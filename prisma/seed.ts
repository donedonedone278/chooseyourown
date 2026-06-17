import { db } from '@/lib/db';
import { hashPassword } from '@/lib/passwords';

const OFFICIAL_TAGS: { name: string; icon: string }[] = [
  { name: 'horror', icon: 'Skull' },
  { name: 'romance', icon: 'Heart' },
  { name: 'mystery', icon: 'Search' },
  { name: 'comedy', icon: 'Laugh' },
  { name: 'fantasy', icon: 'Wand' },
  { name: 'sci-fi', icon: 'Rocket' }
];

async function main() {
  const passwordHash = await hashPassword('password123');

  await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      displayName: 'Admin',
      passwordHash,
      isAdmin: true
    }
  });

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
