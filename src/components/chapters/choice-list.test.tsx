// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChoiceList, type ChoiceItem } from '@/components/chapters/choice-list';

function makeChoice(overrides: Partial<ChoiceItem> = {}): ChoiceItem {
  return {
    id: 'choice-1',
    title: 'Open the gate',
    likeCount: 2,
    viewCount: 5,
    descendantCount: 3,
    read: false,
    tags: [],
    ...overrides
  };
}

describe('ChoiceList', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders likes, views, and descendant stats with accessible names', () => {
    render(<ChoiceList storyId="story-1" choices={[makeChoice()]} />);

    expect(screen.getByLabelText(/2 likes/)).toBeInTheDocument();
    expect(screen.getByLabelText(/5 views/)).toBeInTheDocument();
    expect(screen.getByLabelText(/3 continuations/)).toBeInTheDocument();
  });

  it('renders stats at zero', () => {
    render(
      <ChoiceList
        storyId="story-1"
        choices={[makeChoice({ likeCount: 0, viewCount: 0, descendantCount: 0 })]}
      />
    );

    expect(screen.getByLabelText(/0 likes/)).toBeInTheDocument();
    expect(screen.getByLabelText(/0 views/)).toBeInTheDocument();
    expect(screen.getByLabelText(/0 continuations/)).toBeInTheDocument();
  });

  it('renders an official tag as a glyph with the tag name as its accessible name', () => {
    render(
      <ChoiceList
        storyId="story-1"
        choices={[
          makeChoice({
            tags: [{ tagId: 'tag-1', name: 'horror', isOfficial: true, icon: 'Skull' }]
          })
        ]}
      />
    );

    expect(screen.getByLabelText('horror')).toBeInTheDocument();
  });

  it('renders a custom tag as a text chip', () => {
    render(
      <ChoiceList
        storyId="story-1"
        choices={[
          makeChoice({
            tags: [{ tagId: 'tag-2', name: 'plot_twist', isOfficial: false, icon: null }]
          })
        ]}
      />
    );

    expect(screen.getByText('plot_twist')).toBeInTheDocument();
  });

  it('shows exactly 4 tags plus a +N overflow indicator when there are more than 4', () => {
    const tags = Array.from({ length: 6 }, (_, i) => ({
      tagId: `tag-${i}`,
      name: `tag_${i}`,
      isOfficial: false,
      icon: null
    }));

    render(<ChoiceList storyId="story-1" choices={[makeChoice({ tags })]} />);

    for (let i = 0; i < 4; i++) {
      expect(screen.getByText(`tag_${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText('tag_4')).not.toBeInTheDocument();
    expect(screen.queryByText('tag_5')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('still dims a read choice (data-read="true")', () => {
    render(<ChoiceList storyId="story-1" choices={[makeChoice({ read: true })]} />);

    const item = screen.getByRole('link', { name: 'Open the gate' }).closest('li');
    expect(item).toHaveAttribute('data-read', 'true');
  });
});
