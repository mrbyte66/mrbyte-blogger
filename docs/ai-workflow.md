# AI-assisted issue workflow

Issue başlıkları, açıklamaları, pull request açıklamaları ve test yorumları Türkçe ve kısa yazılır. Teknik terimler gerektiğinde korunur; her issue tek bir işi ve açık tamamlanma ölçütlerini anlatır.

## Branch standardı

Her iş güncel `origin/main` üzerinden ayrı branch ve worktree ile başlar:

| İş | Branch |
| --- | --- |
| Yeni özellik | `feature/<issue>-<kisa-ad>` |
| Hata düzeltme | `bugfix/<issue>-<kisa-ad>` |
| Acil canlı hatası | `hotfix/<issue>-<kisa-ad>` |
| Bakım veya doküman | `chore/<issue>-<kisa-ad>` |

Adlar küçük harfli, ASCII ve tireli olur; örnek: `bugfix/13-avatar-boyutu`.
Kalıcı `dev` veya `hotfix` branchi kullanılmaz. `main` testten geçmiş ortak sürümdür.
PR başlığı kısa Türkçe olur ve açıklaması ilgili issueyu `Closes #13` gibi bağlar.
PR numarasını GitHub otomatik verir; bu numara branchte kullanılan issue numarasından farklıdır.
Bağımsız test geçmeden merge yapılmaz ve iş `Done` durumuna alınmaz.

## Roles

- **Coordinator:** reviews incoming work against the roadmap and open issues, writes acceptance criteria, identifies dependencies and likely files, and assigns one owner. The coordinator integrates work and decides whether scope changes are needed.
- **Implementer:** owns one issue and one branch/worktree. It checks open work for overlap, implements only the accepted scope, runs relevant checks, and opens a pull request linked to the issue.
- **Tester:** independently checks the issue's acceptance criteria against the implementation and runs the relevant tests or browser flow. The implementer must not mark its own work as independently tested.

For the first trial, Codex handles coordination and implementation; a separate Codex conversation performs the test. Claude can be added later as another implementer after this flow is stable.

## Issue intake and parallel work

1. Before creating an issue, search open issues and pull requests for duplicates, dependencies, and conflicting scope. Update an existing issue when appropriate.
2. Every actionable issue states the user-visible result, acceptance criteria, non-goals, dependencies, and likely affected areas. Split work that cannot be reviewed or tested as one change.
3. Assign each active issue one implementer and a separate branch/worktree. Never have two implementers edit the same worktree.
4. Parallelize only when likely file ownership and shared decisions do not overlap. If they overlap, sequence the issues or agree on a small contract first. New urgent work is triaged against active work before interrupting it.
5. Keep each change in a focused pull request linked with `Closes #<issue>`. Do not merge multiple pull requests simultaneously. Before testing/merging, bring the branch up to date with the latest `main` and rerun the relevant checks.

## Status lifecycle and manual test gate

The GitHub Project uses `Todo → In Progress → In Test → Done`.

- A new issue enters `Todo`; an implementer starts it by moving it to `In Progress`.
- Linking its pull request moves it to `In Test` through the existing Project workflow.
- The tester checks every acceptance criterion and records the exact commands/browser steps and observed result in an issue comment.
- **Pass:** tester records `PASS`; coordinator/authorized integrator merges the pull request. The existing Project workflow moves the item to `Done` after merge.
- **Fail:** tester records `FAIL`, lists reproducible findings and expected behavior, and requests changes on the pull request. The existing Project workflow moves the item back to `In Progress`. The implementer fixes the findings and requests another independent test.
- Never merge before an independent pass. A green or absent CI status is not part of this process; checks are run and reported manually.

## Integration and conflict rules

- Treat `main` as the integration point. Merge one tested pull request at a time.
- After another change merges, refresh the next branch from `main`, resolve any conflicts in that issue's branch, and repeat the relevant test before merge.
- If a conflict changes product behavior or a shared contract, pause the affected implementation and ask the coordinator to record the decision in the owning product/API document.
- The tester should not silently rewrite implementation code. It reports findings; the implementer fixes them.
- Keep discussions and handoffs in the GitHub issue or pull request so another conversation or model can resume without private chat context.

## Triggers and current limits

GitHub Project status automation handles item-added, pull-request-linked, changes-requested, and pull-request-merged transitions. It does not start coding or testing agents, nor does an issue comment itself move an item back to `In Progress`.

For now, a person starts each Codex conversation and hands it the issue/PR link. The daily repository review and automatic issue creation are not enabled: they need a reliable scheduled runner with authenticated GitHub access. Do not create issues from speculative findings; verify the defect, check for duplicates, and include reproduction/acceptance criteria first.

## First trial

Use one small, isolated issue first. Run it through intake, implementation, PR, independent test, and merge. Record friction or missing permissions in this document before adding a second parallel issue or connecting Claude.

## Conversation handoff prompts

Start a fresh conversation for each implementer/tester assignment and include the repository and issue/PR link. The GitHub issue and pull request are the shared record; do not rely on another conversation's private context.

**Implementer:**

> Implement GitHub issue #ISSUE in this repository. Read `AGENTS.md`, `docs/ai-workflow.md`, and the relevant frontend/backend instructions. Check active issues and PRs for overlap. Work only in an isolated branch/worktree, meet the issue's acceptance criteria, run and report relevant checks, and open a focused PR linked to the issue. Do not merge. If scope or an overlapping contract is unclear, stop and report the specific decision needed.

**Independent tester:**

> Independently test issue #ISSUE and PR #PR in this repository. Read the issue, PR diff, and `docs/ai-workflow.md`. Do not change implementation files. Verify each acceptance criterion with tests or reproducible browser steps, and check likely regression areas. Report PASS or FAIL with evidence. On failure, list concise reproducible findings and request changes; on pass, state that the coordinator may merge. Do not merge.
