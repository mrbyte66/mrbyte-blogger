# Project coordination

## Work ownership

- The project orchestrator owns product scope, design direction, API contracts, and integration.
- Frontend work reads `frontend/AGENTS.md` and the relevant files in `frontend/docs/`.
- Backend work reads `backend/AGENTS.md` and the relevant files in `backend/docs/`.
- Keep frontend and backend independently buildable. Put cross-project decisions here.

## Current stage

The manual visual theme builder has its first local frontend slice. `/studio` edits a separate draft, `/preview` shows that draft, and `/` renders the applied snapshot. Scene, feed and magazine starters use the same articles, with stable `/yazilar/[slug]` routes. Review the editor before specifying backend contracts and persistence. Do not invent APIs or a database around fixture content.

Blog series now have a separate local content workspace, a shared Studio page navigator, an optional page block and stable `/seriler/[slug]` routes. Explicit series saves are separate from applying a theme; publication here affects this browser only. Chapter order stays independent of article URLs. Manual completion and guest progress have been removed; account-specific automatic visit history is deferred to real authentication/backend. `docs/features/blog-series.md` owns the accepted scope and deferred extensions.

Two future features are recorded without simulating unavailable account or 3D behavior: a public membership introduction page and a genuinely multi-view, pointer-controlled character with return-to-rest and a dizzy-eye finish. The current single-image character stays unchanged until its asset can support the motion.

## Current decisions

- The character-centered, single-scene experience is the first theme. The user explicitly wants to be able to switch to substantially different layouts, including a scrolling feed.
- Preserve the original curly-haired CRT character and glasses. Eye gaze and blinking are active; head warping and the later portrait-based hair experiment are not part of the accepted direction.
- Theme creation means manually selecting, arranging, and configuring blocks. AI theme generation is not requested for the initial version.
- Content and public URLs must survive theme changes; theme support covers structure and interactions as well as colors.
- `docs/site-builder.md` owns the shared theme/builder requirements.
- Backend application code has not started.

## Verification — 2026-10-02

- 92 unit/component tests pass across eight files. Coverage includes draft isolation, block roles, old-record migration, custom colors, two-way canvas selection, local text annotations, storage failures and delete/undo. After the final loading-state adjustment, all nine reading-tool tests were rerun successfully.
- TypeScript and the final production build pass. Studio, preview and four permanent article routes build successfully.
- Desktop Studio retains simultaneous structure/canvas/properties panels with readable controls and an unscaled responsive canvas. List and canvas selection synchronize; non-selected blocks dim, and intro composition switches immediately. Starter selections now immediately reload the requested draft structure without notices or confirmation, including reselecting the current starter; site name/accent are retained.
- Custom color, editorial typography and dark surface were checked in the real iframe; original appearance values were restored after checks. The curated scene halo is no longer controlled by accent color.
- At a loaded 390px viewport, Studio and article pages have no horizontal overflow. Reading toolbar buttons use 15px labels and 63px mobile targets in the checked viewport. Inspector fields use 16px text.
- Browser checks verify selecting a passage, visible highlighting, adding a note, restoring both after reload, and removing the test records. Desktop open-note space keeps text outside the panel. Escape and mobile jump behavior are covered by component tests.
- No new theme was applied during this review. Homepage snapshot remains separate from the draft. All theme state and visitor notes remain browser-local; authenticated admin, public owner notes, accounts/sync, SEO publication and backend/database remain future work.

## Reader motion and series verification — 2026-10-02

- 110 unit/component tests pass across 13 files. Added coverage for series validation, local synchronization/storage errors, explicit completion, Studio chapter editing/order, scene return context, series block links, inert cover snapshots and native/fallback permalink transitions.
- Final TypeScript check and production build pass, including the dynamic series route and existing four article permalinks.
- Browser checks cover series catalog → ordered chapters → first/next chapter and both article/series permalinks. The closing panel retains opacity 1 and transitions transform/display/overlay in 240ms; internal cover entry uses 420ms. Native selection keeps transparent backgrounds; saved marker highlights retain their own fills.
- Series permalink and Studio fit a loaded 390px viewport without horizontal overflow. Light/dark series surfaces were inspected; primary link contrast was corrected and verified as dark text on mint. Original light preference was restored. No theme draft was reset or applied during verification.
- Series content/progress remain browser-local. Only sample articles are selectable. Owner authentication, backend persistence, server metadata for custom series and article publication filtering are deferred.

## Catalog refinement verification — 2026-10-02

