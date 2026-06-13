# Feature: WYSIWYG chapter editor (Tiptap) with a read-only Markdown view

**Branch:** `feat/wysiwyg-editor` (off `develop`). Merge to `develop` only after user approval.
**Plan author:** Opus. **Implementer:** Sonnet, test-first. Gate: `npm test` green.

## Context

Writers don't know that a blank line is required between paragraphs (CommonMark treats a
single Enter as a soft break), and they have no discoverable way to bold/italicize. We're
replacing the raw-Markdown `<textarea>` in `src/components/editor/chapter-editor.tsx` with
a **Tiptap (ProseMirror) WYSIWYG editor**: bold looks bold, Enter makes a real paragraph,
and **Cmd/Ctrl+B/I work cross-platform for free** (ProseMirror's `Mod-` keymap resolves to
Cmd on macOS, Ctrl elsewhere — no custom key handling). A toggle reveals a **read-only
"Markdown" pane** showing exactly what will be stored.

**Hard constraint — storage is unchanged.** Chapter content stays portable restricted
Markdown (paragraph/bold/italic, plus hard breaks), still validated by
`validateChapterContent` (`src/lib/rich-text.ts`) and rendered by `MarkdownContent`
(`src/components/chapters/markdown-content.tsx`). The editor serializes its document to
that exact Markdown subset into the existing hidden `content` field, so **no server
actions, validation, or storage change** — the editor is swapped behind the same form
contract. (`chapter-editor.tsx` was always designed to be swappable; see `CLAUDE.md`.)

## Design decisions

1. **Tiptap, restricted to our subset.** Use `@tiptap/react` + `@tiptap/starter-kit` +
   `@tiptap/pm`. Configure StarterKit to **disable** everything outside the allowlist
   (heading, lists, listItem, blockquote, codeBlock, code, horizontalRule, strike, etc.);
   keep `document`, `paragraph`, `text`, `bold`, `italic`, `history`, and `hardBreak`.
   With those nodes absent from the schema, typing `# ` / `- ` creates nothing and pasted
   headings/links collapse to plain text — and `validateChapterContent` is the final
   server-side backstop regardless.

2. **Hand-rolled doc→Markdown serializer (no `tiptap-markdown` dep).** The subset is tiny,
   and the editor always starts empty (there is no edit-existing-chapter flow — `ChapterEditor`
   is rendered once in `chapter-form.tsx` with no initial content), so we only need
   **doc → Markdown**, never Markdown → doc. A ~40-line pure function gives guaranteed
   subset-compliant output and powers both the saved value and the Markdown view.

3. **Cross-platform shortcuts come from the library.** Tiptap's Bold/Italic extensions bind
   `Mod-b`/`Mod-i`; `Mod` = ⌘ on macOS, Ctrl on Win/Linux. We add **toolbar buttons** as the
   discoverable, deterministically-testable path; the keyboard shortcuts are free.

4. **Testing tiers.** Tiptap is contentEditable/ProseMirror and does **not** run in jsdom
   (it needs DOM range APIs jsdom lacks) — so: unit-test the **pure serializer** in the node
   tier, and test the **editor behavior** with Playwright. Don't add a jsdom test for the
   editor. Existing `markdown-content.test.tsx` is untouched.

5. **Accessibility / selectors.** The editor isn't a labelable control, so associate a
   visible label via `aria-labelledby` (so Playwright `getByLabel('Chapter content')` keeps
   working) and give toolbar buttons `aria-label` + `aria-pressed`.

---

## Step 1 — Pure serializer + unit test (node tier)

