/**
 * On-demand TEST data — separate from the demo `seed.ts`. Run it with:
 *
 *   npm run db:seed:test
 *
 * It adds (idempotently — re-runs skip anything already present):
 *  - short-credential login accounts for hand testing (see TEST_USERS),
 *  - a pool of throwaway "liker" accounts used only to attribute likes,
 *  - two deep branching stories (4–5 levels) whose chapters carry *varying*
 *    fan-out (0–5 children per step), like counts, view counts, and tags — built
 *    to exercise the reader's richer choice cards (tags + 👁 views + ⑂ descendants).
 *
 * Likes/views/tags are derived deterministically (a title hash) so a re-run after
 * a fresh `db:reset` reproduces the same numbers. It only writes to the dev db;
 * it does NOT drop or migrate — run `npm run db:reset` first if you want a clean base.
 */
import { db } from '@/lib/db';
import { addSuggestedPrompt, createChildChapter, createStoryWithRootChapter } from '@/lib/chapters';
import { slugifyHandle } from '@/lib/handles';
import { hashPassword } from '@/lib/passwords';

/** Official tags (name → lucide icon) this data leans on; upserted so the script
 * is self-sufficient even if the main demo seed hasn't run. Mirrors seed.ts. */
const OFFICIAL_TAGS: { name: string; icon: string }[] = [
  { name: 'horror', icon: 'Skull' },
  { name: 'romance', icon: 'Heart' },
  { name: 'mystery', icon: 'Search' },
  { name: 'comedy', icon: 'Laugh' },
  { name: 'fantasy', icon: 'Wand' },
  { name: 'sci_fi', icon: 'Rocket' }
];
const OFFICIAL_NAMES = new Set(OFFICIAL_TAGS.map((t) => t.name));

/** Short-credential accounts for hand testing. Login only verifies the password
 * hash, so these can be tiny. `a`/`b` author the two stories; `c` is an admin. */
const TEST_USERS: { email: string; password: string; displayName: string; isAdmin?: boolean }[] = [
  { email: 'a@a.co', password: 'aaaa', displayName: 'Ana' },
  { email: 'b@b.co', password: 'bbbb', displayName: 'Ben' },
  { email: 'c@c.co', password: 'cccc', displayName: 'Cyd', isAdmin: true }
];

/** Throwaway accounts that exist only so chapters can have varied like counts
 * (a like needs a distinct user). Pool size caps the max likes per chapter. */
const LIKER_COUNT = 14;

/** A branching chapter: `children` are the choices offered at its end (0–5). */
type Node = { title: string; content: string; tags?: string[]; children?: Node[] };
type Story = { title: string; authorEmail: string; root: Node };