- 116 tests pass across 14 files; TypeScript and the final production build pass with 12 article permalinks. Coverage includes five-item sentinel/manual loading, keyboard tabs, selective cover motion, three-series fixtures and safe migration that preserves author edits.
- Yazılar/Seriler are explicit fixed-header tabs with arrow/Home/End navigation and short local ripple feedback. Tab changes and catalog-to-series detail changes show no cover animation. Browser computed styles confirmed no animation or old layer for these actions. Article open/back and panel entry/exit retain their spatial movement.
- Three restrained series cards, compact headings and border/surface hover feedback were checked at desktop and 390px mobile widths. Hover underlines are removed; prose-link semantics and saved underline annotations remain intact.
- Browser scrolling appended chapters 6–10 after the first five. Opening chapter 6 and returning retained all ten loaded cards, its keyboard focus and the list's scroll position. Manual chapter completion and anonymous progress tracking are absent.
- Member-only automatic visit history is documented for the future authenticated backend; no account functionality is simulated. Theme drafts were not reset or applied during review.

## Reader selection cleanup and future feature notes — 2026-10-02

- A collapsed/released text selection clears the reading toolbar's stale quote and disables annotation actions. A selection remains available while the reader activates a toolbar or note-panel control; saved highlights remain until explicitly removed.
- The focused reading-tools suite passes (10 tests), TypeScript passes, and the article page was checked in-browser: annotation controls enable for selected text and disable after the selection is released.
- Public membership/site introduction requirements are recorded in `docs/features/site-introduction.md`. Pointer-driven 360° character interaction, return-to-rest, and a playful dizzy-eye finish are recorded in `docs/features/character-interaction.md`; the current single-image character remains unchanged until suitable multi-view or 3D artwork exists.

## Unified Studio page editing verification — 2026-10-02

- Studio now opens home, existing article and series pages in a shared canvas workflow. Removed the old disconnected series form; article and series inspectors use visitor renderers and support two-way field selection, content changes and bounded page presentation.
- Article drafts are isolated until explicit local Save; catalogs, series chapters, scene featured title and article permalinks then consume the shared saved article collection. Series creation, automatic Turkish slugs, chapter membership/order, cover and publication validation remain available beside the canvas. Internal document links keep navigation within Studio; dirty documents require Save/Revert.
- 125 tests pass across 15 files. The final production build (including TypeScript) passes. Added coverage for live draft messages, trusted selection/navigation, save isolation, storage failure/revert, new-series discard, series authoring through the unified editor, invalid records and reading-mark re-resolution after content edits.
- Browser checks verified article title live preview, paragraph click opening its inspector, revert, article-to-series navigation, series selection and a 390px Studio with no horizontal overflow. Mobile canvas selection scrolls to the matching inspector. Browser verification edits were reverted without saving; no theme was applied.
- This remains a local prototype: only existing article routes are editable. New arbitrary article/custom-page creation, server publication/authentication, real media uploads and dynamic server metadata remain deferred. Article text revisions preserve saved reading quotes, marking unresolved anchors instead of painting unrelated text.

## Change protocol

Record decisions that affect both projects here. Keep visual details in `frontend/docs/design.md`, frontend implementation guidance in `frontend/docs/frontend.md`, and backend decisions in `backend/docs/`. Give parallel contributors non-overlapping file ownership and ask them to update the appropriate guide when a decision changes.

## Shared chapter cards and reader reactions — 2026-10-03

Series chapters now use the same cover cards as the writing catalog, preserving chapter ordering, complete-sentence body previews and five-item loading. Full article permalinks provide a reversible anonymous local clap and share controls (copy, platform links, native share when available). Read-only card totals synchronize through an independent validated local record; series totals aggregate their published articles. Studio preview actions are disabled. Global visitor counts require the future Spring Boot service; the UI labels the current browser-only scope.

Verification: 142 tests across 18 files, TypeScript and production build passed. Browser checks verified desktop two-column chapter cards, 390px single-column/no overflow, full-article clap reflected in article and series totals, and the share menu. No social posts were submitted. Local test vote is reverted after verification. Final CSS refinement preserves full chapter previews without ellipsis.

## Article views — 2026-10-03

Visible article summaries now add a view when their card enters the viewport; infinite-list cards below the fold are not counted. Only permalink reader views count on entry; opening an article in the side panel does not add another view. Article, series chapter, theme-feed and published series cards show read-only counts; a series number sums its published chapter views. Draft Studio previews are excluded. In this frontend prototype, data is validated and stored per browser, synchronized within the browser and explicitly labeled as local. Shared visitor totals and server analytics remain a Spring Boot task.

## Visual writing and series cards — 2026-10-03

Replaced the scene panel's small writing rows with two-column medium cover cards, stacking at 540px available container width. Series retain large full-width cards. Four original local SVG artworks provide prototype covers without network calls; custom series images take priority, and load failures fall back safely. Shared series covers also appear in the visitor detail and Studio preview. Existing theme feed layouts and five-item loading behavior remain unchanged. Online cover selection is still planned for Spring Boot.

