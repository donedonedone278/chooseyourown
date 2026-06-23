// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

import {
  MarkChapterRead,
  readStorageKey,
  useLocalReadIds
} from '@/components/chapters/read-marker';

/** Dispatch a back/forward navigation event; jsdom lacks `PageTransitionEvent`. */
function dispatchNav(type: 'popstate' | 'pageshow') {
  act(() => {
    window.dispatchEvent(new Event(type));
  });
}

function ReadProbe({ ids, userId }: { ids: string[]; userId?: string | null }) {
  const { has } = useLocalReadIds(userId);
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
    localStorage.setItem(readStorageKey(), JSON.stringify(['chapter-a', 'chapter-c']));

    render(<ReadProbe ids={['chapter-a', 'chapter-b', 'chapter-c']} />);

    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('read'));
    expect(screen.getByTestId('chapter-b')).toHaveTextContent('unread');
    expect(screen.getByTestId('chapter-c')).toHaveTextContent('read');
  });

  it('treats all ids as unread when localStorage has no read set yet', async () => {
    render(<ReadProbe ids={['chapter-a']} />);

    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('unread'));
  });

  it('namespaces the read set per user (one account does not see another’s reads)', async () => {
    localStorage.setItem(readStorageKey('user-1'), JSON.stringify(['chapter-a']));

    render(<ReadProbe ids={['chapter-a']} userId="user-2" />);

    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('unread'));
  });

  it('re-reads localStorage on a soft Back (popstate) so a just-read chapter shows read', async () => {
    render(<ReadProbe ids={['chapter-a']} />);
    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('unread'));

    // The chapter gets marked read while we're on its page, then a Next.js soft
    // Back navigation (a `popstate`, not a fresh mount) returns us to the feed.
    localStorage.setItem(readStorageKey(), JSON.stringify(['chapter-a']));
    dispatchNav('popstate');

    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('read'));
  });

  it('re-reads localStorage on a hard Back restore (pageshow / bfcache)', async () => {
    render(<ReadProbe ids={['chapter-a']} />);
    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('unread'));

    localStorage.setItem(readStorageKey(), JSON.stringify(['chapter-a']));
    dispatchNav('pageshow');

    await waitFor(() => expect(screen.getByTestId('chapter-a')).toHaveTextContent('read'));
  });
});

describe('MarkChapterRead', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds the chapter id to the anonymous read set on mount', async () => {
    render(<MarkChapterRead chapterId="chapter-z" />);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(readStorageKey()) ?? '[]');
      expect(stored).toContain('chapter-z');
    });
  });

  it('writes to the per-user read set when a userId is given', async () => {
    render(<MarkChapterRead chapterId="chapter-z" userId="user-1" />);

    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem(readStorageKey('user-1')) ?? '[]');
      expect(stored).toContain('chapter-z');
    });
    expect(localStorage.getItem(readStorageKey())).toBeNull();
  });
});
