# mrbyte-blogger

[![CI](https://github.com/mrbyte66/mrbyte-blogger/actions/workflows/ci.yml/badge.svg)](https://github.com/mrbyte66/mrbyte-blogger/actions/workflows/ci.yml)

Personal publishing and website-builder monorepo. Open this root in your editor to see both applications together.

```text
mrbyte-blogger/
├── frontend/   Next.js + React + TypeScript application
├── backend/    Spring Boot + Java 25 modular monolith (V1 slices 1–8, see backend/README.md)
├── deploy/     Local dev compose, production compose, Caddyfile, backup jobs and runbooks
├── docs/       Product decisions and project-wide coordination
└── AGENTS.md   Shared agent routing and repository rules
```

Frontend runs independently from its folder:

```sh
cd frontend
npm ci
npm run dev
```

The frontend needs the backend API (`backend/README.md`: PostgreSQL, `migrate`, `bootstrap-owner`, then the `dev` profile on :8080; Next proxies `/api` to it). Then open http://127.0.0.1:3000. Studio is at `/studio` (owner only) with statistics at `/studio/istatistikler`; `/preview` shows the theme draft. Content, themes, accounts, libraries, notes and reactions are stored by the backend; only guest reading notes and display preferences stay in the browser.

Whole application in Docker, built from this checkout (site http://127.0.0.1:3010, mail inbox http://127.0.0.1:8025):

```sh
docker compose -f deploy/compose.local.yml up -d --build
```

Then create the owner account once (password from a file, see the runbook). Details: `deploy/runbooks/local-stack.md`. Production deployment (single VPS, Docker Compose, Caddy): `deploy/runbooks/first-deploy.md`.

Start with `AGENTS.md`. The project and app guides live beside the work they govern.

Status: backend V1 (slices 1–8) and the frontend's API integration are on `main`. Remaining work is tracked as GitHub issues ([open issues](https://github.com/mrbyte66/mrbyte-blogger/issues)); `docs/roadmap.md` links them by topic. Demo content for an empty local site: `seed-demo` (`deploy/runbooks/local-stack.md`).

CI (`.github/workflows/ci.yml`) runs on every pull request and push to `main`: backend `./mvnw clean verify` (JDK 25, PostgreSQL via Testcontainers) plus OpenAPI lint, and frontend `npm ci`, `tsc --noEmit`, `vitest run`, `npm run build`. After a green CI run on `main`, `.github/workflows/images.yml` builds, scans (Trivy), pushes (GHCR) and signs (cosign) both images and publishes a release manifest with their digests (`deploy/runbooks/first-deploy.md` §3).
