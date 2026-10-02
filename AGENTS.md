# Repository guide

This repository contains separate frontend and backend applications.

| Task | Read first |
| --- | --- |
| Product direction and accepted decisions | `docs/product.md` |
| Cross-project coordination and decisions | `docs/coordination.md` |
| Theme system and visual builder scope | `docs/site-builder.md` |
| Local reading tools and future annotation layers | `docs/features/reading-tools.md` |
| Planned owner-managed nostalgia corner | `docs/features/nostalgia-corner.md` |
| Planned editable article summaries | `docs/features/article-summary.md` |
| Frontend implementation/design/tests | `frontend/AGENTS.md` |
| Backend implementation/API/domain/tests | `backend/AGENTS.md` |

Keep product requirements and cross-application contracts here. Keep frontend design and implementation rules in `frontend/`; backend architecture and test rules belong in `backend/`. Update the document that owns a decision when it changes.

The intended production stack is Next.js/React frontend and Spring Boot/Java 25 LTS backend. Frontend is currently a design prototype. Do not infer API/database contracts from sample content.
