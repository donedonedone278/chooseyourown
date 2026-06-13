# Feature: Literary/bookish visual design (light + dark)

**Branch:** `feat/literary-styling` (off `develop`). Merge to `develop` only after user approval.
**Plan author:** Opus. **Implementer:** Sonnet. Gate: `npm test` green, then phone preview.

## Context

The app is functionally complete but almost entirely **unstyled** — bare semantic HTML, no
global stylesheet, no CSS framework (only `chapter-editor.module.css` exists). This pass
gives it a cohesive **literary / bookish** identity: warm paper tones, a serif reading
typography, generous line-height and a comfortable reading measure — fitting for an app
about reading and writing stories.

**Decisions (already made with the user):**
- **Plain CSS** — a global tokens stylesheet + per-component **CSS Modules** (same idiom as
  the existing editor module). **No new CSS framework / build tooling.** (Adding `next/font`
  for self-hosted fonts is fine and expected.)
- **Literary/bookish** vibe: warm off-white paper background, ink text, serif body + headings,
  a muted literary accent (e.g. oxblood/ink-blue), choices rendered as inviting tappable cards.
- **Light + dark**, driven by CSS variables + `@media (prefers-color-scheme: dark)` — **respect
  the OS preference, no manual toggle** (keeps it simple, no client JS).

## Hard constraint — don't break behavior or the test suite

This is a **visual** change only. Preserve all DOM semantics the tests and a11y rely on:
- Keep the landmark elements and structure: `<header>`, `<nav>`, `<main>`, `<article>`,
  headings at their current levels, lists, `<form>`.
- **Do not change any accessible names, label associations, or asserted text.** Tests target,
  among others: the `Recent chapters` / `Open reports` headings; nav/links `Start a story`,
  `Add a chapter`, `Sign in`; `getByLabel` for `Display name`, `Email`, `Password`,
  `Story title`, `Chapter title`, `Chapter content`, `Reason`; buttons `Create account`,
  `Sign in`, `Publish first chapter`, `Publish chapter`, `Bold`, `Italic`, `View Markdown`,
  `Report chapter`, `Submit report`, `Like`/`Liked`, `Remove chapter`, `Dismiss`; and text
  like `Signed in as <name>`, `Report submitted`, `Liked by N reader(s)`, `N likes`.
- Style by adding `className`s and wrapper elements only; don't rename, reorder, or drop the
  above. Run `npm test` to confirm the full suite still passes.
- **Accessibility:** both themes must meet **WCAG AA** contrast for text and interactive
  elements; visible focus states on all links/buttons/inputs; set `color-scheme: light dark`.

## Step 1 — Foundation: fonts, tokens, base styles

### 1a. Fonts via `next/font/google` (self-hosted, no layout shift)
In `src/app/layout.tsx`, load a literary reading serif as the primary family — recommend
**Newsreader** or **Source Serif 4** (variable, designed for reading). Expose it as a CSS
variable and apply the class to `<html>`:
```tsx
import { Newsreader } from 'next/font/google';
const serif = Newsreader({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
// <html lang="en" className={serif.variable}>
```
Optionally add a clean system **sans** stack as `--font-sans` for small UI labels/nav (a CSS
var with system fonts, no extra download). Body + headings use the serif. Also add a basic
`export const metadata = { title: 'Choose Your Own', description: '…' }`.

### 1b. `src/app/globals.css` (new) — imported once in `layout.tsx`
Contains, in this order:
- **Minimal reset:** `*{box-sizing:border-box} body,h1,h2,p,figure,ul{margin:0}`, `img,svg{max-width:100%}`, list reset where we re-style.
- **Tokens** as CSS variables on `:root` (light defaults) then overridden in
  `@media (prefers-color-scheme: dark)`. Define a coherent palette + scale:
  - color: `--bg` (warm paper, ~`#faf6ef` light / deep warm charcoal ~`#1b1714` dark),
    `--surface` (cards), `--text` (ink), `--text-muted`, `--accent` (literary oxblood or
    ink-blue), `--accent-contrast`, `--border`, `--like` (heart).
  - type scale (`--step-0`…`--step-4` or named), `--leading` (~1.7 for body),
    `--measure: 65ch` (reading width).
  - spacing scale (`--space-1`…`--space-6`), `--radius`, `--shadow`.
  - `color-scheme: light dark;`
- **Base element styles:** `body{background:var(--bg);color:var(--text);font-family:var(--font-serif);line-height:var(--leading)}`;
  headings (serif, tighter leading, sizes from the scale); `a` (accent color, clear
  hover/focus, underlines for in-content links); `p` spacing.
