// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReadMarker, READ_CHAPTER_IDS_KEY } from '@/components/chapters/read-marker';

describe('ReadMarker', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('applies the read treatment to ids found in localStorage and not to others', () => {
    localStorage.setItem(READ_CHAPTER_IDS_KEY, JSON.stringify(['chapter-a', 'chapter-c']));

    render(
      <ReadMarker>
        {(isRead) => (
          <ul>
            <li data-testid="chapter-a">{isRead('chapter-a') ? 'read' : 'unread'}</li>
            <li data-testid="chapter-b">{isRead('chapter-b') ? 'read' : 'unread'}</li>
            <li data-testid="chapter-c">{isRead('chapter-c') ? 'read' : 'unread'}</li>
          </ul>
        )}
      </ReadMarker>
    );

    expect(screen.getByTestId('chapter-a')).toHaveTextContent('read');
    expect(screen.getByTestId('chapter-b')).toHaveTextContent('unread');
    expect(screen.getByTestId('chapter-c')).toHaveTextContent('read');
  });

  it('treats all ids as unread when localStorage has no read set yet', () => {
    render(
      <ReadMarker>
        {(isRead) => <span data-testid="chapter-a">{isRead('chapter-a') ? 'read' : 'unread'}</span>}
      </ReadMarker>
    );

    expect(screen.getByTestId('chapter-a')).toHaveTextContent('unread');
  });

  it('marks the current chapter as read in localStorage on mount', () => {
    render(
      <ReadMarker markAsReadId="chapter-z">
        {() => <span>content</span>}
      </ReadMarker>
    );

    const stored = JSON.parse(localStorage.getItem(READ_CHAPTER_IDS_KEY) ?? '[]');
    expect(stored).toContain('chapter-z');
  });
});
