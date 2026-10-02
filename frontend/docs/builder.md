# Frontend theme editor

Read `../../docs/site-builder.md` for product scope. This slice is local-only; `/studio` is not a secured admin and Apply is not server publication.

- `lib/builder/model.ts`: serializable discriminated block types, starter themes, immutable draft/apply/restore operations, and validation of stored data.
- `lib/builder/use-workspace.ts`: browser storage adapter with a versioned key and visible failure states. Replace with a backend adapter when contracts are agreed.
- `components/builder/ThemeRenderer.tsx`: common visitor/preview renderer. Page blocks reference shared content rather than owning article copies.
- `lib/builder/appearance.ts`: theme classes/CSS variables and readable foregrounds for custom accent colors.
- `lib/builder/preview-protocol.ts`: validated transient selection messages; only accept the expected frame/parent and same origin.
- `components/builder/PreviewCanvas.tsx`: scaled device preview, source-checked selection bridge and ready handshake.
- `components/builder/ThemeSettings.tsx`: site-wide appearance forms.
- `components/builder/ThemeStructure.tsx`: starter choices, ordered page roles and insertion palette.
- `components/builder/ThemeEditor.tsx`: authoring workflow. Properties use bounded text/enum fields; no raw HTML or executable configuration.
- `components/builder/BlockProperties.tsx`: focused, type-specific property forms.
- `/preview`: isolated draft preview; `/`: applied snapshot; `/yazilar/[slug]`: theme-independent article URLs.

The palette is flat and each kind occurs at most once initially. Movement uses keyboard-accessible buttons; drag-and-drop and a saved multi-theme library can be added later without changing the content model. The scene is a curated complex block, not a generic container.

Verify draft isolation, persistence validation, block identity/order, restoration, and direct article routes. Do not claim SEO publication or authenticated admin support from this slice.

Header/lead/footer have structural roles. Use `canMoveBlock` to disable invalid movement and `addBlock` for canonical insertion; the UI must not mutate order independently. Empty drafts are valid editor states, but Apply requires a real content block. Removal can be undone until the next edit.

Version 1 records without appearance fields receive safe defaults. Old unrestricted order is normalized without discarding block IDs or authored text. Legacy records containing both scene and intro are preserved with a visible validation error until the owner removes one; never silently delete content.

The canvas edit mode captures clicks and keyboard selection before links execute. Gezin mode restores normal visitor interactions. Messages include a selection request counter so repeatedly selecting the same block scrolls again. Selection does not alter persisted content. Keep edit-only labels/spotlights out of published rendering.

Appearance CSS is in `app/themes.css`; editor chrome is in `app/studio/studio.css`. Theme accent must reach the curated Experience's local variables too. Typography and surface work on standalone articles; width and spacing primarily control flowing sections.

The Studio keeps the structure list, canvas, and block properties simultaneously visible on desktop. The inspector switches only between block properties and general theme appearance; choosing blocks does not require a structure tab. Avoid scaling a desktop artboard down to unreadable text. Natural canvas width uses scale 1, while phone preview intentionally models a 390px device. Selection from the persistent structure list opens block settings and scrolls the preview into view. Keep status feedback by the canvas rather than buried below long forms.

Intro layout and quote display enums are part of the block schema. Version 1 missing those values receives statement/band defaults; explicit unsupported values are rejected. Magazine defaults to centered/card. Character halo color is not an accent customization target.

Starter selection immediately loads the chosen default composition into the draft, even when already selected. No notification or replacement dialog is shown; site name/accent remain. Homepage Apply and explicit Restore stay separate operations.

Series content lives in `lib/series/`, outside theme snapshots. The inspector adds a Seriler area with explicit local save, title/slug/summary/level, visibility, ongoing/completed state and accessible chapter order controls. Selecting another series is blocked until unsaved edits are saved or cancelled; clicking the selected series preserves edits. New titles generate a Turkish-normalized ASCII slug until the owner manually changes it. Shared domain validation rejects duplicate slugs, repeated/cross-series article membership and empty publication. Removing a membership never deletes its article.

The optional `series` page block has `title` and `display: cards | list`; its source is the shared published series collection. It follows normal body placement rules and can be added once through the palette. Block appearance and chapter content are separate controls; the canvas stays visible while editing either.
