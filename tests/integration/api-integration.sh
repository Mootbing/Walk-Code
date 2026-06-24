#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATH="$ROOT/.walk-toolchain/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
PORT="${WALK_TEST_PORT:-$((20000 + RANDOM))}"
DATA_DIR="$(mktemp -d)"
LOG="$DATA_DIR/next.log"

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]]; then
    kill -- "-$SERVER_PID" 2>/dev/null || kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$DATA_DIR"
}
trap cleanup EXIT

cd "$ROOT"
setsid env WALK_DATA_FILE="$DATA_DIR/db.json" npm run dev -- --hostname 127.0.0.1 --port "$PORT" >"$LOG" 2>&1 &
SERVER_PID=$!

for _ in {1..60}; do
  if curl -fsS "http://127.0.0.1:$PORT/api/jobs" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

curl -fsS "http://127.0.0.1:$PORT/api/jobs" >/dev/null

JOB_JSON="$DATA_DIR/job.json"
curl -fsS -X POST "http://127.0.0.1:$PORT/api/handoffs" \
  -H "Content-Type: application/json" \
  -d '{
    "id":"job_api",
    "title":"API integration",
    "repoUrl":"/tmp/api.git",
    "sourceBranch":"main",
    "handoffBranch":"walk-code/main",
    "currentSha":"abc123",
    "handoffSha":"def456",
    "enqueuedBy":"api-test",
    "summary":"Integration summary"
  }' > "$JOB_JSON"

node -e "const data=require(process.argv[1]); if (data.job.id !== 'job_api' || data.job.enqueuedBy !== 'api-test') process.exit(1)" "$JOB_JSON"

CLAIM_JSON="$DATA_DIR/claim.json"
curl -fsS -X POST "http://127.0.0.1:$PORT/api/worker/claim" \
  -H "Content-Type: application/json" \
  -d '{"workerId":"api-test-worker"}' > "$CLAIM_JSON"
node -e "const data=require(process.argv[1]); if (data.job.status !== 'running') process.exit(1)" "$CLAIM_JSON"

curl -fsS -X POST "http://127.0.0.1:$PORT/api/jobs/job_api/messages" \
  -H "Content-Type: application/json" \
  -d '{"author":"operator","body":"please continue"}' >/dev/null

curl -fsS -X POST "http://127.0.0.1:$PORT/api/worker/jobs/job_api/events" \
  -H "Content-Type: application/json" \
  -d '{"level":"info","message":"worker event"}' >/dev/null

curl -fsS -X PATCH "http://127.0.0.1:$PORT/api/worker/jobs/job_api/status" \
  -H "Content-Type: application/json" \
  -d '{"status":"completed","handoffSha":"fff999"}' >/dev/null

FINAL_JSON="$DATA_DIR/final.json"
curl -fsS "http://127.0.0.1:$PORT/api/jobs/job_api" > "$FINAL_JSON"
node -e "const data=require(process.argv[1]); if (data.job.status !== 'completed' || data.job.enqueuedBy !== 'api-test' || data.events.length < 3 || data.messages.length !== 1) process.exit(1)" "$FINAL_JSON"

echo "api integration ok"
