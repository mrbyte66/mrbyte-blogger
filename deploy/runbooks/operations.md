# Repeatable local/VPS operations

Do not launch as finished V1 until `docs/backend-implementation.md` release gates pass.
Use Java25, PostgreSQL18 and the dependency versions in the lockfiles. No Docker
runtime exists in the current development environment: production Compose is
**not runtime-verified**. The PostgreSQL16 fallback is explicitly a test substitute.

## Local

Use deploy/.env.example for local Compose and deploy/.env.prod.example for the VPS release; copy actual files outside Git; generate separate database/HMAC/encryption secrets. Start
`docker compose --env-file deploy/.env -f deploy/compose.dev.yml up -d`, export the
backend variables via a secret manager, then run the separate migration process:

```
cd backend
./mvnw verify
./mvnw package
java -Dloader.main=com.satir.platform.MigrationCommand -cp target/satir-backend-0.1.0-SNAPSHOT.jar org.springframework.boot.loader.launch.PropertiesLauncher
java -Dloader.main=com.satir.identity.OwnerBootstrap -cp target/satir-backend-0.1.0-SNAPSHOT.jar org.springframework.boot.loader.launch.PropertiesLauncher
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar
```

Bootstrap requires an interactive TTY, creates a single operator-verified owner,
and never overwrites users. Start Next from `frontend/` with `npm ci; npm run dev`.
`BACKEND_INTERNAL_URL` selects the fixed backend URL. Use dev cookie settings only
on local HTTP. Mailpit receives actual development SMTP; no provider means 503 for
registration/recovery. Do not copy prototype browser accounts or owner credentials.

## VPS prerequisites and first start

Canonical host/DNS and explicit alias, pinned image digests and an offsite backup
repository must be operator choices. Build images in CI, not on the small VPS:
backend build args `JAVA_BUILD_IMAGE`, `JAVA_RUNTIME_IMAGE`; frontend
`NODE_BUILD_IMAGE`, `NODE_RUNTIME_IMAGE` (each includes a verified digest).

Place release config at `/etc/satir/release.env`. Secret files under
`SECRETS_DIR`: db-admin-password, db-migration-password, db-runtime-password,
rate-hmac, token-key, smtp-password, google-secret, pexels-key. Optional provider secret files
may be empty only when disabled: empty Google client ID / SMTP host or COVER_PROVIDER=none. Use an
AES256 key (base64 of 32 random bytes) and a separate at least32-character HMAC key.
Mounts must be readable by UID10001 without becoming world-readable; use an
operator-controlled group/directory. Nothing belongs in NEXT_PUBLIC variables.

```
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml config --quiet
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml pull
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml up -d postgres
```

Connect using interactive `psql` as satir_admin, execute `database-roles.sql`, set
migration/runtime passwords matching their secret mounts. Default grants belong
to the migration role; restrict Flyway history to SELECT for runtime after migrate.
Admin is never the application's DB user. Application sees no database admin secret.

```
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml run --rm media-init
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml run --rm migrate
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml run --rm bootstrap
docker compose --env-file /etc/satir/release.env -f deploy/compose.prod.yml up -d backend frontend proxy
```

Backend startup validates migrations, never mutates schema. HTTP3000/8080 and DB5432
have no host ports. Only Caddy80/443 are published. Trusted forwarding accepts
only Caddy172.29.10.2; Caddy strips client Forwarded and rebuilds X-Forwarded headers.
Subnet collision is an operator check; change both subnet and trusted proxy regex.
Next health calls public API internally; actuator remains internal. Media volume
is private and serves through authorization on **every** request, including Range.

Check HTTPS/session/CSRF/owner-versus-member/private URL/media status/canonical/alias
and logs without credentials. Google callback is `/api/v1/auth/google/callback`;
SPF/DKIM/DMARC and actual TLS mail transport must pass. Both deployment INDEXING_ENABLED
and Studio site indexing must be enabled after SEO checks. Robots alone is never
an access-control boundary. CSP currently restricts ancestors/object/base, with
script nonce enforcement still a release gate, not falsely claimed complete.

## Backup, restore and rollback

Schedule daily encrypted **offsite** backups; no backup vendor or recurring job is
silently provisioned here. The operator chooses the repository and alarm channel.
For a consistent DB/media set, briefly stop backend (writes/workers) and frontend/
proxy or serve maintenance, then use a trusted PostgreSQL18 client with a secret
`PGPASSFILE` to create `pg_dump -Fc`. Snapshot media with SHA256 manifest in the same
window. Include release digests, Flyway version, schema roles (no passwords), and
account_deletion_journal. Encrypt/upload with a configured tool such as restic;
verify repository access and checksums before resuming traffic. Keep encryption
recovery material separately. Same-disk dumps alone are not disaster backups.

Restore into an **isolated empty** DB/media volume, indexing disabled and outbound
mail/workers disabled (`SATIR_WORKERS_ENABLED=false`). Use `pg_restore --exit-on-error`,
restore/check media hashes and release manifest. Reconcile post-backup deletion
journal. Invalidate restored Spring sessions and all action tokens; quarantine
outbox sends before enabling workers. Verify private content/media redaction,
member isolation, migration validation, signup/reset and publishing before DNS switch.
Restoring cannot retract already delivered mail. Target RPO24h/RTO4h remains a target
until a measured restore drill passes.

Before a new release take a consistent backup and record current digests. Run
migrate once, start new images, wait readiness and run acceptance. If migration
fails stop rollout. Roll back to old **digest** only when its schema compatibility
is documented; no automatic down migrations. For incompatible changes use forward
repair or an operator-approved restore acknowledging data loss since the snapshot.
Do not edit Flyway history. CI/backup automation and a tested restore remain release
requirements; these instructions do not pretend a successful production deployment.

## Verification and legacy transfer

`backend/scripts/verify-database-operations.sh` creates its own temporary databases/roles, applies all migrations with the migration role, confirms runtime DML and denied DDL/history mutation, dumps/restores to a separate database and checks Flyway checksums. It removes only its test resources. Requires PostgreSQL tools matching the server major, a local administrative test role and JAVA_HOME25. This is a DB restore drill; production offsite encryption, media-volume consistency, TLS and timed disaster recovery still require a VPS exercise.

After initial migration execute database-runtime-grants.sql using the administrator. Startup must use the runtime credential; do not leave the migration credential in the web service.

Legacy browser content is never loaded automatically. Export the explicit mrbyte:content:v2 and mrbyte:builder:v1 JSON records into local files, then run:

```sh
python3 backend/scripts/convert-legacy-content.py --content content.json --theme workspace.json --output migrated-content.zip
```

Only authored articles are selected by default; --include-demo explicitly opts in to fixtures. Series keep the relative chapter order of selected articles; absent featured bindings become null. Original createdAt is retained as provenance, not overwritten into new server creation time. Missing dates require explicit correction before conversion. Supply --media-map with a src-to-local-PNG mapping for images; prepare licensed PNGs yourself, no remote URL is fetched and SVG is rejected. The converter does not replace the server validator. Upload through Studio tools, review dry-run counts/conflicts, reauthenticate and explicitly commit. Imports never overwrite reserved slugs, publish content or apply a theme. Archive access expires at24h; the6h retention cycle removes expired files afterward.
