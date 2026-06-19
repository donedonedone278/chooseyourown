'use client';

import { useEffect, useState } from 'react';

/**
 * localStorage key for a viewer's read set (an array of chapter ids). Namespaced
 * per signed-in user so two accounts sharing a device/browser don't bleed
 * read-state into each other; logged-out viewers share the device-level `anon`
 * set. The set is an instant client-side overlay on top of the server's
 * authoritative `ChapterView` rows (see `getReadChapterIds`) — it's what makes a
 * just-read chapter show as read the moment you navigate Back, before any server
 * round-trip.
 */
export function readStorageKey(userId?: string | null): string {
  return `readChapterIds:${userId ?? 'anon'}`;
}

function loadReadIds(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed) : new Set();
  } catch {
    return new Set();
  }
}

function saveReadIds(key: string, ids: Set<string>) {
  window.localStorage.setItem(key, JSON.stringify(Array.from(ids)));
}

/**
 * Read-state lookup backed by localStorage. Returns a `has(chapterId)` function
 * that starts out reporting everything unread (server render / first paint) and
 * updates once the client has read localStorage.
 *
 * Re-reads localStorage on the navigations that bring you *back* to a list
 * without re-running React from scratch: `popstate` (Next.js soft Back/Forward
 * via `<Link>`) and `pageshow` (a hard back/forward restore from the browser's
 * bfcache). Without these, a chapter marked read on its own page wouldn't show as
 * read when you returned to the feed until a manual refresh.
 */
export function useLocalReadIds(userId?: string | null): { has: (chapterId: string) => boolean } {
  const key = readStorageKey(userId);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    const sync = () => setReadIds(loadReadIds(key));
    sync();
    window.addEventListener('popstate', sync);
    window.addEventListener('pageshow', sync);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('pageshow', sync);
    };
  }, [key]);

  return { has: (chapterId: string) => readIds.has(chapterId) };
}

/**
 * Marks `chapterId` as read in the viewer's localStorage set on mount. Renders
 * nothing — drop it into a server-rendered chapter page alongside the rest of the
 * markup. Runs for signed-in viewers too: their durable read-state lives in
 * server `ChapterView` rows, but the local set is the instant overlay that keeps
 * Back-navigation from showing stale (cached) server read flags.
 */
export function MarkChapterRead({
  chapterId,
  userId
}: {
  chapterId: string;
  userId?: string | null;
}) {
  useEffect(() => {
    const key = readStorageKey(userId);
    const current = loadReadIds(key);
    if (!current.has(chapterId)) {
      current.add(chapterId);
      saveReadIds(key, current);
    }
  }, [chapterId, userId]);

  return null;
}
