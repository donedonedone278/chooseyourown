'use server';

import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';

import { auth } from '@/lib/auth';
import { recordProfileView } from '@/lib/profile-views';
import { recordView } from '@/lib/views';

const DEVICE_ID_COOKIE = 'deviceId';

/**
 * Resolve the logged-out device id. `src/middleware.ts` guarantees the
 * `deviceId` cookie exists before any `/stories/*` page renders, so this is
 * read-only — render-time code can't call `cookies().set()` (Next.js throws
 * "Cookies can only be modified in a Server Action or Route Handler"). The
 * random fallback only matters if middleware's matcher were ever to miss a
 * route; it keeps this function from throwing even then.
 */
async function getDeviceId(): Promise<string> {
  const store = await cookies();
  return store.get(DEVICE_ID_COOKIE)?.value ?? randomUUID();
}

/**
 * Record a view of `chapterId` for the current viewer (signed-in user or
 * logged-out device). Idempotent — safe to call once per page render,
 * including on refresh.
 */
export async function recordViewAction(chapterId: string, authorId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const viewerKey = userId ? `user:${userId}` : `device:${await getDeviceId()}`;

  return recordView({ chapterId, viewerKey, userId, authorId });
}

/**
 * Record a view of `profileUserId`'s profile page for the current viewer
 * (signed-in user or logged-out device). Idempotent — safe to call once per
 * page render, including on refresh.
 */
export async function recordProfileViewAction(profileUserId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const viewerKey = userId ? `user:${userId}` : `device:${await getDeviceId()}`;

  return recordProfileView({ profileUserId, viewerKey, userId });
}
