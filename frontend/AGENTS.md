# Frontend agent guide

Read the repository `../AGENTS.md` first. Then consult only the frontend guides you need:

| Task | Guide |
| --- | --- |
| Visual direction, layout, motion, responsive behavior | `docs/design.md` |
| React boundaries and frontend/backend integration | `docs/frontend.md` |
| Theme renderer, blocks, article/series page editor and preview | `docs/builder.md` |
| Modular article annotations and local notes | `docs/reading.md` |
| Optional ambient Mozart playback | `docs/audio.md` |
| Series, chapter order and future member visit history | `docs/series.md` |
| Member/login/account UI and server Studio gate | `docs/auth.md` |
| Test and acceptance criteria | `docs/quality.md` |

This is a Next.js App Router / React / TypeScript application. Keep components focused; content definitions live in `lib/`, screen composition in `components/`, and styling in `app/globals.css`. Business APIs belong in Spring Boot. Spring Boot establishes membership and Studio authority; Next checks the actual server session for private pages and never implements a second credential store. See `docs/auth.md`.

Run `npm test`, `npm run typecheck`, and `npm run build` from this directory after meaningful changes. Update the owning guide when you change a component contract or design decision.

The installed Next.js version writes extra instructions to `AGENTS.md` during development. Keep this file as the stable project guide; generated framework notes should not replace its content.
