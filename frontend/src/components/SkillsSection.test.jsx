import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SkillsSection from './SkillsSection';

vi.mock('framer-motion', () => ({
  motion: {
    section: ({ children, ...props }) => <section {...props}>{children}</section>,
    ul: ({ children, ...props }) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }) => <li {...props}>{children}</li>,
  },
}));

const skills = [
  {
    id: 1,
    title: 'Programming Languages',
    content: 'Python, JavaScript',
  },
  {
    id: 2,
    title: 'Testing',
    content: 'Jest, Jasmine, XUnit',
  },
  {
    id: 3,
    title: 'BI & Automation',
    content: 'Power BI, Power Apps, Power Automate',
  },
];

describe('SkillsSection', () => {
  it('renders every skill group as a tab', () => {
    render(<SkillsSection skills={skills} />);

    const tablist = screen.getByRole('tablist', { name: /skill categories/i });
    const tabs = within(tablist).getAllByRole('tab');

    expect(tabs).toHaveLength(skills.length);
    expect(screen.getByRole('tab', { name: 'Programming Languages' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Testing' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'BI & Automation' })).toBeInTheDocument();
  });
});
