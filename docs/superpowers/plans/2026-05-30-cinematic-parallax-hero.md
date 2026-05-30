# Cinematic Parallax Hero Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the portfolio hero with a self-contained, scroll-driven multi-layer parallax hero that creates a cinematic 3D illusion without WebGL.

**Architecture:** A new `<ParallaxHero/>` renders a fixed-height stage holding three absolutely-positioned art layers (background/midground/foreground) plus the text content. A custom `useParallax` rAF hook smooths scroll + pointer input and publishes four CSS custom properties (`--scroll`, `--progress`, `--mx`, `--my`) on the stage; CSS turns those into per-layer transforms using each layer's `--speed`/`--depth`. Pure ratio math lives in a separate, unit-tested module. All motion disables under `prefers-reduced-motion`; pointer tilt disables on touch; parallax magnitude is reduced and the heaviest layer is hidden on small screens.

**Tech Stack:** React 18, Vite, Tailwind 3 (utility classes not required here — scoped CSS file), framer-motion `useReducedMotion`, existing GSAP load timeline, Vitest + React Testing Library.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `frontend/src/utils/parallaxMath.js` | Pure, framework-free ratio math (single source of truth for depth/fade coefficients). |
| `frontend/src/utils/parallaxMath.test.js` | Unit tests for the math. |
| `frontend/src/hooks/useParallax.js` | rAF loop + lerp smoothing; writes CSS vars to a stage ref; self-stops when idle. |
| `frontend/src/hooks/useParallax.test.jsx` | Listener attach/detach + disabled behavior. |
| `frontend/src/components/hero/ParallaxHero.jsx` | The hero markup: stage, layer stack, content, scroll cue. |
| `frontend/src/components/hero/ParallaxHero.test.jsx` | Render, interaction, reduced-motion behavior. |
| `frontend/src/styles/parallax-hero.css` | `.phero-*` scoped styles incl. transform math + responsive/reduced-motion. |
| `frontend/public/parallax/layer-background.svg` | Placeholder art slot (distant nebula). |
| `frontend/public/parallax/layer-midground.svg` | Placeholder art slot (perspective grid). |
| `frontend/public/parallax/layer-foreground.svg` | Placeholder art slot (near particles). |
| `frontend/src/App.jsx` | Swap hero `<section>` for `<ParallaxHero/>`. |
| `frontend/src/App.css` | `@import` the new stylesheet. |

---

### Task 1: Pure parallax math module

**Files:**
- Create: `frontend/src/utils/parallaxMath.js`
- Test: `frontend/src/utils/parallaxMath.test.js`

- [ ] **Step 1: Write the failing tests**

```js
// frontend/src/utils/parallaxMath.test.js
import { describe, expect, it } from 'vitest';
import {
  clampProgress,
  layerTranslateY,
  pointerShift,
  textFade,
  textScale,
  lerp,
} from './parallaxMath';

describe('clampProgress', () => {
  it('is 0 at the top and 1 after one hero height', () => {
    expect(clampProgress(0, 800)).toBe(0);
    expect(clampProgress(400, 800)).toBe(0.5);
    expect(clampProgress(800, 800)).toBe(1);
  });

  it('clamps out-of-range scroll and guards a zero height', () => {
    expect(clampProgress(-50, 800)).toBe(0);
    expect(clampProgress(1600, 800)).toBe(1);
    expect(clampProgress(400, 0)).toBe(0);
  });
});

describe('layerTranslateY', () => {
  it('does not move a layer whose speed matches the page', () => {
    expect(layerTranslateY(1000, 1)).toBe(0);
  });

  it('lags distant layers behind and pushes near layers ahead', () => {
    expect(layerTranslateY(1000, 0.35)).toBeCloseTo(650); // distant: large positive offset
    expect(layerTranslateY(1000, 1.25)).toBeCloseTo(-250); // near: negative offset
    // distant layer keeps a larger on-screen offset than the near layer
    expect(layerTranslateY(1000, 0.35)).toBeGreaterThan(layerTranslateY(1000, 1.25));
  });
});

describe('pointerShift', () => {
  it('scales with axis, depth and range', () => {
    expect(pointerShift(1, 1, 18)).toBe(18);
    expect(pointerShift(-1, 0.15, 18)).toBeCloseTo(-2.7);
  });

  it('moves near layers more than distant layers', () => {
    expect(pointerShift(1, 1, 18)).toBeGreaterThan(pointerShift(1, 0.15, 18));
  });
});

describe('textFade', () => {
  it('is fully visible at the top and gone before the hero leaves', () => {
    expect(textFade(0)).toBe(1);
    expect(textFade(0.5)).toBeCloseTo(0.45);
    expect(textFade(0.91)).toBe(0); // clamps at ~0.909
    expect(textFade(1)).toBe(0);
  });
});

describe('textScale', () => {
  it('recedes from 1.0 to 0.92 across the scroll', () => {
    expect(textScale(0)).toBe(1);
    expect(textScale(1)).toBeCloseTo(0.92);
    expect(textScale(0.5)).toBeLessThan(textScale(0));
  });
});

describe('lerp', () => {
  it('eases the current value toward the target', () => {
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(0, 10, 0.1)).toBeCloseTo(1);
    expect(lerp(7, 7, 0.2)).toBe(7);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd frontend && npx vitest run src/utils/parallaxMath.test.js`
