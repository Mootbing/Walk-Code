import { spawn } from "node:child_process";
import { chmod, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const BASE_URL = process.env.WALK_BASE_URL ?? "http://localhost:3000";
const API_TOKEN = process.env.WALK_API_TOKEN ?? "";
const WORKER_ID = process.env.WALK_WORKER_ID ?? `${os.hostname()}-${process.pid}`;
const WORK_DIR = process.env.WALK_WORK_DIR ?? path.join(os.tmpdir(), "walkcode-worker");
const CLAUDE_COMMAND = process.env.CLAUDE_COMMAND ?? "claude";
const CLAUDE_ARGS = (process.env.CLAUDE_ARGS ?? "-p").split(/\s+/).filter(Boolean);
const POLL_MS = Number(process.env.WALK_WORKER_POLL_MS ?? 5000);
const MAX_FOLLOWUP_TURNS = Number(process.env.WALK_MAX_FOLLOWUP_TURNS ?? 12);
let gitAskPassPath = null;

function headers(extra = {}) {
  return {
    ...extra,
    ...(API_TOKEN ? { Authorization: `Bearer ${API_TOKEN}` } : {}),
  };
}

async function api(pathname, init = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...init,
    headers: headers(init.headers),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${init.method ?? "GET"} ${pathname} failed: ${response.status} ${text}`);
  }

  return response.json();
}

async function event(jobId, level, message) {
  console.log(`[${jobId}] ${level}: ${message}`);
  await api(`/api/worker/jobs/${jobId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ level, message }),
  }).catch((error) => console.error(error));
}

async function status(jobId, nextStatus, patch = {}) {
  await api(`/api/worker/jobs/${jobId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: nextStatus, ...patch }),
  });
}

async function run(jobId, command, args, cwd, options = {}) {
  await event(jobId, "debug", `$ ${command} ${args.join(" ")}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      shell: false,
      env: { ...process.env, ...options.env },
    });

    let stdout = "";
    let stderr = "";
    let stdoutBuffer = "";
    let stderrBuffer = "";

    function flush(buffer, level) {
      const lines = buffer.split(/\r?\n/);
      const rest = lines.pop() ?? "";
      for (const line of lines) {
        if (line.trim()) void event(jobId, level, line);
      }
      return rest;
    }

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      stdoutBuffer = flush(stdoutBuffer + text, "info");
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      stderrBuffer = flush(stderrBuffer + text, "warn");
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (stdoutBuffer.trim()) void event(jobId, "info", stdoutBuffer.trim());
      if (stderrBuffer.trim()) void event(jobId, "warn", stderrBuffer.trim());

      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} exited with code ${code}`));
    });
  });
}

async function git(jobId, args, cwd) {
  return run(jobId, "git", args, cwd);
}

async function installGitCredentials() {
  if (!process.env.GITHUB_TOKEN || gitAskPassPath) return;

  await mkdir(WORK_DIR, { recursive: true });
  gitAskPassPath = path.join(WORK_DIR, ".git-askpass.sh");
  await writeFile(
    gitAskPassPath,
    `#!/bin/sh
case "$1" in
  *Username*) echo "x-access-token" ;;
  *Password*) echo "$GITHUB_TOKEN" ;;
  *) echo "" ;;
esac
`,
  );
  await chmod(gitAskPassPath, 0o700);
  process.env.GIT_ASKPASS = gitAskPassPath;
  process.env.GIT_TERMINAL_PROMPT = "0";
}

function buildInitialPrompt(job) {
  const conflictText = job.conflictBranch
    ? `\n\nA local sync conflict was escalated. Fetch origin/${job.conflictBranch}, merge or compare it against ${job.handoffBranch}, resolve conflicts in favor of preserving both the cloud work and the user's local changes, then leave the final resolved work on ${job.handoffBranch}.\n`
    : "";

  return `You are the Railway WalkCode worker running Claude Code for an internal handoff.

Continue and finish the task described below. Work directly in this checkout. Commit any completed changes before exiting.

Repository: ${job.repoUrl}
Source branch: ${job.sourceBranch}
Handoff branch: ${job.handoffBranch}
Current SHA at handoff: ${job.currentSha}

Transfer summary:
${job.summary}
${conflictText}
Rules:
- Prefer completing the task end to end.
- Run relevant tests or checks when practical.
- If blocked, write the blocker clearly into the final output.
- Do not wait for interactive user input; use best judgment.`;
}

