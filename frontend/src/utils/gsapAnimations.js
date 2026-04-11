import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let pluginsRegistered = false;

const ensurePlugins = () => {
  if (!pluginsRegistered) {
    gsap.registerPlugin(ScrollTrigger);
    pluginsRegistered = true;
  }
};

export const runHeroLoadTimeline = ({ logoRef, words = [], taglineRef, visualRef, reducedMotion }) => {
  if (reducedMotion) {
    gsap.set([logoRef?.current, taglineRef?.current, visualRef?.current], { clearProps: 'all', opacity: 1, y: 0 });
    return () => {};
  }

  const timeline = gsap.timeline({ defaults: { ease: 'power4.out' } });

  timeline
    .fromTo(
      logoRef?.current,
      { y: -18, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.7 }
    )
    .fromTo(
      words,
      { yPercent: 120, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.05 },
      '-=0.25'
    )
    .fromTo(
      taglineRef?.current,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.75 },
      '-=0.5'
    )
    .fromTo(
      visualRef?.current,
      { scale: 0.9, opacity: 0 },
      { scale: 1, opacity: 1, duration: 1.1 },
      '-=0.6'
    );

  return () => timeline.kill();
};

export const runStaggerIn = (scope, selector) => {
  ensurePlugins();

  const context = gsap.context(() => {
    gsap.fromTo(
      selector,
      { y: 40, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power3.out',
        immediateRender: false,
        clearProps: 'transform,opacity',
        scrollTrigger: {
          trigger: scope.current,
          start: 'top 75%',
          once: true,
        },
      }
    );
  }, scope);

  return () => context.revert();
};

export const runSkillBars = (scope) => {
  ensurePlugins();

  const context = gsap.context(() => {
    // Each bar animates only when scrolled into view to reduce initial paint cost.
    gsap.utils.toArray('.skill-fill').forEach((element) => {
      const width = element.getAttribute('data-width') || '0%';
      gsap.fromTo(
        element,
        { width: '0%' },
        {
          width,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: element,
            start: 'top 85%',
            once: true,
          },
        }
      );
    });
  }, scope);

  return () => context.revert();
};

export const applyMagneticEffect = (selector, reducedMotion = false) => {
  if (reducedMotion || typeof window === 'undefined') {
    return () => {};
  }

  const elements = Array.from(document.querySelectorAll(selector));
  const cleanups = [];

  elements.forEach((element) => {
    const onMove = (event) => {
      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left - rect.width / 2;
      const y = event.clientY - rect.top - rect.height / 2;
      gsap.to(element, {
        x: x * 0.24,
        y: y * 0.24,
        duration: 0.35,
        ease: 'power2.out',
      });
    };

    const onLeave = () => {
      gsap.to(element, {
        x: 0,
        y: 0,
        duration: 0.45,
        ease: 'power3.out',
      });
    };

    element.addEventListener('mousemove', onMove);
    element.addEventListener('mouseleave', onLeave);
    cleanups.push(() => {
      element.removeEventListener('mousemove', onMove);
      element.removeEventListener('mouseleave', onLeave);
    });
  });

  return () => cleanups.forEach((cleanup) => cleanup());
};
