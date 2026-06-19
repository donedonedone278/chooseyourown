'use client';

import { useEffect, useState } from 'react';

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
 * Read-state lookup for logged-out viewers, backed by localStorage. Returns a
 * `has(chapterId)` function that starts out reporting everything unread (server
 * render / first paint) and updates once the client has read localStorage.
 *
 * Function props can't cross the server→client boundary, so this is a hook for
 * client components to call directly rather than a render-prop wrapper around
 * server-rendered markup.
 */
export function useLocalReadIds(): { has: (chapterId: string) => boolean } {
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setReadIds(loadReadIds());
  }, []);

  return { has: (chapterId: string) => readIds.has(chapterId) };
}

/**
 * Marks `chapterId` as read in the logged-out localStorage set on mount.
 * Renders nothing — drop it into a server-rendered chapter page alongside the
 * rest of the markup. No-op for signed-in viewers, whose read-state lives in
 * server `ChapterView` rows instead (see `getReadChapterIds`).
 */
export function MarkChapterRead({ chapterId }: { chapterId: string }) {
  useEffect(() => {
    const current = loadReadIds();
    if (!current.has(chapterId)) {
      current.add(chapterId);
      saveReadIds(current);
    }
  }, [chapterId]);

  return null;
}
