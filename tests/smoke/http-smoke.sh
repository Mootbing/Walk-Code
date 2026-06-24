#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PATH="$ROOT/.walk-toolchain/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH"
PORT="${WALK_SMOKE_PORT:-$((30000 + RANDOM))}"
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
  if curl -fsS -I "http://127.0.0.1:$PORT/" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

curl -fsS -I "http://127.0.0.1:$PORT/" | grep -q "200 OK"
HOME_HTML="$DATA_DIR/home.html"
curl -fsS "http://127.0.0.1:$PORT/" > "$HOME_HTML"
grep -q "Enqueued by" "$HOME_HTML"
grep -q "Repo" "$HOME_HTML"
grep -q "Filter" "$HOME_HTML"
grep -q "/handoff" "$HOME_HTML"
curl -fsS "http://127.0.0.1:$PORT/api/jobs" | node -e "let s=''; process.stdin.on('data', d => s += d); process.stdin.on('end', () => { const data=JSON.parse(s); if (!Array.isArray(data.jobs)) process.exit(1); })"

echo "http smoke ok"
