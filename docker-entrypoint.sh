#!/bin/sh
set -e

cd /app/apps/web
node ./scripts/migrate.mjs
exec node ./dist/server/entry.mjs
