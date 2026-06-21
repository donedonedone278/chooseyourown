// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Stat } from '@/components/ui/stat';

describe('Stat', () => {
  it('shows the number and an accessible plural label', () => {
    render(<Stat kind="likes" value={3} />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByLabelText('3 likes')).toBeInTheDocument();
  });

  it('uses the singular noun when value is 1', () => {
    render(<Stat kind="likes" value={1} />);
    expect(screen.getByLabelText('1 like')).toBeInTheDocument();
  });

  it('hides the icon from assistive tech', () => {
    render(<Stat kind="likes" value={3} />);
    const icon = screen.getByLabelText('3 likes').querySelector('svg');
    expect(icon).not.toBeNull();
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('wires up other stat kinds, e.g. views and descendants', () => {
    render(<Stat kind="views" value={5} />);
    expect(screen.getByLabelText('5 views')).toBeInTheDocument();

    render(<Stat kind="descendants" value={1} />);
    expect(screen.getByLabelText('1 continuation')).toBeInTheDocument();
  });

  it('uses an irregular plural when the kind defines one, e.g. story/stories', () => {
    render(<Stat kind="stories" value={2} />);
    expect(screen.getByLabelText('2 stories')).toBeInTheDocument();

    render(<Stat kind="stories" value={1} />);
    expect(screen.getByLabelText('1 story')).toBeInTheDocument();
  });

  it('renders a plain outline when not active', () => {
    render(<Stat kind="likes" value={3} />);
    const icon = screen.getByLabelText('3 likes').querySelector('svg');
    expect(icon).toHaveAttribute('fill', 'none');
    expect(icon).toHaveAttribute('stroke', 'currentColor');
  });

  it('fills the icon with the kind accent when active (picked)', () => {
    render(<Stat kind="likes" value={4} active />);
    const icon = screen.getByLabelText('4 likes').querySelector('svg');
    expect(icon).toHaveAttribute('fill', '#e11d48');
    expect(icon).toHaveAttribute('stroke', '#111');
  });

  it('ignores active for kinds without an accent', () => {
    render(<Stat kind="views" value={2} active />);
    const icon = screen.getByLabelText('2 views').querySelector('svg');
    expect(icon).toHaveAttribute('fill', 'none');
    expect(icon).toHaveAttribute('stroke', 'currentColor');
  });

  it('renders no button and no popup by default (safe to nest in a Link)', () => {
    render(<Stat kind="views" value={2} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByText('views')).not.toBeInTheDocument();
  });

  describe('with explain (floating popup)', () => {
    it('renders no popup node anywhere — not in the wrapper, not in document.body — while closed', () => {
      render(<Stat kind="views" value={2} explain />);
      expect(screen.queryByText('views')).not.toBeInTheDocument();
      expect(document.body.querySelector('[data-stat-popup]')).toBeNull();
    });

    it('tapping the glyph reveals a popup portaled to document.body', async () => {
      const user = userEvent.setup();
      const { container } = render(<Stat kind="views" value={2} explain />);

      const button = screen.getByRole('button', { name: '2 views' });
      await user.click(button);

      const popup = document.body.querySelector('[data-stat-popup]');
      expect(popup).not.toBeNull();
      expect(popup).toHaveTextContent('views');
      // Portaled out of the local render tree, not a descendant of the wrapper.
      expect(container.querySelector('[data-stat-popup]')).toBeNull();
    });

    it('the popup is aria-hidden (redundant for assistive tech)', async () => {
      const user = userEvent.setup();
      render(<Stat kind="views" value={2} explain />);

      const button = screen.getByRole('button', { name: '2 views' });
      await user.click(button);

      const popup = document.body.querySelector('[data-stat-popup]');
      expect(popup).toHaveAttribute('aria-hidden', 'true');
    });

    it('tapping again closes the popup', async () => {
      const user = userEvent.setup();
      render(<Stat kind="views" value={2} explain />);

      const button = screen.getByRole('button', { name: '2 views' });
      await user.click(button);
      expect(document.body.querySelector('[data-stat-popup]')).not.toBeNull();

      await user.click(button);
      expect(document.body.querySelector('[data-stat-popup]')).toBeNull();
    });

    it('Escape closes the popup', async () => {
      const user = userEvent.setup();
      render(<Stat kind="views" value={2} explain />);

      const button = screen.getByRole('button', { name: '2 views' });
      await user.click(button);
      expect(document.body.querySelector('[data-stat-popup]')).not.toBeNull();

      await user.keyboard('{Escape}');
      expect(document.body.querySelector('[data-stat-popup]')).toBeNull();
    });

    it('an outside pointerdown closes the popup', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Stat kind="views" value={2} explain />
          <button type="button">Elsewhere</button>
        </div>
      );

      const button = screen.getByRole('button', { name: '2 views' });
      await user.click(button);
      expect(document.body.querySelector('[data-stat-popup]')).not.toBeNull();

      await user.click(screen.getByRole('button', { name: 'Elsewhere' }));
      expect(document.body.querySelector('[data-stat-popup]')).toBeNull();
    });

    it('opening a second Stat closes the first (only one open at a time)', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <Stat kind="views" value={2} explain />
          <Stat kind="likes" value={5} explain />
        </div>
      );

      const viewsButton = screen.getByRole('button', { name: '2 views' });
      const likesButton = screen.getByRole('button', { name: '5 likes' });

      await user.click(viewsButton);
      expect(document.body.querySelector('[data-stat-popup]')).toHaveTextContent('views');

      await user.click(likesButton);
      const popups = document.body.querySelectorAll('[data-stat-popup]');
      expect(popups).toHaveLength(1);
      expect(popups[0]).toHaveTextContent('likes');
    });

    it('uses the singular noun in the popup when value is 1', async () => {
      const user = userEvent.setup();
      render(<Stat kind="likes" value={1} explain />);

      const button = screen.getByRole('button', { name: '1 like' });
      await user.click(button);

      const popup = document.body.querySelector('[data-stat-popup]');
      expect(popup).toHaveTextContent('like');
    });
  });
});
