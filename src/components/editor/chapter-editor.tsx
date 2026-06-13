'use client';

import { useState } from 'react';

import { MarkdownContent } from '@/components/chapters/markdown-content';

// Markdown text input with a live preview. The textarea submits as `content`
// in the form; storage stays portable Markdown, so this editor can later be
// swapped for a WYSIWYG-over-Markdown without changing storage or validation.
export function ChapterEditor({ initialValue = '' }: { initialValue?: string }) {
  const [value, setValue] = useState(initialValue);

  return (
    <div>
      <label>
        Chapter content
        <textarea
          name="content"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          rows={12}
          required
          aria-describedby="content-help"
        />
      </label>
      <p id="content-help">Use **bold** and *italic*. Links and images aren&apos;t allowed.</p>
      <section aria-label="Preview">
        <MarkdownContent markdown={value} />
      </section>
    </div>
  );
}
