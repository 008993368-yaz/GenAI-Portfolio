import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ProjectGrid from './ProjectGrid';

vi.mock('framer-motion', async () => {
  const React = await import('react');

  const createMotionComponent = (Tag) =>
    React.forwardRef(({ children, whileHover, whileTap, initial, animate, exit, transition, ...props }, ref) => (
      <Tag ref={ref} {...props}>
        {children}
      </Tag>
    ));

  return {
    AnimatePresence: ({ children }) => children,
    motion: {
      article: createMotionComponent('article'),
      button: createMotionComponent('button'),
      div: createMotionComponent('div'),
    },
  };
});

const projects = [
  {
    id: 'focus-project',
    title: 'Focus Project',
    description: 'A project with modal details.',
    tech: 'React, Accessibility',
    highlights: ['Keyboard friendly'],
    githubUrl: 'https://example.com/focus-project',
  },
];

const openProject = async () => {
  render(<ProjectGrid projects={projects} />);

  const opener = screen.getByRole('button', { name: /focus project/i });
  opener.focus();
  fireEvent.click(opener);

  const dialog = await screen.findByRole('dialog', { name: /focus project/i });

  expect(screen.getByRole('button', { name: /close project details/i })).toHaveFocus();

  return { dialog, opener };
};

describe('ProjectGrid modal focus management', () => {
  it.each([
    ['Escape', ({ dialog }) => fireEvent.keyDown(dialog, { key: 'Escape' })],
    ['backdrop click', ({ dialog }) => fireEvent.click(dialog.parentElement)],
    ['close button', () => fireEvent.click(screen.getByRole('button', { name: /close project details/i }))],
  ])('returns focus to the opening project card button after closing with %s', async (_method, closeModal) => {
    const context = await openProject();

    closeModal(context);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /focus project/i })).not.toBeInTheDocument();
      expect(context.opener).toHaveFocus();
    });
  });
});
