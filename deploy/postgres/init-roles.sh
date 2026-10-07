#!/bin/sh
# Runs once, on the first start of an empty data volume (docker-entrypoint-initdb.d).
# Least-privilege roles (deployment-vps.md §3):
#   satir_migrator  owns the database/schema; used only by the one-shot `migrate` job (DDL)
#   satir_app       runtime role: DML on the application's tables, no DDL, not a superuser
#   satir_backup    read-only role for pg_dump
# Passwords are read inside psql from the mounted secret files, so they never appear in argv/env.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<'SQL'
\set migrator_password `cat /run/secrets/db_migration_password`
\set app_password `cat /run/secrets/db_app_password`
\set backup_password `cat /run/secrets/db_backup_password`

CREATE ROLE satir_migrator LOGIN PASSWORD :'migrator_password';
CREATE ROLE satir_app LOGIN PASSWORD :'app_password';
CREATE ROLE satir_backup LOGIN PASSWORD :'backup_password';

ALTER DATABASE :"DBNAME" OWNER TO satir_migrator;
ALTER SCHEMA public OWNER TO satir_migrator;
REVOKE ALL ON DATABASE :"DBNAME" FROM PUBLIC;
GRANT CONNECT ON DATABASE :"DBNAME" TO satir_app, satir_backup;
GRANT USAGE ON SCHEMA public TO satir_app, satir_backup;

-- Every table/sequence Flyway creates (as satir_migrator) is usable by the runtime role.
ALTER DEFAULT PRIVILEGES FOR ROLE satir_migrator IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE, TRUNCATE ON TABLES TO satir_app;
ALTER DEFAULT PRIVILEGES FOR ROLE satir_migrator IN SCHEMA public
    GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO satir_app;
GRANT pg_read_all_data TO satir_backup;
SQL
