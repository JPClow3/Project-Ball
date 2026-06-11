#!/bin/sh
set -e

if [ "$NODE_ENV" = "production" ] && [ "$POSTGRES_PASSWORD" = "projectball" ]; then
  echo "ERROR: Refusing to start in production with default POSTGRES_PASSWORD."
  exit 1
fi

cd /app/apps/web
node ./scripts/cron.mjs &
exec node ./dist/server/entry.mjs
