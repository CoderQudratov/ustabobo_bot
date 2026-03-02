#!/usr/bin/env bash
# AVTO-PRO-SYSTEM — bitta buyruq: Backend (3000), WebApp (3001), ikkala localtunnel.
# TZ.md: Backend 3000, WebApp 3001. WebApp URL = tunnel(3001), API URL = tunnel(3000).

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LT_WEBAPP="avtopro-webapp-doston-x9"
LT_API="avtopro-api-doston-x9"
WEBAPP_URL="https://${LT_WEBAPP}.loca.lt"
API_URL="https://${LT_API}.loca.lt"

WEBAPP_LOG="$ROOT/webapp.log"
API_LOG="$ROOT/api.log"
TUNNELS_LOG="$ROOT/tunnels.log"

WEBAPP_PID=""
BACKEND_PID=""
LT_WEBAPP_PID=""
LT_API_PID=""

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$BACKEND_PID" ]     && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$WEBAPP_PID" ]      && kill "$WEBAPP_PID" 2>/dev/null || true
  [ -n "$LT_WEBAPP_PID" ]   && kill "$LT_WEBAPP_PID" 2>/dev/null || true
  [ -n "$LT_API_PID" ]      && kill "$LT_API_PID" 2>/dev/null || true
  pkill -f "localtunnel --port 3001" 2>/dev/null || true
  pkill -f "localtunnel --port 3000" 2>/dev/null || true
  pkill -f localtunnel 2>/dev/null || true
  fuser -k 3000/tcp 2>/dev/null || true
  fuser -k 3001/tcp 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

wait_for_port() {
  local port=$1
  local max=${2:-90}
  local n=0
  until (echo >/dev/tcp/127.0.0.1/"$port") 2>/dev/null; do
    n=$((n + 1))
    [ $n -ge $max ] && return 1
    sleep 1
  done
  return 0
}

echo "=============================================="
echo "  AVTO-PRO-SYSTEM — Full stack start"
echo "=============================================="
echo ""

echo "[1/7] Cleaning old processes (ports 3000, 3001, localtunnel)..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
pkill -f "localtunnel --port 3001" 2>/dev/null || true
pkill -f "localtunnel --port 3000" 2>/dev/null || true
pkill -f localtunnel 2>/dev/null || true
sleep 2
echo "      Done."
echo ""

echo "[2/7] Starting WebApp (Next.js, port 3001)..."
cd "$ROOT/webapp"
npm run dev -- -p 3001 >> "$WEBAPP_LOG" 2>&1 &
WEBAPP_PID=$!
cd "$ROOT"
echo "      PID: $WEBAPP_PID  |  log: webapp.log"
echo ""

echo "[3/7] Starting Backend (NestJS, port 3000)..."
npm run start:dev >> "$API_LOG" 2>&1 &
BACKEND_PID=$!
echo "      PID: $BACKEND_PID  |  log: api.log"
echo ""

echo "[4/7] Waiting for port 3001 (WebApp)..."
until wait_for_port 3001; do
  echo "      Waiting for 3001..."
  sleep 1
done
echo "      Port 3001 is up."
echo ""

echo "[5/7] Waiting for port 3000 (Backend)..."
until wait_for_port 3000; do
  echo "      Waiting for 3000..."
  sleep 1
done
echo "      Port 3000 is up."
echo ""

echo "[6/7] Starting Localtunnels..."
npx localtunnel --port 3001 --subdomain "$LT_WEBAPP" >> "$TUNNELS_LOG" 2>&1 &
LT_WEBAPP_PID=$!
npx localtunnel --port 3000 --subdomain "$LT_API" >> "$TUNNELS_LOG" 2>&1 &
LT_API_PID=$!
sleep 5
echo "      WebApp tunnel PID: $LT_WEBAPP_PID"
echo "      API tunnel PID: $LT_API_PID  |  log: tunnels.log"
echo ""

echo "[7/7] Status"
echo "      WEBAPP_URL = $WEBAPP_URL"
echo "      API_URL    = $API_URL"
echo "      (.env: WEBAPP_URL, webapp: NEXT_PUBLIC_API_URL = $API_URL)"
echo "=============================================="
echo "  Running. Ctrl+C to stop all (cleanup)."
echo "=============================================="
echo ""

wait $BACKEND_PID
cleanup
