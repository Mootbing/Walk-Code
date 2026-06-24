import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Pool } from "pg";
import type { Job, JobEvent, JobMessage, JobStatus, Store } from "./types";

type StoredJob = Omit<Job, "enqueuedBy"> & { enqueuedBy?: string | null };

type DbFile = {
  jobs: StoredJob[];
  events: JobEvent[];
  messages: JobMessage[];
};

function dataFile() {
  return process.env.WALK_DATA_FILE ?? path.join(".walk-data", "db.json");
}

let storePromise: Promise<Store> | null = null;
let poolPromise: Promise<Pool> | null = null;

export function getStore() {
  storePromise ??= process.env.DATABASE_URL ? createPostgresStore() : Promise.resolve(createFileStore());
  return storePromise;
}

function now() {
  return new Date().toISOString();
}

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
}

function cleanActor(value: string | null | undefined, fallback = "local-agent") {
  return value?.trim().slice(0, 120) || fallback;
}

function normalizeJob(job: StoredJob, fallback = "legacy"): Job {
  return {
    ...job,
    enqueuedBy: cleanActor(job.enqueuedBy, fallback),
  };
}

function rowToJob(row: Record<string, unknown>): Job {
  return {
    id: String(row.id),
    title: String(row.title),
    status: row.status as JobStatus,
    repoUrl: String(row.repo_url),
    sourceBranch: String(row.source_branch),
    handoffBranch: String(row.handoff_branch),
    resultBranch: String(row.result_branch),
    currentSha: String(row.current_sha),
    handoffSha: row.handoff_sha ? String(row.handoff_sha) : null,
    enqueuedBy: cleanActor(row.enqueued_by ? String(row.enqueued_by) : null, "legacy"),
    summary: String(row.summary),
    conflictBranch: row.conflict_branch ? String(row.conflict_branch) : null,
    workerId: row.worker_id ? String(row.worker_id) : null,
    error: row.error ? String(row.error) : null,
    createdAt: new Date(String(row.created_at)).toISOString(),
    updatedAt: new Date(String(row.updated_at)).toISOString(),
    completedAt: row.completed_at ? new Date(String(row.completed_at)).toISOString() : null,
  };
}

function rowToEvent(row: Record<string, unknown>): JobEvent {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    level: row.level as JobEvent["level"],
    message: String(row.message),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

function rowToMessage(row: Record<string, unknown>): JobMessage {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    author: row.author as JobMessage["author"],
    body: String(row.body),
    consumed: Boolean(row.consumed),
    createdAt: new Date(String(row.created_at)).toISOString(),
  };
}

async function getPool() {
  poolPromise ??= (async () => {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query(`
      CREATE TABLE IF NOT EXISTS jobs (
        id text PRIMARY KEY,
        title text NOT NULL,
        status text NOT NULL,
        repo_url text NOT NULL,
        source_branch text NOT NULL,
        handoff_branch text NOT NULL,
        result_branch text NOT NULL,
        current_sha text NOT NULL,
        handoff_sha text,
        enqueued_by text,
        summary text NOT NULL,
        conflict_branch text,
        worker_id text,
        error text,
        created_at timestamptz NOT NULL,
        updated_at timestamptz NOT NULL,
        completed_at timestamptz
      );

      CREATE TABLE IF NOT EXISTS job_events (
        id text PRIMARY KEY,
        job_id text NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        level text NOT NULL,
        message text NOT NULL,
        created_at timestamptz NOT NULL
      );

      CREATE TABLE IF NOT EXISTS job_messages (
        id text PRIMARY KEY,
        job_id text NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        author text NOT NULL,
        body text NOT NULL,
        consumed boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL
      );

      ALTER TABLE jobs ADD COLUMN IF NOT EXISTS enqueued_by text;
    `);
    return pool;
  })();

  return poolPromise;
}

