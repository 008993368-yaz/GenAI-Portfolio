import { act, render, screen, waitFor } from '@testing-library/react';
import RevealSection from './RevealSection';

const observerInstances = [];

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.observe = vi.fn();
    this.unobserve = vi.fn();
    observerInstances.push(this);
  }
}

function setReducedMotion(enabled) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: enabled && query === '(prefers-reduced-motion: reduce)',
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe('RevealSection', () => {
  beforeEach(() => {
    observerInstances.length = 0;
    global.IntersectionObserver = MockIntersectionObserver;
    setReducedMotion(false);
  });

  it('renders section with fade-in before intersection', () => {
    const { container } = render(
      <RevealSection id="skills" title="Skills">
        <div>Inner content</div>
      </RevealSection>
    );

    const section = container.querySelector('#skills');
    expect(section).toHaveClass('section');
    expect(section).toHaveClass('fade-in');
    expect(screen.getByText('Skills')).toBeInTheDocument();
  });

  it('switches to visible when section intersects', async () => {
    const { container } = render(
      <RevealSection id="projects" title="Projects">
        <div>Projects content</div>
      </RevealSection>
    );

    const section = container.querySelector('#projects');
    expect(observerInstances).toHaveLength(1);

    act(() => {
      observerInstances[0].callback([{ isIntersecting: true }]);
    });

    await waitFor(() => {
      expect(section).toHaveClass('visible');
      expect(section).not.toHaveClass('fade-in');
    });
  });

  it('reveals immediately when reduced motion is enabled', async () => {
    setReducedMotion(true);

    const { container } = render(
      <RevealSection id="experience" title="Experience">
        <div>Experience content</div>
      </RevealSection>
    );

    const section = container.querySelector('#experience');

    await waitFor(() => {
      expect(section).toHaveClass('visible');
    });
    expect(observerInstances).toHaveLength(0);
  });
});
