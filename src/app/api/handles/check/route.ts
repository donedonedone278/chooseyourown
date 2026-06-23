import { NextResponse } from 'next/server';

import { db } from '@/lib/db';
import { isValidHandle, RESERVED_HANDLES } from '@/lib/handles';

/**
 * Cheap, unauthenticated availability check for the sign-up Handle field's
 * live ✓/✗ indicator. Server validation in `signUp` remains authoritative —
 * this is a UX nicety only, not the security boundary.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const handle = (searchParams.get('handle') ?? '').trim().toLowerCase();

  if (!handle) {
    return NextResponse.json({ available: false, reason: 'Handle is required.' });
  }

  if (!isValidHandle(handle)) {
    return NextResponse.json({
      available: false,
      reason: 'Handles are 3-30 characters: lowercase letters, numbers, and hyphens.'
    });
  }

  if (RESERVED_HANDLES.has(handle)) {
    return NextResponse.json({ available: false, reason: 'That handle is reserved.' });
  }

  const existing = await db.user.findUnique({ where: { username: handle } });

  return NextResponse.json({
    available: !existing,
    reason: existing ? 'That handle is already taken.' : undefined
  });
}