async function createPostgresStore(): Promise<Store> {
  const pool = await getPool();

  const store: Store = {
    async createJob(input) {
      const timestamp = now();
      const job: Job = {
        id: input.id ?? id("job"),
        title: input.title,
        status: "queued",
        repoUrl: input.repoUrl,
        sourceBranch: input.sourceBranch,
        handoffBranch: input.handoffBranch,
        resultBranch: input.resultBranch ?? input.handoffBranch,
        currentSha: input.currentSha,
        handoffSha: input.handoffSha ?? null,
        enqueuedBy: cleanActor(input.enqueuedBy),
        summary: input.summary,
        conflictBranch: null,
        workerId: null,
        error: null,
        createdAt: timestamp,
        updatedAt: timestamp,
        completedAt: null,
      };

      await pool.query(
        `INSERT INTO jobs
          (id, title, status, repo_url, source_branch, handoff_branch, result_branch, current_sha, handoff_sha, enqueued_by, summary, conflict_branch, worker_id, error, created_at, updated_at, completed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
         ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          status = EXCLUDED.status,
          repo_url = EXCLUDED.repo_url,
          source_branch = EXCLUDED.source_branch,
          handoff_branch = EXCLUDED.handoff_branch,
          result_branch = EXCLUDED.result_branch,
          current_sha = EXCLUDED.current_sha,
          handoff_sha = EXCLUDED.handoff_sha,
          enqueued_by = EXCLUDED.enqueued_by,
          summary = EXCLUDED.summary,
          updated_at = EXCLUDED.updated_at`,
        [
          job.id,
          job.title,
          job.status,
          job.repoUrl,
          job.sourceBranch,
          job.handoffBranch,
          job.resultBranch,
          job.currentSha,
          job.handoffSha,
          job.enqueuedBy,
          job.summary,
          job.conflictBranch,
          job.workerId,
          job.error,
          job.createdAt,
          job.updatedAt,
          job.completedAt,
        ],
      );

      await store.addEvent(job.id, "info", "Job accepted and queued.");
      return job;
    },
    async listJobs() {
      const { rows } = await pool.query("SELECT * FROM jobs ORDER BY created_at DESC");
      return rows.map(rowToJob);
    },
    async getJob(jobId) {
      const { rows } = await pool.query("SELECT * FROM jobs WHERE id = $1", [jobId]);
      return rows[0] ? rowToJob(rows[0]) : null;
    },
    async claimNextJob(workerId) {
      const { rows } = await pool.query(
        `UPDATE jobs SET status = 'running', worker_id = $1, updated_at = $2
         WHERE id = (
          SELECT id FROM jobs
          WHERE status IN ('queued', 'conflict')
          ORDER BY created_at
          FOR UPDATE SKIP LOCKED
          LIMIT 1
         )
         RETURNING *`,
        [workerId, now()],
      );
      const job = rows[0] ? rowToJob(rows[0]) : null;
      if (job) await store.addEvent(job.id, "info", `Claimed by worker ${workerId}.`);
      return job;
    },
    async updateJobStatus(jobId, status, patch = {}) {
      const completedAt = ["completed", "failed", "cancelled"].includes(status) ? now() : null;
      const { rows } = await pool.query(
        `UPDATE jobs SET
          status = $2,
          error = COALESCE($3, error),
          handoff_sha = COALESCE($4, handoff_sha),
          worker_id = COALESCE($5, worker_id),
          completed_at = COALESCE($6, completed_at),
          updated_at = $7
         WHERE id = $1 RETURNING *`,
        [jobId, status, patch.error ?? null, patch.handoffSha ?? null, patch.workerId ?? null, completedAt, now()],
      );
      return rows[0] ? rowToJob(rows[0]) : null;
    },
    async markConflict(jobId, conflictBranch, body) {
      const { rows } = await pool.query(
        "UPDATE jobs SET status = 'conflict', conflict_branch = $2, updated_at = $3 WHERE id = $1 RETURNING *",
        [jobId, conflictBranch, now()],
      );
      await store.addEvent(jobId, "warn", `Local sync conflict escalated on ${conflictBranch}.`);
      await store.addMessage(jobId, "local-agent", body);
      return rows[0] ? rowToJob(rows[0]) : null;
    },
    async addEvent(jobId, level, message) {
      const event: JobEvent = { id: id("evt"), jobId, level, message, createdAt: now() };
      await pool.query(
        "INSERT INTO job_events (id, job_id, level, message, created_at) VALUES ($1,$2,$3,$4,$5)",
        [event.id, event.jobId, event.level, event.message, event.createdAt],
      );
      return event;
    },
    async listEvents(jobId, afterId) {
      const params = [jobId];
      let afterClause = "";
      if (afterId) {
        params.push(afterId);
        afterClause = "AND created_at > (SELECT created_at FROM job_events WHERE id = $2)";
      }
      const { rows } = await pool.query(
        `SELECT * FROM job_events WHERE job_id = $1 ${afterClause} ORDER BY created_at ASC LIMIT 500`,
        params,
      );
      return rows.map(rowToEvent);
    },
    async addMessage(jobId, author, body) {
      const message: JobMessage = { id: id("msg"), jobId, author, body, consumed: false, createdAt: now() };
      await pool.query(
        "INSERT INTO job_messages (id, job_id, author, body, consumed, created_at) VALUES ($1,$2,$3,$4,$5,$6)",
        [message.id, message.jobId, message.author, message.body, message.consumed, message.createdAt],
      );
      await store.addEvent(jobId, "info", `${author} sent a steering message.`);
      return message;
    },
    async listMessages(jobId, onlyUnconsumed) {
      const { rows } = await pool.query(
        `SELECT * FROM job_messages WHERE job_id = $1 ${onlyUnconsumed ? "AND consumed = false" : ""} ORDER BY created_at ASC`,
        [jobId],
      );
      return rows.map(rowToMessage);
    },
    async markMessagesConsumed(jobId, ids) {
      if (ids.length === 0) return;
      await pool.query("UPDATE job_messages SET consumed = true WHERE job_id = $1 AND id = ANY($2)", [jobId, ids]);
    },
  };

  return store;
}

