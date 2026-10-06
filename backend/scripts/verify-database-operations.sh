#!/usr/bin/env bash
set -euo pipefail
# Disposable role separation and pg_dump/restore drill. Never targets an existing database.
postgres_bin="${POSTGRES_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
identifier="$(date +%s)_$RANDOM"
database="satir_test_ops_$identifier"
restored="satir_test_restore_$identifier"
migration_role="satir_test_migrate_$identifier"
runtime_role="satir_test_runtime_$identifier"
admin="$(id -un)"
temporary="$(mktemp -d)"
cleanup() {
  "$postgres_bin/dropdb" -h 127.0.0.1 -U "$admin" --if-exists "$restored"
  "$postgres_bin/dropdb" -h 127.0.0.1 -U "$admin" --if-exists "$database"
  "$postgres_bin/psql" -X -h 127.0.0.1 -U "$admin" postgres -v ON_ERROR_STOP=1 -q -c "DROP ROLE IF EXISTS $runtime_role; DROP ROLE IF EXISTS $migration_role;"
  rm -rf "$temporary"
}
trap cleanup EXIT
"$postgres_bin/createdb" -h 127.0.0.1 -U "$admin" "$database"
"$postgres_bin/psql" -X -h 127.0.0.1 -U "$admin" "$database" -v ON_ERROR_STOP=1 -q <<SQL
CREATE ROLE $migration_role LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE $runtime_role LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE,CREATE ON SCHEMA public TO $migration_role;
GRANT USAGE ON SCHEMA public TO $runtime_role;
ALTER DEFAULT PRIVILEGES FOR ROLE $migration_role IN SCHEMA public GRANT SELECT,INSERT,UPDATE,DELETE ON TABLES TO $runtime_role;
ALTER DEFAULT PRIVILEGES FOR ROLE $migration_role IN SCHEMA public GRANT USAGE,SELECT ON SEQUENCES TO $runtime_role;
SQL
repository="$(cd "$(dirname "$0")/../.." && pwd)"
DB_URL="jdbc:postgresql://127.0.0.1:5432/$database" DB_USER="$migration_role" DB_PASSWORD=disposable_test_only "$JAVA_HOME/bin/java" -Dloader.main=com.satir.platform.MigrationCommand -cp "$repository/backend/target/satir-backend-0.1.0-SNAPSHOT.jar" org.springframework.boot.loader.launch.PropertiesLauncher
"$postgres_bin/psql" -X -h 127.0.0.1 -U "$admin" "$database" -v ON_ERROR_STOP=1 -q -c "REVOKE INSERT,UPDATE,DELETE ON flyway_schema_history FROM $runtime_role;"
"$postgres_bin/psql" -X -h 127.0.0.1 -U "$runtime_role" "$database" -v ON_ERROR_STOP=1 -q <<'SQL'
INSERT INTO category(id,slug,name,version) VALUES('11111111-1111-1111-1111-111111111111','restore-proof','Restore proof',0);
SELECT count(*) FROM public_article_catalog;
SELECT count(*) FROM flyway_schema_history;
SQL
if "$postgres_bin/psql" -X -h 127.0.0.1 -U "$runtime_role" "$database" -v ON_ERROR_STOP=1 -q -c 'CREATE TABLE must_not_exist(id int)' > "$temporary/denial.log" 2>&1; then
  echo 'FAIL: runtime role could create a table' >&2; exit 1
fi
if "$postgres_bin/psql" -X -h 127.0.0.1 -U "$runtime_role" "$database" -v ON_ERROR_STOP=1 -q -c 'DELETE FROM flyway_schema_history' > "$temporary/denial.log" 2>&1; then
  echo 'FAIL: runtime role could change Flyway history' >&2; exit 1
fi
"$postgres_bin/pg_dump" -h 127.0.0.1 -U "$admin" -Fc --no-owner --no-acl -f "$temporary/backup.dump" "$database"
"$postgres_bin/createdb" -h 127.0.0.1 -U "$admin" "$restored"
"$postgres_bin/pg_restore" -h 127.0.0.1 -U "$admin" --no-owner --no-acl --exit-on-error -d "$restored" "$temporary/backup.dump"
count="$("$postgres_bin/psql" -X -h 127.0.0.1 -U "$admin" "$restored" -At -c "SELECT count(*) FROM category WHERE slug='restore-proof';")"
[[ "$count" == 1 ]]
DB_URL="jdbc:postgresql://127.0.0.1:5432/$restored" DB_USER="$admin" DB_PASSWORD=disposable_test_only "$JAVA_HOME/bin/java" -Dloader.main=com.satir.platform.MigrationCommand -cp "$repository/backend/target/satir-backend-0.1.0-SNAPSHOT.jar" org.springframework.boot.loader.launch.PropertiesLauncher
echo 'PASS: clean migration, DML-only runtime, protected Flyway history, isolated backup restore and checksum validation'
