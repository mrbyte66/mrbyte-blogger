# Modular reading tools

Read `../../docs/features/reading-tools.md` for public/private ownership and future scope. Authenticated reading tools use the private Spring API; anonymous notes are explicitly local. Tools are enabled on permanent article pages independently of theme.

- `components/reading/ReadingTools.tsx`: selection capture, accessible toolbar/panel, note form and revision-aware API/local-guest workflow. The live article UUID/revision is supplied by the server.
- `lib/reading/model.ts`: validated mark document, paragraph fragments, UTF-16 text offsets, quote/context resolution and DOM Range creation.
- `lib/reading/storage.ts`: versioned per-article local storage adapter and visible failure states.
- `components/ArticleContent.tsx`: stable `data-reading-anchor` hooks on excerpt and body paragraphs.
- `components/builder/ArticlePage.tsx`: root `reading-content` and module composition.
- `app/reading-tools.css`: touch targets, desktop edge cluster/mobile bottom toolbar, highlight styles and list UI.

Apply highlights via the browser Highlight registry without wrapping or mutating React text nodes. Validate stored documents, IDs, kinds, fragment offsets/text lengths and limits before using them. An unresolved or ambiguous fragment remains in the list; never paint an unrelated passage. Production anchor IDs are stable document block UUIDs with the current revision UUID. UTF-16 plain text, table tab/newline serialization and quote/context verification protect against shifted content. Legacy positional guest anchors are resolved only during an explicit import; unavailable/old-revision notes stay recoverable without painting unrelated text.

Toolbar and closed panel never cover article text. Reserve space on desktop while the note panel is open; mobile uses a dismissible bottom panel. Support keyboard focus, reduced motion, local storage errors and browsers without highlight rendering. No raw HTML is accepted for notes.

Selection remains available while the reader invokes an annotation action. On pointer release or collapse outside the toolbar/panel, clear the stale selection preview and native browser selection; keep stored highlights until the visitor removes that saved record. Never leave a stale quote eligible for a later action.

Anonymous marks remain private to the local browser. They are not owner-public annotations, server-saved records, or an authenticated account feature. Member note synchronization is implemented against the private API; public annotation layers remain deferred.

Reference: [MDN CSS highlight pseudo-element](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::highlight).

`ReadingTools.contentRevision` triggers anchor re-resolution when a saved article changes in another Studio/reader instance. Clear any stale active selection; retain saved quotes and show the unresolved notice rather than highlighting unrelated replacement text.

Demo members use scoped per-account annotation keys; guests retain the existing browser-local keys. Changing identity remounts the annotation tools and clears prior marks/selection. Guest notes are not silently imported into an account.

`GuestNotesImport` submits bounded explicit batches with stable import IDs and removes only acknowledged guest records. `RecordVisit` records a visible250ms authenticated visit, not completion. `ReadingHistory`/`SeriesResume` read actual private history; unavailable articles do not leak titles. Backend current-revision/ownership validation and retention remain authoritative.
