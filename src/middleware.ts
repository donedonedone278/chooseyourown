import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEVICE_ID_COOKIE = 'deviceId';

/**
 * Ensures every visitor to a chapter reader page has a stable `deviceId`
 * cookie before the page renders. Middleware is the one place allowed to
 * set cookies ahead of a Server Component render — the chapter page itself
 * can't (`cookies().set()` there throws "Cookies can only be modified in a
 * Server Action or Route Handler"), which is what caused logged-out chapter
 * opens to 500. Reading/writing on both the request and response makes the
 * value visible to the render that follows in the same request.
 */
export function middleware(request: NextRequest) {
  if (request.cookies.get(DEVICE_ID_COOKIE)) {
    return NextResponse.next();
  }

  const id = crypto.randomUUID();
  request.cookies.set(DEVICE_ID_COOKIE, id);

  const response = NextResponse.next({ request });
  response.cookies.set(DEVICE_ID_COOKIE, id, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365
  });
  return response;
}

export const config = {
  matcher: ['/stories/:path*', '/users/:path*']
};
