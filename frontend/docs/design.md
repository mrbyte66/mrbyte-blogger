# Visual direction

## Current prototype

The first theme uses a single-screen, character-led scene inspired by the user's L.I.S.A. reference. Keep this theme composed as an intentional scene; reading panels can scroll independently. These rules apply to this theme only. Other themes may use scrolling feeds or entirely different navigation; shared builder requirements live in `../../docs/site-builder.md`.

Preserve the original curly-haired CRT character and rounded black glasses. The current implementation masks only the baked eye locations with blank screen glass and draws the animated eyes on top. Eye gaze and blinking should work; do not warp or rotate the raster head. A future feature note describes a real multi-view character interaction; until a suitable rig or multi-view asset exists, keep the approved flat artwork static. Later portrait/hair experiments are historical and are not the active direction.

Use expressive editorial typography, a restrained cool/silver environment, graphite text, and mint accents. Writing and code must remain comfortable to read. Navigation to writing, projects, and about should feel smooth while keeping the scene's identity present.

## Motion and access

Motion should support the scene rather than obscure content. Honor `prefers-reduced-motion`, provide the existing motion control, pause ambient behavior when appropriate, and keep every action keyboard accessible with visible focus. Touch and small screens need a deliberate responsive composition and readable content surfaces.

## Guardrails

- Preserve this theme's scene layout; implement a scrolling feed as another theme rather than replacing its identity.
- Do not generate or substitute a new portrait/character asset without a fresh request.
- Do not claim real 3D or rigged animation: the current character is a raster image with a composited animated screen.
- Keep design decisions and notable experiments current in this document; keep code boundaries in `frontend.md`.

## Reading panel refinement

The scene navigation is the single entry to writing, projects and about; the duplicate header index action is removed. Desktop panels use up to 1040px / 72vw, preserving the blurred character at the left. Compact single-line section headings prioritize the first content cards. Screen gaze and blinking remain active while the panel is open, respecting motion preferences. Article figures fit the reading width; wide tables and code scroll within their own surfaces, with keyboard-accessible table regions. The technical article fixture includes a diagram and table for layout review.

Article navigation stays in the fixed panel topbar. Esc returns from an article to its filtered list; a second Esc closes the panel. Series add one level: chapter → ordered chapters → series catalog → scene. Alt+Left and the visible touch strip use the same return path. The strip supports a deliberate rightward swipe (84px, at most 32px vertical drift, under one second), with feedback and cancellation for vertical scroll. Native text selection recolors only the selected glyphs, with a transparent background; rectangular backgrounds are reserved for saved marker highlights; cards use a quiet surface and border emphasis on hover, with a separate visible keyboard outline. Never add an underline as hover or focus feedback; baseline prose-link underlines and user-authored reading annotations remain semantic content. Darker scene/backdrop and stronger title contrast prioritize the reading panel.

Shared reader preferences are owned by `SitePreferences` in the root layout. An explicit visitor light/dark preference applies to the entire site, articles, Studio and embedded previews, taking precedence over the theme’s authored default surface without altering its saved configuration. Tabs synchronize through storage events. The pre-paint script applies the stored palette before hydration. Selection uses saturated teal glyphs in light mode and bright lime glyphs in dark mode; code uses the bright glyph color against its always-dark surface. Studio destructive actions retain a rose surface, border and text in dark mode; thumbnail icons have their own contrasting palette.

Motion uses shared easing and duration tokens in `app/preferences.css` and the cover movements in `app/transitions.css`. Panel entry is 420ms with deceleration; opaque exit slides right in 240ms. Closing preserves the last visible content. Reserve cover motion for meaningful spatial navigation: opening a reading article, changing chapter and returning to the previous reading level. Writing/series tabs and catalog → series details update without a cover transition; tabs use a short, local ripple on the activated control rather than moving the content. Favor the fewest movements needed to explain the action, and avoid combining animations that compete with reading. Inside the panel, `CoverTransition` shifts the old content 24% left while the new content covers it from the right in 420ms; return reverses the movement in 360ms. Its old DOM snapshot is inert, hidden from assistive technology, stripped of IDs and removed after the animation. Previous chapter navigation also reverses direction.

`SlideLink` and root `RouteMotion` use native View Transitions for internal permalinks; unsupported browsers use a temporary inert DOM snapshot with the same cover movement. Modified/new-tab clicks retain normal link behavior. Route snapshots wait for the pathname change; failed/slow navigation has a bounded cleanup. Reading panels retain native scrolling; passive edge listeners add at most 14px of elastic feedback and never prevent wheel/touch scrolling. Global motion-off and OS reduced-motion disable transitions, elasticity and programmatic smooth scrolling. No simulated frame-rate claims.

