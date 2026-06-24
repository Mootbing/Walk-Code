#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATH="$ROOT/.walk-toolchain/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
PORT="${WALK_REAL_PORT:-$((30000 + RANDOM % 20000))}"
BASE_URL="http://127.0.0.1:$PORT"
TMP="$(mktemp -d)"
DATA_FILE="$TMP/db.json"
SERVER_LOG="$TMP/server.log"
WORKER_LOG="$TMP/worker.log"
REMOTE="$TMP/remote.git"
LOCAL="$TMP/local"
WORK_DIR="$TMP/worker"
FAKE_CLAUDE="$ROOT/tests/fixtures/fake-claude.sh"

cleanup() {
  for pid in "${WORKER_PID:-}" "${SERVER_PID:-}"; do
    if [[ -n "$pid" ]]; then
      kill -- "-$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
    fi
  done
  rm -rf "$TMP"
}
trap cleanup EXIT

cd "$ROOT"
setsid env WALK_DATA_FILE="$DATA_FILE" npm run dev -- --hostname 127.0.0.1 --port "$PORT" >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!

for _ in {1..80}; do
  if curl -fsS "$BASE_URL/api/jobs" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done
curl -fsS "$BASE_URL/api/jobs" >/dev/null

setsid env \
  WALK_BASE_URL="$BASE_URL" \
  WALK_WORK_DIR="$WORK_DIR" \
  WALK_WORKER_POLL_MS=500 \
  CLAUDE_COMMAND="$FAKE_CLAUDE" \
  CLAUDE_ARGS="-p" \
  GIT_AUTHOR_NAME="WalkCode Test" \
  GIT_AUTHOR_EMAIL="walkcode-test@example.com" \
  node "$ROOT/scripts/worker.mjs" >"$WORKER_LOG" 2>&1 &
WORKER_PID=$!

git init --bare "$REMOTE" >/dev/null
git clone "$REMOTE" "$LOCAL" >/dev/null 2>&1
cd "$LOCAL"
git checkout -b main >/dev/null
git config user.name "Local Tester"
git config user.email "local@example.com"
cat > README.md <<'README'
# Real world handoff fixture
README
git add README.md
git commit -m "Initial fixture" >/dev/null
git push -u origin main >/dev/null 2>&1

mkdir -p .walk
cat > .walk/current-summary.md <<'SUMMARY'
Finish the real-world handoff fixture by adding a cloud result file.
SUMMARY

WALK_BASE_URL="$BASE_URL" WALK_POLL_MS=500 node "$ROOT/scripts/walkctl.mjs" handoff --summary-file .walk/current-summary.md --title "Real world fixture"

test -f cloud-result.txt
grep -q "Cloud worker finished" cloud-result.txt
git log --oneline --decorate --max-count=5 | grep -q "Merge"
git ls-remote --heads origin "walk-code/main" | grep -q "walk-code/main"

JOB_ID="$(node -e "const db=require(process.argv[1]); const job=db.jobs[0]; if (!job || job.status !== 'completed' || job.enqueuedBy !== 'Local Tester') process.exit(1); process.stdout.write(job.id)" "$DATA_FILE")"
curl -fsS "$BASE_URL/api/jobs/$JOB_ID" | node -e "let s=''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => { const data=JSON.parse(s); if (data.job.status !== 'completed' || data.job.enqueuedBy !== 'Local Tester' || data.events.length < 4) process.exit(1); })"

echo "real world handoff ok: $JOB_ID"
