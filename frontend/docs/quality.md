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

Log completed verification in `docs/coordination.md`. Distinguish verified behavior from limitations. No zero-bug guarantees.

