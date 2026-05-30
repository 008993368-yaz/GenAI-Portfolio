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
