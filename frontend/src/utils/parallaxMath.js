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
