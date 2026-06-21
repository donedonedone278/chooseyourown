import { db } from '@/lib/db';
import { addSuggestedPrompt, createChildChapter, createStoryWithRootChapter } from '@/lib/chapters';
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

/** A branching chapter node — `children` are the choices offered at its end. */
type StoryNode = { title: string; content: string; children?: StoryNode[] };

type DemoStory = { title: string; authorEmail: string; root: StoryNode };

const DEMO_AUTHORS: { email: string; displayName: string }[] = [
  { email: 'maya@example.com', displayName: 'Maya Quill' },
  { email: 'theo@example.com', displayName: 'Theo Vance' }
];

const DEMO_STORIES: DemoStory[] = [
  {
    title: 'The Lighthouse at Dunmore',
    authorEmail: 'maya@example.com',
    root: {
      title: 'The Long Walk Out',
      content:
        'The causeway to Dunmore lighthouse floods at high tide, and the keeper has not answered the radio in three days. You reach the door as the last gull leaves the rocks.\n\nInside, two stairwells split the dark: one **spiralling up** toward the lantern room, one **dropping down** toward the cellar.',
      children: [
        {
          title: 'Up to the Lantern Room',
          content:
            'The stairs coil up past salt-fogged windows. At the top the great lamp is *cold* — unlit for the first time in a century. A logbook lies open on the brass rail.',
          children: [
            {
              title: 'Read the Last Entry',
              content:
                'The final line is not in the keeper’s steady hand. It slants, hurried: *"The light answers back now. Do not let it finish the sentence."* Below it, a single wet fingerprint.',
              children: [
                {
                  title: 'Light the Lamp Anyway',
                  content:
                    'You strike the igniter. The beam swings out — and far across the water, something swings a beam *back*. You are no longer the only lighthouse on this coast.'
                },
                {
                  title: 'Leave the Lamp Dark',
                  content:
                    'You close the logbook and breathe. In the dark, the silence holds. Whatever was being summoned, you have left the sentence unfinished — for now.'
                }
              ]
            },
            {
              title: 'Signal the Mainland',
              content:
                'You crank the old shutter-signal toward town. Three long, three short. After a moment, three long, three short answer — from the *wrong* direction, out at sea.'
            }
          ]
        },
        {
          title: 'Down to the Cellar',
          content:
            'The air thickens with brine and oil. Your lamp finds crates, coiled rope, and a door that should not be here — iron, riveted, *warm* to the touch.',
          children: [
            {
              title: 'Open the Iron Door',
              content:
                'It swings without a sound onto a tunnel of dripping stone that runs out beneath the seabed, toward a light that is not the lighthouse’s and never was.'
            },
            {
              title: 'Barricade It Shut',
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
    root: {
      title: 'The Eleven-Minute Delay',
      content:
        'You are the only one awake aboard the survey ship *Kestrel* when the dish catches it: a clean, repeating pulse rising from beneath Europa’s ice. It is **patterned**. It is not natural.\n\nThe rest of the crew sleeps in the cold ring. You can *wake the captain*, or *answer it yourself* before the window closes.',
      children: [
        {
          title: 'Wake the Captain',
          content:
            'Captain Adeyemi reads the waveform twice, jaw tight. "Eleven-minute round trip," she says. "Whatever we send, we live with the reply." She hands you the transmit key. "Your discovery. Your call."',
          children: [
            {
              title: 'Send a Prime Sequence',
              content:
                'You pulse out two, three, five, seven. Eleven minutes of held breath. Then the ice answers — *not* with the next prime, but with your own crew’s heartbeat rhythms, played back perfectly.'
            },
            {
              title: 'Stay Silent and Listen',
              content:
                'You record without answering. Over six hours the pattern resolves into a map — of the *Kestrel*, deck by deck, with one room marked that does not exist on your schematics.'
            }
          ]
        },
        {
          title: 'Answer It Yourself',
          content:
            'You don’t wake anyone. You key in a single echo of the pulse and send it down into the ice. Eleven minutes. The reply comes early — at minute *nine* — which means the source has moved closer.',
          children: [
            {
              title: 'Trace the New Position',
              content:
                'The signal now originates a kilometre under the hull, rising. You have time to wake the crew, or time to watch — but not both.'
            },
            {
              title: 'Cut the Transmitter',
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
      children: [
        {
          title: 'Serve the Traveller First',
          content:
            'You pour something dark and smoke-sweet. The traveller wraps both hands around the cup and sighs. "I’ve been walking toward this shop," they say, "since before it was built."',
          children: [
            {
              title: 'Ask Where They’re Going',
              content:
                'They smile and set down a coin older than the city. "Nowhere now. This was the destination. Keep the shop open one more night, and I’ll keep walking — somewhere new."'
            },
            {
              title: 'Offer Them the Spare Room',
              content:
                'They stay. By morning the shop’s ledger has a second name beside yours, and Marrow Street is one door longer than it was the night before.'
            }
          ]
        },
        {
          title: 'Kneel by the Child',
          content:
            'The child holds out an empty cup that is somehow *already warm*. "Grandmother said you’d still be here," they whisper. "She said to order her usual."',
          children: [
            {
              title: 'Make the Usual',
              content:
                'Your hands move before you decide — honey, clove, a pinch of something you’ve never stocked. The child drinks, and for an instant an old woman’s laugh fills the room.'
            },
            {
              title: 'Admit You Don’t Know It',
              content:
                'The child only nods, unsurprised, and recites the recipe in a voice far too old for them. You write it in the ledger. The shop, you realise, will not be closing after all.'
            }
          ]
        }
      ]
    }
  }
];

async function seedDemoStory(authorId: string, story: DemoStory) {
  const existing = await db.story.findFirst({ where: { title: story.title } });
  if (existing) return; // idempotent: don't duplicate on a re-run

  const created = await createStoryWithRootChapter({
    title: story.title,
    authorId,
    chapterTitle: story.root.title,
    content: story.root.content
  });

  async function addChildren(parentChapterId: string, nodes: StoryNode[] = []) {
    for (const node of nodes) {
      const child = await createChildChapter({
        storyId: created.id,
        parentChapterId,
        authorId,
        label: node.title,
        content: node.content
      });
      await addChildren(child.id, node.children);
    }
  }

  await addChildren(created.rootChapterId, story.root.children);

  // A couple of unclaimed suggested prompts on the root chapter, so the
  // "write this" slot is visible in the demo db without extra setup.
  await addSuggestedPrompt({
    parentChapterId: created.rootChapterId,
    authorId,
    label: 'Search for another way in'
  });
  await addSuggestedPrompt({
    parentChapterId: created.rootChapterId,
    authorId,
    label: 'Wait until morning'
  });
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

  for (const story of DEMO_STORIES) {
    const authorId = authorIds.get(story.authorEmail);
    if (authorId) await seedDemoStory(authorId, story);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await db.$disconnect();
    process.exit(1);
  });
