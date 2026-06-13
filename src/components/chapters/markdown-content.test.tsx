// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';

import { MarkdownContent } from '@/components/chapters/markdown-content';

describe('MarkdownContent', () => {
  it('renders bold and italic markdown as <strong> and <em>', () => {
    const { container } = render(<MarkdownContent markdown="Hi **bold** and *italic*." />);
    expect(container.querySelector('strong')?.textContent).toBe('bold');
    expect(container.querySelector('em')?.textContent).toBe('italic');
  });

  it('does not render disallowed elements like links as anchors', () => {
    const { container } = render(
      <MarkdownContent markdown="See [here](https://example.com)." />
    );
    expect(container.querySelector('a')).toBeNull();
    // unwrapDisallowed keeps the visible text even though the anchor is dropped.
    expect(container.textContent).toContain('here');
  });
});
