import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useParallax } from './useParallax';

const Harness = ({ enabled, pointerEnabled }) => {
  const { stageRef } = useParallax({ enabled, pointerEnabled });
  return <div data-testid="stage" ref={stageRef} />;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useParallax', () => {
  it('attaches no listeners while disabled', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<Harness enabled={false} pointerEnabled={false} />);
    expect(addSpy).not.toHaveBeenCalledWith('scroll', expect.any(Function), expect.anything());
    expect(addSpy).not.toHaveBeenCalledWith('pointermove', expect.any(Function), expect.anything());
  });

  it('listens to scroll (passive) when enabled but skips pointer when pointer is off', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<Harness enabled pointerEnabled={false} />);
    expect(addSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      expect.objectContaining({ passive: true })
    );
    expect(addSpy).not.toHaveBeenCalledWith('pointermove', expect.any(Function), expect.anything());
  });

  it('listens to pointermove when pointer is enabled', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    render(<Harness enabled pointerEnabled />);
    expect(addSpy).toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
      expect.objectContaining({ passive: true })
    );
  });

  it('removes its listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<Harness enabled pointerEnabled />);
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('pointermove', expect.any(Function));
  });
});
