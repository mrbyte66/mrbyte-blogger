# Frontend blog series

The Spring editorial API owns UUID identity, lifecycle, membership and order. Slugs are public URLs and can have server308 aliases; they are not personal-data identities. Public SSR/overlay queries expose only published/public chapters and contiguous display numbers. Members cannot edit series or access Studio.

`lib/api/content.ts` adapts public summaries/detail. `lib/api/studio.ts` adapts versioned owner records, preserves chapter order and submits versions only for changed article membership. New series remain drafts until an explicit publish command. Empty public series are hidden/drafted by the server. There is no difficulty metadata and series cards do not show an article date. Article cards retain display dates inside chapter lists without changing manually chosen chapter order.

`SeriesCatalog`, `SeriesArticleNav` preserve existing visual/navigation behavior; permanent `/seriler` catalogs provide crawlable pagination and detail pages use SSR metadata/canonical/schema.org. Overlay navigation loads actual detail and public chapters. `SeriesResume` uses authenticated private visits and never describes a visit as proof of completed reading.

The model's fixtures/browser-local branches remain isolated test/legacy-transfer material. No fixture becomes production content automatically. Future personalized recommendations/portal behavior remain outside V1.
