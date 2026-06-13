import { describe, expect, it } from 'vitest';

import { serializeDocToMarkdown } from '@/lib/chapter-markdown';
import { validateChapterContent } from '@/lib/rich-text';

const doc = (content: unknown[]) => ({ type: 'doc', content });
const para = (content: unknown[]) => ({ type: 'paragraph', content });
const text = (t: string, marks?: string[]) =>
  ({ type: 'text', text: t, ...(marks ? { marks: marks.map((type) => ({ type })) } : {}) });

describe('serializeDocToMarkdown', () => {
  it('joins paragraphs with a blank line', () => {
    expect(serializeDocToMarkdown(doc([para([text('One')]), para([text('Two')])]))).toBe('One\n\nTwo');
  });

  it('serializes bold, italic, and both', () => {
    expect(serializeDocToMarkdown(doc([para([text('a', ['bold'])])]))).toBe('**a**');
    expect(serializeDocToMarkdown(doc([para([text('a', ['italic'])])]))).toBe('*a*');
    expect(serializeDocToMarkdown(doc([para([text('a', ['bold', 'italic'])])]))).toBe('***a***');
  });

  it('serializes a hard break as a CommonMark hard break', () => {
    const md = serializeDocToMarkdown(doc([para([text('One'), { type: 'hardBreak' }, text('Two')])]));
    expect(md).toBe('One\\\nTwo');
    expect(() => validateChapterContent(md)).not.toThrow();
  });

  it('escapes literal markdown so it round-trips as text and stays valid', () => {
    const md = serializeDocToMarkdown(doc([para([text('use *stars* and _scores_')])]));
    expect(() => validateChapterContent(md)).not.toThrow();
    // re-parsing must not yield emphasis — the asterisks are literal
    expect(md).toContain('\\*stars\\*');
  });

  it('escapes leading block-syntax characters so they cannot re-parse into disallowed nodes', () => {
    const md = serializeDocToMarkdown(doc([para([text('# Heading-looking text')])]));
    expect(() => validateChapterContent(md)).not.toThrow();
    expect(md.startsWith('\\#')).toBe(true);
  });

  it('filters out empty paragraphs and trims the result', () => {
    expect(serializeDocToMarkdown(doc([para([]), para([text('Hello')]), para([])]))).toBe('Hello');
  });

  it('always produces output that passes validateChapterContent', () => {
    const md = serializeDocToMarkdown(
      doc([
        para([text('Bold ', []), text('and', ['bold']), text(' italic', ['italic'])]),
        para([text('A second paragraph.')])
      ])
    );
    expect(() => validateChapterContent(md)).not.toThrow();
  });
});
