/**
 * Dev-data seed — every user, story, and chapter the local app shows.
 *
 *   npm run db:seed:dev      # additive, idempotent (re-runs skip what exists)
 *
 * `npm run db:reset` runs the setup seed (`prisma/seed.ts`, official tags) and
 * then this, so one command rebuilds a fully-populated dev/preview db. This file
 * owns ALL content — the setup seed creates no users/stories/chapters.
 *
 * It creates:
 *  - author accounts (Maya, Theo, Ana, Ben), an admin (`admin@example.com`),
 *    short-credential login accounts for hand testing (a@a.co / b@b.co / c@c.co),
 *    and a pool of named "reader" accounts (likes are one-per-user and views are
 *    one-per-unique-viewer, so believable counts need real distinct users);
 *  - five branching demo stories of real depth, every one of which exercises
 *    options-as-edges: choice **labels distinct from chapter titles** and
 *    unclaimed author-suggested **prompts** ("✎ write this" slots), plus a spread
 *    of tags (official → icons, custom → chips), per-chapter likes/views, and
 *    author profile views.
 *
 * Engagement is derived from a deterministic PRNG so a re-run after a fresh
 * `db:reset` reproduces the same numbers — a stable demo, not a flickering one.
 * It only writes to the dev db; it does NOT drop or migrate.
 */
import { db } from '@/lib/db';
import { addSuggestedPrompt, createChildChapter, createStoryWithRootChapter } from '@/lib/chapters';
import { addTagToChapter } from '@/lib/tags';
import { slugifyHandle } from '@/lib/handles';
import { hashPassword } from '@/lib/passwords';

/** Official tags (name → lucide icon). Upserted here too so the dev seed is
 * self-sufficient even when run standalone (mirrors the setup seed). */
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
 * - `label` is the option-select wording on the parent→child edge (the
 *   in-the-moment choice). Omitted ⇒ falls back to `title`; set on most nodes so
 *   the demo db actually shows the label≠title split.
 * - `prompts` are unclaimed author-suggested next-chapter slots ("✎ write this").
 * - `tags` are this chapter's tags (official render as icons, custom as chips).
 * - `children` are the realized choices offered at this chapter's end.
 */
type StoryNode = {
  title: string;
  content: string;
  label?: string;
  prompts?: string[];
  tags?: string[];
  children?: StoryNode[];
};

type DemoStory = {
  title: string;
  authorEmail: string;
  // Defaults to 'crowd' (anyone signed in may tag). One story uses 'author' to
  // flex the locked-tagging variant.
  tagPermission?: 'crowd' | 'author';
  root: StoryNode;
};

/** Accounts that author stories or sign in for hand testing. Short-credential
 * accounts (a/b/c) keep their tiny passwords; everyone else uses `password123`. */
const ACCOUNTS: {
  email: string;
  displayName: string;
  password: string;
  isAdmin?: boolean;
}[] = [
  { email: 'maya@example.com', displayName: 'Maya Quill', password: 'password123' },
  { email: 'theo@example.com', displayName: 'Theo Vance', password: 'password123' },
  { email: 'admin@example.com', displayName: 'Admin', password: 'password123', isAdmin: true },
  { email: 'a@a.co', displayName: 'Ana', password: 'aaaa' },
  { email: 'b@b.co', displayName: 'Ben', password: 'bbbb' },
  { email: 'c@c.co', displayName: 'Cyd', password: 'cccc', isAdmin: true }
];

