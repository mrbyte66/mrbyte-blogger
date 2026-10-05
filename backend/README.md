# Backend application

Java 25 LTS + Spring Boot 4.1 modular monolith, PostgreSQL 18, Flyway. Design sources:
[architecture](../docs/backend-architecture.md), [API contract](../docs/api-contract.md),
[VPS plan](../docs/deployment-vps.md). [`docs/openapi.yaml`](docs/openapi.yaml) currently covers only
the slice-1 auth endpoints (see "Not done").

## Status

| Slice | State |
| --- | --- |
| 1. Foundation + owner | **Done.** Flyway, problem+json, request IDs, clock, audit, DB rate limiter, Spring Security + Spring Session JDBC, CSRF, `bootstrap-owner`/`migrate` commands. Frontend Studio gate uses the Spring session (Next cookie gate removed). |
| 2. Editorial + SEO | **Done.** Categories, articles with immutable revisions, lifecycle state machine, private articles, series + chapters, slug registry/redirects, `If-Match`/`Idempotency-Key`, public and Studio APIs. Frontend renders articles/series server-side with canonical/OG/JSON-LD, 308 for old slugs, 404 for hidden, sitemap/robots. |
| 3. Theme + media | **Done (partly, see below).** Site settings, theme draft/apply/restore with UUID references, owner image upload (re-encoded, EXIF stripped), authorised `/media/{id}`, Pexels search+select adapter. |
| 4. Publishing | **Done.** 15 s scheduler with row locks, transactional outbox, leased worker with backoff, SMTP adapter, owner job list/retry, account-wide publication-mail preference. |
| 5. Membership | **Done.** Register/verify/resend, forgot/reset, login (e-mail or owner username), re-auth (5 min), profile/avatar/preferences, password change, e-mail change, Google sign-in/link/unlink/reauth, session list/revoke, account deletion (tombstone). |
| 6–8 | Not started (personal library/notes/history on the server, claps/views, launch hardening). The frontend library, notes, claps and views are still browser-local. |

## Modules

```text
com.satir.platform   clock, IDs, request ID, problem responses, preconditions, idempotency, audit, rate limit, slugs
com.satir.identity   accounts, sessions, membership, Google, security config
com.satir.editorial  articles, revisions, categories, series, slugs, lifecycle, scheduler, publication mail
com.satir.site       site settings, theme workspace, public site projection, sitemap source
com.satir.media      uploads, storage, authorised access, cover provider
com.satir.delivery   outbox, worker, mail gateway, job admin
```

Each module has `api` / `application` / `domain` / `infrastructure`; `ArchitectureTest` (ArchUnit) enforces
no module cycles, platform independence, framework-free domains and no api→infrastructure access.

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
Without Docker, point tests at a disposable PostgreSQL 18 with `SATIR_TEST_JDBC_URL`/`_USER`/`_PASSWORD`.

The default (production) profile only validates the schema, requires `SATIR_RATE_LIMIT_KEY` (≥ 32 chars)
and uses the `__Host-satir-session` Secure cookie behind HTTPS. All variables: `deploy/.env.example`.

## Implementation decisions (smallest safe option where the documents were silent)

- Owner is created only by `bootstrap-owner`; the operator's bootstrap counts as e-mail verification.
- Sessions store only the account UUID; role, verification and status are re-read on every request.
  Session lists expose an HMAC handle, never the cookie value.
- Repositories use `JdbcClient` (explicit SQL for jsonb, deferred constraints, row locks); JPA remains for
  the original identity entities. PostgreSQL-specific SQL stays in `infrastructure`.
- Additive API fields beyond the contract: `GET /articles?expand=document` (server rendering),
  `chapters` and `presentation` on series summaries, image blocks may use a trusted `staticPath`
  under `/assets/` (shipped site artwork), `POST /studio/cover-jobs/{id}/select` to store a chosen cover.
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

## Not done / open

- OpenAPI 3.1 for slices 2–5, contract lint and generated client types.
- Slices 6–8; badges and advanced analytics stay blocked on product decisions (Ü3).
- Production Dockerfiles, `compose.prod.yml`, Caddyfile, backup/restore runbooks.
- Retention jobs exist for rate buckets, idempotency, tokens and outbox; audit/session retention reports are not.
