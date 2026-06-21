import { db } from '@/lib/db';
import { addSuggestedPrompt, createChildChapter, createStoryWithRootChapter } from '@/lib/chapters';
import { addTagToChapter } from '@/lib/tags';
import { slugifyHandle } from '@/lib/handles';
import { hashPassword } from '@/lib/passwords';

const OFFICIAL_TAGS: { name: string; icon: string }[] = [
  { name: 'horror', icon: 'Skull' },
  { name: 'romance', icon: 'Heart' },
  { name: 'mystery', icon: 'Search' },
  { name: 'comedy', icon: 'Laugh' },
  { name: 'fantasy', icon: 'Wand' },
  { name: 'sci_fi', icon: 'Rocket' }
];

/**
 * A branching chapter node.
 * - `title` is the chapter's own heading (shown once you're reading it).
 * - `label` is the option-select wording on the parent→child edge (the in-the-moment
 *   choice). When omitted it falls back to `title`; we set it on most nodes so the demo
 *   db actually shows the label≠title split this feature introduced.
 * - `prompts` are unclaimed author-suggested next-chapter slots on this chapter (the
 *   "✎ write this" cards). Seeded across several chapters and depths, not just roots.
 * - `children` are the realized choices offered at this chapter's end.
 */
type StoryNode = {
  title: string;
  content: string;
  label?: string;
  prompts?: string[];
  children?: StoryNode[];
};

type DemoStory = {
  title: string;
  authorEmail: string;
  // Defaults to 'crowd' (anyone signed in may tag). One demo story uses 'author'
  // to flex the locked-tagging variant.
  tagPermission?: 'crowd' | 'author';
  root: StoryNode;
};

// Tags per chapter, keyed by chapter title (titles are unique across the demo
// set). A mix of official tags — which render as icons via the OFFICIAL_TAGS
// glyph map — and custom tags, which render as text chips. Several chapters
// carry 5 tags so the choice card's "+N" overflow (MAX_VISIBLE_TAGS = 4) shows.
const TAGS_BY_TITLE: Record<string, string[]> = {
  // The Lighthouse at Dunmore — horror / mystery
  'The Long Walk Out': ['horror', 'mystery', 'lighthouse', 'slow_burn'],
  'Up to the Lantern Room': ['horror', 'mystery', 'dread'],
  'Read the Last Entry': ['mystery', 'horror', 'unreliable_narrator', 'cursed_object', 'epistolary'],
  'Light the Lamp Anyway': ['horror', 'cosmic'],
  'Leave the Lamp Dark': ['mystery', 'quiet_ending'],
  'Signal the Mainland': ['horror', 'isolation'],
  'Down to the Cellar': ['horror', 'mystery', 'claustrophobia'],
  'Open the Iron Door': ['horror', 'fantasy', 'liminal'],
  'Barricade It Shut': ['horror', 'siege'],
  // Signal from Europa — sci_fi / mystery
  'The Eleven-Minute Delay': ['sci_fi', 'mystery', 'first_contact', 'hard_sf'],
  'Wake the Captain': ['sci_fi', 'leadership'],
  'Send a Prime Sequence': ['sci_fi', 'first_contact', 'mathematics'],
  'Stay Silent and Listen': ['sci_fi', 'mystery', 'paranoia'],
  'Answer It Yourself': ['sci_fi', 'first_contact', 'hubris', 'suspense', 'solo'],
  'Trace the New Position': ['sci_fi', 'suspense'],
  'Cut the Transmitter': ['sci_fi', 'horror', 'doppelganger'],
  // The Last Tea Shop on Marrow Street — fantasy / romance / comedy
  'Closing Time': ['fantasy', 'romance', 'cozy', 'magical_realism'],
  'Serve the Traveller First': ['fantasy', 'romance', 'slow_burn'],
  'Ask Where They’re Going': ['fantasy', 'wistful'],
  'Offer Them the Spare Room': ['romance', 'found_family'],
  'Kneel by the Child': ['fantasy', 'mystery', 'heartwarming'],
  'Make the Usual': ['fantasy', 'comedy', 'heartwarming', 'nostalgia', 'cozy'],
  'Admit You Don’t Know It': ['fantasy', 'bittersweet']
};

const DEMO_AUTHORS: { email: string; displayName: string }[] = [
  { email: 'maya@example.com', displayName: 'Maya Quill' },
  { email: 'theo@example.com', displayName: 'Theo Vance' }
];

