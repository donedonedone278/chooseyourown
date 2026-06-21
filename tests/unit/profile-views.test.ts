import { describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import { recordProfileView } from '@/lib/profile-views';
import { createUser } from '@/test/factories';

describe('recordProfileView', () => {
  it('signed-in non-owner (user:<id> key) increments profileViewCount', async () => {
    const profileOwner = await createUser();
    const viewer = await createUser();

    const result = await recordProfileView({
      profileUserId: profileOwner.id,
      viewerKey: `user:${viewer.id}`,
      userId: viewer.id
    });

    expect(result.counted).toBe(true);
    const updated = await db.user.findUnique({ where: { id: profileOwner.id } });
    expect(updated?.profileViewCount).toBe(1);
  });

  it('does not increment on a second call with the same viewerKey (idempotent)', async () => {
    const profileOwner = await createUser();
    const viewer = await createUser();

    await recordProfileView({
      profileUserId: profileOwner.id,
      viewerKey: `user:${viewer.id}`,
      userId: viewer.id
    });
    const second = await recordProfileView({
      profileUserId: profileOwner.id,
      viewerKey: `user:${viewer.id}`,
      userId: viewer.id
    });

    expect(second.counted).toBe(false);
    const updated = await db.user.findUnique({ where: { id: profileOwner.id } });
    expect(updated?.profileViewCount).toBe(1);
  });

  it('records the row but does not increment when the viewer is the profile owner', async () => {
    const profileOwner = await createUser();

    const result = await recordProfileView({
      profileUserId: profileOwner.id,
      viewerKey: `user:${profileOwner.id}`,
      userId: profileOwner.id
    });

    expect(result.counted).toBe(false);
    const view = await db.profileView.findUnique({
      where: {
        profileUserId_viewerKey: {
          profileUserId: profileOwner.id,
          viewerKey: `user:${profileOwner.id}`
        }
      }
    });
    expect(view).not.toBeNull();
    const updated = await db.user.findUnique({ where: { id: profileOwner.id } });
    expect(updated?.profileViewCount).toBe(0);
  });

  it('degrades to a no-op (no throw) when the viewer userId no longer exists', async () => {
    const profileOwner = await createUser();
    const staleUserId = 'user-that-no-longer-exists';

    const result = await recordProfileView({
      profileUserId: profileOwner.id,
      viewerKey: `user:${staleUserId}`,
      userId: staleUserId
    });

    expect(result.counted).toBe(false);
    const updated = await db.user.findUnique({ where: { id: profileOwner.id } });
    expect(updated?.profileViewCount).toBe(0);
    const view = await db.profileView.findUnique({
      where: {
        profileUserId_viewerKey: {
          profileUserId: profileOwner.id,
          viewerKey: `user:${staleUserId}`
        }
      }
    });
    expect(view).toBeNull();
  });

  it('counts distinct user and device viewer keys separately', async () => {
    const profileOwner = await createUser();
    const viewer = await createUser();

    await recordProfileView({
      profileUserId: profileOwner.id,
      viewerKey: `user:${viewer.id}`,
      userId: viewer.id
    });
    await recordProfileView({
      profileUserId: profileOwner.id,
      viewerKey: 'device:some-uuid',
      userId: undefined
    });

    const updated = await db.user.findUnique({ where: { id: profileOwner.id } });
    expect(updated?.profileViewCount).toBe(2);
  });
});
