import { describe, expect, it } from 'vitest';
import { isValidHandle, RESERVED_HANDLES, slugifyHandle } from '@/lib/handles';

describe('slugifyHandle', () => {
  it('lowercases, replaces spaces/underscores with hyphens, and strips invalid chars', () => {
    expect(slugifyHandle('Maya Quill')).toBe('maya-quill');
    expect(slugifyHandle('Theo_Vance')).toBe('theo-vance');
    expect(slugifyHandle('Wëird!! Nâme??')).toBe('wird-nme');
  });

  it('collapses repeated separators and trims leading/trailing hyphens', () => {
    expect(slugifyHandle('  Spacey   Name  ')).toBe('spacey-name');
    expect(slugifyHandle('--Edge--Case--')).toBe('edge-case');
  });
});

describe('isValidHandle', () => {
  it('accepts well-formed lowercase handles, 3-30 chars', () => {
    expect(isValidHandle('maya-quill')).toBe(true);
    expect(isValidHandle('abc')).toBe(true);
    expect(isValidHandle('a'.repeat(30))).toBe(true);
  });

  it('rejects handles that are too short or too long', () => {
    expect(isValidHandle('ab')).toBe(false);
    expect(isValidHandle('a'.repeat(31))).toBe(false);
  });

  it('rejects leading or trailing hyphens', () => {
    expect(isValidHandle('-maya')).toBe(false);
    expect(isValidHandle('maya-')).toBe(false);
  });

  it('rejects uppercase or invalid characters', () => {
    expect(isValidHandle('Maya')).toBe(false);
    expect(isValidHandle('maya_quill')).toBe(false);
    expect(isValidHandle('maya quill')).toBe(false);
  });

  it('does not reject reserved handles by itself — format-only check', () => {
    // Reserved-word rejection is a separate gate (RESERVED_HANDLES), layered on
    // top of isValidHandle by callers — not baked into the format regex.
    expect(isValidHandle('admin')).toBe(true);
  });
});

describe('RESERVED_HANDLES', () => {
  it('contains the reserved words from the plan', () => {
    for (const word of [
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
    ]) {
      expect(RESERVED_HANDLES.has(word)).toBe(true);
    }
  });
});
