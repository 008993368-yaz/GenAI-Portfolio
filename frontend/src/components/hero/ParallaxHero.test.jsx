import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from 'framer-motion';
import ParallaxHero from './ParallaxHero';

// Stub framer-motion's reduced-motion hook so we can toggle it per test.
vi.mock('framer-motion', () => ({ useReducedMotion: vi.fn(() => false) }));
// The GSAP load timeline is irrelevant to markup/behaviour here.
vi.mock('../../utils/gsapAnimations', () => ({
  runHeroLoadTimeline: () => () => {},
  applyMagneticEffect: () => () => {},
}));
// Keep the rAF loop out of the test; we only assert markup + the enabled flag
// that the component derives independently of the hook.
vi.mock('../../hooks/useParallax', () => ({
  useParallax: () => ({ stageRef: { current: null } }),
}));

afterEach(() => {
  vi.clearAllMocks();
  useReducedMotion.mockReturnValue(false);
});

describe('ParallaxHero', () => {
  it('renders the name as the headline', () => {
    render(<ParallaxHero name="Yazhini Elanchezhian" onPrimaryClick={() => {}} onScrollCue={() => {}} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Yazhini Elanchezhian' })).toBeInTheDocument();
  });

  it('fires the primary callback when the CTA is clicked', () => {
    const onPrimaryClick = vi.fn();
    render(<ParallaxHero name="YE" onPrimaryClick={onPrimaryClick} onScrollCue={() => {}} />);
    screen.getByRole('button', { name: /explore my work/i }).click();
    expect(onPrimaryClick).toHaveBeenCalledTimes(1);
  });

  it('fires the scroll-cue callback when the cue is clicked', () => {
    const onScrollCue = vi.fn();
    render(<ParallaxHero name="YE" onPrimaryClick={() => {}} onScrollCue={onScrollCue} />);
    screen.getByRole('button', { name: /scroll to skills section/i }).click();
    expect(onScrollCue).toHaveBeenCalledTimes(1);
  });

  it('marks parallax on by default and off under reduced motion', () => {
    const { rerender, container } = render(
      <ParallaxHero name="YE" onPrimaryClick={() => {}} onScrollCue={() => {}} />
    );
    expect(container.querySelector('.phero').getAttribute('data-parallax')).toBe('on');

    useReducedMotion.mockReturnValue(true);
    rerender(<ParallaxHero name="YE" onPrimaryClick={() => {}} onScrollCue={() => {}} />);
    expect(container.querySelector('.phero').getAttribute('data-parallax')).toBe('off');
  });
});
