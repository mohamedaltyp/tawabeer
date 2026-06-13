#!/usr/bin/env bash
#
# scripts/test.sh
# Starts the Next.js dev server, waits for readiness, runs API integration
# tests, then tears the server down.
#
# Usage:
#   bash scripts/test.sh              # default port 3000
#   PORT=3001 bash scripts/test.sh    # custom port
#

set -euo pipefail

PORT="${PORT:-3000}"
BASE_URL="http://localhost:${PORT}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SERVER_PID=""

cleanup() {
  if [ -n "${SERVER_PID}" ] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    echo "🧹 Stopping dev server (PID ${SERVER_PID})..."
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
}

trap cleanup EXIT

# ── Start dev server ─────────────────────────────────────────────────────────

echo "🚀 Starting Next.js dev server on port ${PORT}..."
cd "${PROJECT_DIR}"
npx next dev --port "${PORT}" &
SERVER_PID=$!

# ── Wait for server to be ready ──────────────────────────────────────────────

echo "⏳ Waiting for server at ${BASE_URL}..."
MAX_WAIT=60
ELAPSED=0
until curl -sf "${BASE_URL}" -o /dev/null 2>/dev/null; do
  if [ "${ELAPSED}" -ge "${MAX_WAIT}" ]; then
    echo "❌ Server did not become ready within ${MAX_WAIT}s"
    exit 1
  fi
  sleep 2
  ELAPSED=$((ELAPSED + 2))
  echo "   ...still waiting (${ELAPSED}s)"
done
echo "✅ Server is ready!"

# ── Run tests ────────────────────────────────────────────────────────────────

echo ""
BASE_URL="${BASE_URL}" npx tsx src/__tests__/api.test.ts
TEST_EXIT=$?

echo ""
if [ "${TEST_EXIT}" -eq 0 ]; then
  echo "🎉 All tests passed!"
else
  echo "💥 Some tests failed."
fi

exit "${TEST_EXIT}"
