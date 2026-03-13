#!/usr/bin/env bash
# Set Redis maxmemory-policy to noeviction (recommended for BullMQ).
# Run once per Redis instance to remove the BullMQ eviction warning.
#
# Usage:
#   ./scripts/redis-set-noeviction.sh
#   REDIS_URL=redis://localhost:6379 ./scripts/redis-set-noeviction.sh
#   REDIS_HOST=myredis.com REDIS_PORT=6379 REDIS_PASSWORD=secret ./scripts/redis-set-noeviction.sh
#
# See RUN.md for details.

set -e

if command -v redis-cli >/dev/null 2>&1; then
  CMD="redis-cli"
else
  echo "redis-cli not found. Install redis-tools (apt install redis-tools) or run the command manually on your Redis server."
  echo "Command to run: CONFIG SET maxmemory-policy noeviction"
  exit 1
fi

ARGS=()
if [ -n "${REDIS_URL}" ]; then
  ARGS+=(-u "${REDIS_URL}")
elif [ -n "${REDIS_HOST}" ]; then
  ARGS+=(-h "${REDIS_HOST}" -p "${REDIS_PORT:-6379}")
  if [ -n "${REDIS_PASSWORD}" ]; then
    ARGS+=(-a "${REDIS_PASSWORD}")
  fi
fi

"$CMD" "${ARGS[@]}" CONFIG SET maxmemory-policy noeviction
echo "Redis: maxmemory-policy set to noeviction."
