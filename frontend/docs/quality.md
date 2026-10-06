# Quality contract

Required: meaningful navigation/filter unit tests; component interaction tests where practical; TypeScript check; production build; desktop/mobile browser inspection.

Acceptance:
- Writing, projects and about are reachable from the initial screen.
- Sample article opens, code copy works or reports failure, back preserves browsing context.
- Escape/close returns to the scene and restores focus.
- Topic filtering produces correct results, including empty states.
- Appearance and motion controls have accessible names and state.
- Small viewport fits the stage and offers scrollable readable content.
- Reduced-motion users do not receive ambient/parallax animations.
- No artificial author stats, fake live demo links or unsupported claims.

Builder acceptance:
- Draft edits do not change the homepage until Apply succeeds.
- Restore returns the draft to the applied snapshot; explicit restore requires confirmation, while starter selection loads immediately.
- Block movement preserves identity and structural roles: header first, one lead next, footer last. Duplicate block kinds cannot be added in this first slice.
- Last-block removal produces a recoverable empty draft; applying an empty/header-only/footer-only page is blocked.
- Selecting any starter immediately reloads that starter into the draft without notices or confirmation, retaining site name/accent and leaving the applied homepage untouched.
- Custom colors and appearance settings reach the common renderer; invalid HEX never replaces the last valid color.
- List/canvas selection is bidirectional, highlights only the selected block, scrolls it into view, and respects reduced motion.
- Preview messages require same origin and the known frame/parent source; stale block IDs cannot select phantom controls.
- Stored data is validated; a storage failure does not falsely report a successful application.
- Canvas receives validated parent messages so in-memory draft edits still preview when storage is unavailable.
- Theme switching preserves article URLs and shared content.

Reading acceptance:
- Article selection captures only anchored prose inside the designated content root; nested/multi-paragraph selections remain valid.
- Notes and marks restore in the same browser and article, with validated kinds/IDs/offsets and bounded content.
- Raw note markup renders as text. Highlighting does not mutate React text nodes.
- Missing/ambiguous text locations are reported; stored quotes remain recoverable.
- Storage failures keep session edits without claiming permanent saving.
- Tools remain visible and touch-sized; notes panels do not cover desktop article text. Escape closes the panel and mobile paragraph navigation dismisses it.

Log completed verification in `../../docs/coordination.md`. Distinguish verified behavior from limitations. No zero-bug guarantees.

## V1 integration evidence — 2026-10-06

191 frontend tests, TypeScript and production Next build passed. Real backend suite:56 PostgreSQL/domain/security/OIDC tests plus1 separately run production Next/Spring acceptance. Focused browser QA exercised actual login/bookmark/library/Studio and390px overflow checks. Legacy conversion has3 Python tests plus backend dry-run acceptance. CI defines PostgreSQL18/container checks but was not remotely executed; local Docker is unavailable. Release requires target VPS/TLS/providers/offsite DB+media restore, as documented in docs/backend-implementation.md. Tests must never skip DB coverage or replace an unavailable server with fake successful account/content persistence.