Expected: FAIL — `Failed to resolve import './parallaxMath'` / functions undefined.

- [ ] **Step 3: Write the implementation**

```js
// frontend/src/utils/parallaxMath.js
// Pure, framework-free math for the parallax hero. Kept separate from the React
// hook so the depth ratios are unit-testable and live in one place. The CSS in
// parallax-hero.css mirrors these formulas (the tests lock the coefficients).

const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * Normalised hero scroll progress.
 * 0 when the hero sits at the top of the viewport, 1 once the user has scrolled
 * one hero-height past it. Guards a zero height so downstream maths stay finite.
 */
export const clampProgress = (scrollY, heroHeight) =>
  heroHeight ? clamp01(scrollY / heroHeight) : 0;

/**
 * Vertical parallax offset (px) for a layer of a given `speed`.
 *
 * The page already lifts an absolutely-positioned layer by `scrollY`. To make
 * the layer's NET on-screen rise equal `scrollY * speed`, we counter-translate
 * by `scrollY * (1 - speed)`:
 *   speed 1.0  -> 0 offset, moves with the page (no parallax)
 *   speed 0.35 -> large positive offset, lags behind  -> reads DISTANT
 *   speed 1.25 -> negative offset, outruns the page    -> reads CLOSE
 */
export const layerTranslateY = (scrollY, speed) => scrollY * (1 - speed);

/**
 * Pointer-driven shift (px) along one axis for a layer at a given `depth`.
 * Near layers (depth ~1) shift the most; distant layers (depth ~0.15) barely
 * move, which is what sells head-movement parallax.
 * `axis` is the normalised cursor position on that axis in [-1, 1].
 */
export const pointerShift = (axis, depth, range) => axis * depth * range;

/**
 * Cinematic text fade. Reaches 0 by progress ~0.91 then clamps, so the headline
 * is fully gone before the hero leaves the viewport.
 */
export const textFade = (progress) => clamp01(1 - progress * 1.1);

/** Slight recede — text scales from 1.0 down to 0.92 across the scroll. */
export const textScale = (progress) => 1 - progress * 0.08;

/**
 * Linear interpolation used by the rAF loop to ease a rendered value toward its
 * target each frame (frame-rate-dependent easing; fine for visual smoothing).
 */
export const lerp = (current, target, ease) => current + (target - current) * ease;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd frontend && npx vitest run src/utils/parallaxMath.test.js`
Expected: PASS — all assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/parallaxMath.js frontend/src/utils/parallaxMath.test.js
git commit -m "feat: add pure parallax ratio math with tests"
```

---

### Task 2: The rAF parallax hook

**Files:**
- Create: `frontend/src/hooks/useParallax.js`
- Test: `frontend/src/hooks/useParallax.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/hooks/useParallax.test.jsx
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/hooks/useParallax.test.jsx`
Expected: FAIL — cannot resolve `./useParallax`.

- [ ] **Step 3: Write the implementation**

```js
// frontend/src/hooks/useParallax.js
import { useEffect, useRef } from 'react';
import { clampProgress, lerp } from '../utils/parallaxMath';