async function readDb(): Promise<DbFile> {
  try {
    return JSON.parse(await readFile(/*turbopackIgnore: true*/ dataFile(), "utf8")) as DbFile;
  } catch {
    return { jobs: [], events: [], messages: [] };
  }
}

async function writeDb(db: DbFile) {
  const file = /*turbopackIgnore: true*/ dataFile();
  await mkdir(path.dirname(file), { recursive: true });
  const tempFile = `${file}.${process.pid}.${crypto.randomUUID()}.tmp`;
  await writeFile(tempFile, JSON.stringify(db, null, 2));
  await rename(tempFile, file);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const lockDir = `${/*turbopackIgnore: true*/ dataFile()}.lock`;
  await mkdir(path.dirname(lockDir), { recursive: true });

  for (let attempt = 0; attempt < 400; attempt += 1) {
    try {
      await mkdir(lockDir);
      try {
        return await fn();
      } finally {
        await rm(lockDir, { recursive: true, force: true });
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      await sleep(25);
    }
  }

  throw new Error(`Timed out waiting for local store lock: ${lockDir}`);
}

function createFileStore(): Store {
  return {
    async createJob(input) {
      return withFileLock(async () => {
        const db = await readDb();
        const timestamp = now();
        const existing = db.jobs.findIndex((job) => job.id === input.id);
        const job: Job = {
          id: input.id ?? id("job"),
          title: input.title,
          status: "queued",
          repoUrl: input.repoUrl,
          sourceBranch: input.sourceBranch,
          handoffBranch: input.handoffBranch,
          resultBranch: input.resultBranch ?? input.handoffBranch,
          currentSha: input.currentSha,
          handoffSha: input.handoffSha ?? null,
          enqueuedBy: cleanActor(input.enqueuedBy),
          summary: input.summary,
          conflictBranch: null,
          workerId: null,
          error: null,
          createdAt: existing >= 0 ? db.jobs[existing].createdAt : timestamp,
          updatedAt: timestamp,
          completedAt: null,
        };
        if (existing >= 0) db.jobs[existing] = job;
        else db.jobs.push(job);
        db.events.push({ id: id("evt"), jobId: job.id, level: "info", message: "Job accepted and queued.", createdAt: timestamp });
        await writeDb(db);
        return normalizeJob(job);
      });
    },
    async listJobs() {
      const db = await readDb();
      return db.jobs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((job) => normalizeJob(job));
    },
    async getJob(jobId) {
      const db = await readDb();
      const job = db.jobs.find((candidate) => candidate.id === jobId);
      return job ? normalizeJob(job) : null;
    },
    async claimNextJob(workerId) {
      return withFileLock(async () => {
        const db = await readDb();
        const job = db.jobs
          .filter((candidate) => candidate.status === "queued" || candidate.status === "conflict")
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
        if (!job) return null;
        job.status = "running";
        job.workerId = workerId;
        job.updatedAt = now();
        db.events.push({ id: id("evt"), jobId: job.id, level: "info", message: `Claimed by worker ${workerId}.`, createdAt: now() });
        await writeDb(db);
        return normalizeJob(job);
      });
    },
    async updateJobStatus(jobId, status, patch = {}) {
      return withFileLock(async () => {
        const db = await readDb();
        const job = db.jobs.find((candidate) => candidate.id === jobId);
        if (!job) return null;
        job.status = status;
        job.updatedAt = now();
        job.error = patch.error ?? job.error;
        job.handoffSha = patch.handoffSha ?? job.handoffSha;
        job.workerId = patch.workerId ?? job.workerId;
        if (["completed", "failed", "cancelled"].includes(status)) job.completedAt = now();
        await writeDb(db);
        return normalizeJob(job);
      });
    },
    async markConflict(jobId, conflictBranch, body) {
      return withFileLock(async () => {
        const db = await readDb();
        const job = db.jobs.find((candidate) => candidate.id === jobId);
        if (!job) return null;
        job.status = "conflict";
        job.conflictBranch = conflictBranch;
        job.updatedAt = now();
        db.events.push({ id: id("evt"), jobId, level: "warn", message: `Local sync conflict escalated on ${conflictBranch}.`, createdAt: now() });
        db.messages.push({ id: id("msg"), jobId, author: "local-agent", body, consumed: false, createdAt: now() });
        await writeDb(db);
        return normalizeJob(job);
      });
    },
    async addEvent(jobId, level, message) {
      return withFileLock(async () => {
        const db = await readDb();
        const event = { id: id("evt"), jobId, level, message, createdAt: now() };
        db.events.push(event);
        await writeDb(db);
        return event;
      });
    },
    async listEvents(jobId, afterId) {
      const db = await readDb();
      const events = db.events.filter((event) => event.jobId === jobId);
      const index = afterId ? events.findIndex((event) => event.id === afterId) : -1;
      return events.slice(index + 1).slice(-500);
    },
    async addMessage(jobId, author, body) {
      return withFileLock(async () => {
        const db = await readDb();
        const message = { id: id("msg"), jobId, author, body, consumed: false, createdAt: now() };
        db.messages.push(message);
        db.events.push({ id: id("evt"), jobId, level: "info", message: `${author} sent a steering message.`, createdAt: now() });
        await writeDb(db);
        return message;
      });
    },
    async listMessages(jobId, onlyUnconsumed) {
      const db = await readDb();
      return db.messages.filter((message) => message.jobId === jobId && (!onlyUnconsumed || !message.consumed));
    },
    async markMessagesConsumed(jobId, ids) {
      await withFileLock(async () => {
        const db = await readDb();
        for (const message of db.messages) {
          if (message.jobId === jobId && ids.includes(message.id)) message.consumed = true;
        }
        await writeDb(db);
      });
    },
  };
}
