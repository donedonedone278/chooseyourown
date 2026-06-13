import { describe, expect, it } from 'vitest';

import { validateChapterContent } from '@/lib/rich-text';

describe('validateChapterContent', () => {
  it('accepts paragraphs with bold and italic and returns the trimmed markdown', () => {
    const input = '  Hi **there**, this is *italic*.\n\nA second paragraph.  ';
    expect(validateChapterContent(input)).toBe(
      'Hi **there**, this is *italic*.\n\nA second paragraph.'
    );
  });

  it('rejects links', () => {
    expect(() => validateChapterContent('See [here](https://example.com).')).toThrow(/link/i);
    expect(() => validateChapterContent('Visit <https://example.com> now.')).toThrow(/link/i);
  });

  it('rejects other unsupported constructs', () => {
    expect(() => validateChapterContent('# A heading')).toThrow();
    expect(() => validateChapterContent('![alt](image.png)')).toThrow();
    expect(() => validateChapterContent('- a list item')).toThrow();
    expect(() => validateChapterContent('> a blockquote')).toThrow();
    expect(() => validateChapterContent('`inline code`')).toThrow();
  });

  it('rejects raw HTML (no injection surface)', () => {
    expect(() => validateChapterContent('<script>alert(1)</script>')).toThrow();
    expect(() => validateChapterContent('text <b>bold</b>')).toThrow();
  });

  it('rejects empty or whitespace-only content', () => {
    expect(() => validateChapterContent('   \n  ')).toThrow(/empty/i);
    expect(() => validateChapterContent('')).toThrow(/empty/i);
  });

  it('rejects non-string input', () => {
    expect(() => validateChapterContent(null)).toThrow();
    expect(() => validateChapterContent(42)).toThrow();
  });
});
