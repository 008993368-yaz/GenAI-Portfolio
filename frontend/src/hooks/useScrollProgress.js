import { useRef } from 'react';
import { useScroll, useSpring } from 'framer-motion';

export const useScrollProgress = () => {
  const ref = useRef(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    mass: 0.3,
  });

  return { ref, progress: smoothProgress };
};
