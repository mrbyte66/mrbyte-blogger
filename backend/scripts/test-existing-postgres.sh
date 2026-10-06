#!/usr/bin/env bash
set -euo pipefail
# Creates and removes ONLY a randomly named disposable database on the local server.
postgres_bin="${POSTGRES_BIN:-/opt/homebrew/opt/postgresql@16/bin}"
database="satir_test_$(date +%s)_$RANDOM"
user="$(id -un)"
"$postgres_bin/createdb" -h 127.0.0.1 -U "$user" "$database"
cleanup() { "$postgres_bin/dropdb" -h 127.0.0.1 -U "$user" --if-exists "$database"; }
trap cleanup EXIT
export SATIR_TEST_DB_URL="jdbc:postgresql://127.0.0.1:5432/$database"
export SATIR_TEST_DB_USER="$user"
export SATIR_TEST_DB_PASSWORD=disposable_test_only
cd "$(dirname "$0")/.."
./mvnw verify "$@"
