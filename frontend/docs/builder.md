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
- `components/builder/SiteEditor.tsx`: shared page navigation, unsaved-edit guard and content save routing.
- `components/builder/DocumentEditor.tsx`: contextual article/series fields, live draft, explicit local save and discard.
- `components/builder/DocumentPreview.tsx`: shared visitor page views with field selection and editor-only focus feedback.
- `lib/builder/document-protocol.ts`: validated article/series preview payloads and internal navigation targets.
- `components/builder/ThemeEditor.tsx`: homepage authoring workflow. Properties use bounded text/enum fields; no raw HTML or executable configuration.
- `components/builder/BlockProperties.tsx`: focused, type-specific property forms.
- `/preview`: isolated draft preview; `/`: applied snapshot; `/yazilar/[slug]`: theme-independent article URLs.

The palette is flat and each kind occurs at most once initially. Movement uses keyboard-accessible buttons; drag-and-drop and a saved multi-theme library can be added later without changing the content model. The scene is a curated complex block, not a generic container.

Verify draft isolation, persistence validation, block identity/order, restoration, and direct article routes. Do not claim SEO publication or authenticated admin support from this slice.

Header/lead/footer have structural roles. Use `canMoveBlock` to disable invalid movement and `addBlock` for canonical insertion; the UI must not mutate order independently. Empty drafts are valid editor states, but Apply requires a real content block. Removal can be undone until the next edit.

Version 1 records without appearance fields receive safe defaults. Old unrestricted order is normalized without discarding block IDs or authored text. Legacy records containing both scene and intro are preserved with a visible validation error until the owner removes one; never silently delete content.

The canvas edit mode captures clicks and keyboard selection before links execute. Gezin mode restores normal visitor interactions. Messages include a selection request counter so repeatedly selecting the same block scrolls again. Selection does not alter persisted content. Keep edit-only labels/spotlights out of published rendering.

Appearance CSS is in `app/themes.css`; editor chrome is in `app/studio/studio.css`. Theme accent must reach the curated Experience's local variables too. Typography and surface work on standalone articles; width and spacing primarily control flowing sections.

The Studio keeps the structure list, canvas, and block properties simultaneously visible on desktop. For the homepage the inspector switches between block properties and general theme appearance; choosing blocks does not require a structure tab. Avoid scaling a desktop artboard down to unreadable text. Natural canvas width uses scale 1, while phone preview intentionally models a 390px device. Selection from the persistent structure list opens block settings and scrolls the preview into view. Keep status feedback by the canvas rather than buried below long forms.

Intro layout and quote display enums are part of the block schema. Version 1 missing those values receives statement/band defaults; explicit unsupported values are rejected. Magazine defaults to centered/card. Character halo color is not an accent customization target.

Starter selection immediately loads the chosen default composition into the draft, even when already selected. No notification or replacement dialog is shown; site name/accent remain. Homepage Apply and explicit Restore stay separate operations.

Series content lives in `lib/series/`, outside theme snapshots. The shared page navigator opens each series directly in the canvas; do not reintroduce a disconnected series inspector tab. Contextual fields cover title, slug, summary, cover, level, visibility, ongoing state, chapter order and page presentation. Explicit local save is separate from homepage theme Apply. New series start as inline unsaved drafts beneath an article; they can be discarded and cannot publish without a chapter. Shared validation rejects duplicate slugs and repeated/cross-series membership. Removing a membership never deletes its article.

The optional `series` page block has `title` and `display: cards | list`; its source is the shared published series collection. It follows normal body placement rules and can be added once through the palette. Block appearance and chapter content are separate controls; the canvas stays visible while editing either.


## Document editing contract

