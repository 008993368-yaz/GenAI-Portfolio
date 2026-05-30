import { useEffect, useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { useParallax } from '../../hooks/useParallax';
import { runHeroLoadTimeline, applyMagneticEffect } from '../../utils/gsapAnimations';

// Per-layer art slots. `src` is a swappable placeholder — drop real art here.
// `speed`/`depth` feed the CSS parallax maths (see parallax-hero.css).
const LAYERS = [
  { key: 'background', src: '/parallax/layer-background.svg', speed: 0.35, depth: 0.15 },
  { key: 'midground', src: '/parallax/layer-midground.svg', speed: 0.6, depth: 0.45 },
  { key: 'foreground', src: '/parallax/layer-foreground.svg', speed: 1.25, depth: 1.0 },
];

const ParallaxHero = ({ name, onPrimaryClick, onScrollCue }) => {
  const reducedMotion = useReducedMotion();
  // Mouse tilt only on devices with a real hover-capable, fine pointer.
  const canHover = useMediaQuery('(hover: hover) and (pointer: fine)');
  const isCompact = useMediaQuery('(max-width: 768px)');

  const parallaxEnabled = !reducedMotion;
  const pointerEnabled = parallaxEnabled && canHover && !isCompact;

  const { stageRef } = useParallax({ enabled: parallaxEnabled, pointerEnabled });

  const logoRef = useRef(null);
  const taglineRef = useRef(null);
  const visualRef = useRef(null);

  const words = useMemo(
    () => 'AI Engineer. Frontend Craftswoman. Product Builder.'.split(' '),
    []
  );

  useEffect(() => {
    // Reuse the existing GSAP load timeline for the cinematic entrance.
    const wordNodes = Array.from(document.querySelectorAll('.phero-word'));
    const cleanupTimeline = runHeroLoadTimeline({
      logoRef,
      words: wordNodes,
      taglineRef,
      visualRef,
      reducedMotion,
    });
    const cleanupMagnetic = applyMagneticEffect('.phero-cta.magnetic', reducedMotion);
    return () => {
      cleanupTimeline();
      cleanupMagnetic();
    };
  }, [reducedMotion]);

  return (
    <section id="home" className="phero" data-parallax={parallaxEnabled ? 'on' : 'off'}>
      <div className="phero-stage" ref={stageRef}>
        <div className="phero-layers" aria-hidden="true">
          {LAYERS.map((layer) => (
            <div
              key={layer.key}
              className={`phero-layer phero-layer--${layer.key}`}
              style={{ '--speed': layer.speed, '--depth': layer.depth }}
            >
              {/* CSS paints on-brand depth; this <img> is the swappable art slot. */}
              <img
                className="phero-layer__art"
                src={layer.src}
                alt=""
                loading="eager"
                draggable="false"
              />
            </div>
          ))}
          <div className="phero-vignette" />
        </div>

        <div className="phero-content">
          <div className="phero-logo" ref={logoRef}>YE</div>

          <h1 className="phero-name" aria-label={name}>{name}</h1>

          <h2 className="phero-tagline" ref={taglineRef}>
            {words.map((word, index) => (
              <span className="phero-word" key={`${word}-${index}`}>{word}</span>
            ))}
          </h2>

          <p className="phero-subline">
            Building expressive interfaces and practical GenAI systems with startup-grade execution.
          </p>

          <button type="button" className="phero-cta magnetic" onClick={onPrimaryClick}>
            Explore My Work
          </button>

          <span ref={visualRef} className="phero-visual-anchor" aria-hidden="true" />
        </div>

        <button
          type="button"
          className="phero-scroll-cue"
          onClick={onScrollCue}
          aria-label="Scroll to skills section"
        >
          <span>Scroll</span>
          <span className="phero-scroll-cue__arrow" aria-hidden="true">↓</span>
        </button>
      </div>
    </section>
  );
};

export default ParallaxHero;
