# Frontend blog series

Series are browser-local editorial records. Existing article slugs serve as stable references; chapter order does not change article URLs. This prototype does not simulate backend publication.

- `lib/series/model.ts` owns validated `BlogSeries`, fixtures, Turkish-to-ASCII slugs and single-series article membership. Series have no difficulty/level metadata; legacy level fields are ignored and removed when normalized. Both drafts and published series reserve membership. Published series require a chapter; only existing fixture articles are selectable.
- `lib/series/use-series-workspace.ts` owns local storage and same-window / cross-tab synchronization. Failed saves return `false` without changing the saved list; Studio should retain unsaved editor fields.
- Verified members' permalink openings are recorded automatically (`POST /me/visits`); series detail shows a "Son açtığın bölüm" link from `/me/series/{id}/history`. Visits never imply completion; there is no manual completion control or guest progress. Legacy progress keys are not read or reused.
- Series cards and detail pages never display a publication date or difficulty label. Chapter cards share the article date presentation; their sequence comes from author-controlled `articleSlugs`, independently of the article publication date. In the two-column grid, reading order is first left, second right, third on the next row.
- `SeriesCatalog` renders published cards or an ordered chapter list; the explicit preview flag also renders the current draft series without publishing it. Catalog → series details changes directly, including ordinary standalone links; opening a chapter uses the shared cover navigation. Selected panel headings use `panel-title` for focus; standalone detail uses `h1`.
- Series catalog cards are editorial feature cards with a large cover area (or a restrained typographic placeholder) and optional author-provided HTTPS/site-local cover image. Set the image in Studio; image paths are validated and preserved in browser-local series records. List presentation keeps a compact horizontal cover.
- Chapter cards show article-body sentences until the preview reaches at least 200 characters, then finish the current sentence. Do not append an extra ellipsis. The separate editorial abstract remains available on the article page and is not repeated as the chapter-card preview.
- `lib/use-progressive-items.ts` supplies five-item batches for article feeds and chapter lists, with a scroll-root-aware intersection sentinel and an accessible button fallback. `ContentPanel` retains chapter limits while opening/returning from a chapter so loaded cards and scroll/focus context remain available. This finite fixture list does not invent endless duplicate content.
- `SeriesArticleNav` renders chapter position, previous/next and series return. It does not record anonymous visits or show completion controls. It discovers published membership from the shared series workspace.
- `/seriler/[slug]` accepts browser-created series without a rebuild. Metadata is meaningful for the known fixture; arbitrary local records cannot supply server metadata or server 404 status. The UI shows an unavailable state for absent/draft series.
- `app/series.css` uses the site's palette and readable touch controls. No hardcoded light surfaces override shared dark mode.

All current articles start as editorial fixtures and their existing content can be edited in Studio; publication filtering applies to series. An article-level publication model will need its own validation and filtering when actual article editing arrives.

## Demonstration fixtures and migration

Three published demonstration series cover software, literature and culture. The software series has ten distinct initial example articles. No article is assigned twice. These are editorial previews, not the owner's published writing.

`upgradeDemoSeries` upgrades only the exact original, untouched single demo record to the expanded three-series fixture set. A renamed series, reordered chapter list, changed status, empty collection or additional custom record must remain unchanged. Do not inject new demonstration records into an author's edited collection. A custom cover or page presentation also prevents demo migration. The workspace saves the upgrade when storage is available and retains usable content if persistence fails.

## Future authenticated visit history

After real authentication and backend exist, an authenticated member's successfully opened article page can record an automatic visit associated with that account. Membership history should show which chapters were visited, never label them completed or read. Anonymous readers see the default presentation. No checkbox, fake account, guest tracking or local completion state should substitute for this future contract. Account synchronization and backend schema are deliberately deferred.

Series authoring now lives in the shared Studio page navigator and `SeriesProperties`, beside the actual series page canvas. The former standalone `SeriesStudio` form has been removed so authoring has a single entry point. Per-series `presentation` controls heading alignment and chapter card/row style. Covers appear on both catalog cards and the series detail page.
