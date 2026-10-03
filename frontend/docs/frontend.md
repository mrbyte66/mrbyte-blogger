# Frontend implementation guide

## Stack and layout

Independent Next.js App Router application using React, TypeScript, and CSS. Keep this project installable and runnable from this directory with its own `package.json` and lockfile.

- `app/`: routes, metadata, global styles.
- `components/`: scene and interaction components.
- `lib/`: typed content, navigation, and character motion logic.
- `public/`: static assets.
- `tests/`: frontend unit/component tests.

## Component responsibilities

- `lib/content.ts`: typed initial article content; custom browser-local articles live in `lib/articles/` and resolve via dynamic article routes.
- `lib/articles/`: validated browser-local article records and shared reader/editor synchronization.
- `components/builder/SiteEditor.tsx`: homepage/article/series workspace navigation.
- `lib/navigation.ts`: explicit navigation state transitions.
- `components/Experience.tsx`: scene composition, preferences, and navigation integration.
- `components/ContentPanel.tsx`: accessible browsing and reading surface.
- `components/Character.tsx`: original character, screen masking, and ambient wrapper.
- `components/MonitorFace.tsx`: animated eye gaze and blinking.
- `lib/character-motion.ts`: bounded gaze calculations in source-image coordinates.
- `app/globals.css`: shared tokens, responsive composition, and motion.
- `components/ArticleContent.tsx`: common article body for the scene panel and standalone routes.
- Theme/editor boundaries are described in `docs/builder.md`; the homepage now renders the locally applied theme, whose default is the original scene.

Keep metadata and static layout separate from interactive client components. Use semantic controls, avoid fake links, and keep navigation state explicit. No backend API is simulated in Next.js route handlers; backend belongs in the sibling `../backend/` project.
