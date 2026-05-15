import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScrollSpy } from './useScrollSpy';

const SECTION_IDS = ['home', 'skills', 'projects'];

const createSection = (id, { offsetTop = 0, offsetHeight = 400 } = {}) => {
  const section = document.createElement('section');
  section.id = id;

  Object.defineProperty(section, 'offsetTop', {
    configurable: true,
    value: offsetTop,
  });
  Object.defineProperty(section, 'offsetHeight', {
    configurable: true,
    value: offsetHeight,
  });

  document.body.appendChild(section);
  return section;
};

describe('useScrollSpy', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
    delete window.IntersectionObserver;
  });

  it('updates the active section from intersecting observer entries', () => {
    let observerCallback;
    const observe = vi.fn();
    const disconnect = vi.fn();

    window.IntersectionObserver = vi.fn(function IntersectionObserver(callback) {
      observerCallback = callback;
      return {
        observe,
        disconnect,
        unobserve: vi.fn(),
      };
    });

    createSection('home');
    const skills = createSection('skills');
    createSection('projects');

    const { result, unmount } = renderHook(() => useScrollSpy(SECTION_IDS));

    expect(window.IntersectionObserver).toHaveBeenCalled();
    expect(observe).toHaveBeenCalledTimes(3);
    expect(result.current).toBe('home');

    act(() => {
      observerCallback([
        {
          target: skills,
          isIntersecting: true,
          intersectionRatio: 0.7,
          boundingClientRect: { top: 120 },
        },
      ]);
    });

    expect(result.current).toBe('skills');

    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it('falls back to scroll offsets when IntersectionObserver is unavailable', () => {
    delete window.IntersectionObserver;

    const nav = document.createElement('nav');
    nav.className = 'nav-root';
    Object.defineProperty(nav, 'offsetHeight', {
      configurable: true,
      value: 50,
    });
    document.body.appendChild(nav);

    createSection('home', { offsetTop: 0, offsetHeight: 400 });
    createSection('skills', { offsetTop: 500, offsetHeight: 400 });
    createSection('projects', { offsetTop: 1000, offsetHeight: 400 });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 560,
    });

    const { result } = renderHook(() => useScrollSpy(SECTION_IDS));

    expect(result.current).toBe('skills');
  });
});