### 1a. Failing test — `tests/unit/chapter-markdown.test.ts`
Cover: plain paragraphs join with a blank line; bold → `**x**`; italic → `*x*`; bold+italic
→ `***x***`; a hard break serializes to a CommonMark hard break; **literal `*`/`_` in text
are escaped** so they round-trip as literal; and the invariant that output always passes
validation:
```ts
import { describe, expect, it } from 'vitest';
import { serializeDocToMarkdown } from '@/lib/chapter-markdown';
import { validateChapterContent } from '@/lib/rich-text';

const doc = (content: unknown[]) => ({ type: 'doc', content });
const para = (content: unknown[]) => ({ type: 'paragraph', content });
const text = (t: string, marks?: string[]) =>
  ({ type: 'text', text: t, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });

describe('serializeDocToMarkdown', () => {
  it('joins paragraphs with a blank line', () => {
    expect(serializeDocToMarkdown(doc([para([text('One')]), para([text('Two')])]))).toBe('One\n\nTwo');
  });
  it('serializes bold, italic, and both', () => {
    expect(serializeDocToMarkdown(doc([para([text('a', ['bold'])])]))).toBe('**a**');
    expect(serializeDocToMarkdown(doc([para([text('a', ['italic'])])]))).toBe('*a*');
    expect(serializeDocToMarkdown(doc([para([text('a', ['bold', 'italic'])])]))).toBe('***a***');
  });
  it('escapes literal markdown so it round-trips as text and stays valid', () => {
    const md = serializeDocToMarkdown(doc([para([text('use *stars* and _scores_')])]));
    expect(() => validateChapterContent(md)).not.toThrow();
    // re-parsing must not yield emphasis — the asterisks are literal
    expect(md).toContain('\\*stars\\*');
  });
});
```
Run red: `npm run test:unit -- tests/unit/chapter-markdown.test.ts`

### 1b. Implement `src/lib/chapter-markdown.ts`
A pure function `serializeDocToMarkdown(doc: ProseMirrorDocJSON): string`:
- `doc` → map block children, filter out empty paragraphs, join with `\n\n`.
- `paragraph` → concatenate inline children.
- `text` → escape the text, then wrap by marks: both bold+italic → `***…***`, bold → `**…**`,
  italic → `*…*`.
