# Modular reading tools

Read `../../docs/features/reading-tools.md` for public/private ownership and future scope. The first module is browser-local and enabled on permanent article pages, independently of the current theme.

- `components/reading/ReadingTools.tsx`: selection capture, accessible toolbar/panel, note form and local mark workflow. Props: `articleId` and `contentRootId`.
- `lib/reading/model.ts`: validated mark document, paragraph fragments, UTF-16 text offsets, quote/context resolution and DOM Range creation.
- `lib/reading/storage.ts`: versioned per-article local storage adapter and visible failure states.
- `components/ArticleContent.tsx`: stable `data-reading-anchor` hooks on excerpt and body paragraphs.
- `components/builder/ArticlePage.tsx`: root `reading-content` and module composition.
- `app/reading-tools.css`: touch targets, desktop edge cluster/mobile bottom toolbar, highlight styles and list UI.

Apply highlights via the browser Highlight registry without wrapping or mutating React text nodes. Validate stored documents, IDs, kinds, fragment offsets/text lengths and limits before using them. An unresolved or ambiguous fragment remains in the list; never paint an unrelated passage. Current anchor IDs are fixture paragraph positions, and text/context verification protects against shifted content. Production content must supply stable block identities and versions before editing/publishing integration.

Toolbar and closed panel never cover article text. Reserve space on desktop while the note panel is open; mobile uses a dismissible bottom panel. Support keyboard focus, reduced motion, local storage errors and browsers without highlight rendering. No raw HTML is accepted for notes.

Anonymous marks remain private to the local browser. They are not owner-public annotations, server-saved records, or an authenticated account feature. Public layers and syncing require separate backend contracts.

Reference: [MDN CSS highlight pseudo-element](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Selectors/::highlight).