const EASE = 0.12;     // per-frame smoothing factor (0..1); lower = silkier/laggier
const EPSILON = 0.01;  // stop the loop once movement is imperceptible

/**
 * Drives a single requestAnimationFrame loop that smooths scroll + pointer input
 * and publishes CSS custom properties on the stage element:
 *   --scroll   : eased scrollY in px       -> layers use calc(var(--scroll) * (1 - var(--speed)))
 *   --progress : eased hero progress 0..1   -> text fade/scale
 *   --mx, --my : eased pointer pos in [-1,1] -> layers use calc(var(--mx) * var(--depth) * range)
 *
 * The component owns the per-layer ratios in CSS, so the hook only ever writes a
 * handful of numbers and the loop stays cheap. It self-stops when the eased
 * values reach their targets and restarts on the next scroll/pointer event.
 *
 * @param {{ enabled: boolean, pointerEnabled: boolean }} opts
 * @returns {{ stageRef: import('react').RefObject<HTMLDivElement> }}
 */
export const useParallax = ({ enabled, pointerEnabled }) => {
  const stageRef = useRef(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !enabled) return undefined;

    // Cache layout up front. The scroll handler must NEVER read layout (that
    // causes jank), so height is measured here and refreshed on resize only.
    let heroHeight = stage.offsetHeight || window.innerHeight;

    // Targets are written by passive listeners; rendered values ease toward them
    // inside the loop. Kept in plain objects so input never triggers re-renders.
    const target = { scroll: window.scrollY || 0, mx: 0, my: 0 };
    const current = { ...target };
    let frame = 0;
    let running = false;

    const render = () => {
      current.scroll = lerp(current.scroll, target.scroll, EASE);
      current.mx = lerp(current.mx, target.mx, EASE);
      current.my = lerp(current.my, target.my, EASE);

      // One batched write of all vars per frame.
      stage.style.setProperty('--scroll', `${current.scroll.toFixed(2)}px`);
      stage.style.setProperty('--progress', clampProgress(current.scroll, heroHeight).toFixed(4));
      stage.style.setProperty('--mx', current.mx.toFixed(4));
      stage.style.setProperty('--my', current.my.toFixed(4));

      const settled =
        Math.abs(current.scroll - target.scroll) < EPSILON &&
        Math.abs(current.mx - target.mx) < EPSILON &&
        Math.abs(current.my - target.my) < EPSILON;

      if (settled) {
        running = false;
        return; // idle: no more frames scheduled until the next input
      }
      frame = window.requestAnimationFrame(render);
    };

    const ensureRunning = () => {
      if (!running) {
        running = true;
        frame = window.requestAnimationFrame(render);
      }
    };

    const onScroll = () => {
      target.scroll = window.scrollY || 0;
      ensureRunning();
    };

    const onPointerMove = (event) => {
      // Normalise the cursor to [-1, 1] with (0,0) at the viewport centre.
      target.mx = (event.clientX / window.innerWidth) * 2 - 1;
      target.my = (event.clientY / window.innerHeight) * 2 - 1;
      ensureRunning();
    };

    const onResize = () => {
      heroHeight = stage.offsetHeight || window.innerHeight;
      ensureRunning();
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    if (pointerEnabled) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
    }

    ensureRunning(); // paint the initial frame so layers start placed correctly

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.cancelAnimationFrame(frame);
      ['--scroll', '--progress', '--mx', '--my'].forEach((v) => stage.style.removeProperty(v));
    };
  }, [enabled, pointerEnabled]);

  return { stageRef };
};
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/hooks/useParallax.test.jsx`
Expected: PASS — all four assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useParallax.js frontend/src/hooks/useParallax.test.jsx
git commit -m "feat: add requestAnimationFrame parallax hook"
```

---

### Task 3: Placeholder layer SVGs

**Files:**
- Create: `frontend/public/parallax/layer-background.svg`
- Create: `frontend/public/parallax/layer-midground.svg`
- Create: `frontend/public/parallax/layer-foreground.svg`

- [ ] **Step 1: Create the background art (distant neon nebula)**

