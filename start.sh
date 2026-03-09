#!/usr/bin/env bash
# ustabobo_bot — Backend (3000) + ERP (3001) ni birga ishga tushirish

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

BACKEND_PID=""
ERP_PID=""

cleanup() {
  echo ""
  echo "To'xtatilmoqda..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null || true
  [ -n "$ERP_PID" ]     && kill "$ERP_PID" 2>/dev/null || true
  fuser -k 3000/tcp 2>/dev/null || true
  fuser -k 3001/tcp 2>/dev/null || true
  exit 0
}
trap cleanup INT TERM

echo "=============================================="
echo "  ustabobo_bot — Backend + ERP"
echo "=============================================="
echo ""

# Eski processlarni tozalash
echo "[1/3] Portlar 3000, 3001 bo'shatilmoqda..."
fuser -k 3000/tcp 2>/dev/null || true
fuser -k 3001/tcp 2>/dev/null || true
sleep 1
echo "      Tayyor."
echo ""

# Backend (NestJS)
echo "[2/3] Backend ishga tushyapti (port 3000)..."
npm run start:dev &
BACKEND_PID=$!
echo "      PID: $BACKEND_PID"
echo ""

# ERP (Next.js)
echo "[3/3] ERP ishga tushyapti (port 3001)..."
cd "$ROOT/erp"
npm run dev &
ERP_PID=$!
cd "$ROOT"
echo "      PID: $ERP_PID"
echo ""

echo "=============================================="
echo "  Backend:  http://localhost:3000"
echo "  ERP:      http://localhost:3001"
echo "=============================================="
echo "  To'xtatish: Ctrl+C"
echo "=============================================="
echo ""

wait $BACKEND_PID 2>/dev/null || wait $ERP_PID 2>/dev/null || true
cleanup
