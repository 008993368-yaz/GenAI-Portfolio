import { useEffect, useRef, useState } from "react";

interface TypewriterOptions {
  /** Characters revealed per second. */
  cps?: number;
}

/**
 * Reveals `text` progressively, one character at a time, to simulate live
 * typing. Restarts whenever `text` changes. Honors prefers-reduced-motion by
 * showing the full text immediately. The reveal is time-based (not per-frame),
 * so it runs at a consistent speed regardless of frame rate.
 */
export function useTypewriter(text: string, { cps = 170 }: TypewriterOptions = {}) {
  const [shown, setShown] = useState("");
  const frame = useRef(0);

  useEffect(() => {
    if (!text) {
      setShown("");
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) {
      setShown(text);
      return;
    }

    setShown("");
    let start: number | null = null;

    const step = (now: number) => {
      if (start === null) start = now;
      const count = Math.min(
        text.length,
        Math.floor(((now - start) / 1000) * cps)
      );
      setShown(text.slice(0, count));
      if (count < text.length) {
        frame.current = requestAnimationFrame(step);
      }
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [text, cps]);

  // `done` is true only when the revealed text exactly matches the target,
  // which avoids a flicker while a new answer is swapping in.
  return { shown, done: shown === text };
}
