#!/bin/sh
set -e

echo "========================================"
echo "Starting Application..."
echo "========================================"
echo ""
echo "Environment Configuration:"
echo "   - NODE_ENV: ${NODE_ENV:-not set}"
echo "   - PORT: ${PORT:-4001}"
echo "   - HOST: ${HOST:-0.0.0.0}"
if [ -n "$DATABASE_URL" ]; then
  echo "   - DATABASE_URL: Set"
else
  echo "   - DATABASE_URL: Not set"
fi
if [ -n "$REDIS_URL" ]; then
  echo "   - REDIS_URL: Set"
else
  echo "   - REDIS_URL: Not set"
fi
echo ""

# NOTE: Migrations should be run manually or via CI/CD, not on every container start
# npx prisma migrate deploy

echo "========================================"
echo "Starting Node.js application on port ${PORT:-4001}..."
echo "========================================"

exec node dist/src/main.js