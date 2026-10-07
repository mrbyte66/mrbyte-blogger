# Modular reading tools

Read `../../docs/features/reading-tools.md` for public/private ownership and future scope. The module is enabled on permanent article pages, independently of the current theme. Guests keep marks in this browser; verified members keep them in their account (API contract §5).

- `components/reading/ReadingTools.tsx`: selection capture, accessible toolbar/panel, note form and mark workflow. Props: `articleId` (local key: the slug), `contentRootId` and optional `server` (`{id, revisionId, blockIds}` of a published server article). With a verified member and `server`, marks are loaded from and written to the account (optimistic, rolled back on failure; undo re-creates the same mark ID with `If-None-Match:*`).
- `lib/reading/server.ts`: API adapter. The page anchors paragraphs by stable block UUID (`data-reading-anchor`) with `data-reading-legacy="paragraph-N"` as an alias for older guest notes; the abstract is `excerpt` on the page and `abstract` in the API.
- `lib/reading/model.ts`: validated mark document, paragraph fragments, UTF-16 text offsets, quote/context resolution and DOM Range creation.
- `lib/reading/storage.ts`: versioned per-article local storage adapter and visible failure states.
- `components/ArticleContent.tsx`: stable `data-reading-anchor` hooks on excerpt and body paragraphs.
- `components/builder/ArticlePage.tsx`: root `reading-content` and module composition.
- `app/reading-tools.css`: touch targets, desktop edge cluster/mobile bottom toolbar, highlight styles and list UI.

Apply highlights via the browser Highlight registry without wrapping or mutating React text nodes. Validate stored documents, IDs, kinds, fragment offsets/text lengths and limits before using them. An unresolved or ambiguous fragment remains in the list; never paint an unrelated passage. Current anchor IDs are fixture paragraph positions, and text/context verification protects against shifted content. Production content must supply stable block identities and versions before editing/publishing integration.

Toolbar and closed panel never cover article text. Reserve space on desktop while the note panel is open; mobile uses a dismissible bottom panel. Support keyboard focus, reduced motion, local storage errors and browsers without highlight rendering. No raw HTML is accepted for notes.

Selection remains available while the reader invokes an annotation action. On pointer release or collapse outside the toolbar/panel, clear the stale selection preview and native browser selection; keep stored highlights until the visitor removes that saved record. Never leave a stale quote eligible for a later action.

Guest marks remain private to the local browser. Member marks are private account records; the owner cannot read them. Public owner annotation layers remain future work.

Reference: [MDN CSS highlight pseudo-element](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::highlight).

`ReadingTools.contentRevision` triggers anchor re-resolution when a saved article changes in another Studio/reader instance. Clear any stale active selection; retain saved quotes and show the unresolved notice rather than highlighting unrelated replacement text.

Changing identity remounts the annotation tools and clears prior marks/selection. Guest notes are never silently imported: a verified member sees an explicit "Misafir notlarını hesabıma aktar" action; the import uses one `clientImportId` per local document (safe to retry) and removes only the accepted local marks.
