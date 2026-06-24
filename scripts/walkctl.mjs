#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { readdirSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE_URL = process.env.WALK_BASE_URL ?? "http://localhost:3000";
const API_TOKEN = process.env.WALK_API_TOKEN ?? "";
const DEFAULT_POLL_MS = Number(process.env.WALK_POLL_MS ?? 5000);

function usage() {
  console.log(`WalkCode

Usage:
  handoff --summary-file .walk/current-summary.md [--enqueued-by name]
  walkcode handoff --summary-file .walk/current-summary.md [--enqueued-by name]
  walkcode sync <job-id>
  walkcode wait <job-id>

Project-local fallback:
  npm run handoff -- --summary-file .walk/current-summary.md
  npm run walkcode -- handoff --summary-file .walk/current-summary.md
  npm run walkcode -- sync <job-id>
  npm run walkcode -- wait <job-id>

Environment:
  WALK_BASE_URL=http://localhost:3000
  WALK_API_TOKEN=shared-token-if-configured
`);
}

function flag(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function exec(command, args, cwd, options = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: options.stdio ?? "pipe",
    shell: false,
  });

  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || `${command} ${args.join(" ")} failed`;
    throw new Error(detail.trim());
  }

  return (result.stdout ?? "").trim();
}

function tryExec(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", stdio: "pipe", shell: false });
  return result.status === 0 ? result.stdout.trim() : null;
}

function git(args, cwd, options) {
  return exec("git", args, cwd, options);
}

