import { useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { runHeroLoadTimeline, applyMagneticEffect } from '../../utils/gsapAnimations';

const HeroText = ({ name, onPrimaryClick }) => {
  const logoRef = useRef(null);
  const taglineRef = useRef(null);
  const visualRef = useRef(null);
  const reducedMotion = useReducedMotion();

  const words = useMemo(() => 'AI Engineer. Frontend Craftswoman. Product Builder.'.split(' '), []);

  useEffect(() => {
    const wordNodes = Array.from(document.querySelectorAll('.hero-word'));

    // GSAP timeline coordinates the logo, split headline words, tagline, and 3D visual reveal.
    const cleanupTimeline = runHeroLoadTimeline({
      logoRef,
      words: wordNodes,
      taglineRef,
      visualRef,
      reducedMotion,
    });

    const cleanupMagnetic = applyMagneticEffect('.hero-cta.magnetic', reducedMotion);

    return () => {
      cleanupTimeline();
      cleanupMagnetic();
    };
  }, [reducedMotion]);

  return (
    <div className="hero-text-wrapper">
      <div className="hero-logo" ref={logoRef}>
        YE
      </div>

      <h1 className="hero-name" aria-label={name}>
        {name}
      </h1>

      <h2 className="hero-tagline" ref={taglineRef}>
        {words.map((word, index) => (
          <span className="hero-word" key={`${word}-${index}`}>
            {word}
          </span>
        ))}
      </h2>

      <motion.p
        className="hero-subline"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
      >
        Building expressive interfaces and practical GenAI systems with startup-grade execution.
      </motion.p>

      <button type="button" className="hero-cta magnetic" onClick={onPrimaryClick}>
        Explore My Work
      </button>

      <span ref={visualRef} className="hero-visual-anchor" aria-hidden="true" />
    </div>
  );
};

export default HeroText;
