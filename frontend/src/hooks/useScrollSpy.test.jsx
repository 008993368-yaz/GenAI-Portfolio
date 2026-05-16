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
  section.getBoundingClientRect = vi.fn(() => {
    const top = offsetTop - window.scrollY;
    return {
      top,
      bottom: top + offsetHeight,
      left: 0,
      right: 0,
      width: 0,
      height: offsetHeight,
      x: 0,
      y: top,
      toJSON: () => {},
    };
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

  it('updates the active section from the viewport activation line', () => {
    createSection('home', { offsetTop: 0, offsetHeight: 400 });
    createSection('skills', { offsetTop: 500, offsetHeight: 400 });
    createSection('projects', { offsetTop: 1000, offsetHeight: 400 });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 450,
    });

    const { result } = renderHook(() => useScrollSpy(SECTION_IDS));

    expect(result.current).toBe('skills');
  });

  it('keeps the section under the fixed nav active when the next section is more visible', () => {
    const nav = document.createElement('nav');
    nav.className = 'nav-root';
    Object.defineProperty(nav, 'offsetHeight', {
      configurable: true,
      value: 60,
    });
    document.body.appendChild(nav);

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 400,
    });

    createSection('home', { offsetTop: 0, offsetHeight: 400 });
    createSection('skills', { offsetTop: 500, offsetHeight: 220 });
    createSection('projects', { offsetTop: 720, offsetHeight: 580 });

    const { result } = renderHook(() => useScrollSpy(SECTION_IDS));
    expect(result.current).toBe('skills');
  });

  it('falls back to the nearest previous section when the activation line is between sections', () => {
    const nav = document.createElement('nav');
    nav.className = 'nav-root';
    Object.defineProperty(nav, 'offsetHeight', {
      configurable: true,
      value: 50,
    });
    document.body.appendChild(nav);

    createSection('home', { offsetTop: 0, offsetHeight: 400 });
    createSection('skills', { offsetTop: 500, offsetHeight: 100 });
    createSection('projects', { offsetTop: 1000, offsetHeight: 400 });

    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      value: 450,
    });

    const { result } = renderHook(() => useScrollSpy(SECTION_IDS));

    expect(result.current).toBe('skills');
  });
});
