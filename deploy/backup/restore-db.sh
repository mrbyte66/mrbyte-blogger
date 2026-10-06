#!/bin/sh
# Restores a backup set (restored by restic into /restore) into an EMPTY database and media volume.
# Refuses to touch a database that already has the application schema: never a blind overwrite.
set -eu

set_dir=/restore/backups/current
[ -f "$set_dir/satir.dump" ] || { echo "no backup set at $set_dir" >&2; exit 2; }

umask 077
printf '%s:%s:%s:%s:%s\n' "$PGHOST" 5432 "$PGDATABASE" "$PGUSER" "$(cat /run/secrets/db_migration_password)" > /tmp/.pgpass
export PGPASSFILE=/tmp/.pgpass
trap 'rm -f /tmp/.pgpass' EXIT

if [ "$(psql --tuples-only --no-align -c "SELECT to_regclass('public.flyway_schema_history') IS NOT NULL")" = "t" ]; then
  echo "database already contains the application schema; restore only into an empty database" >&2
  exit 3
fi
if [ -n "$(ls -A /media 2>/dev/null)" ]; then
  echo "media volume is not empty; restore only into an empty volume" >&2
  exit 3
fi

expected=$(sed -n 's/^dump_sha256=//p' "$set_dir/manifest.txt")
actual=$(sha256sum "$set_dir/satir.dump" | cut -d' ' -f1)
[ "$expected" = "$actual" ] || { echo "dump checksum mismatch" >&2; exit 4; }

pg_restore --exit-on-error --no-owner --no-privileges --dbname="$PGDATABASE" "$set_dir/satir.dump"

cp -a /restore/media/. /media/
( cd /media && sha256sum -c --quiet "$set_dir/media.sha256" )
echo "restore complete: $(sed -n 's/^created_at=//p' "$set_dir/manifest.txt")"