// A pool of demo "reader" accounts. Likes are one-per-user and views are
// one-per-unique-viewer, so believable counts need real distinct users, not
// just the two authors. (All use password123, like every demo account.)
const DEMO_READERS = [
  'Ines Marlow',
  'Bram Foss',
  'Cora Devlin',
  'Otis Vane',
  'Pell Sandoval',
  'Wren Achebe',
  'Dax Romero',
  'Liora Quint',
  'Hale Sutter',
  'Nim Okafor',
  'Saskia Bell',
  'Eli Drummond'
];

// Deterministic PRNG (mulberry32) so seeded engagement varies chapter-to-chapter
// but is identical on every `db:reset` — a stable demo, not a flickering one.
function makeRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A random subset of `items` of size `n` (deterministic given `rng`).
function pickSome<T>(items: T[], n: number, rng: () => number): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.max(0, Math.min(n, pool.length)));
}

const DEMO_STORIES: DemoStory[] = [
  {
    title: 'The Lighthouse at Dunmore',
    authorEmail: 'maya@example.com',
    root: {
      title: 'The Long Walk Out',
      content:
        'The causeway to Dunmore lighthouse floods at high tide, and the keeper has not answered the radio in three days. You reach the door as the last gull leaves the rocks.\n\nInside, two stairwells split the dark: one **spiralling up** toward the lantern room, one **dropping down** toward the cellar.',
      prompts: ['search the rocks for the keeper', 'wait for the tide to fall'],
      children: [
        {
          title: 'Up to the Lantern Room',
          label: 'climb toward the lantern room',
          content:
            'The stairs coil up past salt-fogged windows. At the top the great lamp is *cold* — unlit for the first time in a century. A logbook lies open on the brass rail.',
          prompts: ['check the radio set'],
          children: [
            {
              title: 'Read the Last Entry',
              label: 'open the keeper’s logbook',
              content:
                'The final line is not in the keeper’s steady hand. It slants, hurried: *"The light answers back now. Do not let it finish the sentence."* Below it, a single wet fingerprint.',
              prompts: ['follow the wet fingerprint'],
              children: [
                {
                  title: 'Light the Lamp Anyway',
                  label: 'strike the igniter',
                  content:
                    'You strike the igniter. The beam swings out — and far across the water, something swings a beam *back*. You are no longer the only lighthouse on this coast.'
                },
                {
                  title: 'Leave the Lamp Dark',
                  label: 'leave the lamp cold',
                  content:
                    'You close the logbook and breathe. In the dark, the silence holds. Whatever was being summoned, you have left the sentence unfinished — for now.'
                }
              ]
            },
            {
              title: 'Signal the Mainland',
              label: 'work the shutter-signal',
              content:
                'You crank the old shutter-signal toward town. Three long, three short. After a moment, three long, three short answer — from the *wrong* direction, out at sea.'
            }
          ]
        },
        {
          title: 'Down to the Cellar',
          label: 'descend to the cellar',
          content:
            'The air thickens with brine and oil. Your lamp finds crates, coiled rope, and a door that should not be here — iron, riveted, *warm* to the touch.',
          prompts: ['pry open the warm crates', 'feel along the wall for a switch'],
          children: [
            {
              title: 'Open the Iron Door',
              label: 'open the warm iron door',
              content:
                'It swings without a sound onto a tunnel of dripping stone that runs out beneath the seabed, toward a light that is not the lighthouse’s and never was.'
            },
            {
              title: 'Barricade It Shut',
              label: 'barricade the door shut',
              content:
                'You drag the crates across the iron door and sit against them until dawn. Something on the far side knocks, politely, three times, and then is quiet.'
            }
          ]
        }
      ]
    }
  },
  {
    title: 'Signal from Europa',
    authorEmail: 'theo@example.com',
    tagPermission: 'author',
    root: {
      title: 'The Eleven-Minute Delay',
      content:
        'You are the only one awake aboard the survey ship *Kestrel* when the dish catches it: a clean, repeating pulse rising from beneath Europa’s ice. It is **patterned**. It is not natural.\n\nThe rest of the crew sleeps in the cold ring. You can *wake the captain*, or *answer it yourself* before the window closes.',
      prompts: ['wake the whole crew', 'run a diagnostic on the dish'],
      children: [
        {
          title: 'Wake the Captain',
          label: 'wake Captain Adeyemi',
          content:
            'Captain Adeyemi reads the waveform twice, jaw tight. "Eleven-minute round trip," she says. "Whatever we send, we live with the reply." She hands you the transmit key. "Your discovery. Your call."',
          prompts: ['ask the captain to wait for orders'],
          children: [
            {
              title: 'Send a Prime Sequence',
              label: 'transmit the primes',
              content:
                'You pulse out two, three, five, seven. Eleven minutes of held breath. Then the ice answers — *not* with the next prime, but with your own crew’s heartbeat rhythms, played back perfectly.'
            },
            {
              title: 'Stay Silent and Listen',
              label: 'record without answering',
              content:
                'You record without answering. Over six hours the pattern resolves into a map — of the *Kestrel*, deck by deck, with one room marked that does not exist on your schematics.'
            }
          ]
        },
        {
          title: 'Answer It Yourself',
          label: 'answer it alone',
          content:
            'You don’t wake anyone. You key in a single echo of the pulse and send it down into the ice. Eleven minutes. The reply comes early — at minute *nine* — which means the source has moved closer.',
          prompts: ['log it but tell no one', 'seal the bulkheads'],
          children: [
            {
              title: 'Trace the New Position',
              label: 'trace the rising source',
              content:
                'The signal now originates a kilometre under the hull, rising. You have time to wake the crew, or time to watch — but not both.'
            },
            {
              title: 'Cut the Transmitter',
              label: 'kill the dish',
              content:
                'You pull the dish offline. The bridge goes quiet. On the dead screen, your own reflection lifts its hand a half-second before you do.'
            }
          ]
        }
      ]
    }
  },
  {
    title: 'The Last Tea Shop on Marrow Street',
    authorEmail: 'maya@example.com',
    root: {
      title: 'Closing Time',
      content:
        'The little shop has sold tea on Marrow Street for two hundred years, and tonight it closes for good — unless the right customer walks in before the clock strikes nine.\n\nThe bell rings. *Two* customers enter at once: a soaked traveller, and a child who could not possibly be out alone.',
      prompts: ['lock the door and turn them away', 'ring the closing bell early'],
      children: [
        {
          title: 'Serve the Traveller First',
          label: 'pour for the traveller',
          content:
            'You pour something dark and smoke-sweet. The traveller wraps both hands around the cup and sighs. "I’ve been walking toward this shop," they say, "since before it was built."',
          prompts: ['refuse the ancient coin'],
          children: [
            {
              title: 'Ask Where They’re Going',
              label: 'ask their destination',
              content:
                'They smile and set down a coin older than the city. "Nowhere now. This was the destination. Keep the shop open one more night, and I’ll keep walking — somewhere new."'
            },
            {
              title: 'Offer Them the Spare Room',
              label: 'offer the spare room',
              content:
                'They stay. By morning the shop’s ledger has a second name beside yours, and Marrow Street is one door longer than it was the night before.'
            }
          ]
        },
        {
          title: 'Kneel by the Child',
          label: 'kneel by the child',
          content:
            'The child holds out an empty cup that is somehow *already warm*. "Grandmother said you’d still be here," they whisper. "She said to order her usual."',
          prompts: ['ask who their grandmother was'],
          children: [
            {
              title: 'Make the Usual',
              label: 'brew grandmother’s usual',
              content:
                'Your hands move before you decide — honey, clove, a pinch of something you’ve never stocked. The child drinks, and for an instant an old woman’s laugh fills the room.'
            },
            {
              title: 'Admit You Don’t Know It',
              label: 'admit you don’t know it',
              content:
                'The child only nods, unsurprised, and recites the recipe in a voice far too old for them. You write it in the ledger. The shop, you realise, will not be closing after all.'
            }
          ]
        }
      ]
    }
  }
];