## Catalog cards

Keep writing and series catalogs minimal: consistent rounded cards, comfortable 18–22px reading-panel padding, restrained metadata and compact headings. Selection feedback belongs to the card border and surface, never an underlined title. Use existing ink, panel and surface tokens in every palette; keyboard focus stays clearly visible and distinct from hover.

The scene writing catalog uses medium-sized cover cards in two columns, switching to one when the catalog container is 540px or narrower. Series remain large full-width cards in the scene panel, so their hierarchy is visible before reading labels. Writing cards place the cover above category, title, short abstract and reading time; omit the old numeric index and large plus. Keep titles readable and fully visible, with at most three visual lines of abstract. Native five-at-a-time loading and return focus remain intact.

Prototype covers are original local SVG illustrations (orbit, code, pages, arches), selected by explicit demo mappings/category fallback. They are not online search or AI-generated content matches. `CatalogCover` displays authored series images first and falls back to local artwork on load failure. Series detail/Studio previews share the same artwork. Cover frames reserve their ratio before loading; there is no new zoom/parallax motion.

Series chapters use the same `ArticleCard` with a small chapter badge. Their body-derived previews retain complete sentences without line clamping/ellipsis. Default chapter cards use two columns; the explicit Studio row presentation remains a single-column cover-card variant. All chapter layouts collapse on narrow containers. Read-only view and monochrome clap counts appear on article cards; series cards aggregate published chapter counts. Modal and permalink readers share one compact translucent engagement bar after the article, grouping views, reversible claps and sharing outside authored fields; no additional navigation motion is introduced. Prototype view totals count each visible article summary and article reading view once per mounted impression; browser storage is local and does not represent site-wide analytics.

## Studio command area

Keep Studio commands on one desktop row: compact identity, one page picker, quiet state and contextual save/actions. Article relationships belong near the canvas; show independent/existing/new series in a single selector. An inline series form opens below the canvas and returns to it after save/cancel. Series precede writing in the page picker, with clear 16px theme-aligned group headings. Keep edit fields, canvas and inspector simultaneously visible on desktop. Archives/trash use explicit navigation filters and reversible actions.

## Member library prototype

Article cards retain a dedicated open control and a sibling bookmark control; never nest buttons inside article links/buttons. The bookmark uses the same monochrome icon language as the reader engagement bar. Saving first targets the default collection, then offers a compact category picker, category creation and removal. `/kaydedilenler` centralizes filtering, moves, category naming/removal and unavailable saved articles. Removing a category moves its records to the default collection. Explicit member-preview labeling and an optional guest preview distinguish the prototype from real authentication. Counts represent only the local demo member; no invented visitor totals.

Library cards have no detached category/removal row. Use their existing bookmark menu for optional management. Category selection is a draft until “Taşı”; moving an existing save preserves its insertion position. Explicit links returning from the library reveal the site from the left while the library slides right. The opt-in sound control sits at the lower right with a quiet monochrome circular surface; in the native modal it lives in the footer, with the same bottom/right inset on desktop reading pages. On narrow reading pages it clears the notes toolbar. The 44px translucent monochrome control remains available in Studio. A tiny decorative four-bar indicator runs only while playing and respects motion preferences; never autoplay.

The character scene embeds music beside motion and appearance in one restrained translucent footer group, with matched 44px control heights and monochrome icons. Narrow screens retain icon controls without crowded labels. The tooltip gives a short Mozart biography rather than repeating playback duration.

Featured scene cards share the original frosted-glass treatment. Keep the article at lower left and the optional series at lower right; no meaningless bracket ornament. On mobile, render both cards below a compact single-line navigation bar, above the footer. Writing cards place categories and a subdued calendar date on a shared metadata row; chapter numbering follows row-major grid order. Series cards never display difficulty ratings or dates.

When scene motion is enabled, featured glass cards drift independently with perspective (850px), roll (±1°), pitch (±4°), yaw (±6°), and a few pixels of translation. Slow 8.4/10.2-second cycles with different phases suggest opposite corners dipping into water. Hover preserves the drift; keyboard focus and canvas editing pause it. Disabled motion and reduced-motion preference remove it. Animate only transforms, keeping the glass surface and readable text intact. Passive scene navigation in canvas edit mode must not animate as an active destination.
