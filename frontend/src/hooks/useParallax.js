import { useEffect, useRef } from 'react';
import { clampProgress, lerp } from '../utils/parallaxMath';

const EASE = 0.12; // per-frame smoothing factor (0..1); lower = silkier/laggier
const EPSILON = 0.01; // stop the loop once movement is imperceptible

/**
 * Drives a single requestAnimationFrame loop that smooths scroll + pointer input
 * and publishes CSS custom properties on the stage element:
 *   --scroll   : eased scrollY in px        -> layers use calc(var(--scroll) * (1 - var(--speed)))
 *   --progress : eased hero progress 0..1    -> text fade/scale
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
