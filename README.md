# WalkCode

WalkCode is an internal handoff bridge for local coding agents. When a user invokes `/handoff`, the local agent writes a transfer summary, snapshots the repository into `walk-code/<branch>`, submits a job to the Next.js dashboard, and polls until the Railway worker finishes the task with Claude Code.

## Local development

```bash
npm install
npm run dev
```

In another terminal:

```bash
npm run worker
```

To hand off the current repository state:

```bash
mkdir -p .walk
printf "Finish the task described in the current session.\n" > .walk/current-summary.md
npm run handoff -- --summary-file .walk/current-summary.md
```

## Railway services

Create two Railway services from this repo:

- Web: `npm start`
- Worker: set `START_COMMAND=npm run worker`

Required shared variables:

- `WALK_BASE_URL`: public URL of the web service.
- `WALK_API_TOKEN`: shared bearer token for local CLI and worker API calls.
- `DATABASE_URL`: Railway Postgres connection string.
- `START_COMMAND`: optional. Defaults to `npm start` for the web service.

Worker-specific variables:

- `CLAUDE_COMMAND`: usually `claude`.
- `CLAUDE_ARGS`: defaults to `-p`.
- `WALK_WORK_DIR`: optional checkout directory.

The worker expects the Railway shell to already be authenticated for Claude Code and to have Git push access to the target repository.

## Conflict loop

`walkctl` waits for completion by default. When the job completes, it fetches `origin/walk-code/<branch>` and tries to merge it locally. If the local tree changed or Git reports conflicts, it pushes a `walk-code/conflicts/<job-id>-<branch>` snapshot and requeues the cloud job to resolve that state against the cloud result.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.

WalkCode fake Claude touched this file.
