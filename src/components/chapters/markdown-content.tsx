import Markdown from 'react-markdown';

import { ALLOWED_MARKDOWN_ELEMENTS } from '@/lib/rich-text';

// Renders stored chapter Markdown. Content is already validated server-side to
// the allowed subset; the element allowlist here is defense-in-depth and keeps
// rendering consistent with validation. Works in both server and client trees.
export function MarkdownContent({ markdown }: { markdown: string }) {
  return (
    <Markdown allowedElements={[...ALLOWED_MARKDOWN_ELEMENTS]} unwrapDisallowed skipHtml>
      {markdown}
    </Markdown>
  );
}
