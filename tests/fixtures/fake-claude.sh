#!/usr/bin/env bash
set -euo pipefail

echo "fake claude received prompt"
cat > cloud-result.txt <<'RESULT'
Cloud worker finished this task.
RESULT

if [[ -f README.md ]]; then
  printf '\nWalkCode fake Claude touched this file.\n' >> README.md
fi