/**
 * Give a chapter a believable spread of likes + unique views, recorded the way
 * the app records them: likes are one row per distinct reader; views are unique
 * `ChapterView` rows (some tied to those readers so read-state demos too, the
 * rest anonymous devices) with `Chapter.viewCount` denormalized to match. Views
 * always exceed likes, as in real traffic.
 */
async function seedEngagement(chapterId: string, readerIds: string[], rng: () => number) {
  const likers = pickSome(readerIds, Math.floor(rng() * (readerIds.length + 1)), rng);
  for (const userId of likers) {
    await db.chapterLike.create({ data: { chapterId, userId } });
  }

  const viewTotal = likers.length + 3 + Math.floor(rng() * 30);
  const viewers = pickSome(readerIds, Math.min(readerIds.length, viewTotal), rng);
  for (const userId of viewers) {
    await db.chapterView.create({
      data: { chapterId, viewerKey: `seed-u:${chapterId}:${userId}`, userId }
    });
  }
  for (let i = viewers.length; i < viewTotal; i++) {
    await db.chapterView.create({ data: { chapterId, viewerKey: `seed-d:${chapterId}:${i}` } });
  }
  await db.chapter.update({ where: { id: chapterId }, data: { viewCount: viewTotal } });
}

async function seedDemoStory(
  authorId: string,
  story: DemoStory,
  readerIds: string[],
  rng: () => number
) {
  const existing = await db.story.findFirst({ where: { title: story.title } });
  if (existing) return; // idempotent: don't duplicate on a re-run

  const created = await createStoryWithRootChapter({
    title: story.title,
    authorId,
    chapterTitle: story.root.title,
    content: story.root.content,
    tagPermission: story.tagPermission
  });

  // Unclaimed suggested prompts ("✎ write this" slots) seeded on any chapter that
  // declares them — including the root.
  async function addPrompts(parentChapterId: string, labels: string[] = []) {
    for (const label of labels) {
      await addSuggestedPrompt({ parentChapterId, authorId, label });
    }
  }

  // Tags for this chapter (official → icons, custom → chips), added by the story
  // author so it works under both 'crowd' and 'author' tag permissions.
  async function addTags(chapterId: string, title: string) {
    for (const name of TAGS_BY_TITLE[title] ?? []) {
      await addTagToChapter({ chapterId, name, userId: authorId });
    }
  }

  async function addChildren(parentChapterId: string, nodes: StoryNode[] = []) {
    for (const node of nodes) {
      const child = await createChildChapter({
        storyId: created.id,
        parentChapterId,
        authorId,
        // label = the option-select wording; title = the chapter's own heading.
        label: node.label ?? node.title,
        title: node.title,
        content: node.content
      });
      await addPrompts(child.id, node.prompts);
      await addTags(child.id, node.title);
      await seedEngagement(child.id, readerIds, rng);
      await addChildren(child.id, node.children);
    }
  }

  await addPrompts(created.rootChapterId, story.root.prompts);
  await addTags(created.rootChapterId, story.root.title);
  await seedEngagement(created.rootChapterId, readerIds, rng);
  await addChildren(created.rootChapterId, story.root.children);
}