const STORIES: Story[] = [
  {
    title: 'The Clockwork Orchard',
    authorEmail: 'a@a.co',
    root: {
      title: 'The Brass Gate',
      content:
        'The orchard wall runs for miles, and only one gate breaks it: brass, taller than a house, ticking softly like a held breath. Beyond it the trees are *metal*, and somewhere among them a bell counts a time that is not the hour.\n\nThe gate is unlocked. It always was. You push.',
      children: [
        {
          title: 'The Orchard of Gears',
          content:
            'Rows of geared trees stretch in every direction, their leaves shivering with the faint **whir** of escapements. Five paths open between the trunks, each worn smooth by feet that came before yours.',
          tags: ['fantasy', 'mystery', 'clockwork', 'puzzle', 'time_loop'],
          children: [
            {
              title: 'The Copper Apple',
              content:
                'A single apple of beaten copper hangs within reach, warm as a living thing. Inside its hollow you can hear a *core* turning over, slow and patient.',
              tags: ['clockwork', 'puzzle'],
              children: [
                {
                  title: 'Wind the Core',
                  content:
                    'You turn the stem. The orchard speeds up around you — a century of seasons in a breath — and when it stops you are *older*, and the gate behind you has rusted shut. **The End.**',
                  tags: ['bittersweet']
                },
                {
                  title: 'Let It Rust',
                  content:
                    'You leave the apple to its slow corrosion. Nothing changes, which is its own kind of mercy. You walk on, and the orchard lets you. **The End.**'
                }
              ]
            },
            {
              title: 'The Singing Bough',
              content:
                'One branch sings in a wind that isn’t blowing — a thin, tin lullaby. You could listen for hours, and perhaps you do. By the time you look up, the path behind you is gone. **The End.**',
              tags: ['fantasy']
            },
            {
              title: 'The Tin Crow',
              content:
                'A crow of riveted tin watches you with one lens eye, then hops twice and waits, as if it means for you to *follow*.',
              tags: ['mystery', 'creature'],
              children: [
                {
                  title: 'Follow It Home',
                  content:
                    'The crow leads you to a nest of lost keys, every one a different gate, every gate a different orchard. You take one at random and pocket your next beginning. **The End.**'
                }
              ]
            },
            {
              title: 'The Frozen Fountain',
              content:
                'Water hangs mid-fall, frozen not by cold but by a *stopped clock* at the fountain’s heart. Your reflection in it blinks a half-second after you do. **The End.**',
              tags: ['fantasy']
            },
            {
              title: 'The Gardener’s Shed',
              content:
                'The shed holds a thousand tiny tools and one enormous one: a crank set into the floor, labelled only **WINTER**. You decide, wisely, not to turn it. **The End.**',
              tags: ['puzzle']
            }
          ]
        },
        {
          title: 'The Silent Greenhouse',
          content:
            'Off to the side, a greenhouse of fogged glass holds the only *quiet* in the orchard — no ticking, no bell. Something here was built to keep time *out*.',
          tags: ['fantasy', 'liminal'],
          children: [
            {
              title: 'The Glass Seedling',
              content:
                'In a clay pot sits a seedling of spun glass, impossibly delicate, its roots threaded with hair-fine gears that haven’t started turning yet.',
              tags: ['clockwork'],
              children: [
                {
                  title: 'Plant It',
                  content:
                    'You set it in the orchard soil. The gears catch, and a new tree begins — yours, this time, counting a time you chose. **The End.**'
                },
                {
                  title: 'Pocket It',
                  content:
                    'You wrap it in your sleeve and carry it out through the brass gate, into a world with no orchards in it at all. Not yet. **The End.**',
                  tags: ['bittersweet']
                }
              ]
            }
          ]
        },
        {
          title: 'Turn Back at the Gate',
          content:
            'You stand on the threshold and decide some doors are kinder unwalked. The brass gate ticks once, almost fondly, as you go. **The End.**',
          tags: ['bittersweet']
        }
      ]
    }
  },
  {
    title: 'Down the Static',
    authorEmail: 'b@b.co',
    root: {
      title: 'Channel Zero',
      content:
        'The old set in the basement still works, mostly. Tonight it climbs *past* the last channel, into the grey roar between stations — and the roar is shaped like a **room**, and in the room something is waiting for you to settle in.',
      children: [
        {
          title: 'The Test Pattern',
          content:
            'The screen resolves into colour bars, but the tone underneath them is a *word*, repeated, slowed almost past hearing. You lean in to catch it.',
          tags: ['horror', 'found_footage'],
          children: [
            {
              title: 'Tune Closer',
              content:
                'You nudge the dial a hair. The bars bend toward you like reeds in a current, and the word becomes your name in a voice you used to know.',
              tags: ['horror', 'cosmic_horror'],
              children: [
                {
                  title: 'Answer the Voice',
                  content:
                    'You say *yes*. The grey opens like a pupil, and on the far side of the glass, your chair in the basement is already empty. **The End.**',
                  tags: ['cosmic_horror']
                },
                {
                  title: 'Record It',
                  content:
                    'You hit the tape. The reels spin up greedily, drinking the signal, hungry for a copy of whatever this is.',
                  tags: ['found_footage'],
                  children: [
                    {
                      title: 'Play It Back',
                      content:
                        'On playback the tape shows *your* basement, *your* back, and a second figure standing behind you in the frame — patient, unblinking — that was never there in the room. **The End.**',
                      tags: ['cosmic_horror', 'bittersweet']
                    }
                  ]
                },
                {
                  title: 'Pull the Plug',
                  content:
                    'You yank the cord. The screen dies. In the black glass your reflection keeps watching the bars a moment longer than you do, then catches up. **The End.**'
                }
              ]
            },
            {
              title: 'Smash the Set',
              content:
                'You put a chair through it. Glass and grey spill across the floor — and keep spilling, a thin tide of static pooling toward the stairs, but slower now. Slow enough to leave. **The End.**'
            }
          ]
        },
        {
          title: 'The Weather Report',
          content:
            'A calm anchor describes tomorrow’s forecast for a city with your name, street by street, and ends with: *"and at 3 a.m., one viewer will finally look away."* You check the clock. **The End.**',
          tags: ['mystery']
        },
        {
          title: 'The Midnight Movie',
          content:
            'A film you half-remember from childhood flickers up, except now the camera lingers on the *edges* of every shot, on the doorways, as if waiting for someone off-screen to enter.',
          tags: ['horror', 'late_night', 'found_footage'],
          children: [
            {
              title: 'Enter the Film',
              content:
                'You step toward the glass and the basement is suddenly a back-lot at dusk, warm and grainy, and a voice off-camera calls *action* in a tone that expects you to know your lines. **The End.**',
              tags: ['liminal']
            },
            {
              title: 'Pause It',
              content:
                'You freeze the frame on an empty hallway. Held still, the image keeps moving anyway — a shadow lengthening across the far wall, toward the lens. **The End.**'
            }
          ]
        },
        {
          title: 'Static All the Way Down',
          content:
            'You stop fighting it and just *watch* the grey. It isn’t empty. It has depth, and the depth has a floor, and the floor is very far down and getting nearer.',
          tags: ['cosmic_horror'],
          children: [
            {
              title: 'Keep Falling',
              content:
                'There’s no bottom, only more channel, more rooms, more chairs the exact shape of yours — and in each one, briefly, you, settling in. **The End.**',
              tags: ['liminal']
            }
          ]
        }
      ]
    }
  }
];

