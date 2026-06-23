/**
 * Pure handle utilities for `User.username` ("@handle"). Format validation
 * (`isValidHandle`) and the reserved-word gate (`RESERVED_HANDLES`) are kept
 * separate — `isValidHandle` only checks shape, callers layer the reserved
 * check on top for user-chosen handles (seeding `admin` directly is fine).
 */

const HANDLE_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/;

/** Lowercase, spaces/underscores -> hyphens, strip to [a-z0-9-], collapse/trim hyphens. */
export function slugifyHandle(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Format-only check: 3-30 chars, lowercase alphanumeric + hyphen, no leading/trailing/double hyphen. */
export function isValidHandle(handle: string): boolean {
  return HANDLE_PATTERN.test(handle);
}

export const RESERVED_HANDLES: ReadonlySet<string> = new Set([
  'admin',
  'api',
  'auth',
  'users',
  'stories',
  'new',
  'sign-in',
  'sign-up',
  'about',
  'settings',
  'me',
  'null',
  'undefined'
]);
