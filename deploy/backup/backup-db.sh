#!/bin/sh
# Local backup set (deployment-vps.md §7): consistent PostgreSQL custom-format dump, a SHA-256
# manifest of the private media volume and the release identity. The set is written to a temporary
# directory and only renamed to /backups/current when complete. The `offsite` job then copies it,
# encrypted, to the off-site restic repository; a backup on the same disk is not a disaster backup.
set -eu

stamp=$(date -u +%Y%m%dT%H%M%SZ)
work="/backups/.incomplete-$stamp"
mkdir -p "$work"
trap 'rm -rf "$work"' EXIT

# Password from the mounted secret, via a private pgpass file (never argv/env).
umask 077
printf '%s:%s:%s:%s:%s\n' "$PGHOST" 5432 "$PGDATABASE" "$PGUSER" "$(cat /run/secrets/db_backup_password)" > /tmp/.pgpass
export PGPASSFILE=/tmp/.pgpass

pg_dump --format=custom --no-owner --no-privileges --file="$work/satir.dump"
pg_restore --list "$work/satir.dump" > /dev/null   # the dump must be readable

( cd /media && find . -type f -print0 | sort -z | xargs -0 -r sha256sum ) > "$work/media.sha256"
{
  echo "created_at=$stamp"
  echo "release=${APP_RELEASE:-unknown}"
  echo "postgres=$(pg_dump --version)"
  echo "migration=$(psql --tuples-only --no-align -c "SELECT max(version) FROM flyway_schema_history WHERE success")"
  echo "dump_sha256=$(sha256sum "$work/satir.dump" | cut -d' ' -f1)"
} > "$work/manifest.txt"
rm -f /tmp/.pgpass

trap - EXIT
rm -rf /backups/previous
[ -d /backups/current ] && mv /backups/current /backups/previous
mv "$work" /backups/current
echo "backup set complete: $stamp"