Verification: 137 tests across 17 files, standalone TypeScript check and production build passed. Browser inspection verified desktop two-column writing cards, full-width series, loaded artwork, article open/back focus, and 390px single-column layout without horizontal overflow in light/dark palettes.

## Automatic covers requirement — 2026-10-03

Recorded content-matched online article/series covers and larger visual article cards in `docs/features/automatic-covers.md`. Pexels is a researched provider candidate, requiring a backend API key and provider/license attribution handling. Manual overrides, stable saved selection and graceful search failure are required. This is a documented feature plan; no online integration or card implementation was added in this step.

## 2026-10-03 — Unified page navigation and independent articles

Replaced separate home/article/series selectors with one searchable PageNavigator including New article/New series. New independent articles receive title-derived editable ASCII permalinks, collision protection and explicit local save. Saved articles appear first in shared visitor feeds and resolve through dynamic article routes; series membership is optional and supports these records later. Existing fixture collections remain compatible. Shared Studio header/canvas chrome remains consistent. Backend publication/authentication and server SEO for browser-local articles remain future work.

Verification: 129 tests passed, production build including TypeScript passed. Browser inspection verified the single page menu on desktop and 390px mobile (no horizontal overflow), new article creation and title-derived permalink. The temporary browser draft was discarded without changing visitor content.

## 2026-10-03 — Article-first series authoring and content lifecycle

Studio now uses one desktop command row. PageNavigator lists series before writing, uses readable group typography and exposes active/archive/trash filters. New writing chooses independent, existing series or inline new-series creation beside the canvas. Inline series parameters include title, ASCII slug, summary, cover, level and ongoing state; save selects the series, closes the form and returns to writing. Writing and membership commit together through the validated version-2 content record; legacy keys remain readable and non-authoritative compatibility snapshots after migration. Articles and series support draft/publication/archive/reversible trash, with restore as draft. Visitor lists, article permalinks and series chapter navigation exclude hidden content. Archiving/deleting a series retains its writing.

Verification: 135 tests across 16 files passed; production build and TypeScript passed. New tests cover empty drafts, existing/new series membership, inline cover save, atomic write failure, visitor visibility, archive/trash recovery and preserved series members. Browser QA verified the single desktop command row, readable series-first menu, contextual inline form and 390px layout without horizontal overflow. Temporary browser drafts were cancelled/discarded. Content remains browser-local; server publication and authenticated administration remain future work.

## Unified reader engagement — 2026-10-03

Modal and permalink readers now use the same compact translucent engagement bar for view counts, clap toggle and sharing. Opening an article in the side panel does not increment views; visible card impressions and permalink visits do. Removed the standalone view paragraph and replaced colored emoji/circle counters with shared monochrome line icons across reader and catalog cards. Studio actions remain disabled; counting remains browser-local.

Verification: 142 tests passed, TypeScript and production build passed. Desktop and 390px mobile inspection verified the shared toolbar, clap/undo and share menu with no horizontal page overflow. The progressive-list observer test now distinguishes sentinel observation from independent card-impression observers.

## Private member library preview — 2026-10-03

Added independent bookmark controls to article/chapter cards, theme feeds and the shared reader bar. Initial save targets Kaydedilenler; a compact picker supports existing/new categories and removal. `/kaydedilenler` centralizes filtering, moving/removing articles, category naming/deletion and unavailable records. Category deletion retains articles under the default. A root context owns validated browser-local storage, cross-tab synchronization and explicit mock membership; guest preview hides personal records. Public save metrics currently reflect only the local demo member (0/1), with no fabricated site-wide totals. Studio counts remain read-only. Saved collections are now included in the membership introduction plan, with backend ownership/idempotency requirements in `features/saved-articles.md`.

Verification: 149 tests across 19 files, TypeScript and production build passed. Tests cover default save, unique records, category movement/deletion, corruption/write failures, remount persistence, guest hiding and Studio restrictions. Desktop and 390px mobile browser checks verified independent save/open actions, category creation/rename, filtering, light/dark contrast, category deletion retaining the record and record removal. Fixed a clipped first-card popup; mobile had no page overflow. Temporary browser records/categories were removed after verification. Real authentication, user isolation and aggregate member totals remain backend work.

## Library refinement and optional Mozart listening — 2026-10-03

Removed detached per-card category/removal rows; bookmark menus now own those actions. Category selection stays a draft until “Taşı”, and moving a saved record preserves its insertion position. Library-return links use an explicit reverse cover direction in native/fallback navigation. Added one persistent opt-in Mozart audio element with lower-right controls, including a shared control inside the native reading dialog. Streams are Musopen Symphony public-domain recordings via Commons; movements repeat in order up to forty minutes of played media time. Pause/resume retains position; Studio pauses audio.