- **Layout:** style `main` as a centered column (`max-width`, horizontal padding, vertical
  rhythm) so every page gets a sensible container without new wrappers. The reader narrows
  further to `--measure` via its module.
- **Form + button baselines:** inputs/textarea (padding, border, radius, bg `--surface`,
  inherit font, focus ring); a base `button`/`.btn` with variants `.btn--primary`,
  `.btn--secondary`, `.btn--danger` (used by admin "Remove chapter"). Buttons should look
  tappable (good touch target ≥44px) since this is used on phones.

## Step 2 — Layout shell: `site-header`

`src/components/layout/site-header.module.css` + className updates in `site-header.tsx`:
sticky top header with a subtle bottom border/shadow, brand wordmark in serif on the left,
nav on the right, comfortable tap targets, `Signed in as …` and the admin `Reports` link
styled as muted nav items. Keep `<header>`/`<nav>` and all link text unchanged.

## Step 3 — Primary surfaces (one CSS Module each)

For each, add a `.module.css` next to the component and apply classNames. Keep markup
semantics; enhance presentation.

- **Home feed** (`recent-chapter-feed.tsx`): `Recent chapters` heading + intro; the chapter
  list as a responsive grid/stack of **cards** (`--surface`, border, radius, subtle shadow,
  hover lift), each showing the chapter-title link and muted `From <story>`. Style the empty
  state. (Note: this component already renders `<main>`; keep that.)
- **Chapter reader** (`chapter-reader.tsx`): the article constrained to `--measure` for
  comfortable reading; the `From <story>` breadcrumb muted; body text generous. The
  **Choices** render as a list of large tappable cards (title + like count) — the visual
  centerpiece of the branching feel. Style the **Reactions** section: a clear Like button
  (heart, with the `Liked` disabled state), the `Liked by N readers` count, and the
  `Report chapter` disclosure + reason form. `Add a chapter` styled as a secondary action.
- **Story overview** (`stories/[storyId]/page.tsx`): story title (serif display) + the chapter
  list styled like the feed rows/cards.
- **Forms & editor** (`chapter-form.tsx`, `chapter-editor.tsx`, `stories/new`, `chapter…/new`):
  a `chapter-form.module.css` styling labels/inputs/submit consistently. **Harmonize the
  existing `chapter-editor.module.css`** to use the new tokens (toolbar buttons get the
  shared button styles + clear active state; the editor surface looks like a writing area;
  the read-only Markdown pane is visually distinct/muted).
- **Auth** (`auth/sign-in`, `auth/sign-up`): a centered narrow auth card reusing the form
  styles; the two pages should look like siblings.
- **Admin reports** (`admin/reports/page.tsx`, `report-chapter.tsx`): report items as cards
  with the reason and reporter; `Remove chapter` as `.btn--danger`, `Dismiss` as secondary.

## Step 4 — Gate, preview, request approval

```bash
npm test            # full suite must stay green (proves semantics/a11y intact)
```
Spot-check WCAG AA contrast in **both** light and dark (e.g. simulate dark via DevTools /
OS). Then expose for phone testing per `CLAUDE.md` "Development loop":
```bash
npm run dev:phone   # background; hand the user the URL + a "what to look at" tour
```
Commit on the branch as you go. **Do not merge to `develop`** — report back for approval.
On approval: `git checkout develop && git merge --no-ff feat/literary-styling && git push origin develop`.

> No new behavioral tests: this is a pure restyle with no new behavior, so value comes from
> the existing suite staying green + the phone review. Don't add brittle visual-assertion tests.

---

## File checklist

**New**
- [ ] `src/app/globals.css` — tokens (light+dark), reset, base typography, layout, button/form baselines
- [ ] `src/components/layout/site-header.module.css`
- [ ] `src/components/feed/recent-chapter-feed.module.css`
- [ ] `src/components/chapters/chapter-reader.module.css`
- [ ] `src/components/chapters/chapter-form.module.css` (shared by forms + auth)
- [ ] `src/components/chapters/report-chapter.module.css` (or fold into reader module)
- [ ] `src/app/admin/reports/reports.module.css` (or co-located module)
- [ ] `src/app/stories/story.module.css` (story overview) — or co-located

**Modified**
- [ ] `src/app/layout.tsx` — `next/font`, import `globals.css`, `metadata`, html font var class
- [ ] All `page.tsx` + components listed in Step 2–3 — add classNames/wrappers only
- [ ] `src/components/editor/chapter-editor.module.css` — re-base on the new tokens

