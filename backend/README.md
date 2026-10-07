# Backend application

Java 25 LTS + Spring Boot 4.1 modular monolith, PostgreSQL 18, Flyway. Design sources:
[architecture](../docs/backend-architecture.md), [API contract](../docs/api-contract.md),
[VPS plan](../docs/deployment-vps.md). [`docs/openapi.yaml`](docs/openapi.yaml) (OpenAPI 3.1, Redocly-lint clean)
describes every served operation; tests keep it honest (see "Contract tests").

## Status

| Slice | State |
| --- | --- |
| 1. Foundation + owner | **Done.** Flyway, problem+json, request IDs, clock, audit, DB rate limiter, Spring Security + Spring Session JDBC, CSRF, `bootstrap-owner`/`migrate` commands. Frontend Studio gate uses the Spring session (Next cookie gate removed). |
| 2. Editorial + SEO | **Done.** Categories, articles with immutable revisions, lifecycle state machine, private articles, series + chapters, slug registry/redirects, `If-Match`/`Idempotency-Key`, public and Studio APIs. Frontend renders articles/series server-side with canonical/OG/JSON-LD, 308 for old slugs, 404 for hidden, sitemap/robots. |
| 3. Theme + media | **Done (partly, see below).** Site settings, theme draft/apply/restore with UUID references, owner image upload (re-encoded, EXIF stripped), authorised `/media/{id}`, Pexels search+select adapter. |
| 4. Publishing | **Done.** 15 s scheduler with row locks, transactional outbox, leased worker with backoff, SMTP adapter, owner job list/retry, account-wide publication-mail preference. |
| 5. Membership | **Done.** Register/verify/resend, forgot/reset, login (e-mail or owner username), re-auth (5 min), profile/avatar/preferences, password change, e-mail change, Google sign-in/link/unlink/reauth, session list/revoke, account deletion (tombstone). |
| 6. Personal space | **Done.** Collections (immutable "Genel") and bookmarks, annotations anchored to stable block IDs with server-side quote verification, explicit guest-note import, automatic visit history + series history, per-article state. Two-member isolation, hidden articles as opaque records, account deletion clean-up. Frontend library, member notes, history (account page) and "last opened chapter" use the API. |
| 7. Reactions | **Done.** Anonymous (random cookie) and member claps as target state, deduplicated view events (card/permalink, per page view, event-ID retry safe, bot filter, rate limits), public totals on summaries/details/series, `/articles/{id}/stats`, owner per-article totals and member list. Frontend counters, clap and view events use the API; Studio `/studio/istatistikler`. |
| 8. Launch readiness | **Done (files + local checks), VPS not provisioned.** Backend/frontend Dockerfiles, `deploy/compose.prod.yml` (least-privilege DB roles, secrets as files, internal networks), Caddyfile (validated with Caddy 2.11), backup/restore jobs (pg_dump + restic), runbooks. Production readiness = DB readiness probe. |

## Modules

```text
com.satir.platform    clock, IDs, request ID, problem responses, preconditions, idempotency, audit, rate limit, keyed hash, slugs
com.satir.identity    accounts, sessions, membership, Google, security config, owner member list
com.satir.editorial   articles, revisions, categories, series, slugs, lifecycle, scheduler, publication mail, stats port
com.satir.site        site settings, theme workspace, public site projection, sitemap source
com.satir.media       uploads, storage, authorised access, cover provider
com.satir.delivery    outbox, worker, mail gateway, job admin
com.satir.library     collections, bookmarks, per-article state
com.satir.reading     annotations, guest import, visit history
com.satir.engagement  anonymous actors, claps, view receipts/totals, public + owner statistics
```

Each module has `api` / `application` / `domain` / `infrastructure`; `ArchitectureTest` (ArchUnit) enforces
no module cycles, platform independence, framework-free domains and no api→infrastructure access.
Dependencies point one way: `engagement → library → reading → editorial → media`; editorial owns the
`ArticleStatsSource` port that engagement implements. Account deletion publishes `AccountDeleted` inside the
deletion transaction; library, reading and engagement delete their personal data in that same transaction.

## Local development

```sh
docker compose -f deploy/compose.dev.yml up -d          # PostgreSQL 18 + Mailpit (http://localhost:8025)
cd backend
./mvnw verify                                           # unit + PostgreSQL (Testcontainers) + ArchUnit
./mvnw package -DskipTests
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar migrate          # needs SATIR_RATE_LIMIT_KEY, DB_* (dev defaults below)
java -jar target/satir-backend-0.1.0-SNAPSHOT.jar bootstrap-owner --email=... --username=... --name="..." [--password-file=...]
SPRING_PROFILES_ACTIVE=dev java -jar target/satir-backend-0.1.0-SNAPSHOT.jar   # http://localhost:8080
```

The `dev` profile migrates on start, uses the `satir-session-dev` non-Secure cookie, sends mail to Mailpit
and links to `http://localhost:3000`. Frontend: `cd frontend && npm run dev` (proxies `/api` to 8080).
Without Docker, point tests at a disposable PostgreSQL 18 with `SATIR_TEST_JDBC_URL`/`_USER`/`_PASSWORD`
(its tables are truncated by the tests). With neither, `./mvnw verify` fails on every integration class;
`./mvnw verify -Punit-only` explicitly runs only unit/ArchUnit tests — report such a run as partial.

