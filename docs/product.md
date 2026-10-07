# Product brief

## Goal

Build a distinctive, responsive personal publishing site that can grow into a visual site builder. Version one is for its owner, a software developer writing mainly about AI and software, with room for books, culture, quotations, poetry, stories, and project demos. In the distant future, pages could host interactive experiments or games.

## Visitor experience

- The current character-led, futuristic scene is one theme, not a permanent site-wide layout restriction.
- Themes can change page composition and navigation, including scene panels, scrolling content feeds, editorial layouts, and dedicated reading pages.
- The visual style can be experimental while reading surfaces remain clear for prose and code.
- Responsive behavior, keyboard access, reduced-motion support, and search discoverability are requirements.

## Owner experience

The product includes a private, password-protected admin and block-based site builder. The owner creates themes manually by selecting and arranging blocks without tuning pixel dimensions. Theme support is a foundational requirement: a theme can change layout, typography, navigation, motion, and content presentation. AI theme generation is out of the initial scope. See `site-builder.md` for the accepted boundaries. Light/dark mode, language variants, SEO fields, and publishing workflows can be expanded incrementally.

## Content and URLs

Content types can expand over time: articles, notes, projects/demos, quotes, poems, stories, and pages. Public slugs should be stable, readable, and URL-safe; Turkish characters should normalize to ASCII. Keep title, slug, language, SEO metadata, publication status, and block content conceptually separate.

## Delivery sequence

1. Use the current prototype as the first theme reference.
2. Specify independent content, theme composition, and visual-editor responsibilities; validate them with contrasting scene and feed layouts using the same content.
3. Specify the block model and admin workflows.
4. Agree on API contracts and persistence needs.
5. Implement the backend and database.
6. Add builder features in small, independently testable increments.

Backend implementation started on 2026-10-05 from the recorded architecture and API contract; progress by slice is tracked in `backend/README.md`.

For the categorized, consolidated checklist of shipped prototype work, remaining V1 scope, membership V1, V2, and later ideas, see [the project roadmap](roadmap.md).

## Planned extensions

- Content-matched online covers for articles and series, with larger visual writing cards and editable Studio defaults: [automatic covers](features/automatic-covers.md).
- Public site introduction and membership landing page: explain private reading notes, personal workbooks, account syncing, and visit history with clear ownership and privacy boundaries. [Site introduction](features/site-introduction.md).
- Interactive character play: drag to turn the character through 360 degrees, then let it ease back to its resting view after inactivity; add a playful dizzy eye loop. [Character interaction](features/character-interaction.md).
- Modular reading, highlighting, and private/public annotation rules: [reading tools](features/reading-tools.md).
- Owner-managed nostalgia collections with music and other media: [nostalgia corner](features/nostalgia-corner.md).
- Separate Studio summary input and a permanent “read full article” link: [article summary](features/article-summary.md).

Anonymous local reading tools now have a first frontend implementation on permanent article pages. Existing article summaries and content can now be edited in the shared Studio page canvas. Public owner annotation publishing/account sync and the nostalgia corner remain planned.

- Owner-only hidden/locked writing with server-enforced privacy: [private articles](features/private-articles.md).
- Member reading badges/profile progress and configurable owner analytics: [reader progress and analytics](features/reader-progress-and-analytics.md).
