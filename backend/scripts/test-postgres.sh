#!/usr/bin/env bash
set -euo pipefail
# Disposable cluster only; never connects to a user's existing PostgreSQL database.
postgres_bin="${POSTGRES_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
command -v "$postgres_bin/initdb" >/dev/null
cluster=$(mktemp -d "${TMPDIR:-/tmp}/satir-pg.XXXXXX")
port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
cleanup() { "$postgres_bin/pg_ctl" -D "$cluster/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$cluster"; }
trap cleanup EXIT
"$postgres_bin/initdb" -D "$cluster/data" -U satir_test --auth-local=trust --auth-host=trust >/dev/null
"$postgres_bin/pg_ctl" -D "$cluster/data" -l "$cluster/server.log" -o "-h 127.0.0.1 -k $cluster -p $port" -w start >/dev/null
"$postgres_bin/createdb" -h 127.0.0.1 -p "$port" -U satir_test satir_test
export SATIR_TEST_DB_URL="jdbc:postgresql://127.0.0.1:$port/satir_test"
export SATIR_TEST_DB_USER=satir_test
export SATIR_TEST_DB_PASSWORD=disposable_test_only
cd "$(dirname "$0")/.."
./mvnw verify "$@"