The default (production) profile only validates the schema, requires `SATIR_RATE_LIMIT_KEY` (≥ 32 chars)
and uses the `__Host-satir-session` / `__Host-satir-actor` Secure cookies behind HTTPS. Secrets may come
from environment variables or from mounted files (`SPRING_CONFIG_IMPORT=optional:configtree:/run/secrets/`,
file name = variable name). All variables: `deploy/.env.example`; production: `deploy/runbooks/`.

## Implementation decisions (smallest safe option where the documents were silent)

- Owner is created only by `bootstrap-owner`; the operator's bootstrap counts as e-mail verification.
- Sessions store only the account UUID; role, verification and status are re-read on every request.
  Session lists expose an HMAC handle, never the cookie value.
- Repositories use `JdbcClient` (explicit SQL for jsonb, deferred constraints, row locks); JPA remains for
  the original identity entities. PostgreSQL-specific SQL stays in `infrastructure`.
- Additive API fields beyond the contract: `GET /articles?expand=document` (server rendering),
  `chapters` and `presentation` on series summaries, image blocks may use a trusted `staticPath`
  under `/assets/` (shipped site artwork), `POST /studio/cover-jobs/{id}/select` to store a chosen cover,
  `stats` on series summaries/details (sum of public chapters).
- Media uploads are processed synchronously (202 with state `ready`); only JPEG/PNG — the JDK has no WebP
  decoder, so WebP is refused until a vetted decoder is added.
- Cover search sends only the query the owner types (never article text). Automatic AUTO-mode cover
  selection is not implemented; AUTO currently means "no stored cover" and the frontend shows its local art.
- Account e-mails (verify/reset/e-mail change) are sent after commit, not through the outbox, because the
  outbox must not store secrets; a failed send is recovered with "resend". Publication mails use the outbox.
- Without SMTP configuration, publication mail jobs stay visible as `MAIL_NOT_CONFIGURED` retries.
- Making a published article private takes it off the site (draft/private) in one save from Studio.
- New series are always drafts and are published explicitly (Ü6); publishing a chapter never activates
  a series implicitly.
- Library limits (not in the contract): 100 collections and 1000 bookmarks per account (409
  `COLLECTION_LIMIT` / `LIBRARY_FULL`). The default "Genel" collection is created lazily on first use.
  Bookmark lists are filtered, searched, sorted and paged in memory over the account's (bounded) bookmarks so
  the library module never reads editorial tables; hidden articles never match a search.
- Annotation mark IDs are client UUIDs, unique per account (primary key `(user_id, id)`), so another
  member's ID is simply "not found". Quotes are verified against the anchored revision using UTF-16 offsets;
  `kind: note` needs a non-blank note. Delete of a missing mark is 404 (contract table), not 204.
- `POST /me/visits` stores only the newest time per article (`GREATEST`), so retries are harmless; the
  `eventId` is accepted but not stored. Visits older than 24 h are 422, future times are capped to now.
  Only real permalink openings are sent by the frontend (the side panel has no revision ID).
- Guest-note import stores its report under `(user, clientImportId)`; a retry returns the same report and a
  different body under the same ID is 409. Imported marks get new server IDs.
- Claps: a verified member claps as their account; everyone else (including signed-in unverified accounts)
  as the anonymous cookie identity, created on the first clap or `POST /engagement/session`.
  `GET /articles/{id}/my-clap` never creates an identity. Clap limit 30/min per actor.
- Views: actor key = member ID, anonymous actor ID or (without a cookie) the client address, always stored
  as an HMAC (`SATIR_RATE_LIMIT_KEY`) — no raw IP. Known automation user agents get `accepted:false`.
  Limits 120/min per actor and 600/min per client address. Receipts are kept 30 days, anonymous actors 180 days
  (expired actors and their claps are purged; totals drop accordingly).
- Owner statistics list every article (any status) with its totals; no per-reader, duration or device data.
- Production DB roles: `satir_migrator` (owner/DDL, used only by `migrate`), `satir_app` (DML via default
  privileges), `satir_backup` (`pg_read_all_data`). Verified locally: migrate as migrator, run as `satir_app`.

## Contract tests

- `ApiClient` checks every response an integration test receives against `docs/openapi.yaml` (operation,
  status, headers and body schema; undocumented properties fail). Requests are not checked because tests send
  invalid ones on purpose. A mismatch fails the test that caused it and prints the body.
- `OpenApiCoverageIntegrationTest` fails when an operation is served but not documented, or documented but not served.
- `OpenApiContractIntegrationTest` reaches success responses the behavioural tests do not. Not exercised:
  a successful `POST /studio/cover-jobs/{id}/select` (downloads only from images.pexels.com).
- Lint: `npx @redocly/cli lint docs/openapi.yaml` (no errors; remaining warnings are style-only).

## Not done / open

- Contract lint in CI (#14) and generated frontend client types (#23).
- Studio export/import (API contract §8 `/studio/exports`, `/studio/imports`) — not implemented.
- Badges and advanced analytics stay blocked on product decisions (Ü3); no reading-time or device data is collected.
- An operator command to reset the owner password; an off-site account-deletion journal for restores.
- CI pipeline itself (build/test/scan/sign/push) and image digest pinning are described in
  `deploy/runbooks/first-deploy.md` but not automated. Both images build and run locally (`deploy/compose.local.yml`);
  the production compose file passes `docker compose config` but has not run on a VPS.
- Audit/session retention reports; retention jobs exist for rate buckets, idempotency, tokens, outbox,
  impression receipts, anonymous actors and visit history.
