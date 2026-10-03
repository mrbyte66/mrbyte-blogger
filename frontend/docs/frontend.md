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
- `components/ArticleCard.tsx`: visual article card inside the scene writing catalog.
- `components/ArticleCard.tsx` also renders ordered series chapters, with an optional chapter label, body preview and callback/link navigation.
- `lib/reactions/use-claps.ts`: validated independent browser-local reactions; same-tab and cross-tab synchronization. No counts in authored content records.
- `lib/reactions/use-views.ts`: validated browser-local article view totals and first-visible-card impressions. Full reader entries count once per mount; Studio previews do not count. These totals are not site-wide analytics.
- `components/ArticleEngagement.tsx` and `ClapCount.tsx`: shared modal/permalink toggle/sharing and read-only totals across cards. Studio preview disables actions. See `../../docs/features/claps-and-sharing.md` for the server boundary.
- `components/saved/` and `lib/saved/model.ts`: prototype member context, validated private browser-local article collections, card/reader bookmark controls and `/kaydedilenler` management. The root provider owns synchronization; Studio has read-only counts. Replace the mock membership and local adapter with authenticated backend endpoints later.
- `components/CatalogCover.tsx` and `lib/catalog-covers.ts`: shared decorative cover renderer and explicit local prototype artwork mappings; real provider matching belongs to the planned backend feature.
- `components/Character.tsx`: original character, screen masking, and ambient wrapper.
- `components/MonitorFace.tsx`: animated eye gaze and blinking.
- `lib/character-motion.ts`: bounded gaze calculations in source-image coordinates.
- `app/globals.css`: shared tokens, responsive composition, and motion.
- `components/ArticleContent.tsx`: common article body for the scene panel and standalone routes.
- Theme/editor boundaries are described in `docs/builder.md`; the homepage now renders the locally applied theme, whose default is the original scene.

Keep metadata and static layout separate from interactive client components. Use semantic controls, avoid fake links, and keep navigation state explicit. No backend API is simulated in Next.js route handlers; backend belongs in the sibling `../backend/` project.

`lib/editorial/` owns browser-local article/series persistence and lifecycle; editor and visitor hooks share its validated combined record. Keep UI authoring in focused builder components (series context, inline series form, contextual actions) and avoid adding storage logic to forms.

`components/audio/AmbientAudio.tsx` keeps opt-in visitor audio above route changes; modal and floating controls share the provider. `lib/audio/mozart.ts` owns stream sources and the session limit. See `audio.md` for licensing, failure behavior and duration semantics. `SlideLink` accepts `direction="back"` for explicit library-return links; native and fallback cover transitions share the reverse movement, with reduced motion honored.
