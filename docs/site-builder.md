# Visual theme builder

## Accepted product direction

The owner manually creates themes by selecting, arranging, and configuring blocks. No AI generation is required initially. The current character-led site is one theme; the product must also support substantially different layouts and interactions, including a scrolling content feed.

## Responsibility boundaries

- Content owns articles, projects, quotations, media, and their stable identities and URLs. Changing a theme must not duplicate or rewrite content.
- A theme owns site/page composition, typography, colors, navigation presentation, motion, and how content is displayed.
- The editor lets the owner select blocks, arrange sections, bind them to content, configure supported behavior, and preview a theme before applying it.
- Responsive layout is handled by the system and supported layout choices; manual pixel sizing is not an initial requirement.

Distinguish content blocks inside a document (paragraph, heading, code, image, quotation) from page blocks that display or navigate content (header, character scene, article feed, project list, footer). A feed should reference content rather than embed copies of articles into a theme.

## First validation target

Render one shared content collection with both the existing scene theme and a scrolling feed theme. Switching themes must preserve content and direct links, with deliberate mobile layouts and accessible controls in each theme. This validates the foundation for authoring additional themes, not a permanent limit of two templates.

## First editor slice

Build a local-only prototype at `/studio`. It is a design editor, not the password-protected production admin. Theme state is browser-local; application is not a public server publication.

Initial page palette: header, intro, complete character scene, article feed, quotation, about, projects, footer. Start with a flat ordered composition and at most one instance of each kind. The character scene remains a curated full-screen block with its internal choreography; a header may precede it and body sections follow it. Header stays first, the single lead (intro or scene) immediately follows it, and footer stays last. Only body sections reorder freely between those boundaries. Nesting and arbitrary dimensions are deferred.

Provide scene, scrolling-feed, and magazine starters; editable theme/site names; preset or custom HEX accent color; modern/editorial/mono typography; paper/warm/night surfaces; reading/wide content width; airy/compact spacing; block insertion/removal/reordering, text properties, and feed category, row/card layout, and progressive loading. Content bindings reference the shared article collection; no copied articles belong in themes. Project blocks use honest empty states until project content exists.

Draft edits save locally without changing the applied theme. Preview renders the draft through the same renderer used by the homepage. Apply snapshots the valid draft; restore copies the applied theme back to the draft. Clearly communicate storage failures and draft replacement. Theme creation begins from a starter; a multi-theme saved library is deferred.

Article URLs use `/yazilar/[slug]`, independent of the chosen theme. Fixture content remains visibly marked as sample content. The site remains non-indexable during this prototype stage.

Runtime validation must reject unsupported schema versions, unknown block kinds, duplicate block identities/kinds, invalid enum values, and oversized strings. Do not persist executable markup or component names supplied by users. Define the backend storage schema and API separately after reviewing this editor.

## Selection and editor UX

The embedded canvas has edit and visitor-navigation modes. In edit mode, selecting a page block opens its corresponding properties. Selecting from the structure list scrolls the canvas to that block; selected content remains bright while other sections dim. Theme-wide properties clear the spotlight. Selection is transient editor state, not stored theme content. Respect reduced motion.

Removing the last block is allowed in a draft; show an empty canvas and allow undo of the last removal. Applying requires at least one actual content block. Choosing any starter immediately loads its composition into the draft, including when it is already selected. No selection notice or replacement confirmation is shown. Site name and accent are retained; homepage application remains a separate action. Explicit restore still asks for confirmation.

Controls use readable type and touch-sized targets. Show structure, live canvas, and properties together on desktop. The structure list stays visible while the owner changes block properties; only general theme appearance uses a separate inspector tab. Use readable controls and natural responsive canvas width rather than shrinking an oversized desktop artboard. Preview uses the actual available width at scale 1, so text remains readable and responsive layout is real. Mobile stacks full-width panels; a separate 390px phone preview remains available.

## Next builder increments

This remains a flat composition prototype. Evolve toward reusable theme libraries, richer block variants, supported grid/column containers, per-block appearance, navigation and interaction choices, and content editing. Define constraints for each container and block role before adding free-form placement. Shared article summaries, reading tools, and nostalgia collections are owned by the feature documents under `features/`.

Supported per-block compositions currently include statement/centered/split intros, rows/cards for articles, and band/card quotations. Magazine starts with a centered intro and inset quote card; these choices affect layout while page-role boundaries remain enforced.

The curated character art, background halo, and choreographed scene structure are protected design elements. Theme accent colors apply to intentional UI marks and content presentations, not the halo or the character asset.


## Unified page canvas — 2026-10-02

Studio must expose home, article and series pages through one page navigator. Use the same renderers as the visitor site; selecting visible content opens the corresponding properties and selecting properties highlights/scrolls the canvas. Keep desktop navigation, canvas and inspector visible together. Document links bring the target document into Studio.

The current implementation creates/edits independent articles and series. Article title/abstract/body/media/table/code and bounded page presentation are browser-local content records; series content/presentation have the same explicit-save workflow. These edits are independent of homepage block composition and theme Apply. Unsaved document edits stay isolated and require Save/Revert before switching. Arbitrary custom-page creation, media uploads, authenticated server publication, server persistence and server SEO metadata remain future work. New articles need no series membership and are listed newest first.

Article-first authoring supports independent writing, a chosen existing series, or a new series entered below the current canvas. A series is saved before the writing; writing Save commits its series membership together with its content. Articles and series have draft/published/archived/trashed states; delete means reversible trash, not permanent erasure. Hidden writing is excluded from visitor catalogs, permalinks and series chapter navigation. Series archive/trash preserves all member articles.
