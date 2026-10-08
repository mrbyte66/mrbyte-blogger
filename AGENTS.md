# Repository guide

This repository contains separate frontend and backend applications.

| Task | Read first |
| --- | --- |
| Product direction and accepted decisions | `docs/product.md` |
| Consolidated categorized project roadmap | `docs/roadmap.md` |
| Cross-project coordination and decisions | `docs/coordination.md` |
| Theme system and visual builder scope | `docs/site-builder.md` |
| Local reading tools and future annotation layers | `docs/features/reading-tools.md` |
| Future instrumental/nature audio and weather mode | `docs/features/ambient-audio.md` |
| Planned owner-managed nostalgia corner | `docs/features/nostalgia-corner.md` |
| Planned editable article summaries | `docs/features/article-summary.md` |
| Automatic article/series covers and visual cards | `docs/features/automatic-covers.md` |
| Article publication scheduling and author email preferences | `docs/features/publication-scheduling.md` |
| Membership UI, Studio access and V2 portal | `docs/features/membership.md` |
| Private member bookmarks and collections | `docs/features/saved-articles.md` |
| Anonymous claps, aggregate counts and article sharing | `docs/features/claps-and-sharing.md` |
| Blog series and chapter journeys | `docs/features/blog-series.md` |
| Future reader badges and configurable owner analytics | `docs/features/reader-progress-and-analytics.md` |
| Owner-only private/locked articles and access rules | `docs/features/private-articles.md` |
| Public membership introduction | `docs/features/site-introduction.md` |
| Interactive character rotation | `docs/features/character-interaction.md` |
| Scene featured writing/series and future member recommendations | `docs/features/personalized-recommendations.md` |
| Frontend implementation/design/tests | `frontend/AGENTS.md` |
| Backend implementation/API/domain/tests | `backend/AGENTS.md` |
| AI-assisted issue, coding, and test workflow | `docs/ai-workflow.md` |

Keep product requirements and cross-application contracts here. Keep frontend design and implementation rules in `frontend/`; backend architecture and test rules belong in `backend/`. Update the document that owns a decision when it changes.

The stack is a Next.js/React frontend and a Spring Boot/Java 25 LTS backend with PostgreSQL. Backend V1 (slices 1–8) is on `main` and the frontend uses its API; status and open items live in `backend/README.md`, the contract in `docs/api-contract.md` and `backend/docs/openapi.yaml`. Do not infer API/database contracts from sample or seed content. Work is tracked in GitHub issues (`docs/ai-workflow.md`); every pull request runs CI.
