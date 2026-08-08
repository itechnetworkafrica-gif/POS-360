#!/bin/sh
# Production startup: run migrations then start the server.
# Migrations are idempotent (journal-tracked) so this is safe on every restart.
set -e
pnpm --filter @workspace/db run migrate
exec node --enable-source-maps artifacts/api-server/dist/index.mjs
