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
- `components/engagement/EngagementProvider.tsx`: server claps and view events (API contract §6). Holds only fresher totals returned by the visitor's own actions and their own clap state (cleared when the account changes); mutations per article are queued so an older response never overwrites a newer choice.
- `lib/reactions/use-claps.ts`: `useClap(slug)` — own clap via `/articles/{id}/my-clap` and target-state `PUT …/clap`.
- `lib/reactions/use-views.ts`: `useArticleStats` (server totals from the public content, `null` → "—" for drafts), `useVisibleArticleView` (card ≥20% visible, once per page view) and `usePermalinkView`. The side panel, Studio and previews send no events. Totals are views, not unique readers.
- `components/ArticleEngagement.tsx` and `ClapCount.tsx`: shared modal/permalink toggle/sharing and read-only totals across cards. Studio preview disables actions. See `../../docs/features/claps-and-sharing.md` for the server boundary.
- `components/saved/`: the member's server library (collections, bookmarks), card/reader bookmark controls and `/kaydedilenler` management. Hidden articles stay listed as anonymous "erişilemiyor" records that can be removed. Studio shows read-only save totals.
- `lib/reading/history.ts`: permalink visit recording for verified members and `useSeriesHistory` ("Son açtığın bölüm" link in series detail).
- `components/builder/StudioInsights.tsx` (`/studio/istatistikler`): owner's per-article totals and limited member list.
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

## Editorial metadata
Articles have multiple `categories`; legacy `category` is retained as the primary cover fallback. Old single-category records normalize on read without losing content. `createdAt` is immutable; `publishedAt` is an editable calendar date, initially the creation day. Cards and reading views share Turkish date formatting without timezone shifts. Public writing lists sort newest date first; series use stored chapter order, regardless of date edits. Adding a chapter inserts by creation time while preserving existing relative order. Existing demo articles carry deterministic sample dates; unknown legacy articles use 30 September 2026 as a migration fallback, never the time of each read.

Membership/session, account screens and the narrow server-side Studio login gate are owned by `docs/auth.md`.