**Unchanged**
- DOM text, roles, landmarks, label associations, accessible names (see Hard constraint)
- `src/lib/*`, `src/actions/*`, `prisma/schema.prisma`, `markdown-content.test.tsx`

## Review (fill in after implementation)

- **Font:** Newsreader (variable, via `next/font/google`), exposed as `--font-serif` and
  applied to `<html>`. System sans stack as `--font-sans` for small UI labels/nav (header
  nav, form labels, breadcrumbs, helper text, like counts).

- **Light palette:**
  - `--bg` `#faf6ef` (warm paper)
  - `--surface` `#ffffff` (cards)
  - `--surface-muted` `#f1ebe1` (reactions box, markdown preview)
  - `--text` `#2a2420` (ink)
  - `--text-muted` `#6f6258`
  - `--accent` `#7d2e2e` (oxblood), `--accent-hover` `#6a2424`, `--accent-contrast` `#fffaf4`
  - `--border` `#ddd2c2`
  - `--like` `#b3433f`
  - `--danger` `#a3312b`, `--danger-contrast` `#fffaf4`
  - `--focus-ring` `#2a6f8e` (blue, distinct from accent for visibility)

- **Dark palette:**
  - `--bg` `#1b1714` (deep warm charcoal)
  - `--surface` `#261f1b`
  - `--surface-muted` `#2f2722`
  - `--text` `#efe7dc`
  - `--text-muted` `#b3a596`
  - `--accent` `#e0a39a` (lightened oxblood for contrast on dark), `--accent-hover` `#ecbcb4`,
    `--accent-contrast` `#1b1714`
  - `--border` `#423831`
  - `--like` `#e07a74`
  - `--danger` `#e0837c`, `--danger-contrast` `#1b1714`
  - `--focus-ring` `#7fc3e8`

  All text/background pairs were chosen to clear ~4.5:1 contrast (e.g. light
  `--text` #2a2420 on `--bg` #faf6ef ≈ 13:1; dark `--text` #efe7dc on `--bg` #1b1714 ≈ 14:1;
  accent on its contrast color and vice versa both exceed 4.5:1 in both themes).
  `color-scheme: light dark` is set on `:root` and both themes use a single
  `@media (prefers-color-scheme: dark)` override block — no manual toggle/JS.

- **Structural tweaks (classNames/wrappers only, no semantic changes):**
  - `chapter-reader.tsx`: wrapped existing content in an `<article>` inside `<main>` for the
    `--measure`-constrained reading column; added section/list/card classes.
  - `recent-chapter-feed.tsx`, `stories/[storyId]/page.tsx`, `admin/reports/page.tsx`: list
    items become card-styled `<li>`s via classNames only; headings/links/text unchanged.
  - `report-chapter.tsx`: "Report chapter" button now uses shared `.btn--secondary`;
    "Submit report" likewise; added a small wrapper `<form>`/`<p>` className for layout.
  - `chapter-form.tsx`: new `chapter-form.module.css` shared by the story/chapter forms and
    both auth pages (`.authCard` / `.authFooter` give sign-in/sign-up a centered card look).
  - `chapter-editor.module.css` rebased onto the new tokens (toolbar buttons use
    `--accent`/`--border`/`--surface`; `aria-pressed='true'` state uses `--accent`; Markdown
    preview pane uses `--surface-muted`). `aria-labelledby="chapter-content-label"` wiring
    unchanged — `getByLabel('Chapter content')` still resolves.
  - `site-header.tsx`: sticky header, serif wordmark, nav — `<header>`/`<nav>` and all link
    text/order unchanged.

- **Deviations from plan:** none structurally significant. Used Newsreader (one of the two
  recommended options). Buttons/links use shared global `.btn`, `.btn--primary`,
  `.btn--secondary`, `.btn--danger` classes from `globals.css` combined with module classes
  via template literals, per the plan's "base `button`/`.btn` with variants" guidance.

- **Could not verify visually** (text-only environment): actual rendered colors/contrast in a
  browser, dark-mode rendering via OS toggle, and the phone preview's visual appearance.
  Confirmed by construction: both `:root` and `@media (prefers-color-scheme: dark)` blocks
  define the full token set with no missing variables, and `npm test` (lint, typecheck,
  unit, e2e — 18 unit + 7 e2e) is fully green, so DOM semantics/accessible names are intact.
