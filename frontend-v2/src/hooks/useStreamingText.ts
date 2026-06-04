import { useEffect, useRef, useState } from "react";
import { revealCount } from "./streamingReveal";

interface StreamingTextOptions {
  /** True while tokens are still arriving. */
  streaming: boolean;
  /** Characters revealed per second. */
  cps?: number;
}

/**
 * Reveals a *growing* `target` string at a steady character rate, so a real
 * token stream reads as smooth typing. Unlike a one-shot typewriter, it does
 * NOT reset when `target` grows (every token changes it) — it only resets when
 * `target` becomes empty (a new exchange). Honors prefers-reduced-motion by
 * showing whatever has been received immediately.
 *
 * `done` is true only once streaming has stopped AND the revealed text has
 * caught up to the full target.
 */
export function useStreamingText(
  target: string,
  { streaming, cps = 170 }: StreamingTextOptions
) {
  const [shown, setShown] = useState("");
  const startRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!target) {
      startRef.current = null;
      setShown("");
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) {
      setShown(target);
      return;
    }

    // Start the clock at the first non-empty target (the first token), and keep
    // it across re-renders so the reveal stays continuous as tokens arrive.
    if (startRef.current === null) startRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - (startRef.current as number);
      const count = revealCount(elapsed, cps, targetRef.current.length);
      setShown(targetRef.current.slice(0, count));
      if (count < targetRef.current.length || streaming) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, streaming, cps]);

  const done = !streaming && shown === target;
  return { shown, done };
}
