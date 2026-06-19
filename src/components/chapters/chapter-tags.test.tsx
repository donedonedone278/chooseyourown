// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

import { ChapterTags } from '@/components/chapters/chapter-tags';
import { addChapterTagAction } from '@/actions/tag-actions';

vi.mock('@/actions/tag-actions', () => ({
  addChapterTagAction: vi.fn(async () => ({})),
  removeChapterTagAction: vi.fn(),
  suggestTagsAction: vi.fn(async () => [])
}));

describe('ChapterTags', () => {
  const officialTag = { chapterTagId: 'ct-1', tagId: 'tag-1', name: 'horror', isOfficial: true, icon: 'Skull' };
  const customTag = { chapterTagId: 'ct-2', tagId: 'tag-2', name: 'plot twist', isOfficial: false, icon: null };

  it('renders an official tag with its glyph and a custom tag as a plain chip', () => {
    render(
      <ChapterTags
        storyId="story-1"
        chapterId="chapter-1"
        tags={[officialTag, customTag]}
        canAdd={false}
        canRemove={false}
      />
    );

    expect(screen.getByText('horror')).toBeInTheDocument();
    expect(screen.getByText('plot twist')).toBeInTheDocument();
    // Official tag renders a glyph (an svg icon) alongside its label.
    const officialChip = screen.getByText('horror').closest('li');
    expect(officialChip?.querySelector('svg')).not.toBeNull();
    const customChip = screen.getByText('plot twist').closest('li');
    expect(customChip?.querySelector('svg')).toBeNull();
  });

  it('shows the add-tag input only when the viewer is permitted to add', () => {
    const { rerender } = render(
      <ChapterTags storyId="story-1" chapterId="chapter-1" tags={[]} canAdd={true} canRemove={false} />
    );
    expect(screen.getByRole('textbox', { name: /add a tag/i })).toBeInTheDocument();

    rerender(
      <ChapterTags storyId="story-1" chapterId="chapter-1" tags={[]} canAdd={false} canRemove={false} />
    );
    expect(screen.queryByRole('textbox', { name: /add a tag/i })).not.toBeInTheDocument();
  });

  it('shows a remove control on each tag only when the viewer can remove', () => {
    const { rerender } = render(
      <ChapterTags
        storyId="story-1"
        chapterId="chapter-1"
        tags={[officialTag]}
        canAdd={false}
        canRemove={true}
      />
    );
    expect(screen.getByRole('button', { name: /remove horror/i })).toBeInTheDocument();

    rerender(
      <ChapterTags
        storyId="story-1"
        chapterId="chapter-1"
        tags={[officialTag]}
        canAdd={false}
        canRemove={false}
      />
    );
    expect(screen.queryByRole('button', { name: /remove horror/i })).not.toBeInTheDocument();
  });

  it('surfaces a validation error from the add action instead of crashing', async () => {
    vi.mocked(addChapterTagAction).mockResolvedValueOnce({
      error: 'Tag must be at least 4 characters.'
    });

    render(
      <ChapterTags storyId="story-1" chapterId="chapter-1" tags={[]} canAdd={true} canRemove={false} />
    );

    fireEvent.change(screen.getByRole('textbox', { name: /add a tag/i }), {
      target: { value: 'ab' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Tag must be at least 4 characters.')
    );
  });
});
