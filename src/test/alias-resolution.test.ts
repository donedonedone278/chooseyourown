import { describe, expect, it } from 'vitest';

// Import a pure leaf module to prove the `@/` alias resolves under Vitest.
// Don't point this at server components or anything that imports `next-auth`
// /`next/server` — those can't load in Vitest's node environment.
import { hashPassword } from '@/lib/passwords';

describe('Vitest path alias', () => {
  it('resolves @/ imports', () => {
    expect(hashPassword).toBeTypeOf('function');
  });
});