// A pool of demo "reader" accounts that attribute likes and views. (All use
// password123.)
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
// but is identical on every reseed.
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
      tags: ['horror', 'mystery', 'lighthouse', 'slow_burn'],
      prompts: ['search the rocks for the keeper', 'wait for the tide to fall'],
      children: [
        {
          title: 'Up to the Lantern Room',
          label: 'climb toward the lantern room',
          content:
            'The stairs coil up past salt-fogged windows. At the top the great lamp is *cold* — unlit for the first time in a century. A logbook lies open on the brass rail.',
          tags: ['horror', 'mystery', 'dread'],
          prompts: ['check the radio set'],
          children: [
            {
              title: 'Read the Last Entry',
              label: 'open the keeper’s logbook',
              content:
                'The final line is not in the keeper’s steady hand. It slants, hurried: *"The light answers back now. Do not let it finish the sentence."* Below it, a single wet fingerprint.',
              tags: ['mystery', 'horror', 'unreliable_narrator', 'cursed_object', 'epistolary'],
              prompts: ['follow the wet fingerprint'],
              children: [
                {
                  title: 'Light the Lamp Anyway',
                  label: 'strike the igniter',
                  content:
                    'You strike the igniter. The beam swings out — and far across the water, something swings a beam *back*. You are no longer the only lighthouse on this coast.',
                  tags: ['horror', 'cosmic']
                },
                {
                  title: 'Leave the Lamp Dark',
                  label: 'leave the lamp cold',
                  content:
                    'You close the logbook and breathe. In the dark, the silence holds. Whatever was being summoned, you have left the sentence unfinished — for now.',
                  tags: ['mystery', 'quiet_ending']
                }
              ]
            },
            {
              title: 'Signal the Mainland',
              label: 'work the shutter-signal',
              content:
                'You crank the old shutter-signal toward town. Three long, three short. After a moment, three long, three short answer — from the *wrong* direction, out at sea.',
              tags: ['horror', 'isolation']
            }
          ]
        },
        {
          title: 'Down to the Cellar',
          label: 'descend to the cellar',
          content:
            'The air thickens with brine and oil. Your lamp finds crates, coiled rope, and a door that should not be here — iron, riveted, *warm* to the touch.',
          tags: ['horror', 'mystery', 'claustrophobia'],
          prompts: ['pry open the warm crates', 'feel along the wall for a switch'],
          children: [
            {
              title: 'Open the Iron Door',
              label: 'open the warm iron door',
              content:
                'It swings without a sound onto a tunnel of dripping stone that runs out beneath the seabed, toward a light that is not the lighthouse’s and never was.',
              tags: ['horror', 'fantasy', 'liminal']
            },
            {
              title: 'Barricade It Shut',
              label: 'barricade the door shut',
              content:
                'You drag the crates across the iron door and sit against them until dawn. Something on the far side knocks, politely, three times, and then is quiet.',
              tags: ['horror', 'siege']
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
      tags: ['sci_fi', 'mystery', 'first_contact', 'hard_sf'],
      prompts: ['wake the whole crew', 'run a diagnostic on the dish'],
      children: [
        {
          title: 'Wake the Captain',
          label: 'wake Captain Adeyemi',
          content:
            'Captain Adeyemi reads the waveform twice, jaw tight. "Eleven-minute round trip," she says. "Whatever we send, we live with the reply." She hands you the transmit key. "Your discovery. Your call."',
          tags: ['sci_fi', 'leadership'],
          prompts: ['ask the captain to wait for orders'],
          children: [
            {
              title: 'Send a Prime Sequence',
              label: 'transmit the primes',
              content:
                'You pulse out two, three, five, seven. Eleven minutes of held breath. Then the ice answers — *not* with the next prime, but with your own crew’s heartbeat rhythms, played back perfectly.',
              tags: ['sci_fi', 'first_contact', 'mathematics']
            },
            {
              title: 'Stay Silent and Listen',
              label: 'record without answering',
              content:
                'You record without answering. Over six hours the pattern resolves into a map — of the *Kestrel*, deck by deck, with one room marked that does not exist on your schematics.',
              tags: ['sci_fi', 'mystery', 'paranoia']
            }
          ]
        },
        {
          title: 'Answer It Yourself',
          label: 'answer it alone',
          content:
            'You don’t wake anyone. You key in a single echo of the pulse and send it down into the ice. Eleven minutes. The reply comes early — at minute *nine* — which means the source has moved closer.',
          tags: ['sci_fi', 'first_contact', 'hubris', 'suspense', 'solo'],
          prompts: ['log it but tell no one', 'seal the bulkheads'],
          children: [
            {
              title: 'Trace the New Position',
              label: 'trace the rising source',
              content:
                'The signal now originates a kilometre under the hull, rising. You have time to wake the crew, or time to watch — but not both.',
              tags: ['sci_fi', 'suspense']
            },
            {
              title: 'Cut the Transmitter',
              label: 'kill the dish',
              content:
                'You pull the dish offline. The bridge goes quiet. On the dead screen, your own reflection lifts its hand a half-second before you do.',
              tags: ['sci_fi', 'horror', 'doppelganger']
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
      tags: ['fantasy', 'romance', 'cozy', 'magical_realism'],
      prompts: ['lock the door and turn them away', 'ring the closing bell early'],
      children: [
        {
          title: 'Serve the Traveller First',
          label: 'pour for the traveller',
          content:
            'You pour something dark and smoke-sweet. The traveller wraps both hands around the cup and sighs. "I’ve been walking toward this shop," they say, "since before it was built."',
          tags: ['fantasy', 'romance', 'slow_burn'],
          prompts: ['refuse the ancient coin'],
          children: [
            {
              title: 'Ask Where They’re Going',
              label: 'ask their destination',
              content:
                'They smile and set down a coin older than the city. "Nowhere now. This was the destination. Keep the shop open one more night, and I’ll keep walking — somewhere new."',
              tags: ['fantasy', 'wistful']
            },
            {
              title: 'Offer Them the Spare Room',
              label: 'offer the spare room',
              content:
                'They stay. By morning the shop’s ledger has a second name beside yours, and Marrow Street is one door longer than it was the night before.',
              tags: ['romance', 'found_family']
            }
          ]
        },
        {
          title: 'Kneel by the Child',
          label: 'kneel by the child',
          content:
            'The child holds out an empty cup that is somehow *already warm*. "Grandmother said you’d still be here," they whisper. "She said to order her usual."',
          tags: ['fantasy', 'mystery', 'heartwarming'],
          prompts: ['ask who their grandmother was'],
          children: [
            {
              title: 'Make the Usual',
              label: 'brew grandmother’s usual',
              content:
                'Your hands move before you decide — honey, clove, a pinch of something you’ve never stocked. The child drinks, and for an instant an old woman’s laugh fills the room.',
              tags: ['fantasy', 'comedy', 'heartwarming', 'nostalgia', 'cozy']
            },
            {
              title: 'Admit You Don’t Know It',
              label: 'admit you don’t know it',
              content:
                'The child only nods, unsurprised, and recites the recipe in a voice far too old for them. You write it in the ledger. The shop, you realise, will not be closing after all.',
              tags: ['fantasy', 'bittersweet']
            }
          ]
        }
      ]
    }
  },
  {
    title: 'The Clockwork Orchard',
    authorEmail: 'a@a.co',
    root: {
      title: 'The Brass Gate',
      content:
        'The orchard wall runs for miles, and only one gate breaks it: brass, taller than a house, ticking softly like a held breath. Beyond it the trees are *metal*, and somewhere among them a bell counts a time that is not the hour.\n\nThe gate is unlocked. It always was. You push.',
      prompts: ['listen to what the bell is counting', 'count the metal trees'],
      children: [
        {
          title: 'The Orchard of Gears',
          label: 'walk in among the trees',
          content:
            'Rows of geared trees stretch in every direction, their leaves shivering with the faint **whir** of escapements. Five paths open between the trunks, each worn smooth by feet that came before yours.',
          tags: ['fantasy', 'mystery', 'clockwork', 'puzzle', 'time_loop'],
          prompts: ['climb the nearest geared tree'],
          children: [
            {
              title: 'The Copper Apple',
              label: 'reach for the copper apple',
              content:
                'A single apple of beaten copper hangs within reach, warm as a living thing. Inside its hollow you can hear a *core* turning over, slow and patient.',
              tags: ['clockwork', 'puzzle'],
              children: [
                {
                  title: 'Wind the Core',
                  label: 'wind the apple’s core',
                  content:
                    'You turn the stem. The orchard speeds up around you — a century of seasons in a breath — and when it stops you are *older*, and the gate behind you has rusted shut. **The End.**',
                  tags: ['bittersweet']
                },
                {
                  title: 'Let It Rust',
                  label: 'leave it to rust',
                  content:
                    'You leave the apple to its slow corrosion. Nothing changes, which is its own kind of mercy. You walk on, and the orchard lets you. **The End.**'
                }
              ]
            },
            {
              title: 'The Singing Bough',
              label: 'follow the singing branch',
              content:
                'One branch sings in a wind that isn’t blowing — a thin, tin lullaby. You could listen for hours, and perhaps you do. By the time you look up, the path behind you is gone. **The End.**',
              tags: ['fantasy']
            },
            {
              title: 'The Tin Crow',
              label: 'meet the tin crow’s eye',
              content:
                'A crow of riveted tin watches you with one lens eye, then hops twice and waits, as if it means for you to *follow*.',
              tags: ['mystery', 'creature'],
              children: [
                {
                  title: 'Follow It Home',
                  label: 'follow the crow home',
                  content:
                    'The crow leads you to a nest of lost keys, every one a different gate, every gate a different orchard. You take one at random and pocket your next beginning. **The End.**'
                }
              ]
            },
            {
              title: 'The Frozen Fountain',
              label: 'approach the stopped fountain',
              content:
                'Water hangs mid-fall, frozen not by cold but by a *stopped clock* at the fountain’s heart. Your reflection in it blinks a half-second after you do. **The End.**',
              tags: ['fantasy']
            },
            {
              title: 'The Gardener’s Shed',
              label: 'try the gardener’s shed',
              content:
                'The shed holds a thousand tiny tools and one enormous one: a crank set into the floor, labelled only **WINTER**. You decide, wisely, not to turn it. **The End.**',
              tags: ['puzzle']
            }
          ]
        },
        {
          title: 'The Silent Greenhouse',
          label: 'slip into the greenhouse',
          content:
            'Off to the side, a greenhouse of fogged glass holds the only *quiet* in the orchard — no ticking, no bell. Something here was built to keep time *out*.',
          tags: ['fantasy', 'liminal'],
          prompts: ['wipe a clear patch in the fogged glass'],
          children: [
            {
              title: 'The Glass Seedling',
              label: 'lift the glass seedling',
              content:
                'In a clay pot sits a seedling of spun glass, impossibly delicate, its roots threaded with hair-fine gears that haven’t started turning yet.',
              tags: ['clockwork'],
              children: [
                {
                  title: 'Plant It',
                  label: 'plant it in the orchard',
                  content:
                    'You set it in the orchard soil. The gears catch, and a new tree begins — yours, this time, counting a time you chose. **The End.**'
                },
                {
                  title: 'Pocket It',
                  label: 'pocket it and leave',
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
          label: 'turn back at the gate',
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
      prompts: ['turn the set off and walk away', 'check who else is home'],
      children: [
        {
          title: 'The Test Pattern',
          label: 'lean toward the colour bars',
          content:
            'The screen resolves into colour bars, but the tone underneath them is a *word*, repeated, slowed almost past hearing. You lean in to catch it.',
          tags: ['horror', 'found_footage'],
          prompts: ['mute the tone and just watch'],
          children: [
            {
              title: 'Tune Closer',
              label: 'nudge the dial closer',
              content:
                'You nudge the dial a hair. The bars bend toward you like reeds in a current, and the word becomes your name in a voice you used to know.',
              tags: ['horror', 'cosmic_horror'],
              children: [
                {
                  title: 'Answer the Voice',
                  label: 'say yes to the voice',
                  content:
                    'You say *yes*. The grey opens like a pupil, and on the far side of the glass, your chair in the basement is already empty. **The End.**',
                  tags: ['cosmic_horror']
                },
                {
                  title: 'Record It',
                  label: 'hit the tape',
                  content:
                    'You hit the tape. The reels spin up greedily, drinking the signal, hungry for a copy of whatever this is.',
                  tags: ['found_footage'],
                  children: [
                    {
                      title: 'Play It Back',
                      label: 'play the tape back',
                      content:
                        'On playback the tape shows *your* basement, *your* back, and a second figure standing behind you in the frame — patient, unblinking — that was never there in the room. **The End.**',
                      tags: ['cosmic_horror', 'bittersweet']
                    }
                  ]
                },
                {
                  title: 'Pull the Plug',
                  label: 'yank the cord',
                  content:
                    'You yank the cord. The screen dies. In the black glass your reflection keeps watching the bars a moment longer than you do, then catches up. **The End.**'
                }
              ]
            },
            {
              title: 'Smash the Set',
              label: 'put a chair through it',
              content:
                'You put a chair through it. Glass and grey spill across the floor — and keep spilling, a thin tide of static pooling toward the stairs, but slower now. Slow enough to leave. **The End.**'
            }
          ]
        },
        {
          title: 'The Weather Report',
          label: 'watch the late forecast',
          content:
            'A calm anchor describes tomorrow’s forecast for a city with your name, street by street, and ends with: *"and at 3 a.m., one viewer will finally look away."* You check the clock. **The End.**',
          tags: ['mystery']
        },
        {
          title: 'The Midnight Movie',
          label: 'stay for the late movie',
          content:
            'A film you half-remember from childhood flickers up, except now the camera lingers on the *edges* of every shot, on the doorways, as if waiting for someone off-screen to enter.',
          tags: ['horror', 'late_night', 'found_footage'],
          prompts: ['look for the exit signs in the frame'],
          children: [
            {
              title: 'Enter the Film',
              label: 'step into the frame',
              content:
                'You step toward the glass and the basement is suddenly a back-lot at dusk, warm and grainy, and a voice off-camera calls *action* in a tone that expects you to know your lines. **The End.**',
              tags: ['liminal']
            },
            {
              title: 'Pause It',
              label: 'freeze the frame',
              content:
                'You freeze the frame on an empty hallway. Held still, the image keeps moving anyway — a shadow lengthening across the far wall, toward the lens. **The End.**'
            }
          ]
        },
        {
          title: 'Static All the Way Down',
          label: 'just watch the grey',
          content:
            'You stop fighting it and just *watch* the grey. It isn’t empty. It has depth, and the depth has a floor, and the floor is very far down and getting nearer.',
          tags: ['cosmic_horror'],
          children: [
            {
              title: 'Keep Falling',
              label: 'let yourself keep falling',
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
  if (existing) {
    console.log(`· skip (exists): ${story.title}`);
    return;
  }

  const created = await createStoryWithRootChapter({
    title: story.title,
    authorId,
    chapterTitle: story.root.title,
    content: story.root.content,
    tagPermission: story.tagPermission
  });

  // Unclaimed suggested prompts ("✎ write this" slots) on any chapter that
  // declares them — including the root.
  async function addPrompts(parentChapterId: string, labels: string[] = []) {
    for (const label of labels) {
      await addSuggestedPrompt({ parentChapterId, authorId, label });
    }
  }

  // Tags added by the story author so it works under both 'crowd' and 'author'
  // permissions (official ones were upserted in main() with their icons).
  async function addTags(chapterId: string, tags: string[] = []) {
    for (const name of tags) {
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
      await addTags(child.id, node.tags);
      await seedEngagement(child.id, readerIds, rng);
      await addChildren(child.id, node.children);
    }
  }

  await addPrompts(created.rootChapterId, story.root.prompts);
  await addTags(created.rootChapterId, story.root.tags);
  await seedEngagement(created.rootChapterId, readerIds, rng);
  await addChildren(created.rootChapterId, story.root.children);

  console.log(`✓ seeded: ${story.title}`);
}

async function main() {
  // Official tag vocabulary (self-sufficient; mirrors the setup seed).
  for (const tag of OFFICIAL_TAGS) {
    await db.tag.upsert({
      where: { name: tag.name },
      update: { isOfficial: true, icon: tag.icon },
      create: { name: tag.name, isOfficial: true, icon: tag.icon }
    });
  }

  // Author + login accounts.
  const accountIds = new Map<string, string>();
  for (const account of ACCOUNTS) {
    const user = await db.user.upsert({
      where: { email: account.email },
      update: { displayName: account.displayName, isAdmin: account.isAdmin ?? false },
      create: {
        email: account.email,
        username: slugifyHandle(account.displayName),
        displayName: account.displayName,
        passwordHash: await hashPassword(account.password),
        isAdmin: account.isAdmin ?? false
      }
    });
    accountIds.set(account.email, user.id);
  }

  // Reader pool (likes + views need distinct users).
  const readerPasswordHash = await hashPassword('password123');
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
        passwordHash: readerPasswordHash
      }
    });
    readerIds.push(reader.id);
  }

  const rng = makeRng(0x5eed);

  for (const story of DEMO_STORIES) {
    const authorId = accountIds.get(story.authorEmail);
    if (authorId) await seedDemoStory(authorId, story, readerIds, rng);
  }

  // Profile views for each story author (the profile "views" stat reads
  // User.profileViewCount). Idempotent: skip an author who already has them.
  const authorEmails = new Set(DEMO_STORIES.map((s) => s.authorEmail));
  for (const email of authorEmails) {
    const authorId = accountIds.get(email);
    if (!authorId) continue;
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

  console.log('\nLogin accounts (email / password):');
  for (const account of ACCOUNTS) {
    console.log(`  ${account.email} / ${account.password}${account.isAdmin ? '  (admin)' : ''}`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
