WalkCode production smoke workflow for Railway Claude SSO

Original user goal:
The user just installed or exposed the `claude` command in the Railway environment and wants a double-check that the WalkCode/Railway workflow works with Claude SSO/subscription auth instead of an API-key-only path. They asked to dispatch a real-world workflow in the Walk-Code repository.

Current local findings:
- The repo is `/home/mootbing/code/Walk-Code`.
- The project-local Node runtime is available at `.walk-toolchain/node/bin`.
- `handoff` is available at `/home/mootbing/.local/bin/handoff`.
- `walkcode` is available at `/home/mootbing/.local/bin/walkcode`.
- The repo's local real-world handoff test passed before this dispatch:
  - Command: `npm run test:real` with a clean WSL PATH including `.walk-toolchain/node/bin`.
  - Result: success.
  - Local test job id: `job_8adb200beb804bf4ab3d`.
  - It queued a fixture handoff, ran the worker, merged `origin/walk-code/main`, and printed `real world handoff ok`.
- The current local worktree already has user changes unrelated to this smoke dispatch, so the local agent is dispatching this production job without waiting for auto-sync.

Requested worker task:
Run a small, safe production smoke workflow in this checkout to prove the Railway WalkCode worker can claim and execute a real job using its configured Claude command/auth.

Recommended actions:
1. Inspect the checkout enough to confirm it is the Walk-Code repository.
2. Verify the runtime basics that are safe to print in logs, such as `pwd`, `git status --short`, `node --version` or the bundled Node equivalent, and `claude --version` if available.
3. Run a lightweight repository check if practical. Prefer `npm run test:unit` or an equivalent focused check over broad changes.
4. Create or update `WALKCODE_RAILWAY_SMOKE.md` at the repository root with:
   - The job id if visible from the prompt/context.
   - The UTC timestamp.
   - A short statement that the Railway worker claimed and executed the job.
   - The commands/checks run and their pass/fail result.
   - Any blocker if Claude auth or runtime setup is not working.
5. Commit the result before exiting, as the WalkCode worker normally expects.

Boundaries:
- Do not make broad product, UI, or API changes.
- Do not print or commit secrets, tokens, `.env` values, private keys, or Railway credentials.
- If Claude auth fails, record the blocker in `WALKCODE_RAILWAY_SMOKE.md` and exit cleanly so the job result is auditable.
