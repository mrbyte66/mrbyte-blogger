# Visual direction

## Current prototype

The first theme uses a single-screen, character-led scene inspired by the user's L.I.S.A. reference. Keep this theme composed as an intentional scene; reading panels can scroll independently. These rules apply to this theme only. Other themes may use scrolling feeds or entirely different navigation; shared builder requirements live in `../../docs/site-builder.md`.

Preserve the original curly-haired CRT character and rounded black glasses. The current implementation masks only the baked eye locations with blank screen glass and draws the animated eyes on top. Eye gaze and blinking should work; do not warp or rotate the raster head. Later portrait/hair experiments are historical and are not the active direction.

Use expressive editorial typography, a restrained cool/silver environment, graphite text, and mint accents. Writing and code must remain comfortable to read. Navigation to writing, projects, and about should feel smooth while keeping the scene's identity present.

## Motion and access

Motion should support the scene rather than obscure content. Honor `prefers-reduced-motion`, provide the existing motion control, pause ambient behavior when appropriate, and keep every action keyboard accessible with visible focus. Touch and small screens need a deliberate responsive composition and readable content surfaces.

## Guardrails

- Preserve this theme's scene layout; implement a scrolling feed as another theme rather than replacing its identity.
- Do not generate or substitute a new portrait/character asset without a fresh request.
- Do not claim real 3D or rigged animation: the current character is a raster image with a composited animated screen.
- Keep design decisions and notable experiments current in this document; keep code boundaries in `frontend.md`.
