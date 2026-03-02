#!/usr/bin/env bash
# AVTO-PRO-SYSTEM — Backend (3000), WebApp (3001), Cloudflare Tunnel (cloudflared).
# TZ.md 6.2.7: Order flow preserved. Two tunnels: API and WebApp.

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

WEBAPP_LOG="$ROOT/webapp.log"
API_LOG="$ROOT/api.log"
API_CF_LOG="$ROOT/api_cf.log"
WEBAPP_CF_LOG="$ROOT/webapp_cf.log"

WEBAPP_PID=""
BACKEND_PID=""
CF_API_PID=""
CF_WEBAPP_PID=""
WEBAPP_URL=""
API_URL=""

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$BACKEND_PID" ]    && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$WEBAPP_PID" ]     && kill "$WEBAPP_PID" 2>/dev/null || true
  [ -n "$CF_API_PID" ]     && kill "$CF_API_PID" 2>/dev/null || true
  [ -n "$CF_WEBAPP_PID" ]  && kill "$CF_WEBAPP_PID" 2>/dev/null || true
  pkill -f "cloudflared tunnel" 2>/dev/null || true
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

# Cloudflare quick tunnel URL pattern (cloudflared writes to stderr)
get_cf_url_from_log() {
  local logfile=$1
  [ ! -f "$logfile" ] && return 1
  grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$logfile" 2>/dev/null | head -n 1
}

CLOUDFLARED="$ROOT/cloudflared"
ensure_cloudflared() {
  if [ -x "$CLOUDFLARED" ]; then
    return 0
  fi
  echo "      cloudflared topilmadi, yuklanmoqda..."
  if ! curl -sSf -L "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" -o "$CLOUDFLARED"; then
    echo "      ERROR: cloudflared yuklab bo'lmadi. Qo'lda o'rnating: $CLOUDFLARED"
    return 1
  fi
  chmod +x "$CLOUDFLARED"
  echo "      cloudflared o'rnatildi: $CLOUDFLARED"
}

echo "=============================================="
echo "  AVTO-PRO-SYSTEM — Full stack (Cloudflare Tunnel)"
echo "=============================================="
echo ""

echo "[1/7] Cleaning old processes (ports 3000, 3001, cloudflared)..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 2
echo "      Done."
echo ""

echo "[2/7] Starting Backend (NestJS, port 3000)..."
npm run start:dev >> "$API_LOG" 2>&1 &
BACKEND_PID=$!
echo "      PID: $BACKEND_PID  |  log: api.log"
echo ""

echo "[3/7] Starting WebApp (Next.js, port 3001)..."
cd "$ROOT/webapp"
npm run dev -- -p 3001 >> "$WEBAPP_LOG" 2>&1 &
WEBAPP_PID=$!
cd "$ROOT"
echo "      PID: $WEBAPP_PID  |  log: webapp.log"
echo ""

echo "[4/7] Waiting for port 3000 (Backend)..."
until wait_for_port 3000; do echo "      Waiting for 3000..."; sleep 1; done
echo "      Port 3000 is up."
echo ""

echo "[5/7] Waiting for port 3001 (WebApp)..."
until wait_for_port 3001; do echo "      Waiting for 3001..."; sleep 1; done
echo "      Port 3001 is up."
echo ""

echo "[6/7] Cloudflare Tunnel (cloudflared)..."
if ! ensure_cloudflared; then
  echo "      Tunnel skip qilindi."
else
  # Cloudflare writes URL to stderr; capture both stdout and stderr
  "$CLOUDFLARED" tunnel --url http://localhost:3000 > "$API_CF_LOG" 2>&1 &
  CF_API_PID=$!
  "$CLOUDFLARED" tunnel --url http://localhost:3001 > "$WEBAPP_CF_LOG" 2>&1 &
  CF_WEBAPP_PID=$!
  echo "      API tunnel PID: $CF_API_PID   |  log: api_cf.log"
  echo "      WebApp tunnel PID: $CF_WEBAPP_PID  |  log: webapp_cf.log"
  echo "      Waiting 10s for tunnels to register..."
  sleep 10
  echo ""

  API_URL=$(get_cf_url_from_log "$API_CF_LOG")
  WEBAPP_URL=$(get_cf_url_from_log "$WEBAPP_CF_LOG")
  if [ -z "$API_URL" ]; then
    echo "      WARNING: API URL aniqlanmadi. api_cf.log ni tekshiring."
  fi
  if [ -z "$WEBAPP_URL" ]; then
    echo "      WARNING: WebApp URL aniqlanmadi. webapp_cf.log ni tekshiring."
  fi
fi
echo ""

echo "[7/7] Updating env..."
if [ -n "$WEBAPP_URL" ]; then
  if grep -q '^WEBAPP_URL=' "$ROOT/.env" 2>/dev/null; then
    sed -i "s|^WEBAPP_URL=.*|WEBAPP_URL=$WEBAPP_URL|" "$ROOT/.env"
  else
    echo "WEBAPP_URL=$WEBAPP_URL" >> "$ROOT/.env"
  fi
  echo "      .env: WEBAPP_URL=$WEBAPP_URL"
fi
if [ -n "$API_URL" ]; then
  echo "NEXT_PUBLIC_API_URL=$API_URL" > "$ROOT/webapp/.env.local"
  echo "      webapp/.env.local: NEXT_PUBLIC_API_URL=$API_URL"
  echo "      Restarting WebApp to pick up new API URL..."
  [ -n "$WEBAPP_PID" ] && kill "$WEBAPP_PID" 2>/dev/null || true
  sleep 2
  cd "$ROOT/webapp"
  npm run dev -- -p 3001 >> "$WEBAPP_LOG" 2>&1 &
  WEBAPP_PID=$!
  cd "$ROOT"
  until wait_for_port 3001 15; do sleep 1; done
  echo "      WebApp restarted (PID: $WEBAPP_PID)"
fi
echo ""

echo "=============================================="
echo "  Cloudflare Tunnel URLs"
echo "=============================================="
echo "  WEBAPP_URL = ${WEBAPP_URL:-<not available>}"
echo "  API_URL    = ${API_URL:-<not available>}"
echo "=============================================="
if [ -z "$WEBAPP_URL" ] || [ -z "$API_URL" ]; then
  echo "  Agar URL chiqmasa: api_cf.log va webapp_cf.log ni tekshiring."
  echo "=============================================="
fi
echo "  Ishga tushdi. To'xtatish: Ctrl+C"
echo "=============================================="
echo ""

wait $BACKEND_PID
cleanup