/** Stable 32-bit FNV-1a hash → non-negative int, for deterministic varied counts. */
function hashInt(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

async function upsertUser(input: {
  email: string;
  displayName: string;
  passwordHash: string;
  isAdmin?: boolean;
}) {
  return db.user.upsert({
    where: { email: input.email },
    update: { displayName: input.displayName, isAdmin: input.isAdmin ?? false },
    create: {
      email: input.email,
      username: slugifyHandle(input.displayName),
      displayName: input.displayName,
      passwordHash: input.passwordHash,
      isAdmin: input.isAdmin ?? false
    }
  });
}

/** Apply deterministic views/likes/tags to a freshly-created chapter. */
async function enrichChapter(
  chapterId: string,
  node: Node,
  authorId: string,
  likerIds: string[]
) {
  // Views: a plain denormalized counter — set it directly (0–179, varied).
  const views = hashInt(`${node.title}::views`) % 180;
  await db.chapter.update({ where: { id: chapterId }, data: { viewCount: views } });

  // Likes: need distinct users; take the first N from the liker pool (0..pool size).
  const likes = hashInt(`${node.title}::likes`) % (likerIds.length + 1);
  for (let i = 0; i < likes; i++) {
    try {
      await db.chapterLike.create({ data: { chapterId, userId: likerIds[i] } });
    } catch {
      // P2002 — already liked on a prior run; idempotent no-op.
    }
  }

  // Tags: upsert each (official ones flagged + iconed via OFFICIAL_TAGS), then link.
  for (const name of node.tags ?? []) {
    const official = OFFICIAL_NAMES.has(name);
    const tag = await db.tag.upsert({
      where: { name },
      update: {},
      create: { name, isOfficial: official }
    });
    try {
      await db.chapterTag.create({ data: { chapterId, tagId: tag.id, addedByUserId: authorId } });
    } catch {
      // P2002 — chapter already carries this tag; idempotent no-op.
    }
  }
}

async function addChildren(
  storyId: string,
  parentChapterId: string,
  nodes: Node[] = [],
  authorId: string,
  likerIds: string[]
) {
  for (const node of nodes) {
    const child = await createChildChapter({
      storyId,
      parentChapterId,
      authorId,
      label: node.title,
      content: node.content
    });
    await enrichChapter(child.id, node, authorId, likerIds);
    await addChildren(storyId, child.id, node.children, authorId, likerIds);
  }
}

async function seedStory(story: Story, authorId: string, likerIds: string[]) {
  const existing = await db.story.findFirst({ where: { title: story.title } });
  if (existing) {
    console.log(`· skip (exists): ${story.title}`);
    return;
  }

  const created = await createStoryWithRootChapter({
    title: story.title,
    authorId,
    chapterTitle: story.root.title,
    content: story.root.content
  });
  await enrichChapter(created.rootChapterId, story.root, authorId, likerIds);
  await addChildren(created.id, created.rootChapterId, story.root.children, authorId, likerIds);

  // A couple of unclaimed suggested prompts on the root, so the "write this"
  // slot has real data to exercise in the dev/preview db.
  await addSuggestedPrompt({
    parentChapterId: created.rootChapterId,
    authorId,
    label: 'Try a different path'
  });
  await addSuggestedPrompt({
    parentChapterId: created.rootChapterId,
    authorId,
    label: 'Turn back'
  });

  console.log(`✓ seeded: ${story.title}`);
}

async function main() {
  const passwordHash = await hashPassword('reader');

  // Official tag vocabulary (self-sufficient; mirrors the demo seed).
  for (const tag of OFFICIAL_TAGS) {
    await db.tag.upsert({
      where: { name: tag.name },
      update: { isOfficial: true, icon: tag.icon },
      create: { name: tag.name, isOfficial: true, icon: tag.icon }
    });
  }

  // Login accounts (short credentials).
  const authorIds = new Map<string, string>();
  for (const u of TEST_USERS) {
    const user = await upsertUser({
      email: u.email,
      displayName: u.displayName,
      passwordHash: await hashPassword(u.password),
      isAdmin: u.isAdmin
    });
    authorIds.set(u.email, user.id);
  }

  // Throwaway liker pool (for varied like counts).
  const likerIds: string[] = [];
  for (let i = 1; i <= LIKER_COUNT; i++) {
    const user = await upsertUser({
      email: `l${i}@t.co`,
      displayName: `Liker ${i}`,
      passwordHash
    });
    likerIds.push(user.id);
  }

  for (const story of STORIES) {
    const authorId = authorIds.get(story.authorEmail);
    if (authorId) await seedStory(story, authorId, likerIds);
  }

  console.log('\nTest logins (email / password):');
  for (const u of TEST_USERS) {
    console.log(`  ${u.email} / ${u.password}${u.isAdmin ? '  (admin)' : ''}`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
