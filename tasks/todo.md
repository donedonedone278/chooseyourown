# Plan: Adopt Prisma Migrate + a repeatable dev-db setup script

Branch: `chore/ls-prisma-migrate`

## Why

`prisma db push` keeps **no history** and can't apply data-preserving structural changes
(the `username` required+unique-on-populated-rows problem that surfaced in profiles). Adopt
**`prisma migrate`** for versioned, reviewable, production-applicable schema changes — and
add a **one-command, repeatable dev-db build with seed data** so setting up / resetting the
dev database is standard and scripted.

This branch is **infra only** — it does *not* add the `username` column or any profiles work.
Profiles resumes on `feat/ls-user-profiles` (parked) on top of this.

## A. Baseline migration (capture the current schema as migration #1)

- Generate `prisma/migrations/<ts>_init/` from the **current** `schema.prisma` and apply it
  to a fresh db. Method (non-interactive): delete the dev db files, then
  `npx prisma migrate dev --name init` (creates the init migration, applies it, runs seed).
- **Commit `prisma/migrations/**`** — migrations are version-controlled (the whole point).
  Verify `.gitignore` doesn't swallow them (it ignores `*.db`, not the SQL).
- Verify no drift: `npx prisma migrate status` reports up to date; the generated
  `migration.sql` reproduces today's schema exactly (diff against a `db push` db if unsure).

## B. Test harness → `migrate deploy` (so tests exercise real migrations)

- `src/test/global-setup.ts`: keep the manual `test.db` file delete (Prisma's `--force-reset`
  is still agent-blocked), but replace `npx prisma db push --skip-generate` with
  **`npx prisma migrate deploy`** — non-interactive, applies all migrations to the fresh
  `test.db`. Now the suite runs against the migrated schema, catching a broken migration
  instead of silently pushing the schema.

## C. Repeatable dev-db script — `npm run db:reset`

- `scripts/db-reset.sh`: delete `prisma/dev.db*` → `npx prisma migrate deploy` → `npx prisma
  db seed`. Non-interactive and agent/CI-safe (no `migrate reset` confirmation prompt),
  idempotent, re-runnable anytime. Sources Volta PATH (like the other scripts), prints a
  friendly banner, and reads the dev `DATABASE_URL` from `.env`.
- This is **the** standard "(re)build the dev db + dummy data" command. Dummy data = the
  existing `prisma/seed.ts` (demo authors Maya/Theo, branching demo stories, official tags,
  admin user) — reused, not rewritten. Works for first-time setup *and* a clean reset.
- (Native equivalent is `prisma migrate reset --force`; we use the explicit
  delete→deploy→seed form to stay deterministic and avoid any reset-prompt/agent-block edge.)

## D. Docs

- `CLAUDE.md` → **Environment / first-time setup**: replace `npx prisma db push` with
  `npm run db:reset`. Add a one-liner: schema changes now go through
  `npx prisma migrate dev --name <desc>` (creates a migration), **never `db push`**.
- `CLAUDE.md` → **Testing conventions**: update the global-setup description (db push →
  `migrate deploy`); keep the manual-file-delete rationale.
- `scripts/README.md`: document `db-reset.sh` / `npm run db:reset`.
- Update the stray `db push` mention in the testing section so the repo is consistent.

## Verification

- `npx prisma migrate status` → up to date, no drift.
- `npm run db:reset` run **twice** → rebuilds dev db + seed cleanly both times (proves
  repeatability).
- `npm test` green end-to-end (now via `migrate deploy`).

## Out of scope

- The `username` column / profiles feature (resumes on `feat/ls-user-profiles`).
- Switching CI/deploy infra (there's no CI/prod yet); this only sets the local + test path.

## Review

_(fill in after implementation)_