- `hardBreak` → CommonMark hard break (`\` + `\n`) within the paragraph.
- **Escape** in text nodes: backslash, `` * _ ` ``; and at a paragraph's start, a leading
  `#`, `>`, `-`, `+`, `~`, or `digit.`/`digit)` so typed block syntax can't re-parse into a
  disallowed node. Keep types minimal (define a small local `DocNode` type; no `any`).
- Result is trimmed (no leading/trailing blank lines) so it matches `validateChapterContent`'s trim.

Run green: `npm run test:unit -- tests/unit/chapter-markdown.test.ts`

---

## Step 2 — Add Tiptap and build the editor

### 2a. Dependencies
```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/pm
```
Use the current major (Tiptap v3 line is React 19-ready). If `npm install` reports a React
19 peer conflict, prefer the v3 packages; do **not** use `--force`. Run `npm run typecheck`
to confirm types resolve.

### 2b. Rewrite `src/components/editor/chapter-editor.tsx` (`'use client'`)
- `useEditor({ extensions: [StarterKit.configure({ /* disable non-subset nodes/marks */ })],
  immediatelyRender: false, editorProps: { attributes: { 'aria-labelledby': 'chapter-content-label',
  role: 'textbox', 'aria-multiline': 'true' } }, onUpdate })`.
  - `immediatelyRender: false` is required under Next SSR to avoid hydration mismatch.
- State `markdown`, recomputed from `serializeDocToMarkdown(editor.getJSON())` on `onUpdate`
  (and once on create).
- **Hidden field** `<input type="hidden" name="content" value={markdown} />` — preserves the
  form contract; `createStory` / `createChildChapterAction` read `formData.get('content')` unchanged.
- **Toolbar** (above the editor): `<button type="button">` Bold and Italic, each with
  `aria-label="Bold"/"Italic"`, `aria-pressed={editor.isActive('bold'/'italic')}`,
  `onClick={() => editor.chain().focus().toggleBold()/toggleItalic().run()}`. `type="button"`
  so they never submit the form.
- Visible label `<span id="chapter-content-label">Chapter content</span>` and `<EditorContent editor={editor} />`.
- **"View Markdown" toggle**: a `<button type="button">View Markdown</button>` (`aria-pressed`)
  that reveals a **read-only** `<pre aria-label="Markdown source">{markdown}</pre>` (or readOnly
  textarea). Default hidden — WYSIWYG is the primary surface.
- Replace the old `**bold**` hint with: "Select text and use Bold/Italic (or ⌘/Ctrl+B, ⌘/Ctrl+I)."
- Empty content is still blocked server-side by `validateChapterContent`; native `required`
  doesn't apply to a contentEditable, so don't rely on it. (Optional nicety, not required:
  reflect emptiness for a disabled submit — skip if it complicates the server-component form.)
- Minimal editor styling so bold/italic are visibly distinct (a small CSS module or inline is fine).

`src/components/chapters/chapter-form.tsx` keeps `<ChapterEditor />` as-is (no prop changes).

---

## Step 3 — Playwright coverage

### 3a. New `tests/e2e/editor.spec.ts`
Sign up, go to `/stories/new`, then in the editor (scope to `main`):
- Type "First para", press `Enter`, type "Second para"; publish; assert the reader renders
  **two** `<p>` (`main` `locator('p')` count / distinct paragraph text).
- Select text and click the **Bold** toolbar button → publish → assert `main` shows a
  `<strong>`; repeat for **Italic** → `<em>`.
- Toggle **View Markdown** and assert the pane shows the expected `**…**` / paragraph blank line.
- (Optional) also exercise `page.keyboard.press('Control+b')` on Linux/CI as a smoke check;
  the toolbar button is the authoritative assertion (Mac's ⌘ is handled by Tiptap, untestable here).

### 3b. Update the 4 specs that fill `'Chapter content'`
`reading.spec.ts`, `reporting.spec.ts`, `full-journey.spec.ts` fill **plain** text — confirm
`getByLabel('Chapter content').fill('…')` still works against the contentEditable (Playwright
`fill` supports `[contenteditable]`; `getByLabel` matches via `aria-labelledby`). If `fill`
is unreliable on contentEditable, fall back to `.click()` + `.pressSequentially('…')`.
`chapter-creation.spec.ts` currently types `**midnight**`/`*creaking*` and asserts the
**rendered** text — rework it to type plain text then apply **bold/italic via the toolbar**,
and assert the reader shows `<strong>`/`<em>` (don't type literal Markdown — WYSIWYG would
store the asterisks as escaped literals).

---

## Step 4 — Gate, then request approval to merge

```bash
npm test   # lint → typecheck → unit → e2e (fail-fast)
```
Then expose for phone testing per `CLAUDE.md` "Development loop":
```bash
npm run dev:phone   # background; hand the user the URL + "what to try"
```
Commit on the branch as you go. **Do not merge to `develop`** — report back for the user's
approval. On approval: `git checkout develop && git merge --no-ff feat/wysiwyg-editor && git push origin develop`.

---

## File checklist

**New**
- [ ] `src/lib/chapter-markdown.ts` — pure doc→Markdown serializer
- [ ] `tests/unit/chapter-markdown.test.ts`
- [ ] `tests/e2e/editor.spec.ts`

**Modified**
- [ ] `src/components/editor/chapter-editor.tsx` — Tiptap WYSIWYG + toolbar + Markdown view
- [ ] `package.json` / `package-lock.json` — `@tiptap/*` deps
- [ ] `tests/e2e/chapter-creation.spec.ts` — bold/italic via toolbar (not typed Markdown)
- [ ] `tests/e2e/{reading,reporting,full-journey}.spec.ts` — verify/adjust contentEditable fills

**Unchanged on purpose** (the swap stays behind the form contract)
- `src/lib/rich-text.ts`, `src/components/chapters/markdown-content.tsx`,
  `src/actions/*`, `prisma/schema.prisma`

## Review (fill in after implementation)

**Summary:** Implemented all 4 steps as planned, test-first.

- **Step 1** — `src/lib/chapter-markdown.ts` (`serializeDocToMarkdown`) with
  `tests/unit/chapter-markdown.test.ts` (7 tests, expanded slightly beyond the
  plan's snippet: also covers hard breaks, leading `#` escaping, empty-paragraph
  filtering, and a mixed-marks "always valid" invariant). Confirmed red (module
  not found) before implementing, then green.
- **Step 2** — Installed `@tiptap/react@3.26.1`, `@tiptap/starter-kit@3.26.1`,
  `@tiptap/pm@3.26.1` (current v3, React-19-ready). **No peer conflicts** —
  plain `npm install` worked, no `--force` needed. Rewrote
  `src/components/editor/chapter-editor.tsx` as a `'use client'` Tiptap editor:
  StarterKit with heading/lists/listItem/listKeymap/blockquote/codeBlock/code/
  horizontalRule/strike/link/underline all disabled (leaving document,
  paragraph, text, bold, italic, hardBreak, history, dropcursor, gapcursor,
  trailingNode — none of which can produce disallowed Markdown). Added
  `chapter-editor.module.css` for minimal styling (bold/italic render visibly
  distinct; toolbar buttons get a pressed style). `chapter-form.tsx` is
  untouched — `<ChapterEditor />` usage unchanged.
- **Step 3** — New `tests/e2e/editor.spec.ts` covers: two paragraphs via Enter
  (asserted via distinct `<em>`/`<strong>` wrapping `<p>`s in the reader),
  bold/italic via toolbar buttons (asserting `aria-pressed` and rendered
  `<strong>`/`<em>`), and the "View Markdown" pane showing `*…*`/`**…**`.
  Updated `reading.spec.ts`, `reporting.spec.ts`, `full-journey.spec.ts` —
  **no changes needed**, `getByLabel('Chapter content').fill('…')` works
  fine against Tiptap's contentEditable (no fallback to `pressSequentially`
  required for plain-text fills). Reworked `chapter-creation.spec.ts`: types
  plain text, selects the paragraph (click + Home + Shift+End), applies
  Bold/Italic via the toolbar, and asserts `<strong>`/`<em>` in the reader for
  both the root and child chapter.
- **Step 4** — `npm test` fully green: lint (no warnings), typecheck (clean),
  unit (6 files / 18 tests passed), e2e (7/7 passed, chromium).

**Deviations / notes:**
- `editor.isActive('bold'/'italic')` (used for toolbar `aria-pressed`) only
  reflects the latest state on re-render; `onUpdate` alone (doc-content
  changes) wasn't enough to keep it in sync with *selection* changes. Added
  `onSelectionUpdate`/`onTransaction` handlers that force a re-render so
  `aria-pressed` stays accurate immediately after toolbar clicks and cursor
  moves — needed for the e2e assertions to be reliable.
- In e2e, **double-click-to-select-a-word did not produce a selection Tiptap
  picked up** (`window.getSelection()` came back empty after `dblclick()` on
  ProseMirror content). Switched to click into the paragraph + `Home` +
  `Shift+End` to select the full line before toggling Bold/Italic — this
  worked reliably everywhere it was needed.
- Serializer escaping: backslash, `*`, `_`, `` ` `` are escaped anywhere in
  text; a leading `#`/`>`/`-`/`+`/`~`/ordered-list marker at the start of a
  paragraph has its first character escaped so it can't re-parse into a
  disallowed block node. Empty paragraphs are dropped before joining with
  `\n\n`, and the final result is trimmed to match `validateChapterContent`'s
  trim.
- Styling: `chapter-editor.module.css` gives the ProseMirror content area a
  border/min-height, makes `<strong>`/`<em>` visibly bold/italic inside the
  editor, and styles the toolbar buttons (bold "B", italic "I", with a dark
  "pressed" state) plus a light-gray `<pre>` for the Markdown view.
