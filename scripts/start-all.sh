#!/usr/bin/env bash
# AVTO-PRO-SYSTEM — full auto run: Backend (3000), WebApp (3001), Localtunnel (fixed subdomain).
# TZ.md: Backend 3000, WebApp 3001. Telegram WebApp URL = tunnel(3001).

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WEBAPP_PID=""
LT_PID=""
BACKEND_PID=""
LT_SUBDOMAIN="avtopro-doston-unique-2026"
WEBAPP_URL="https://${LT_SUBDOMAIN}.loca.lt"
LT_LOG="$ROOT/localtunnel.log"
WEBAPP_LOG="$ROOT/webapp.log"

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$LT_PID" ]     && kill "$LT_PID" 2>/dev/null || true
  [ -n "$WEBAPP_PID" ] && kill "$WEBAPP_PID" 2>/dev/null || true
  pkill -f "localtunnel --port 3001" 2>/dev/null || true
  fuser -k 3000/tcp 2>/dev/null || true
  fuser -k 3001/tcp 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

wait_for_port() {
  local port=$1
  local max=${2:-60}
  local n=0
  while [ $n -lt $max ]; do
    (echo >/dev/tcp/127.0.0.1/"$port") 2>/dev/null && return 0
    n=$((n + 1))
    sleep 1
  done
  return 1
}

echo "=============================================="
echo "  AVTO-PRO-SYSTEM — Full stack start"
echo "=============================================="
echo ""

echo "[1/6] Killing old processes (ports 3000, 3001, localtunnel)..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
pkill -f "localtunnel --port 3001" 2>/dev/null || true
sleep 2
echo "      Done."
echo ""

echo "[2/6] Starting WebApp (Next.js, port 3001)..."
cd "$ROOT/webapp"
npm run dev -- -p 3001 > "$WEBAPP_LOG" 2>&1 &
WEBAPP_PID=$!
cd "$ROOT"
echo "      PID: $WEBAPP_PID  |  log: webapp.log"
echo ""

echo "[3/6] Waiting for port 3001..."
if wait_for_port 3001; then
  echo "      Port 3001 is up."
else
  echo "      ERROR: Port 3001 did not become ready in time."
  cleanup
  exit 1
fi
echo ""

echo "[4/6] Starting Localtunnel (--subdomain $LT_SUBDOMAIN)..."
(npx localtunnel --port 3001 --subdomain "$LT_SUBDOMAIN" 2>&1 | tee "$LT_LOG") &
LT_PID=$!
sleep 4
echo "      PID: $LT_PID  |  log: localtunnel.log"
echo ""
echo "      WEBAPP_URL = $WEBAPP_URL"
echo "      (Set WEBAPP_URL in .env for backend.)"
echo ""

echo "[5/6] Starting Backend (NestJS, port 3000)..."
echo "      Backend runs in foreground. Ctrl+C to stop all."
echo "=============================================="
echo ""

cd "$ROOT"
npm run start:dev &
BACKEND_PID=$!
wait $BACKEND_PID
cleanup
