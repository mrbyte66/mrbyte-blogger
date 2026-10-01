# Agent entry point

Read this file first, then only the documents relevant to your task.

| Task | Read |
| --- | --- |
| Product scope or user decisions | `docs/product.md` |
| UI, visual assets, motion, responsive layout | `docs/design.md` |
| Application code and component contracts | `docs/frontend.md` |
| Tests, review, acceptance | `docs/quality.md` |
| Coordination or changing a decision | `docs/coordination.md` |

## Shared rules
- This iteration is a local visual prototype. Do not implement the backend, database, authentication, or builder before the design discussion.
- Preserve the user's intended production stack: Spring Boot / Java 25 LTS backend; React-based frontend. The prototype uses Next.js / TypeScript.
- Keep responsibilities small and explicit. Prefer composition over inheritance; do not impose Java-style class hierarchies on React.
- UI components do not own content persistence. Typed content models and fixtures live separately.
- Add meaningful unit tests for behavior and run type checks and a production build before handoff.
- Update the owning document when changing a contract or accepted decision. Do not copy the same rule into multiple documents.
- Orchestrator owns integration. Delegated work must have bounded ownership. Never overwrite another agent's files.
- Never claim photoreal imagery is real-time 3D, or fixture content is published user content.


<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
