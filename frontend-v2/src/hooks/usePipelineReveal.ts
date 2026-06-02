import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveals a signal-flow pipeline as it scrolls into view: the `[data-spine]`
 * line draws downward, then each `[data-node]` lights in sequence (ending on
 * the output node). No-op — everything shown immediately — under reduced
 * motion. Returns a ref to attach to the pipeline container.
 */
export function usePipelineReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const spine = root.querySelector("[data-spine]");
    const nodes = root.querySelectorAll("[data-node]");
    if (!nodes.length) return;

    if (prefersReduced()) {
      gsap.set(nodes, { opacity: 1, y: 0 });
      if (spine) gsap.set(spine, { opacity: 1, scaleY: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 78%" },
      });
      if (spine) {
        tl.fromTo(
          spine,
          { scaleY: 0, opacity: 1 },
          { scaleY: 1, duration: 0.5, ease: "power2.out" }
        );
      }
      tl.fromTo(
        nodes,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.18, ease: "power3.out" },
        spine ? "-=0.25" : 0
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return ref;
}
