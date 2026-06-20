# Fix: harden flaky editor e2e + record the gate-push lesson

**Branch:** `fix/flaky-editor-spec` (off `develop`). Merge after approval; reset this file
to the placeholder first.

## Why
`editor.spec.ts` intermittently failed under the 8-worker parallel run (`***FirstPara***` —
both marks piling onto the first paragraph). A flaky gate is dangerous: it red-lit `npm run
check` mid-merge, and a loose `;`-chained push shipped through it.

## Root cause
The toolbar buttons run `editor.chain().focus().toggleMark()`. Clicking a button blurs the
editor; `.focus()` restores ProseMirror's internal selection. Under load the keyboard
selection (`Home`/`Shift+End`) hadn't propagated into ProseMirror before the click's
`.focus()` fired, so the mark landed on the stale (still-selected) paragraph. Product is
fine — real users don't click that fast; it's a test-automation race.

## Plan
1. `tests/e2e/editor.spec.ts`: before each toolbar toggle, assert the toolbar `aria-pressed`
   reflects the new selection (`italic` false on the plain second paragraph) — a deterministic
   sync point that waits for the selection to land before toggling. Keeps full toolbar coverage.
2. `tasks/lessons.md`: record the gate-push lesson (`&&` not `;`; gate must be green to push).
3. `CLAUDE.md` step 5: make "push only if green, chain with `&&`" explicit.

## Review
Done.
- **Test fix:** added `aria-pressed`-based selection-sync assertions in `editor.spec.ts`. The
  key one — `italic` reads `false` after selecting the second paragraph — forces a wait until
  the caret has moved off the now-italic first paragraph, eliminating the race. Verified:
  editor spec **10/10** with `--repeat-each`, and **two full `npm run check` runs green** (the
  contention scenario where it used to flake).
- **Lesson + procedure:** `tasks/lessons.md` gains the gate-push rule; `CLAUDE.md` step 5 now
  says push **only if green**, `&&`-chained never `;`.
- Root cause was test timing, not product behaviour — editor component untouched.