async function consumeMessages(jobId) {
  const { messages } = await api(`/api/worker/jobs/${jobId}/messages`);
  if (!messages.length) return [];

  await api(`/api/worker/jobs/${jobId}/messages`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: messages.map((message) => message.id) }),
  });

  return messages;
}

async function runClaudeTurn(job, cwd, prompt) {
  await status(job.id, "running");
  await event(job.id, "info", "Starting Claude Code turn.");
  await run(job.id, CLAUDE_COMMAND, [...CLAUDE_ARGS, prompt], cwd);
}

async function finalize(job, cwd) {
  await git(job.id, ["config", "user.name", process.env.GIT_AUTHOR_NAME ?? "WalkCode Worker"], cwd);
  await git(job.id, ["config", "user.email", process.env.GIT_AUTHOR_EMAIL ?? "walkcode@local"], cwd);

  const { stdout } = await git(job.id, ["status", "--porcelain"], cwd);
  if (stdout.trim()) {
    await git(job.id, ["add", "-A"], cwd);
    await git(job.id, ["commit", "-m", `Complete WalkCode job ${job.id}`], cwd);
  } else {
    await event(job.id, "info", "No file changes to commit.");
  }

  await git(job.id, ["push", "origin", `HEAD:${job.handoffBranch}`], cwd);
  const { stdout: sha } = await git(job.id, ["rev-parse", "HEAD"], cwd);
  await status(job.id, "completed", { handoffSha: sha.trim() });
  await event(job.id, "info", `Job complete. Pushed ${sha.trim()} to ${job.handoffBranch}.`);
}

async function processJob(job) {
  const cwd = path.join(WORK_DIR, job.id);
  await rm(cwd, { recursive: true, force: true });
  await mkdir(WORK_DIR, { recursive: true });
  await installGitCredentials();

  try {
    await event(job.id, "info", `Cloning ${job.repoUrl}#${job.handoffBranch}.`);
    await run(job.id, "git", ["clone", "--branch", job.handoffBranch, job.repoUrl, cwd], WORK_DIR);

    if (job.conflictBranch) {
      await git(job.id, ["fetch", "origin", `${job.conflictBranch}:${job.conflictBranch}`], cwd);
    }

    await runClaudeTurn(job, cwd, buildInitialPrompt(job));

    for (let turn = 0; turn < MAX_FOLLOWUP_TURNS; turn += 1) {
      const messages = await consumeMessages(job.id);
      if (!messages.length) break;

      const prompt = `The operator/local agent sent these follow-up instructions for this same job:\n\n${messages
        .map((message) => `[${message.author}] ${message.body}`)
        .join("\n\n")}\n\nApply them in this checkout, then continue toward completion.`;

      await runClaudeTurn(job, cwd, prompt);
    }

    await finalize(job, cwd);
  } catch (error) {
    await status(job.id, "failed", { error: error instanceof Error ? error.message : String(error) });
    await event(job.id, "error", error instanceof Error ? error.stack ?? error.message : String(error));
  }
}

async function loop() {
  await mkdir(WORK_DIR, { recursive: true });
  console.log(`WalkCode worker ${WORKER_ID} polling ${BASE_URL}`);

  for (;;) {
    try {
      const { job } = await api("/api/worker/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workerId: WORKER_ID }),
      });

      if (job) await processJob(job);
      else await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    } catch (error) {
      console.error(error);
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }
}

loop();