`lib/editorial/store.ts` owns the combined article/series record at `mrbyte:content:v2`; `use-content-workspace.ts` synchronizes readers and editors. `useArticles` and `useSeriesWorkspace` remain narrow adapters. Legacy article/series keys are read before the first explicit save, then retained only as compatibility snapshots. Article and membership updates commit atomically to the combined record. Corrupt records and failed writes never replace the current content. New independent articles are created through `PageNavigator`, with a title-derived Turkish ASCII slug editable before first save. Collision checks prevent overwriting existing records. Published articles appear first in visitor lists and can choose independent/existing-series/new-series authoring beside the canvas. New series are entered in `InlineSeriesForm` below the canvas, including title, slug, summary, cover and level. Saving closes the form, selects the series and returns to the article; the writing is linked only on its own Save. A new one-chapter draft series becomes visible when its first article is published. Dynamic article routes resolve browser-local records after hydration; server publication and metadata for local records are not implemented. The editor supports separate title/abstract, body paragraph editing/reordering, figure, code, table, metadata and per-article reading width/header alignment. Series support header alignment and card/row chapter presentation. Header/metadata cannot be arbitrarily reordered into article prose.

Use `ArticlePageView`, `ArticleContent` and `SeriesPageView` for both visitor pages and document previews. Preview drafts travel through the existing iframe with expected-source and same-origin validation; they never write visitor records before Save. Invalid drafts keep the last valid canvas visible and disable Save with explicit feedback. Saved article data feeds the scene featured title, writing catalogs, series chapters and permanent article pages through `useArticles`.

`data-edit-field` identifies contextual fields. Pointer selection opens the matching inspector; sidebar selection scrolls/highlights the matching canvas field. On small screens canvas selection scrolls to the inspector. Internal article/series links select that document in Studio instead of escaping the frame. Unsaved document edits block switching until Save/Revert; beforeunload protects accidental refresh/close. New-document discard returns home without creating a record. Storage failures keep edits and never report publication.

Article revisions re-resolve reading annotations against the changed content. Position-based anchors can become unresolved after edits; retained quotes remain recoverable. Stable server-side block IDs/content revisions are still required for production authoring.

## Unified Studio chrome

`StudioHeader` uses one desktop command row for identity, page selection, a compact state and actions; no separate command/status strip. Narrow mobile layouts can wrap. `PageNavigator` is the single searchable page selector and writing creation entry point, with homepage, then series, then writing groups, Escape/outside dismissal and focus restoration. Do not add separate homepage buttons or competing article/series dropdowns. Structure, live canvas and inspector remain simultaneously visible on desktop. Use consistent compact typography, contextual selection and a single local-save explanation; empty status regions must not consume canvas height. Keep restore/save/apply semantics distinct. `CanvasToolbar` groups edit/browse and device controls identically across all page types. Mobile navigation wraps without horizontal overflow. Group headings use readable theme typography, not tiny uppercase labels.

## Content lifecycle

Articles default to draft; missing legacy article status means published. Both record types support draft/published/archived/trashed. The contextual Content actions menu saves as draft, publishes, archives, sends to trash, or restores as draft. Empty writing drafts are valid; publication needs prose. Archives/trash are selectable from PageNavigator filters. Trash is reversible; there is no permanent purge. Status changes preserve content and membership. Archiving/trashing a series never changes the articles themselves. Visitor catalogs/permalinks and chapter navigation exclude non-published records, and series counts/adjacent chapters include only published writing. Preview can still edit hidden records. Published-series chapter removal that leaves no members demotes that series to draft.

## Curated scene content

Scene blocks own `featuredArticleSlug`, `showFeaturedArticle`, `featuredSeriesSlug` and `showFeaturedSeries`. Studio picks published content through the shared stores; these slugs are references, not copied writing. Missing legacy fields default to the original article and AI series with both cards shown; malformed supplied values are rejected. Hiding either card preserves its selection. Missing/non-public targets render no card, without substituting another owner choice. Both visitor and Studio preview use `SceneFeatured` through `Experience`; article/series data attributes retain canvas document navigation. Future member-specific ranking is described in `../../docs/features/personalized-recommendations.md`.

### Edit-mode interaction isolation
Embedded preview messages from the trusted parent are authoritative for the live workspace, so scene visibility updates render immediately even when browser storage is unavailable. Edit mode takes priority over article/series navigation: card clicks select the scene block and its `featured-article` / `featured-series` property group. Scene navigation, theme/audio controls and other non-editable scene areas stay passive. Document previews also select editable fields before considering links. Parent navigation messages are accepted only in browse mode. Writer and series card controls have separate groups, with the selected group highlighted and scrolled into view.
