import { useEffect, useRef } from 'react';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const SmoothScroll = ({ children }) => {
  const containerRef = useRef(null);
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    let scrollInstance;
    let mounted = true;

    const setup = async () => {
      const module = await import('locomotive-scroll');
      const LocomotiveScroll = module.default;

      if (!mounted || !containerRef.current) {
        return;
      }

      scrollInstance = new LocomotiveScroll({
        el: containerRef.current,
        // Keep inertia subtle so section pinning and content readability stay balanced.
        smooth: true,
        smartphone: { smooth: false },
        tablet: { smooth: true },
        multiplier: 0.9,
        lerp: 0.08,
      });
    };

    setup().catch((error) => {
      console.warn('Smooth scroll initialization failed:', error);
    });

    return () => {
      mounted = false;
      if (scrollInstance?.destroy) {
        scrollInstance.destroy();
      }
    };
  }, [prefersReducedMotion]);

  return (
    <div ref={containerRef} data-scroll-container>
      {children}
    </div>
  );
};

export default SmoothScroll;
