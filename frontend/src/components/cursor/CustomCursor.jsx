import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCursor } from '../../hooks/useCursor';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const SPRING = { type: 'spring', stiffness: 380, damping: 35, mass: 0.4 };

const CustomCursor = () => {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');

  const enabled = canHover && !prefersReducedMotion;
  const { dotPosition, ringPosition, isPointer, isHidden, isKeyboardNav } = useCursor(enabled);

  const ringStyle = useMemo(
    () => ({
      x: ringPosition.x - 16,
      y: ringPosition.y - 16,
      scale: isPointer ? 1.8 : 1,
      opacity: isHidden || isKeyboardNav ? 0 : 1,
    }),
    [isPointer, isHidden, isKeyboardNav, ringPosition]
  );

  const dotStyle = useMemo(
    () => ({
      x: dotPosition.x - 3,
      y: dotPosition.y - 3,
      scale: isPointer ? 1.1 : 1,
      opacity: isHidden || isKeyboardNav ? 0 : 1,
    }),
    [isPointer, isHidden, isKeyboardNav, dotPosition]
  );

  if (!enabled) {
    return null;
  }

  return (
    <>
      <motion.div className="cursor-ring" animate={ringStyle} transition={SPRING} />
      <motion.div className="cursor-dot" animate={dotStyle} transition={SPRING} />
    </>
  );
};

export default CustomCursor;
