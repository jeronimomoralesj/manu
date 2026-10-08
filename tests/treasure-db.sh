#!/usr/bin/env bash
set -euo pipefail
# Dependencies and database are local/disposable. Never uses application .env,
# DATABASE_URL, Supabase credentials, or a remote database.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ -z "${TREASURE_DB_RUNTIME:-}" ]]; then
  TREASURE_DB_RUNTIME="$(mktemp -d "${TMPDIR:-/tmp}/manu-treasure-runtime-XXXXXX")"
  export TREASURE_DB_RUNTIME
  trap 'rm -rf -- "$TREASURE_DB_RUNTIME"' EXIT
  npm install --prefix "$TREASURE_DB_RUNTIME" --cache "$TREASURE_DB_RUNTIME/cache" \
    --no-audit --no-fund --loglevel=error embedded-postgres@18.4.0-beta.17 pg@8.20.0
fi
node --test "$ROOT/tests/treasure-db.test.mjs"
