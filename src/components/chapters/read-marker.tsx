'use client';

import { useEffect, useState, type ReactNode } from 'react';

/** localStorage key for the logged-out read-state set (an array of chapter ids). */
export const READ_CHAPTER_IDS_KEY = 'readChapterIds';

function loadReadIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(READ_CHAPTER_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(ids: Set<string>) {
  window.localStorage.setItem(READ_CHAPTER_IDS_KEY, JSON.stringify(Array.from(ids)));
}

/**
 * Client-side read-state enhancer for logged-out viewers. On mount, optionally
 * marks `markAsReadId` (the chapter currently being read) into the localStorage
 * set, then renders `children` with an `isRead` lookup so callers can decorate
 * choice/feed lists without server round-trips.
 */
export function ReadMarker({
  markAsReadId,
  children
}: {
  markAsReadId?: string;
  children: (isRead: (chapterId: string) => boolean) => ReactNode;
}) {
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const current = loadReadIds();
    if (markAsReadId && !current.has(markAsReadId)) {
      current.add(markAsReadId);
      saveReadIds(current);
    }
    setReadIds(new Set(current));
    // Only re-run when the chapter being marked changes; `chapterIds` is read
    // fresh from state on every render via the `isRead` closure below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markAsReadId]);

  function isRead(chapterId: string): boolean {
    return readIds.has(chapterId);
  }

  return <>{children(isRead)}</>;
}
