# Project coordination

## Work ownership

- The project orchestrator owns product scope, design direction, API contracts, and integration.
- Frontend work reads `frontend/AGENTS.md` and the relevant files in `frontend/docs/`.
- Backend work reads `backend/AGENTS.md` and the relevant files in `backend/docs/`.
- Keep frontend and backend independently buildable. Put cross-project decisions here.

## Current stage

The manual visual theme builder has its first local frontend slice. `/studio` edits a separate draft, `/preview` shows that draft, and `/` renders the applied snapshot. Scene, feed and magazine starters use the same articles, with stable `/yazilar/[slug]` routes. Review the editor before specifying backend contracts and persistence. Do not invent APIs or a database around fixture content.

Blog series now have a separate local content workspace, a Studio inspector tab, an optional page block and stable `/seriler/[slug]` routes. Explicit series saves are separate from applying a theme; publication here affects this browser only. Chapter order stays independent of article URLs. Manual completion and guest progress have been removed; account-specific automatic visit history is deferred to real authentication/backend. `docs/features/blog-series.md` owns the accepted scope and deferred extensions.

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

## Change protocol

Record decisions that affect both projects here. Keep visual details in `frontend/docs/design.md`, frontend implementation guidance in `frontend/docs/frontend.md`, and backend decisions in `backend/docs/`. Give parallel contributors non-overlapping file ownership and ask them to update the appropriate guide when a decision changes.
