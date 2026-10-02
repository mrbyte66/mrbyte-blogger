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

The backend is intentionally unimplemented until the earlier product decisions are ready.

## Planned extensions

- Modular reading, highlighting, and private/public annotation rules: [reading tools](features/reading-tools.md).
- Owner-managed nostalgia collections with music and other media: [nostalgia corner](features/nostalgia-corner.md).
- Separate Studio summary input and a permanent “read full article” link: [article summary](features/article-summary.md).

Anonymous local reading tools now have a first frontend implementation on permanent article pages. Public owner annotation publishing and account sync, the nostalgia corner, and editable article summaries remain planned.
