/**
 * Setup seed — reference data the app expects, and nothing else.
 *
 * This is the `prisma db seed` target (run by `npm run db:reset` right after
 * `migrate deploy`). It deliberately creates **no** users, stories, or chapters:
 * that demo/dev content lives in `prisma/seed-dev.ts` (`npm run db:seed:dev`),
 * which `db:reset` runs straight after this. Keeping the two apart means "set up
 * the db" and "populate it with dev data" are cleanly separable steps.
 *
 * All it establishes is the official tag vocabulary (the controlled set the
 * tagging feature renders as icons) — reference data, not content.
 */
import { db } from '@/lib/db';

const OFFICIAL_TAGS: { name: string; icon: string }[] = [
  { name: 'horror', icon: 'Skull' },
  { name: 'romance', icon: 'Heart' },
  { name: 'mystery', icon: 'Search' },
  { name: 'comedy', icon: 'Laugh' },
  { name: 'fantasy', icon: 'Wand' },
  { name: 'sci_fi', icon: 'Rocket' }
];

async function main() {
  for (const tag of OFFICIAL_TAGS) {
    await db.tag.upsert({
      where: { name: tag.name },
      update: { isOfficial: true, icon: tag.icon },
      create: { name: tag.name, isOfficial: true, icon: tag.icon }
    });
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
