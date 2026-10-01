# Product brief

## Goal

Build a distinctive, responsive personal publishing site that can grow into a visual site builder. Version one is for its owner, a software developer writing mainly about AI and software, with room for books, culture, quotations, poetry, stories, and project demos. In the distant future, pages could host interactive experiments or games.

## Visitor experience

- A character-led, futuristic landing scene with expressive typography and smooth transitions. Avoid a conventional long-scroll marketing homepage.
- Visitors can explore writing, projects, and about information through the scene.
- The visual style can be experimental while reading surfaces remain clear for prose and code.
- Responsive behavior, keyboard access, reduced-motion support, and search discoverability are requirements.

## Owner experience

The longer-term product is a private, password-protected admin and block-based site builder. The owner should compose pages from curated blocks and arrange them without tuning pixel dimensions. Templates, themes, light/dark mode, language variants, SEO fields, and publishing workflows can be added incrementally.

## Content and URLs

Content types can expand over time: articles, notes, projects/demos, quotes, poems, stories, and pages. Public slugs should be stable, readable, and URL-safe; Turkish characters should normalize to ASCII. Keep title, slug, language, SEO metadata, publication status, and block content conceptually separate.

## Delivery sequence

1. Settle the visitor-facing design and navigation in the frontend prototype.
2. Specify the block model and admin workflows.
3. Agree on API contracts and persistence needs.
4. Implement the backend and database.
5. Add builder features in small, independently testable increments.

The backend is intentionally unimplemented until the earlier product decisions are ready.
