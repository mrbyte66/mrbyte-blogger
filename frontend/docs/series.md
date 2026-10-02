# Frontend blog series

Series are browser-local editorial records. Existing article slugs serve as stable references; chapter order does not change article URLs. This prototype does not simulate backend publication.

- `lib/series/model.ts` owns validated `BlogSeries`, fixtures, Turkish-to-ASCII slugs and single-series article membership. Both drafts and published series reserve membership. Published series require a chapter; only existing fixture articles are selectable.
- `lib/series/use-series-workspace.ts` owns local storage and same-window / cross-tab synchronization. Failed saves return `false` without changing the saved list; Studio should retain unsaved editor fields.
- Reading-history data is reserved for authenticated members after authentication/backend implementation. Visits will be recorded automatically; they must never imply completion. There is no manual completion control or simulated guest/member progress in this prototype. Existing legacy progress keys are not read or reused.
- `SeriesCatalog` renders published cards or an ordered chapter list. Catalog → series details changes directly, including ordinary standalone links; opening a chapter uses the shared cover navigation. Selected panel headings use `panel-title` for focus; standalone detail uses `h1`.
- Chapter cards show article-body sentences until the preview reaches at least 200 characters, then finish the current sentence. Do not append an extra ellipsis. The separate editorial abstract remains available on the article page and is not repeated as the chapter-card preview.
- `lib/use-progressive-items.ts` supplies five-item batches for article feeds and chapter lists, with a scroll-root-aware intersection sentinel and an accessible button fallback. `ContentPanel` retains chapter limits while opening/returning from a chapter so loaded cards and scroll/focus context remain available. This finite fixture list does not invent endless duplicate content.
- `SeriesArticleNav` renders chapter position, previous/next and series return. It does not record anonymous visits or show completion controls. It discovers published membership from the shared series workspace.
- `/seriler/[slug]` accepts browser-created series without a rebuild. Metadata is meaningful for the known fixture; arbitrary local records cannot supply server metadata or server 404 status. The UI shows an unavailable state for absent/draft series.
- `app/series.css` uses the site's palette and readable touch controls. No hardcoded light surfaces override shared dark mode.

All current articles are editorial fixtures; publication filtering applies to series. An article-level publication model will need its own validation and filtering when actual article editing arrives.

## Demonstration fixtures and migration

Three published demonstration series cover software, literature and culture. The software series has ten distinct example articles. No article is assigned twice. These are editorial previews, not the owner's published writing.

`upgradeDemoSeries` upgrades only the exact original, untouched single demo record to the expanded three-series fixture set. A renamed series, reordered chapter list, changed status, empty collection or additional custom record must remain unchanged. Do not inject new demonstration records into an author's edited collection. The workspace saves the upgrade when storage is available and retains usable content if persistence fails.

## Future authenticated visit history

After real authentication and backend exist, an authenticated member's successfully opened article page can record an automatic visit associated with that account. Membership history should show which chapters were visited, never label them completed or read. Anonymous readers see the default presentation. No checkbox, fake account, guest tracking or local completion state should substitute for this future contract. Account synchronization and backend schema are deliberately deferred.
