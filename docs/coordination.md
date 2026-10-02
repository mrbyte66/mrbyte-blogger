# Project coordination

## Work ownership

- The project orchestrator owns product scope, design direction, API contracts, and integration.
- Frontend work reads `frontend/AGENTS.md` and the relevant files in `frontend/docs/`.
- Backend work reads `backend/AGENTS.md` and the relevant files in `backend/docs/`.
- Keep frontend and backend independently buildable. Put cross-project decisions here.

## Current stage

The manual visual theme builder has its first local frontend slice. `/studio` edits a separate draft, `/preview` shows that draft, and `/` renders the applied snapshot. Scene, feed and magazine starters use the same articles, with stable `/yazilar/[slug]` routes. Review the editor before specifying backend contracts and persistence. Do not invent APIs or a database around fixture content.

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

## Change protocol

Record decisions that affect both projects here. Keep visual details in `frontend/docs/design.md`, frontend implementation guidance in `frontend/docs/frontend.md`, and backend decisions in `backend/docs/`. Give parallel contributors non-overlapping file ownership and ask them to update the appropriate guide when a decision changes.
