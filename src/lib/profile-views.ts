import { Prisma } from '@prisma/client';

import { db } from '@/lib/db';

/**
 * Record that `viewerKey` opened the profile of `profileUserId`. Idempotent:
 * the unique `(profileUserId, viewerKey)` row means a repeat viewer (e.g. a
 * page reload) never inflates `User.profileViewCount` past one. The owner's
 * own views are recorded but excluded from the count — mirrors
 * `recordView` for `ChapterView`.
 */
export async function recordProfileView(input: {
  profileUserId: string;
  viewerKey: string;
  userId?: string | null;
}): Promise<{ counted: boolean }> {
  const isOwner = input.userId != null && input.userId === input.profileUserId;

  try {
    await db.$transaction(async (tx) => {
      await tx.profileView.create({
        data: {
          profileUserId: input.profileUserId,
          viewerKey: input.viewerKey,
          userId: input.userId ?? null
        }
      });

      if (!isOwner) {
        await tx.user.update({
          where: { id: input.profileUserId },
          data: { profileViewCount: { increment: 1 } }
        });
      }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      // A view is best-effort and must never crash the profile page:
      //  - P2002: already viewed by this viewerKey (idempotent reload).
      //  - P2003: the viewer's userId FK no longer exists — e.g. a stale JWT
      //    session pointing at a user row deleted by a db reset. Skip the row.
      if (error.code === 'P2002' || error.code === 'P2003') {
        return { counted: false };
      }
    }
    throw error;
  }

  return { counted: !isOwner };
}
