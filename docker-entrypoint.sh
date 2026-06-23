#!/bin/sh
set -e

# When a database is configured, ensure the schema exists (idempotent).
if [ -n "$DATABASE_URL" ]; then
  echo "→ Syncing database schema (prisma db push)…"
  npx prisma db push --skip-generate
else
  echo "→ DATABASE_URL not set — starting in sample-data mode."
fi

echo "→ Starting dashboard on port ${PORT:-3000}…"
exec npm run start
