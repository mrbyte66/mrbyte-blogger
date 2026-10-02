# Blog series

Status: implemented as a browser-local frontend prototype. Domain and component contracts are documented in `../../frontend/docs/series.md`. Backend publication, account synchronization and SEO publication remain deferred.

## Reader experience

- The fixed panel header groups Yazılar and Seriler as explicit keyboard-accessible tabs. Keep category filters inside the article view. Tab selection gets local ripple feedback; catalog/series selection does not slide content.
- Series cards show title, short description, level, chapter count and ongoing/completed state. Example: “YZ ile sıfırdan ileri seviyeye”.
- Selecting a series opens its ordered chapter list in the same panel, preserving the blurred character and compact navigation. Provide a simple first-chapter entry and compact chapter cards. Do not expose manual completion or anonymous reading progress.
- Writing and chapter cards use restrained border/surface feedback, with no hover underlines. Lists load five items at a time on scroll, with a manual fallback. Keep catalog headings compact.
- Articles remain individually addressable and discoverable. A series chapter additionally shows series name, chapter position, previous/next chapter and a link back to its chapter list.
- Preserve the originating view, filters and scroll position when returning. Esc and edge swipe go back one level: chapter → series → series list → scene.
- A dedicated /seriler/[slug] permalink uses the same shared light/dark preference and reading layout.
- Member visit history is a future authenticated feature: automatically record successfully visited article pages and show visited chapters for the signed-in account. Visiting never means reading or completing. No manual “Bölümü tamamladım” input, fake login or local guest progress is part of this prototype. Authentication/backend synchronization remains deferred.

## Studio experience

- The Studio inspector has a Seriler content-management tab: title, slug, short summary, level, publication state and ongoing/completed status. Edits require explicit save; switching inspector tabs retains the current form.
- Pick existing articles and order chapters; provide accessible up/down controls alongside any drag interaction. Removing a chapter from a series must not delete its article.
- One series per article is enforced across both draft and published series. Removing a chapter only removes membership. A future article editor can provide the same assignment controls.
- A Seriler page block displays all published series, with configurable heading and card/list presentation. Chapter editing stays in content management. Covers and a featured-series subset are future extensions.
- The current articles are sample fixtures, without article-level publication state. Series publication is validated now; filtering unpublished chapters must accompany the future article publication model. Empty/draft series states are explicit.

## Data and validation

The prototype uses existing stable article slugs as references and an ordered membership list; article URLs stay independent of chapter order. Unique series IDs/slugs and chapter membership are validated, and publication requires at least one valid chapter. Local custom series resolve at /seriler/[slug] without rebuilding; they cannot supply server metadata or server 404 status yet. Backend contracts remain deferred until the frontend interaction is agreed.

## Example content

The frontend includes three clearly labeled demonstration series. The AI/software series contains ten distinct sample articles; literature and culture use their existing example articles. Expanded fixtures upgrade only an exactly untouched original demo collection. User edits, custom series and intentional deletions must be preserved.
