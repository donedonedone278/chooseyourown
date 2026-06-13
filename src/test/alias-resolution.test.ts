import { describe, expect, it } from 'vitest';

import { SiteHeader } from '@/components/layout/site-header';

describe('Vitest path alias', () => {
  it('resolves @/ imports', () => {
    expect(SiteHeader).toBeTypeOf('function');
  });
});
