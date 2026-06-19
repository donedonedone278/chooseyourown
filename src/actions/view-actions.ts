'use server';

import { randomUUID } from 'node:crypto';

import { cookies } from 'next/headers';

import { auth } from '@/lib/auth';
import { recordView } from '@/lib/views';

const DEVICE_ID_COOKIE = 'deviceId';

/**
 * Resolve (and lazily set) the logged-out device id cookie. Signed-in viewers
 * don't need one for view recording, but we still keep it stable per browser
 * so a later sign-out continues to read consistently.
 */
async function getOrSetDeviceId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(DEVICE_ID_COOKIE)?.value;
  if (existing) return existing;

  const id = randomUUID();
  store.set(DEVICE_ID_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });
  return id;
}

/**
 * Record a view of `chapterId` for the current viewer (signed-in user or
 * logged-out device). Idempotent — safe to call once per page render,
 * including on refresh.
 */
export async function recordViewAction(chapterId: string, authorId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  const viewerKey = userId ? `user:${userId}` : `device:${await getOrSetDeviceId()}`;

  return recordView({ chapterId, viewerKey, userId, authorId });
}
