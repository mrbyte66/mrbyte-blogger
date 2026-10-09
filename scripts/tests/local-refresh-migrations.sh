#!/usr/bin/env bash
# Tests the migration guard of scripts/local-refresh against a throwaway git repository (no Docker needed).
#   bash scripts/tests/local-refresh-migrations.sh
set -euo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT
failures=0
pass() { printf 'ok   %s\n' "$1"; }
fail() { printf 'FAIL %s\n' "$1"; failures=$((failures + 1)); }

# Repository: main with V1/V2, a PR without new migrations, one adding V3, one editing V2.
export SATIR_REPO="$WORK/repo"
dir=backend/src/main/resources/db/migration
git init --quiet "$SATIR_REPO"
cd "$SATIR_REPO"
git config user.email test@example.com; git config user.name test
mkdir -p "$dir" frontend
echo "create table a();" > "$dir/V1__a.sql"; echo "create table b();" > "$dir/V2__b.sql"
git add -A; git commit --quiet -m main; main=$(git rev-parse HEAD)
echo "ui" > frontend/page.tsx; git add -A; git commit --quiet -m ui; plain=$(git rev-parse HEAD)
git checkout --quiet "$main"; echo "create table c();" > "$dir/V3__c.sql"; git add -A; git commit --quiet -m v3; added=$(git rev-parse HEAD)
git checkout --quiet "$main"; echo "create table b(x int);" > "$dir/V2__b.sql"; git add -A; git commit --quiet -m edit; edited=$(git rev-parse HEAD)
cd "$WORK"

# shellcheck source=../local-refresh
source "$HERE/../local-refresh"
set +e

[ -z "$(pending_migrations "$main" "$plain")" ] && pass "no migration change → nothing pending" || fail "no migration change → nothing pending"
[ "$(pending_migrations "$main" "$added")" = "$dir/V3__c.sql" ] && pass "new migration detected" || fail "new migration detected"
[ "$(pending_migrations "$main" "$edited")" = "$dir/V2__b.sql" ] && pass "edited migration detected" || fail "edited migration detected"

out=$(confirm_migrations "" 0 2>&1 </dev/null); code=$?
[ $code -eq 0 ] && [ -z "$out" ] && pass "no migrations → no prompt, continues" || fail "no migrations → no prompt, continues"

list="$dir/V3__c.sql"
out=$(confirm_migrations "$list" 0 2>&1 </dev/null); code=$?
[ $code -ne 0 ] && grep -q "V3__c.sql" <<<"$out" && grep -q "pg_restore" <<<"$out" && grep -q -- "--migration-onay" <<<"$out" \
  && pass "non-interactive without consent stops, explains rollback" || fail "non-interactive without consent stops, explains rollback"

out=$(confirm_migrations "$list" 1 2>&1 </dev/null); code=$?
[ $code -eq 0 ] && grep -q "migration-onay" <<<"$out" && pass "--migration-onay continues" || fail "--migration-onay continues"

export LOCAL_REFRESH_INTERACTIVE=1
for answer in "" h n; do
  out=$(printf '%s\n' "$answer" | confirm_migrations "$list" 0 2>&1); code=$?
  [ $code -ne 0 ] && grep -q "Vazgeçildi" <<<"$out" && pass "answer '$answer' declines" || fail "answer '$answer' declines"
done
printf 'e\n' | confirm_migrations "$list" 0 >/dev/null 2>&1 && pass "answer 'e' continues without backup" || fail "answer 'e' continues without backup"

# 'y' takes a backup through docker; a stub records the call and writes the dump.
mkdir -p "$WORK/bin"; printf '#!/bin/sh\necho "$@" > "%s/docker-args"; echo DUMP\n' "$WORK" > "$WORK/bin/docker"; chmod +x "$WORK/bin/docker"
out=$(printf 'y\n' | HOME="$WORK" PATH="$WORK/bin:$PATH" confirm_migrations "$list" 0 2>&1); code=$?
dump=$(ls "$WORK"/satir-local-yedek-*.dump 2>/dev/null | head -n 1)
[ $code -eq 0 ] && [ -n "$dump" ] && grep -q DUMP "$dump" && grep -q "pg_dump" "$WORK/docker-args" && pass "answer 'y' backs up then continues" || fail "answer 'y' backs up then continues"

printf '#!/bin/sh\nexit 1\n' > "$WORK/bin/docker"; rm -f "$WORK"/satir-local-yedek-*.dump
out=$(printf 'y\n' | HOME="$WORK" PATH="$WORK/bin:$PATH" confirm_migrations "$list" 0 2>&1); code=$?
[ $code -ne 0 ] && ! ls "$WORK"/satir-local-yedek-*.dump >/dev/null 2>&1 && pass "failed backup stops and leaves no file" || fail "failed backup stops and leaves no file"

[ "$failures" -eq 0 ] || { echo "$failures test failed"; exit 1; }
echo "all passed"
