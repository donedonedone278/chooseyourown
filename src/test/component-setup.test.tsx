// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

// Smoke test proving the component-testing tier (jsdom + Testing Library +
// jest-dom matchers + JSX transform) works end to end. Delete this once Task 4
// adds real client-component tests (e.g. the chapter editor) that exercise it.
function Greeting({ name }: { name: string }) {
  return <button type="button">Hello {name}</button>;
}

describe('component-testing setup (jsdom + Testing Library)', () => {
  it('renders a component into jsdom and supports DOM assertions', () => {
    render(<Greeting name="Avery" />);
    expect(screen.getByRole('button', { name: 'Hello Avery' })).toBeInTheDocument();
  });
});
