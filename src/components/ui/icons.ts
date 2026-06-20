import {
  BookOpen,
  Eye,
  GitFork,
  Heart,
  Laugh,
  Library,
  Rocket,
  Search,
  Skull,
  Wand,
  type LucideIcon
} from 'lucide-react';

type StatKindDef = {
  icon: LucideIcon;
  noun: string;
  // Override for nouns with an irregular plural (e.g. "story" -> "stories").
  // Omit when the default `${noun}s` suffix is correct.
  plural?: string;
  // When a stat has a viewer-specific "picked" state (e.g. the viewer liked it),
  // the icon fills with this accent instead of rendering as a plain outline.
  accent?: { fill: string; stroke: string };
};

// Shared icon vocabulary for "symbol + number" stats across the app. New stat
// kinds should be added here so every render site stays in sync.
const STAT_KIND_DEFS = {
  likes: { icon: Heart, noun: 'like', accent: { fill: '#e11d48', stroke: '#111' } },
  views: { icon: Eye, noun: 'view' },
  descendants: { icon: GitFork, noun: 'continuation' },
  chapters: { icon: BookOpen, noun: 'chapter' },
  stories: { icon: Library, noun: 'story', plural: 'stories' }
} satisfies Record<string, StatKindDef>;

export type StatKind = keyof typeof STAT_KIND_DEFS;

// Widen the value type to StatKindDef so `accent` is uniformly accessible (it's
// optional — only kinds with a picked state define it) while keeping literal keys.
export const STAT_KINDS: Record<StatKind, StatKindDef> = STAT_KIND_DEFS;

// Maps a seeded official tag's icon name to its glyph. Returns undefined for
// `null` or an unrecognized name so callers can render a plain chip.
const OFFICIAL_TAG_ICONS: Record<string, LucideIcon> = {
  Skull,
  Heart,
  Search,
  Laugh,
  Wand,
  Rocket
};

export function officialTagIcon(name: string | null): LucideIcon | undefined {
  if (!name) return undefined;
  return OFFICIAL_TAG_ICONS[name];
}