```xml
<!-- frontend/public/parallax/layer-background.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="bgA" cx="22%" cy="26%" r="55%">
      <stop offset="0%" stop-color="#00E5FF" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#00E5FF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bgB" cx="80%" cy="74%" r="55%">
      <stop offset="0%" stop-color="#FF00E5" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#FF00E5" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="bgC" cx="55%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#0066FF" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#0066FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1440" height="900" fill="url(#bgC)"/>
  <rect width="1440" height="900" fill="url(#bgA)"/>
  <rect width="1440" height="900" fill="url(#bgB)"/>
</svg>
```

- [ ] **Step 2: Create the midground art (perspective grid)**

```xml
<!-- frontend/public/parallax/layer-midground.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="mgFade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="58%" stop-color="#fff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#fff" stop-opacity="1"/>
    </linearGradient>
    <mask id="mgMask"><rect width="1440" height="900" fill="url(#mgFade)"/></mask>
  </defs>
  <g stroke="#00E5FF" stroke-opacity="0.16" stroke-width="1.2" mask="url(#mgMask)">
    <!-- horizontal floor lines, spacing widens toward the viewer for perspective -->
    <line x1="0" y1="470" x2="1440" y2="470"/>
    <line x1="0" y1="512" x2="1440" y2="512"/>
    <line x1="0" y1="562" x2="1440" y2="562"/>
    <line x1="0" y1="622" x2="1440" y2="622"/>
    <line x1="0" y1="694" x2="1440" y2="694"/>
    <line x1="0" y1="780" x2="1440" y2="780"/>
    <line x1="0" y1="882" x2="1440" y2="882"/>
    <!-- vertical lines converging on the vanishing point (720, 430) -->
    <line x1="720" y1="430" x2="-260" y2="900"/>
    <line x1="720" y1="430" x2="120" y2="900"/>
    <line x1="720" y1="430" x2="420" y2="900"/>
    <line x1="720" y1="430" x2="720" y2="900"/>
    <line x1="720" y1="430" x2="1020" y2="900"/>
    <line x1="720" y1="430" x2="1320" y2="900"/>
    <line x1="720" y1="430" x2="1700" y2="900"/>
  </g>
</svg>
```

- [ ] **Step 3: Create the foreground art (near particles)**

```xml
<!-- frontend/public/parallax/layer-foreground.svg -->
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
  <g fill="#00E5FF">
    <circle cx="140" cy="180" r="3.5" fill-opacity="0.9"/>
    <circle cx="1230" cy="240" r="2.5" fill-opacity="0.7"/>
    <circle cx="980" cy="640" r="4" fill-opacity="0.85"/>
    <circle cx="320" cy="720" r="2" fill-opacity="0.6"/>
  </g>
  <g fill="#FF00E5">
    <circle cx="1100" cy="140" r="3" fill-opacity="0.8"/>
    <circle cx="240" cy="430" r="2.5" fill-opacity="0.7"/>
    <circle cx="1320" cy="560" r="3.5" fill-opacity="0.8"/>
    <circle cx="640" cy="820" r="2" fill-opacity="0.6"/>
  </g>
  <g fill="#FFFFFF">
    <circle cx="520" cy="260" r="1.5" fill-opacity="0.7"/>
    <circle cx="820" cy="360" r="1.2" fill-opacity="0.6"/>
    <circle cx="1180" cy="780" r="1.6" fill-opacity="0.7"/>
    <circle cx="420" cy="600" r="1.3" fill-opacity="0.55"/>
    <circle cx="900" cy="180" r="1.4" fill-opacity="0.6"/>
  </g>
</svg>
```

- [ ] **Step 4: Verify the files exist**

Run: `ls frontend/public/parallax`
Expected: `layer-background.svg  layer-foreground.svg  layer-midground.svg`

- [ ] **Step 5: Commit**

```bash
git add frontend/public/parallax/
git commit -m "feat: add placeholder parallax layer art"
```

---

### Task 4: Scoped parallax-hero stylesheet

**Files:**
- Create: `frontend/src/styles/parallax-hero.css`

- [ ] **Step 1: Write the stylesheet**

