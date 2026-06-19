// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

import {
  MarkChapterRead,
  READ_CHAPTER_IDS_KEY,
  useLocalReadIds
} from '@/components/chapters/read-marker';

function ReadProbe({ ids }: { ids: string[] }) {
  const { has } = useLocalReadIds();
  return (
    <ul>
      {ids.map((id) => (
        <li key={id} data-testid={id}>
          {has(id) ? 'read' : 'unread'}
        </li>
      ))}
    </ul>
  );
}

describe('useLocalReadIds', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('reports ids found in localStorage as read and others as unread', async () => {
    localStorage.setItem(READ_CHAPTER_IDS_KEY, JSON.stringify(['chapter-a', 'chapter-c']));

    render(<ReadProbe ids={['chapter-a', 'chapter-b', 'chapter-c']} />);

    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('read'));
    expect(screen.getByTestId('chapter-b')).toHaveTextContent('unread');
    expect(screen.getByTestId('chapter-c')).toHaveTextContent('read');
  });

  it('treats all ids as unread when localStorage has no read set yet', async () => {
    render(<ReadProbe ids={['chapter-a']} />);

    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('unread'));
  });
});

describe('MarkChapterRead', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds the chapter id to the localStorage read set on mount', async () => {
    render(<MarkChapterRead chapterId="chapter-z" />);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(READ_CHAPTER_IDS_KEY) ?? '[]');
      expect(stored).toContain('chapter-z');
    });
  });
});
