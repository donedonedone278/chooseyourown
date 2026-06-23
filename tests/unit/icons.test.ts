import { describe, expect, it } from 'vitest';

import { officialTagIcon, STAT_KINDS } from '@/components/ui/icons';

describe('officialTagIcon', () => {
  it('returns the glyph for a known official icon name', () => {
    expect(officialTagIcon('Skull')).toBeTruthy();
  });

  it('returns undefined for null', () => {
    expect(officialTagIcon(null)).toBeUndefined();
  });

  it('returns undefined for an unknown name', () => {
    expect(officialTagIcon('nope')).toBeUndefined();
  });
});

describe('STAT_KINDS', () => {
  it('has the three expected nouns', () => {
    expect(STAT_KINDS.likes.noun).toBe('like');
    expect(STAT_KINDS.views.noun).toBe('view');
    expect(STAT_KINDS.descendants.noun).toBe('continuation');
  });

  it('gives likes a picked-state accent (red fill, black outline)', () => {
    expect(STAT_KINDS.likes.accent).toEqual({ fill: '#e11d48', stroke: '#111' });
  });

  it('leaves kinds without a picked state accent-less', () => {
    expect(STAT_KINDS.views.accent).toBeUndefined();
    expect(STAT_KINDS.descendants.accent).toBeUndefined();
  });
});