```css
/* frontend/src/styles/parallax-hero.css
 * Cinematic parallax hero. Transform maths mirror src/utils/parallaxMath.js.
 * The hook writes --scroll/--progress/--mx/--my onto .phero-stage; each layer
 * applies them via its own --speed/--depth. */

.phero {
  position: relative;
  min-height: 100vh;
  min-height: 100svh;
  overflow: hidden;
  isolation: isolate; /* contain z-index stacking to the hero */
  background:
    radial-gradient(80% 60% at 82% 6%, rgba(0, 102, 255, 0.16) 0%, transparent 70%),
    radial-gradient(70% 50% at 16% 22%, rgba(255, 0, 229, 0.12) 0%, transparent 70%),
    linear-gradient(160deg, var(--bg-0), var(--bg-1) 52%, #0d0d0d 100%);
}

/* The stage owns the parallax CSS vars and centres the content. */
.phero-stage {
  --pointer-range: 18px; /* desktop pointer tilt magnitude */
  --parallax-gain: 1;    /* global scroll-parallax multiplier (reduced on mobile) */
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 6.5rem 6vw 2rem;
}

/* --- Layer stack ------------------------------------------------------ */
.phero-layers {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.phero-layer {
  position: absolute;
  inset: -8%; /* bleed so translated edges never reveal the page behind */
  /* translateY = scroll * (1 - speed) * gain   (vertical parallax)
   * + pointer tilt on both axes (near layers move more via --depth)
   * background also zooms in slightly via --layer-zoom * progress */
  transform:
    translate3d(
      calc(var(--mx, 0) * var(--depth) * var(--pointer-range)),
      calc(
        var(--scroll, 0px) * (1 - var(--speed)) * var(--parallax-gain) +
        var(--my, 0) * var(--depth) * var(--pointer-range)
      ),
      0
    )
    scale(calc(1 + var(--progress, 0) * var(--layer-zoom, 0)));
  will-change: transform;
}

.phero-layer__art {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.55;
}

/* Background: distant, slow, gently pushing in. */
.phero-layer--background {
  --layer-zoom: 0.12;
  background:
    radial-gradient(38% 38% at 20% 26%, rgba(0, 229, 255, 0.22), transparent 60%),
    radial-gradient(44% 44% at 80% 72%, rgba(255, 0, 229, 0.18), transparent 62%),
    radial-gradient(60% 60% at 52% 50%, rgba(0, 102, 255, 0.12), transparent 70%);
  filter: blur(8px);
}

/* Midground: faint structure. */
.phero-layer--midground {
  opacity: 0.9;
}

/* Foreground: sharp, fast, fades as it rushes past. */
.phero-layer--foreground {
  opacity: calc(1 - var(--progress, 0) * 0.6);
}

/* Edge vignette + bottom blend into the next section. */
.phero-vignette {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 50% 38%, transparent 52%, rgba(0, 0, 0, 0.55) 100%),
    linear-gradient(to bottom, transparent 72%, var(--bg-0) 100%);
}

/* --- Content --------------------------------------------------------- */
.phero-content {
  position: relative;
  z-index: 2;
  width: min(46rem, 100%);
  min-width: 0;
  /* Cinematic recede: rise slightly faster than the page, fade and shrink. */
  opacity: calc(1 - var(--progress, 0) * 1.1);
  transform:
    translate3d(0, calc(var(--scroll, 0px) * -0.12 * var(--parallax-gain)), 0)
    scale(calc(1 - var(--progress, 0) * 0.08));
  will-change: transform, opacity;
}

.phero-logo {
  width: max-content;
  margin-bottom: 1.3rem;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  padding: 0.3rem 0.75rem;
  font-size: 0.72rem;
  letter-spacing: 0.2em;
}

.phero-name {
  margin: 0;
  font-size: clamp(3rem, 10vw, 5.5rem);
  line-height: 0.92;
  letter-spacing: -0.04em;
  font-weight: 900;
  color: transparent;
  -webkit-text-stroke: 2px rgba(255, 255, 255, 0.78);
  max-width: 100%;
  overflow-wrap: normal;
}

.phero-tagline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5ch;
  margin: 1.1rem 0;
  font-size: clamp(1.4rem, 3.1vw, 2.8rem);
  line-height: 1.1;
  font-weight: 700;
  max-width: 100%;
  min-width: 0;
}

.phero-word {
  display: inline-block;
  opacity: 0; /* GSAP load timeline reveals each word */
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-magenta), var(--neon-blue));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.phero-subline {
  width: min(34rem, 100%);
  max-width: 100%;
  color: var(--text-2);
  font-size: 1.05rem;
  line-height: 1.7;
}

.phero-cta {
  margin-top: 1.6rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-1);
  border-radius: 999px;
  padding: 0.55rem 1rem;
  cursor: pointer;
  box-shadow: var(--shadow-neon);
  transition: transform 0.25s var(--transition-premium);
}

.phero-cta:hover {
  transform: translateY(-4px);
}

.phero-visual-anchor {
  display: none;
}

.phero-scroll-cue {
  position: absolute;
  bottom: 1.6rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.02);
  color: var(--text-1);
  border-radius: 999px;
  padding: 0.5rem 0.9rem;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  /* fade the cue out as the hero scrolls away */
  opacity: calc(1 - var(--progress, 0) * 1.6);
}

.phero-scroll-cue__arrow {
  animation: phero-bob 1.6s ease-in-out infinite;
}

@keyframes phero-bob {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}

/* --- Responsive ------------------------------------------------------ */
@media (max-width: 768px) {
  .phero-stage {
    padding-top: 5.5rem;
    --parallax-gain: 0.4;   /* minimise heavy parallax on small screens */
    --pointer-range: 0px;
  }
  .phero-layer--foreground {
    display: none;          /* drop the heaviest layer on small screens */
  }
  .phero-name {
    font-size: clamp(2rem, 10vw, 4.75rem);
    line-height: 0.98;
    letter-spacing: 0;
    -webkit-text-stroke-width: 1.25px;
  }
  .phero-tagline {
    font-size: clamp(1.2rem, 6vw, 1.65rem);
    line-height: 1.18;
  }
  .phero-subline {
    font-size: 0.98rem;
  }
}

/* No mouse tilt on touch / coarse pointers. */
@media (hover: none) {
  .phero-stage {
    --pointer-range: 0px;
  }
}

/* Honour reduced-motion: freeze everything to its resting state. */
@media (prefers-reduced-motion: reduce) {
  .phero-stage {
    --parallax-gain: 0;
    --pointer-range: 0px;
  }
  .phero-content {
    opacity: 1;
    transform: none;
  }
  .phero-layer {
    transform: none;
  }
  .phero-scroll-cue {
    opacity: 1;
  }
  .phero-scroll-cue__arrow {
    animation: none;
  }
}
```

