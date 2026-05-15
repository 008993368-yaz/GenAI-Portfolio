import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Navbar from './Navbar';

vi.mock('../../utils/gsapAnimations', () => ({
  applyMagneticEffect: vi.fn(() => vi.fn()),
}));

const links = [
  { id: 'about', label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
];

const renderNavbar = (props = {}) => {
  const onNavigate = vi.fn();

  render(
    <Navbar
      links={links}
      activeSection="about"
      onNavigate={onNavigate}
      {...props}
    />,
  );

  return { onNavigate };
};

describe('Navbar', () => {
  it('opens accessible section links from the menu toggle', async () => {
    renderNavbar();

    const toggle = screen.getByRole('button', { name: /open section navigation/i });
    const menu = screen.getByRole('navigation', { name: /primary navigation/i });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle).toHaveAttribute('aria-controls', menu.id);
    expect(menu).not.toHaveClass('is-open');

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(menu).toHaveClass('is-open');
    expect(within(menu).getByRole('button', { name: 'About' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Projects' })).toBeInTheDocument();
    expect(within(menu).getByRole('button', { name: 'Contact' })).toBeInTheDocument();
  });

  it('navigates and closes the menu after a section is selected', async () => {
    const { onNavigate } = renderNavbar();

    const toggle = screen.getByRole('button', { name: /open section navigation/i });
    const menu = screen.getByRole('navigation', { name: /primary navigation/i });

    fireEvent.click(toggle);
    fireEvent.click(within(menu).getByRole('button', { name: 'Projects' }));

    expect(onNavigate).toHaveBeenCalledWith('projects');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(menu).not.toHaveClass('is-open');
  });
});
