import { useEffect, useRef, useState } from "react";

interface CycleOptions {
  /** Characters typed per second. */
  typeCps?: number;
  /** Characters deleted per second. */
  deleteCps?: number;
  /** Pause once a word is fully typed, before deleting (ms). */
  holdMs?: number;
  /** Pause once a word is fully deleted, before the next word (ms). */
  pauseMs?: number;
}

/**
 * Cycles through `words`, typing each one out, holding, backspacing it, then
 * moving to the next — looping forever. Time-based (consistent regardless of
 * frame rate). Honors prefers-reduced-motion by showing nothing animated and
 * leaving the caller to render a static fallback instead.
 *
 * Returns the current partial string and `reduced` so the caller can branch to
 * a static treatment when motion is disabled.
 */
export function useTypewriterCycle(
  words: readonly string[],
  opts: CycleOptions = {}
) {
  const {
    typeCps = 14,
    deleteCps = 26,
    holdMs = 2500,
    pauseMs = 350,
  } = opts;

  const [shown, setShown] = useState("");
  const [reduced, setReduced] = useState(false);
  const frame = useRef(0);

  useEffect(() => {
    if (!words.length) {
      setShown("");
      return;
    }

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) {
      setReduced(true);
      return;
    }
    setReduced(false);

    let wordIndex = 0;
    let phase: "typing" | "holding" | "deleting" | "pausing" = "typing";
    let phaseStart: number | null = null;

    const step = (now: number) => {
      if (phaseStart === null) phaseStart = now;
      const word = words[wordIndex];
      const elapsed = now - phaseStart;

      if (phase === "typing") {
        const count = Math.min(word.length, Math.floor((elapsed / 1000) * typeCps));
        setShown(word.slice(0, count));
        if (count >= word.length) {
          phase = "holding";
          phaseStart = now;
        }
      } else if (phase === "holding") {
        if (elapsed >= holdMs) {
          phase = "deleting";
          phaseStart = now;
        }
      } else if (phase === "deleting") {
        const removed = Math.floor((elapsed / 1000) * deleteCps);
        const count = Math.max(0, word.length - removed);
        setShown(word.slice(0, count));
        if (count <= 0) {
          phase = "pausing";
          phaseStart = now;
        }
      } else if (elapsed >= pauseMs) {
        wordIndex = (wordIndex + 1) % words.length;
        phase = "typing";
        phaseStart = now;
      }

      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [words, typeCps, deleteCps, holdMs, pauseMs]);

  return { shown, reduced };
}
