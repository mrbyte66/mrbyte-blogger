# V1 implementation and release status — 2026-10-06

The real backend and frontend integration are implemented locally. **Production release is not verified or deployed.** No commit/push was made. This document separates completed code, local evidence and external release requirements; the architecture/API/product documents remain the scope authority.

## Implemented slices

| Area | Behavior and important files |
| --- | --- |
| Runtime/schema | Java25, Spring Boot4.1.1, Maven wrapper3.9.11, PostgreSQL/Flyway V1–V13; standalone migration/bootstrap/health commands; runtime schema validation |
| Identity | Real register/verify/resend/login/recovery/reset, Argon2id, JDBC HttpOnly sessions, absolute/idle expiry, session rotation/renew/logout, server role reconstruction and authentication-generation revocation |
| Account | Profile/avatar/preferences, confirmed password/email changes, recent reauthentication, own session revocation, Google OIDC login/link/unlink, member deletion/anonymized tombstone |
| Security | CSRF for unsafe requests including login, exact-origin checks, rate limits, owner/member/anonymous boundaries, optimistic versions, command idempotency, no-store/private noindex responses and safe structured errors/logs |
| Editorial | Categories, versioned block documents, article lifecycle/private access/slug aliases, date ordering, owner-only Studio; series explicit activation/manual order and atomic membership version checks |
| Publication/delivery | Transactional scheduled publication and generation-specific outbox, leased bounded retries, global email preference, real SMTP failure handling; owner publication-job search/state/list/retry UI |
| Site | Immutable draft/applied themes, public-only featured bindings, owner site/SEO/index settings; UUID identities behind existing frontend controls |
| Media | Bounded JPEG/PNG/WebP decoding and PNG sanitization, private UUID storage, revision-aware permission checks including ranges; configured Pexels cover jobs with attribution, failed-candidate cleanup and expired unreferenced-candidate retention |
| Library/reading | Private collections/Genel default/bookmarks; actual counts; revision/UTF-16 personal notes/highlights; explicit guest-note import; real private visits/history and unavailable-item redaction |
| Reactions | One clap per actor, real aggregates, separate anonymous opaque actor cookie, visible-page impressions with event/page dedupe, bot/prefetch rejection; SSR GET does not increment views |
| Owner tools | Member list without private reading/library exposure, aggregate article counts, category create/edit/delete, site SEO, publication jobs, authenticated content ZIP export/dry-run/import |
| Import/export | Bounded domain ZIP manifest, path/symlink/hash/entry validation, owner reauthentication for sensitive actions,24h access expiry and retention; restore is atomic, draft-only, no overwrites, no automatic indexing/theme apply; explicit legacy slug→UUID conversion tool |
| Frontend/SEO | Actual same-origin APIs and server-established authority, Next SSR public bodies/metadata/canonical/schema.org,308 aliases, crawlable paged catalogs, sitemap/robots/private headers; existing visual design retained |
| Deployment | Separate Docker images, local Compose, production Caddy/HTTPS/private PostgreSQL networks, secret files, migration/runtime roles, health/log limits, rollback/restore runbook and CI workflow |

All production routes use the root real-data provider. Legacy frontend local-storage branches remain for isolated prototype tests and explicit guest notes; they do not grant a real role, seed production accounts or stand in for a successful API write. Owner credentials are entered interactively; no old prototype credential is used. Google/email/provider secrets are configuration, never frontend bundle data.

## Verification evidence

