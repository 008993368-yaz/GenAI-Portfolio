import { useEffect, useRef, useState } from 'react';

const lerp = (start, end, factor) => start + (end - start) * factor;

export const useCursor = (enabled = true) => {
  const [isPointer, setIsPointer] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isKeyboardNav, setIsKeyboardNav] = useState(false);
  const [dotPosition, setDotPosition] = useState({ x: 0, y: 0 });
  const [ringPosition, setRingPosition] = useState({ x: 0, y: 0 });

  const targetRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return undefined;
    }

    const update = () => {
      // Dot snaps to pointer while ring lerps for a premium trailing effect.
      setDotPosition({ x: targetRef.current.x, y: targetRef.current.y });
      setRingPosition((prev) => ({
        x: lerp(prev.x, targetRef.current.x, 0.18),
        y: lerp(prev.y, targetRef.current.y, 0.18),
      }));
      rafRef.current = requestAnimationFrame(update);
    };

    const onMouseMove = (event) => {
      targetRef.current.x = event.clientX;
      targetRef.current.y = event.clientY;
      setIsHidden(false);

      const target = event.target;
      const hoverable = target?.closest?.('a, button, [role="button"], .cursor-hover, .magnetic');
      setIsPointer(Boolean(hoverable));
    };

    const onMouseLeave = () => setIsHidden(true);
    const onMouseEnter = () => setIsHidden(false);
    const onKeyDown = () => setIsKeyboardNav(true);
    const onPointerDown = () => setIsKeyboardNav(false);

    rafRef.current = requestAnimationFrame(update);
    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('mouseleave', onMouseLeave);
    window.addEventListener('mouseenter', onMouseEnter);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      window.removeEventListener('mouseenter', onMouseEnter);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [enabled]);

  return {
    dotPosition,
    ringPosition,
    isPointer,
    isHidden,
    isKeyboardNav,
  };
};
