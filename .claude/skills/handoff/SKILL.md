---
description: Hand off the current Claude Code session to the Railway WalkCode worker when the user says /handoff, asks to transfer work to cloud Claude Code, or wants Railway to finish and auto-sync the task.
---

# Handoff

Stop normal implementation work and prepare a transfer for the Railway worker.

1. Summarize the current session in `.walk/current-summary.md`.
   Include the original goal, current plan, progress, files changed, commands run, blockers, risks, and next steps.

2. Run:

   ```bash
   npm run handoff -- --summary-file .walk/current-summary.md
   ```

3. Let the command poll until the Railway job finishes. It will fetch and merge the cloud result automatically. If local conflicts occur, it will push a conflict branch and requeue the cloud worker.

4. Report the job id, handoff branch, and sync result.

Do not continue coding locally after starting the handoff unless the user cancels the cloud handoff.