- Backend: **56 tests passed** against dedicated disposable PostgreSQL16.10 databases: domain, archive validation, ArchUnit module/foreign-repository guards, actual Spring HTTP/JDBC sessions, MockMvc PostgreSQL/role/ownership/concurrency tests and local mock-issuer OIDC signature/issuer/audience/nonce/PKCE/replay tests. No skipped DB tests or H2 substitution.
- Frontend: **191 tests passed**, TypeScript and Next production build passed. API tests cover failed saves, session races, stable content anchors and partial-save retry identities.
- Full-stack acceptance starts a real Spring HTTP server and built Next production server, checks SSR public content and escaping/canonical/structured data, cookies/CSRF through Next, private/draft404, sitemap omission, live slug308 and public→private revocation including RSC not-found payloads. See `FrontendAcceptanceIT`; run separately after the frontend build. RSC streams may use200 with the framework404 control payload; public HTML uses404.
- An actual browser check exercised production article rendering, login, server bookmark save, library and authorized Studio;390px DOM width showed no horizontal overflow. This is focused QA, not exhaustive device testing.
- The disposable DB operations script passed clean migration under a dedicated migration role, runtime DML/denied DDL/denied history mutations, pg_dump/isolated restore and Flyway checksum verification. It does not certify production media/offsite/TLS recovery.
- Three legacy-conversion unit tests passed, and a converted archive passed the backend dry-run validator without publishing.
- Both Compose YAML files parse. OpenAPI3.1 minimal lint passed; six warnings concern ambiguous static/parameter route patterns and intentional Google redirect-only responses. Controller coverage verifies every implemented application HTTP operation has a specification entry; this is not a proof of every possible response payload.
- Docker is unavailable here. PostgreSQL18/container/Compose runtime checks and remote CI have **not** run. JDK25/Maven dependencies were loaded under temporary directories; no global Java installation or existing user database was changed.

## Decisions and boundaries

Spring JDBC repositories implement the approved persistence boundary; no ORM requirement was added. A singleton transactional editorial guard deliberately serializes single-owner aggregate writes before article/series locks; this avoids cross-series deadlocks without prematurely introducing distributed machinery. Private-data commands lock the live user before module/idempotency writes, preventing late writes after deletion. Public-only database projections keep hidden titles out of library search/order and delivery projections.

Tokens use URL fragments and single-use hashes; outbox delivery material is independently AES-GCM encrypted and cleared on consumption. SMTP sends happen outside DB transactions with lease/retry; a send/crash can cause duplicate delivery, so exactly-once external mail is not claimed. Publication preference is checked again before sending.

Media is served with current-reference permission checks and no-store; no public asset optimizer/CDN cache is introduced. Expired cover candidates are removed only if no retained revision references them. ZIP results become inaccessible immediately after24h; periodic physical cleanup can lag by up to6h. Legacy conversion is explicit, requires dates/local prepared PNG mappings, excludes unauthored fixtures unless opted in and preserves selected chapter order/provenance.

Frontend revokes public access before sending text intended to be private. Content-save and lifecycle endpoints are separate commands. If content saves but publication fails, the editor keeps the actual persisted UUID/version/status and reports the partial outcome; it does not invent publication or retry as a new article. Custom categories come from the backend. Root overlays expose a link to the complete paged catalog rather than suggesting their initial50 items are the entire site.

Badge thresholds, advanced duration/device analytics and the multi-author/follow/comment portal remain deferred product decisions. V1 members do not get Studio or writing/publishing authority. Basic member directory and aggregate counts do not expose other users' private annotations/bookmarks.

## Release gates and unresolved inputs

1. Select VPS/domain/canonical alias, verified image digests and PostgreSQL18. Execute CI and actual Compose/runtime health, TLS, trusted-proxy, migration-role and restart/rollback checks on the target environment.
2. Configure SMTP sender/domain/SPF-DKIM and perform real delivery/failure/recovery tests. Configure Google client/redirect URI and perform real account login/link tests. Optional Pexels requires key/licensing attribution verification; disabled providers report real unavailable errors.
3. Set separate database roles/secret files, run migration then runtime-grants SQL, bootstrap owner locally through the protected TTY command. Enable indexing only after public content and canonical/robots/sitemap checks pass.
4. Choose encrypted offsite backup storage and retention. Exercise consistent DB+media backup, deletion-journal reconciliation, restored-session/token revocation, quarantined outbox and measured RPO/RTO. The local DB drill does not replace that deployment exercise.
5. Complete production security-header/CSP nonce policy and calibrate rate/retention/privacy policies against actual operation. Current reverse-proxy frame/object/base protections and safe plain-text rendering do not certify a complete nonce-based script policy.

No VPS login or real provider secret is required to review these files. Actual infrastructure/provider release gates must pass before this is described as production-ready.

## Commands and next sequence

See `backend/README.md` and `deploy/runbooks/operations.md` for environment variables, migration/bootstrap, local startup, legacy transfer and VPS operations. Verify frontend first, then backend, then full-stack acceptance; build-time BACKEND_INTERNAL_URL must point at the same backend origin used for rewrites. Local acceptance uses ports18080/18081 and its own test database. Implemented test fixture seeding is confined to disposable test databases.
