# mrbyte-blogger

Personal publishing and website-builder monorepo. Open this root in your editor to see both applications together.

```text
mrbyte-blogger/
├── frontend/   Next.js + React + TypeScript application
├── backend/    Spring Boot + Java 25 application (scaffold follows design approval)
├── docs/       Product decisions and project-wide coordination
└── AGENTS.md   Shared agent routing and repository rules
```

Frontend runs independently from its folder:

```sh
cd frontend
npm ci
npm run dev
```

Then open http://127.0.0.1:3000. The local theme editor is at `/studio`; `/preview` shows its draft. Choose a starter, add/reorder blocks, change properties, and apply the draft to this browser's homepage. Themes share article content and `/yazilar/[slug]` links. This prototype uses browser storage; the production admin, authentication, database and server publication will be implemented separately in `backend/`.

Start with `AGENTS.md`. The project and app guides live beside the work they govern.