async function main() {
  const passwordHash = await hashPassword('password123');

  await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      username: slugifyHandle('Admin'),
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

  const authorIds = new Map<string, string>();
  for (const author of DEMO_AUTHORS) {
    const user = await db.user.upsert({
      where: { email: author.email },
      update: { displayName: author.displayName },
      create: {
        email: author.email,
        username: slugifyHandle(author.displayName),
        displayName: author.displayName,
        passwordHash
      }
    });
    authorIds.set(author.email, user.id);
  }

  const rng = makeRng(0x5eed);

  const readerIds: string[] = [];
  for (const name of DEMO_READERS) {
    const handle = slugifyHandle(name);
    const reader = await db.user.upsert({
      where: { email: `${handle}@example.com` },
      update: {},
      create: {
        email: `${handle}@example.com`,
        username: handle,
        displayName: name,
        passwordHash
      }
    });
    readerIds.push(reader.id);
  }

  for (const story of DEMO_STORIES) {
    const authorId = authorIds.get(story.authorEmail);
    if (authorId) await seedDemoStory(authorId, story, readerIds, rng);
  }

  // Profile views for the two authors (the profile "views" stat reads
  // User.profileViewCount). Idempotent: skip an author who already has them.
  for (const authorId of authorIds.values()) {
    if ((await db.profileView.count({ where: { profileUserId: authorId } })) > 0) continue;

    const viewers = pickSome(readerIds, 8 + Math.floor(rng() * (readerIds.length - 7)), rng);
    for (const viewerId of viewers) {
      await db.profileView.create({
        data: { profileUserId: authorId, viewerKey: `seed-u:${viewerId}`, userId: viewerId }
      });
    }
    const anon = Math.floor(rng() * 25);
    for (let i = 0; i < anon; i++) {
      await db.profileView.create({
        data: { profileUserId: authorId, viewerKey: `seed-d:${authorId}:${i}` }
      });
    }
    await db.user.update({
      where: { id: authorId },
      data: { profileViewCount: viewers.length + anon }
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
