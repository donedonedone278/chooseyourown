// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ChoiceList, type ChoiceItem } from '@/components/chapters/choice-list';

function makeRealizedChoice(overrides: Partial<ChoiceItem> = {}): ChoiceItem {
  return {
    kind: 'realized',
    optionId: 'option-1',
    childId: 'choice-1',
    label: 'Open the gate',
    likeCount: 2,
    viewCount: 5,
    descendantCount: 3,
    read: false,
    tags: [],
    ...overrides
  } as ChoiceItem;
}

function makePromptChoice(overrides: Partial<ChoiceItem> = {}): ChoiceItem {
  return {
    kind: 'prompt',
    optionId: 'option-2',
    label: 'Search the cellar',
    ...overrides
  } as ChoiceItem;
}

describe('ChoiceList', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders likes, views, and descendant stats with accessible names', () => {
    render(<ChoiceList storyId="story-1" chapterId="chapter-1" choices={[makeRealizedChoice()]} />);

    expect(screen.getByLabelText(/2 likes/)).toBeInTheDocument();
    expect(screen.getByLabelText(/5 views/)).toBeInTheDocument();
    expect(screen.getByLabelText(/3 continuations/)).toBeInTheDocument();
  });

  it('renders stats at zero', () => {
    render(
      <ChoiceList
        storyId="story-1"
        chapterId="chapter-1"
        choices={[makeRealizedChoice({ likeCount: 0, viewCount: 0, descendantCount: 0 })]}
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
        chapterId="chapter-1"
        choices={[
          makeRealizedChoice({
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
        chapterId="chapter-1"
        choices={[
          makeRealizedChoice({
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

    render(<ChoiceList storyId="story-1" chapterId="chapter-1" choices={[makeRealizedChoice({ tags })]} />);

    for (let i = 0; i < 4; i++) {
      expect(screen.getByText(`tag_${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText('tag_4')).not.toBeInTheDocument();
    expect(screen.queryByText('tag_5')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('still dims a read choice (data-read="true")', () => {
    render(<ChoiceList storyId="story-1" chapterId="chapter-1" choices={[makeRealizedChoice({ read: true })]} />);

    const item = screen.getByRole('link', { name: 'Open the gate' }).closest('li');
    expect(item).toHaveAttribute('data-read', 'true');
  });

  it('renders the label, not a title, as the primary text', () => {
    render(<ChoiceList storyId="story-1" chapterId="chapter-1" choices={[makeRealizedChoice({ label: 'Climb the stairs' })]} />);

    expect(screen.getByRole('link', { name: 'Climb the stairs' })).toBeInTheDocument();
  });

  it('renders an unclaimed prompt as a write affordance with the correct ?option= href and no stats', () => {
    render(
      <ChoiceList
        storyId="story-1"
        chapterId="chapter-1"
        choices={[makePromptChoice({ optionId: 'opt-42', label: 'Search the cellar' })]}
      />
    );

    const link = screen.getByRole('link', { name: /Unwritten.*Search the cellar/i });
    expect(link).toHaveAttribute('href', '/stories/story-1/chapters/chapter-1/new?option=opt-42');

    const item = link.closest('li');
    expect(item).toHaveAttribute('data-kind', 'prompt');
    expect(item?.querySelector('[aria-label*="likes"]')).not.toBeInTheDocument();
  });

  it('realized card keeps stats alongside a prompt card with none', () => {
    render(
      <ChoiceList
        storyId="story-1"
        chapterId="chapter-1"
        choices={[makeRealizedChoice(), makePromptChoice()]}
      />
    );

    expect(screen.getByLabelText(/2 likes/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Unwritten/i })).toBeInTheDocument();
  });

  it('always renders a trailing open-branch "create your own option" card (open /new, no ?option)', () => {
    render(<ChoiceList storyId="story-1" chapterId="chapter-1" choices={[makeRealizedChoice()]} />);

    const create = screen.getByRole('link', { name: 'Create your own option' });
    expect(create).toHaveAttribute('href', '/stories/story-1/chapters/chapter-1/new');
    expect(create.closest('li')).toHaveAttribute('data-kind', 'create');
  });

  it('shows the create-your-own card even when there are no other choices', () => {
    render(<ChoiceList storyId="story-1" chapterId="chapter-1" choices={[]} />);

    expect(screen.getByRole('link', { name: 'Create your own option' })).toHaveAttribute(
      'href',
      '/stories/story-1/chapters/chapter-1/new'
    );
  });

  it('divides written options from the suggestions group when realized choices exist', () => {
    render(
      <ChoiceList
        storyId="story-1"
        chapterId="chapter-1"
        choices={[makeRealizedChoice(), makePromptChoice()]}
      />
    );

    expect(screen.getByText(/write the next chapter/i)).toBeInTheDocument();
  });

  it('omits the divider when there are no written options (nothing to divide from)', () => {
    render(
      <ChoiceList storyId="story-1" chapterId="chapter-1" choices={[makePromptChoice()]} />
    );

    expect(screen.queryByText(/write the next chapter/i)).not.toBeInTheDocument();
    // the suggestion + create card still render
    expect(screen.getByRole('link', { name: /Unwritten/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create your own option' })).toBeInTheDocument();
  });
});
