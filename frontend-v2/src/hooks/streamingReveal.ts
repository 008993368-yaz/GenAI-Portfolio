/**
 * How many characters of a target string should be visible after `elapsedMs`
 * at `cps` characters/second, clamped to `targetLength`. Time-based so the
 * reveal runs at a steady rate regardless of frame rate, and clamping to the
 * received length is what lets it track a *growing* (streamed) target.
 */
export function revealCount(
  elapsedMs: number,
  cps: number,
  targetLength: number
): number {
  return Math.min(targetLength, Math.floor((elapsedMs / 1000) * cps));
}
