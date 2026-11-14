#!/usr/bin/env bash
set -euo pipefail
command -v psql >/dev/null || { echo 'Install postgresql-client first.' >&2; exit 1; }
# Use PGHOST/PGPORT/PGDATABASE/PGUSER and ~/.pgpass; never commit credentials.
: "${PGDATABASE:?Set PGDATABASE to an isolated test database first}"
root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# A single session keeps the advisory lock while migrations are checked/applied.
{
  printf '%s\n' '\set ON_ERROR_STOP on' "SELECT pg_advisory_lock(824113950);" 'CREATE SCHEMA IF NOT EXISTS platform_migrations;' 'CREATE TABLE IF NOT EXISTS platform_migrations.history (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now());'
  for file in "$root"/migrations/*.sql; do
    name="$(basename "$file")"
    [[ "$name" =~ ^[0-9]+_[a-z0-9_]+\.sql$ ]] || { echo 'Invalid migration filename' >&2; exit 1; }
    checksum="$(sha256sum "$file" | cut -d ' ' -f1)"
    printf "SELECT EXISTS(SELECT 1 FROM platform_migrations.history WHERE name='%s' AND checksum <> '%s') AS changed \\gset\n" "$name" "$checksum"
    printf '%s\n' '\if :changed' "DO \$\$ BEGIN RAISE EXCEPTION 'Applied migration checksum changed'; END \$\$;" '\endif'
    printf "SELECT NOT EXISTS(SELECT 1 FROM platform_migrations.history WHERE name='%s') AS pending \\gset\n" "$name"
    printf '%s\n' '\if :pending' 'BEGIN;'
    cat "$file"
    printf "\nINSERT INTO platform_migrations.history(name,checksum) VALUES ('%s','%s');\n" "$name" "$checksum"
    printf '%s\n' 'COMMIT;' '\endif'
  done
} | psql -X --no-password