Verification: 155 tests across 20 files, TypeScript and production build passed. Added coverage for stable order, deferred category changes, reverse fallback movement, opt-in start/pause/resume, route continuity, playlist advancement, the forty-minute stop/restart and failure/retry. Browser playback reported readyState 4, paused=false and advancing currentTime; the first MP3 responded 206 with audio/mpeg. Playback persisted on the home route and could be paused from inside the native dialog. Desktop and 390px library inspection verified integrated controls and no page overflow; preview category choices were cancelled without changing member records.

## Ambient listening refinement — 2026-10-03

44px translucent monochrome control, decorative playback-only bars with reduced-motion support, consistent desktop reading inset and mobile notes clearance. Studio retains the pause control and playback; embedded preview hides its duplicate control. Future instrumental/nature categories, opt-in weather/season suggestions and advanced floating interaction are recorded in `features/ambient-audio.md`. Verification: 155 tests, typecheck and production build passed; browser confirmed four bars during actual playback and Studio control visibility.

## Shared audio session and scene alignment — 2026-10-03

Music now shares the scene footer controls and palette, with a short Mozart biography in the caption. BroadcastChannel mirrors playback state; a Web Lock enforces one audio owner per origin. New tabs remotely pause/resume the owner; normal closure releases the lock and shares the position for explicit resume elsewhere. Browser verification: main audio advanced; new Studio tab had no media source while its control showed playing; Studio pause stopped main at 26.12s and resume continued at 26.44s. Unit coverage includes joining, remote controls and owner-close handoff.

## Audio owner-close recovery — 2026-10-03

Active followers now queue on the owner Web Lock, so takeover also works if closing a tab omits pagehide/broadcast. Pausing cancels queued takeovers. Playback position and elapsed listening time are preserved; a NotAllowedError exposes an explicit continuation state without restarting. Browser test: closing the owner at 17.59s transferred 17.43s to the remaining tab; that browser blocked automatic audio and correctly presented the continuation control. 157 tests, TypeScript and production build passed.

## Background audio recovery — 2026-10-03

Fixed denied/error owners retaining the Web Lock and forwarding continuation clicks to the wrong document. Blocked/error owners release ownership; explicit recovery runs in the clicked tab. Fixed stale local media position/track on reacquisition and pending takeover cleanup. Five-tab regression plus stale-media test added. Browser: owner closed at 13.4s, unrelated site visited, Studio resume played at 13.77s with other audio paused; Studio then closed at 31.84s, original tab recovered at 32.09s. Browser required a gesture on both transfers; this is recovery, not a promise of uninterrupted background playback. 159 tests, TypeScript and production build passed.

## 4 October 2026 — Editorial metadata and curated scene cards
- Removed series difficulty labels and legacy field from normalized records. Added multiple article categories, editable calendar dates, descending public writing order and immutable creation timestamps. Series keep Studio chapter order, with creation-order insertion for new membership.
- Refined bookmark controls with the default `Genel` collection, `Kitaplığım` naming and an optional new-collection form; existing records/order migrate safely.
- Preserved glass scene cards, removed bracket ornament, added optional selected series card and independent Studio visibility/content choices. Future member recommendations are defined in `features/personalized-recommendations.md`.
- Verified 170 unit/interaction tests, TypeScript and production build. Browser verified dated writing/chapter cards, reduced bookmark popover, Studio metadata controls and desktop/390px scene layout. Mobile navigation labels now fit on one line. Data remains browser-local prototype content; member personalization is planned.

## 4 October 2026 — Scene editor interaction fixes
- Embedded live drafts now render directly from validated parent messages; article/series visibility changes appear immediately. Edit-mode capture selects the related card settings instead of navigating; parent navigation is guarded by browse mode. Non-editable scene controls stay passive.
- Article and series settings use separate highlighted groups. Featured cards float subtly when motion is enabled, pausing for editing, hover/focus and reduced-motion preferences.
- Verified live show/hide and card selection in the browser, plus 173 tests, TypeScript and production build. Previous requested changes remain uncommitted alongside these fixes.

### Featured-card motion refinement
The original 3px/0.2° animation was running in the browser but visually too faint. Replaced it with independent, slow perspective pitch/yaw/roll on the two glass cards. Hover no longer pauses their drift. Character breathing remains unchanged; editing/focus and reduced-motion behavior remain protected.

Verified two changing `matrix3d` transforms in the public homepage and confirmed both become `none` when motion is disabled, then restored motion. All 173 tests, TypeScript and production build passed.
