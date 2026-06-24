---
description: Alias for /walkcode. Hand off the current Claude Code session to the Railway WalkCode worker and auto-sync the result back locally.
---

# WalkCode Alias

Use the same workflow as `/walkcode`:

1. Write `.walk/current-summary.md` with the current goal, progress, changed files, checks run, blockers, and next steps.
2. Run `npm run walkcode -- handoff --summary-file .walk/current-summary.md`.
3. Wait for the command to finish polling and syncing.
