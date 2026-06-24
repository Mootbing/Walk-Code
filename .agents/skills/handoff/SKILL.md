---
name: handoff
description: Hand off the current coding-agent session to the Railway WalkCode worker. Use when the user says /handoff, asks to hand off work to cloud Claude Code, asks the local agent to stop and transfer progress, or wants Railway to finish the current task and sync it back automatically.
---

# Handoff

When this skill is invoked, stop normal implementation work and hand the task to the Railway worker.

## Workflow

1. Summarize the active task for a different agent.
   Include:
   - Original user goal.
   - Current plan and decisions already made.
   - Work completed so far.
   - Files changed or created.
   - Commands/tests/checks run and their outcomes.
   - Known blockers, uncertainties, and risks.
   - Exact recommended next steps.

2. Write the summary to `.walk/current-summary.md`.
   Create `.walk/` if needed.

3. Run:

   ```bash
   handoff --summary-file .walk/current-summary.md
   ```

   The CLI snapshots the repository into `walk-code/<current-branch>`, submits the job to the WalkCode dashboard, polls until the Railway worker finishes, fetches the result, and attempts to merge it locally.

   If `handoff` is not on PATH, use:

   ```bash
   /home/mootbing/.local/bin/handoff --summary-file .walk/current-summary.md
   ```

   In this WalkCode app repository only, the project-local script is also available:

   ```bash
   npm run handoff -- --summary-file .walk/current-summary.md
   ```

   The compatibility CLI remains available too:

   ```bash
   walkcode handoff --summary-file .walk/current-summary.md
   ```

4. If the local sync reports conflicts, do not resolve them locally unless the user explicitly asks.
   The CLI pushes a conflict snapshot branch and requeues the cloud worker to resolve the merge against the cloud result.

5. After the command returns successfully, report the job id, branch, and local sync result.

## Rules

- Do not continue editing locally after the handoff starts.
- Do not omit the summary; the cloud worker depends on it.
- Do not include secrets, `.env` values, tokens, private keys, or unrelated personal notes in the summary.
- If the CLI fails because `WALK_BASE_URL` or `WALK_API_TOKEN` is missing, explain which environment variable is needed.
- Prefer the global `handoff` shim when available; it runs `/home/mootbing/code/Walk-Code/scripts/walkctl.mjs` against the current repository.