- [ ] **Step 2: Verify the file parses (build smoke check happens in Task 6).**

No standalone test for CSS; correctness is validated by the component render test (Task 5) and the production build (Task 6).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/styles/parallax-hero.css
git commit -m "feat: add parallax hero stylesheet"
```

---

### Task 5: The ParallaxHero component

**Files:**
- Create: `frontend/src/components/hero/ParallaxHero.jsx`
- Test: `frontend/src/components/hero/ParallaxHero.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/hero/ParallaxHero.test.jsx
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

  it('fires the primary callback when the CTA is clicked', async () => {
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/hero/ParallaxHero.test.jsx`
Expected: FAIL — cannot resolve `./ParallaxHero`.

- [ ] **Step 3: Write the implementation**

```jsx
// frontend/src/components/hero/ParallaxHero.jsx
import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useParallax } from '../../hooks/useParallax';
import { runHeroLoadTimeline, applyMagneticEffect } from '../../utils/gsapAnimations';

// Per-layer art slots. `src` is a swappable placeholder — drop real art here.
// `speed`/`depth` feed the CSS parallax maths (see parallax-hero.css).
const LAYERS = [
  { key: 'background', src: '/parallax/layer-background.svg', speed: 0.35, depth: 0.15 },
  { key: 'midground', src: '/parallax/layer-midground.svg', speed: 0.6, depth: 0.45 },
  { key: 'foreground', src: '/parallax/layer-foreground.svg', speed: 1.25, depth: 1.0 },
];

const ParallaxHero = ({ name, onPrimaryClick, onScrollCue }) => {
  const reducedMotion = useReducedMotion();
  // Mouse tilt only on devices with a real hover-capable, fine pointer.
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const isCompact = useMediaQuery('(max-width: 768px)');

  const parallaxEnabled = !reducedMotion;
  const pointerEnabled = parallaxEnabled && canHover && !isCompact;

  const { stageRef } = useParallax({ enabled: parallaxEnabled, pointerEnabled });

  const logoRef = useRef(null);
  const taglineRef = useRef(null);
  const visualRef = useRef(null);

  const words = useMemo(
    () => 'AI Engineer. Frontend Craftswoman. Product Builder.'.split(' '),
    []
  );

  useEffect(() => {
    // Reuse the existing GSAP load timeline for the cinematic entrance.
    const wordNodes = Array.from(document.querySelectorAll('.phero-word'));
    const cleanupTimeline = runHeroLoadTimeline({
      logoRef,
      words: wordNodes,
      taglineRef,
      visualRef,
      reducedMotion,
    });
    const cleanupMagnetic = applyMagneticEffect('.phero-cta.magnetic', reducedMotion);
    return () => {
      cleanupTimeline();
      cleanupMagnetic();
    };
  }, [reducedMotion]);

  return (
    <section id="home" className="phero" data-parallax={parallaxEnabled ? 'on' : 'off'}>
      <div className="phero-stage" ref={stageRef}>
        <div className="phero-layers" aria-hidden="true">
          {LAYERS.map((layer) => (
            <div
              key={layer.key}
              className={`phero-layer phero-layer--${layer.key}`}
              style={{ '--speed': layer.speed, '--depth': layer.depth }}
            >
              {/* CSS paints on-brand depth; this <img> is the swappable art slot. */}
              <img
                className="phero-layer__art"
                src={layer.src}
                alt=""
                loading="eager"
                draggable="false"
              />
            </div>
          ))}
          <div className="phero-vignette" />
        </div>

        <div className="phero-content">
          <div className="phero-logo" ref={logoRef}>YE</div>

          <h1 className="phero-name" aria-label={name}>{name}</h1>

          <h2 className="phero-tagline" ref={taglineRef}>
            {words.map((word, index) => (
              <span className="phero-word" key={`${word}-${index}`}>{word}</span>
            ))}
          </h2>

          <p className="phero-subline">
            Building expressive interfaces and practical GenAI systems with startup-grade execution.
          </p>

          <button type="button" className="phero-cta magnetic" onClick={onPrimaryClick}>
            Explore My Work
          </button>

          <span ref={visualRef} className="phero-visual-anchor" aria-hidden="true" />
        </div>

        <button
          type="button"
          className="phero-scroll-cue"
          onClick={onScrollCue}
          aria-label="Scroll to skills section"
        >
          <span>Scroll</span>
          <span className="phero-scroll-cue__arrow" aria-hidden="true">↓</span>
        </button>
      </div>
    </section>
  );
};

export default ParallaxHero;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/hero/ParallaxHero.test.jsx`
Expected: PASS — all four assertions green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/hero/ParallaxHero.jsx frontend/src/components/hero/ParallaxHero.test.jsx
git commit -m "feat: add ParallaxHero component"
```

---

### Task 6: Wire the hero into the app

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/App.css`

- [ ] **Step 1: Import the stylesheet**

Edit `frontend/src/App.css` to add the import (order after globals/animations):

```css
@import './styles/globals.css';
@import './styles/animations.css';
@import './styles/parallax-hero.css';
```

- [ ] **Step 2: Replace the hero block in `App.jsx`**

Change the imports near the top: remove the `HeroText` and `ScrollIndicator` imports and the `useRef` import, add `ParallaxHero`. The import section becomes:

```jsx
import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import Navbar from './components/nav/Navbar';
import ParallaxHero from './components/hero/ParallaxHero';
import SmoothScroll from './components/shared/SmoothScroll';
import PageTransition from './components/shared/PageTransition';
import SkillsSection from './components/SkillsSection';
import ProjectGrid from './components/projects/ProjectGrid';
import ExperienceSection from './components/ExperienceSection';
import EducationSection from './components/EducationSection';
import Footer from './components/Footer';
import ChatWidget from './components/ai/ChatWidget';
import { portfolioData } from './data/portfolioData';
import { navLinks } from './data/navigation';
import { useScrollSpy } from './hooks/useScrollSpy';
import './App.css';
```

Then remove the now-unused `heroSectionRef` line and replace the hero `<section>` block. The component body becomes:

```jsx
function App() {
  const sectionIds = useMemo(() => navLinks.map((link) => link.id), []);
  const activeSection = useScrollSpy(sectionIds);
  const reducedMotion = useReducedMotion();

  const handleNavClick = (sectionId) => {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <SmoothScroll>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Navbar links={navLinks} activeSection={activeSection} onNavigate={handleNavClick} />

      <ParallaxHero
        name={portfolioData.personalInfo.name}
        onPrimaryClick={() => handleNavClick('projects')}
        onScrollCue={() => handleNavClick('skills')}
      />
      <ChatWidget />

      <main id="main-content" className="main-content" tabIndex={-1}>
        <PageTransition delay={0.05}>
          <SkillsSection skills={portfolioData.skills} />
        </PageTransition>
        <PageTransition delay={0.1}>
          <ExperienceSection experience={portfolioData.experience} />
        </PageTransition>
        <PageTransition delay={0.15}>
          <ProjectGrid projects={portfolioData.projects} />
        </PageTransition>
        <PageTransition delay={0.2}>
          <EducationSection education={portfolioData.education} />
        </PageTransition>
      </main>

      <Footer />
    </SmoothScroll>
  );
}

export default App;
```

- [ ] **Step 3: Run the full test suite**

Run: `cd frontend && npm test`
Expected: PASS — all suites including the new `parallaxMath`, `useParallax`, and `ParallaxHero` tests, with no regressions in existing suites.

- [ ] **Step 4: Production build smoke test**

Run: `cd frontend && npm run build`
Expected: build completes with no errors (CSS `@import` resolves, no unresolved module imports).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/App.css
git commit -m "feat: wire ParallaxHero into the app"
```

---

### Task 7: Manual verification

**Files:** none (verification only).

- [ ] **Step 1: Run the dev server and view the hero**

Run: `cd frontend && npm run dev` then open the printed URL.
Expected: layered neon hero; scrolling moves background/midground/foreground at visibly different speeds; the headline fades and shrinks slightly as you scroll; on desktop, moving the mouse produces a subtle depth tilt.

- [ ] **Step 2: Check the degraded paths**

- Resize below 768px (or use device emulation): foreground layer is hidden, parallax is gentle, no mouse tilt, layout is single column with readable type.
- Enable OS "reduce motion": hero renders static (no parallax, no fade, no tilt), text fully visible.

- [ ] **Step 3: Final commit (if any tweaks were needed)**

```bash
git add -A
git commit -m "chore: parallax hero verification tweaks"
```

---

## Self-Review

**1. Spec coverage:**
- Multi-layer foreground/midground/background at independent speeds → Tasks 3, 4, 5 (LAYERS + `--speed`/`--depth` + CSS transform). ✓
- Cinematic text entrance interacting with scroll (fade/scale) → GSAP load timeline reused in Task 5 + `.phero-content` opacity/scale in Task 4 (`textFade`/`textScale` in Task 1). ✓
- Smooth scroll via requestAnimationFrame → Task 2 hook. ✓
- Responsive / mobile degradation (disable or minimise) → Task 4 media queries (`--parallax-gain: 0.4`, foreground hidden, `(hover: none)` zeroes tilt) + reduced-motion block; Task 5 derives `pointerEnabled`. ✓
- Placeholder background images → Task 3 SVG slots + `<img>` in Task 5. ✓
- Inline comments explaining scroll-to-transform ratios → comments in `parallaxMath.js` (Task 1), `useParallax.js` (Task 2), and `parallax-hero.css` (Task 4). ✓
- Clean/responsive layout that degrades gracefully → covered by Tasks 4 + 5. ✓

**2. Placeholder scan:** No "TBD/TODO"; every code step contains complete code. ✓

**3. Type consistency:** CSS var names (`--scroll`, `--progress`, `--mx`, `--my`, `--speed`, `--depth`, `--layer-zoom`, `--pointer-range`, `--parallax-gain`) are written by `useParallax`/component and read by `parallax-hero.css` consistently. Hook signature `useParallax({ enabled, pointerEnabled }) -> { stageRef }` matches the call site. Function names (`clampProgress`, `layerTranslateY`, `pointerShift`, `textFade`, `textScale`, `lerp`) match between module, tests, and the hook's import. Class names (`.phero*`) match between component and stylesheet. ✓

All checks pass.
