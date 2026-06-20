// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

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
});