function sanitizeBranch(value) {
  return value
    .trim()
    .replace(/^refs\/heads\//, "")
    .replace(/[^A-Za-z0-9._/-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

function repoRoot() {
  return git(["rev-parse", "--show-toplevel"], process.cwd());
}

function currentBranch(root) {
  return tryExec("git", ["branch", "--show-current"], root) || `detached-${shortSha(root)}`;
}

function shortSha(root) {
  return (tryExec("git", ["rev-parse", "--short", "HEAD"], root) || "unborn").trim();
}

function currentSha(root) {
  return (tryExec("git", ["rev-parse", "HEAD"], root) || "unborn").trim();
}

function hasHead(root) {
  return tryExec("git", ["rev-parse", "--verify", "HEAD"], root) !== null;
}

function remoteUrl(root) {
  return git(["remote", "get-url", "origin"], root);
}

function gitConfig(root, key) {
  return tryExec("git", ["config", "--get", key], root);
}

function firstNonEmpty(values, fallback) {
  for (const value of values) {
    const cleaned = value?.trim();
    if (cleaned) return cleaned.slice(0, 120);
  }
  return fallback;
}

function enqueuedBy(root) {
  return firstNonEmpty(
    [
      flag("--enqueued-by"),
      process.env.WALK_ENQUEUED_BY,
      process.env.WALK_ACTOR,
      process.env.GIT_AUTHOR_NAME,
      gitConfig(root, "user.name"),
      gitConfig(root, "user.email"),
      process.env.USER,
      process.env.USERNAME,
    ],
    "local-agent",
  );
}

function authHeaders(extra = {}) {
  return {
    ...extra,
    ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
  };
}

async function api(pathname, init = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...init,
    headers: authHeaders(init.headers),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${init.method ?? "GET"} ${pathname} failed: ${response.status} ${text}`);
  }

  return response.json();
}

function shouldSkip(name, fullPath) {
  const base = path.basename(name);
  const relative = fullPath.replaceAll("\\", "/");

  return (
    base === ".git" ||
    base === ".walk" ||
    base === "node_modules" ||
    base === ".next" ||
    base === ".walk-data" ||
    base === ".walk-sync" ||
    base === ".walk-toolchain" ||
    base === "coverage" ||
    base === "dist" ||
    base === "out" ||
    base === ".vercel" ||
    base.startsWith(".env") ||
    base.endsWith(".pem") ||
    relative.includes("/.git/")
  );
}

async function copyRepo(source, target) {
  await cp(source, target, {
    recursive: true,
    force: true,
    filter: (src) => !shouldSkip(path.basename(src), src),
  });
}

function cleanSnapshotWorktree(snapshotDir) {
  for (const entry of readdirSync(snapshotDir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    rmSync(path.join(snapshotDir, entry.name), { recursive: true, force: true });
  }
}

async function createSnapshotBranch(root, branchName, summary, metadata = {}) {
  const snapshotDir = path.join(os.tmpdir(), `walkcode-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  const repo = remoteUrl(root);

  if (hasHead(root)) {
    git(["worktree", "add", "--force", "--detach", snapshotDir, "HEAD"], root);
    cleanSnapshotWorktree(snapshotDir);
  } else {
    await mkdir(snapshotDir, { recursive: true });
    git(["init"], snapshotDir);
    git(["remote", "add", "origin", repo], snapshotDir);
  }

  try {
    await copyRepo(root, snapshotDir);
    await mkdir(path.join(snapshotDir, ".walk"), { recursive: true });

    const jobJson = {
      branchName,
      sourceBranch: currentBranch(root),
      currentSha: currentSha(root),
      createdAt: new Date().toISOString(),
      ...metadata,
    };

    await writeFile(path.join(snapshotDir, "WALK_HANDOFF.md"), summary);
    await writeFile(path.join(snapshotDir, ".walk", "job.json"), JSON.stringify(jobJson, null, 2));

    git(["checkout", "-B", branchName], snapshotDir);
    git(["config", "user.name", process.env.GIT_AUTHOR_NAME ?? "WalkCode"], snapshotDir);
    git(["config", "user.email", process.env.GIT_AUTHOR_EMAIL ?? "walkcode@local"], snapshotDir);
    git(["add", "-A"], snapshotDir);

    const pending = git(["status", "--porcelain"], snapshotDir);
    if (pending) {
      git(["commit", "-m", metadata.commitMessage ?? `WalkCode handoff for ${branchName}`], snapshotDir);
    }

    git(["push", "--force-with-lease", "-u", "origin", branchName], snapshotDir, { stdio: "inherit" });
    const sha = git(["rev-parse", "HEAD"], snapshotDir);
    return { sha, repoUrl: repo };
  } finally {
    if (hasHead(root)) {
      tryExec("git", ["worktree", "remove", "--force", snapshotDir], root);
    } else {
      await rm(snapshotDir, { recursive: true, force: true });
    }
  }
}

async function loadSummary(root) {
  const summaryFile = flag("--summary-file");
  const summaryText = flag("--summary");

  if (summaryText) return summaryText;
  if (summaryFile) return readFile(path.resolve(root, summaryFile), "utf8");

  const status = tryExec("git", ["status", "--short"], root) || "";
  return `No explicit transfer summary was supplied.

The local agent should normally create .walk/current-summary.md before invoking walkctl.

Current git status at handoff:
${status || "(clean)"}
`;
}

async function handoff() {
  const root = repoRoot();
  const sourceBranch = currentBranch(root);
  const safeBranch = sanitizeBranch(sourceBranch || "main");
  const handoffBranch = sanitizeBranch(flag("--branch") ?? `walk-code/${safeBranch}`);
  const summary = await loadSummary(root);
  const title = flag("--title") ?? summary.split(/\r?\n/).find((line) => line.trim())?.slice(0, 120) ?? `WalkCode ${sourceBranch}`;
  const jobId = flag("--job-id") ?? `job_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const actor = enqueuedBy(root);

  console.log(`Creating handoff branch ${handoffBranch}...`);
  const snapshot = await createSnapshotBranch(root, handoffBranch, summary, {
    jobId,
    enqueuedBy: actor,
    commitMessage: `WalkCode handoff ${jobId}`,
  });

  const { job } = await api("/api/handoffs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: jobId,
      title,
      repoUrl: snapshot.repoUrl,
      sourceBranch,
      handoffBranch,
      resultBranch: handoffBranch,
      currentSha: currentSha(root),
      handoffSha: snapshot.sha,
      enqueuedBy: actor,
      summary,
    }),
  });

  console.log(`Queued ${job.id}: ${BASE_URL}/jobs/${job.id}`);

  if (!hasFlag("--no-wait")) {
    await wait(job.id);
  }
}

async function wait(jobId) {
  console.log(`Polling ${jobId} until completion...`);

  for (;;) {
    const { job } = await api(`/api/jobs/${jobId}`);
    process.stdout.write(`\r${new Date().toLocaleTimeString()} ${job.status.padEnd(18)} ${job.handoffBranch}`);

    if (job.status === "completed") {
      console.log("");
      const result = await sync(job.id);
      if (result === "requeued") continue;
      return;
    }

    if (job.status === "failed" || job.status === "cancelled") {
      console.log("");
      throw new Error(`Job ${job.status}: ${job.error ?? "no error details"}`);
    }

    await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_MS));
  }
}

function relevantDirtyStatus(root) {
  const status = tryExec("git", ["status", "--porcelain"], root) || "";

  return status
    .split(/\r?\n/)
    .filter((line) => {
      const file = line.slice(3).trim().replaceAll("\\", "/");
      return file && !file.startsWith(".walk/");
    })
    .join("\n");
}

async function pushConflictSnapshot(root, job, reason) {
  const sourceBranch = sanitizeBranch(currentBranch(root) || "local");
  const conflictBranch = sanitizeBranch(`walk-code/conflicts/${job.id}-${sourceBranch}`);
  const summary = `Local sync conflict for ${job.id}

Reason:
${reason}

Cloud result branch:
${job.handoffBranch}

Local branch:
${currentBranch(root)}

Local status:
${tryExec("git", ["status", "--short"], root) || "(clean)"}
`;

  console.log(`Pushing local conflict snapshot ${conflictBranch}...`);
  await createSnapshotBranch(root, conflictBranch, summary, {
    jobId: job.id,
    conflictFor: job.handoffBranch,
    commitMessage: `WalkCode conflict snapshot ${job.id}`,
  });

  await api(`/api/jobs/${job.id}/conflict`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conflictBranch,
      body: `Local auto-sync could not safely merge ${job.handoffBranch}.

${reason}

I pushed the local state to ${conflictBranch}. Please fetch that branch, resolve it against ${job.handoffBranch}, push the resolved result back to ${job.handoffBranch}, and mark the job complete again.`,
    }),
  });

  console.log(`Requeued ${job.id} for cloud conflict resolution.`);
  return "requeued";
}

async function sync(jobId) {
  const root = repoRoot();
  const { job } = await api(`/api/jobs/${jobId}`);

  if (job.status !== "completed") {
    console.log(`Job is ${job.status}; sync waits for completed.`);
    return "pending";
  }

  git(["fetch", "origin", job.handoffBranch], root, { stdio: "inherit" });

  const localChanges = relevantDirtyStatus(root);
  if (localChanges) {
    console.log(`Local changes block auto-sync:\n${localChanges}`);
    return pushConflictSnapshot(
      root,
      job,
      `The local worktree changed while the cloud worker was running.\n\nRelevant local status:\n${localChanges}`,
    );
  }

  console.log(`Merging origin/${job.handoffBranch} into ${currentBranch(root)}...`);
  const result = spawnSync("git", ["merge", "--no-edit", "--no-ff", `origin/${job.handoffBranch}`], {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  });

  if (result.status === 0) {
    console.log(result.stdout.trim());
    console.log(`Synced ${job.id}.`);
    return "synced";
  }

  const unresolved = tryExec("git", ["diff", "--name-only", "--diff-filter=U"], root) || "";
  tryExec("git", ["merge", "--abort"], root);
  console.log(`Git merge failed while syncing:\n${result.stderr || result.stdout}`);

  return pushConflictSnapshot(
    root,
    job,
    `Git reported a merge conflict while syncing.\n\n${result.stderr || result.stdout}\n\nUnresolved files:\n${unresolved || "(not reported)"}`,
  );
}

async function main() {
  const invokedAsHandoff = path.basename(process.argv[1] ?? "") === "handoff";
  const command = invokedAsHandoff ? "handoff" : process.argv[2];

  if (command === "handoff") return handoff();
  if (command === "wait") {
    const jobId = process.argv[3];
    if (!jobId) throw new Error("wait requires a job id.");
    return wait(jobId);
  }
  if (command === "sync") {
    const jobId = process.argv[3];
    if (!jobId) throw new Error("sync requires a job id.");
    return sync(jobId);
  }

  usage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
