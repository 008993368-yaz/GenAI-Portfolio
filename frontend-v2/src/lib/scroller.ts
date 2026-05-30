import type Lenis from "lenis";

/* Shared Lenis handle so the query console and anchor links can drive the
   same smooth scroller that ScrollTrigger is synced to. */
let instance: Lenis | null = null;

export function setLenis(l: Lenis | null) {
  instance = l;
}

export function scrollToTarget(target: Element | number) {
  if (instance) {
    instance.scrollTo(target as HTMLElement, { offset: 0, duration: 1.1 });
  } else if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (el) scrollToTarget(el);
}
