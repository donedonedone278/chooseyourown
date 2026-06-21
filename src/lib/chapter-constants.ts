// Client-safe chapter constants. Kept out of `chapters.ts` (which imports Prisma
// and is server-only) so client components can import the limit without pulling
// the server bundle in. `chapters.ts` re-exports this for existing import sites.
export const MAX_OPTION_LABEL = 120;
