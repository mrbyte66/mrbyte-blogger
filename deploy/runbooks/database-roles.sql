-- Run in an interactive psql terminal; password prompts do not echo.
CREATE ROLE satir_migrate LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
CREATE ROLE satir_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
\password satir_migrate
\password satir_runtime
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE, CREATE ON SCHEMA public TO satir_migrate;
GRANT USAGE ON SCHEMA public TO satir_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE satir_migrate IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO satir_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE satir_migrate IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO satir_runtime;
-- After migration, restrict Flyway history to read-only runtime access.
-- Run database-runtime-grants.sql after migration (the history table does not exist beforehand).
