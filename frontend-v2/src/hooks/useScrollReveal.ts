import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface RevealOptions {
  /** CSS selector for the elements to stagger-reveal within the container. */
  selector?: string;
  y?: number;
  stagger?: number;
  duration?: number;
  start?: string;
}

/**
 * Stagger-reveals `.reveal` children of the returned ref as they scroll
 * into view. No-op (children shown immediately) under reduced-motion.
 */
export function useScrollReveal<T extends HTMLElement>({
  selector = ".reveal",
  y = 28,
  stagger = 0.09,
  duration = 0.9,
  start = "top 82%",
}: RevealOptions = {}) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const targets = root.querySelectorAll(selector);
    if (!targets.length) return;

    if (prefersReduced()) {
      gsap.set(targets, { opacity: 1, y: 0 });
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration,
          stagger,
          ease: "power3.out",
          scrollTrigger: { trigger: root, start },
        }
      );
    }, root);

    return () => ctx.revert();
  }, [selector, y, stagger, duration, start]);

  return ref;
}
