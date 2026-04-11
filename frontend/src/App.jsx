import { Suspense, lazy, useEffect, useMemo, useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import Navbar from './components/nav/Navbar';
import HeroText from './components/hero/HeroText';
import ScrollIndicator from './components/hero/ScrollIndicator';
import CustomCursor from './components/cursor/CustomCursor';
import SmoothScroll from './components/shared/SmoothScroll';
import PageTransition from './components/shared/PageTransition';
import SkillsSection from './components/SkillsSection';
import ProjectGrid from './components/projects/ProjectGrid';
import ExperienceSection from './components/ExperienceSection';
import EducationSection from './components/EducationSection';
import Footer from './components/Footer';
import { portfolioData } from './data/portfolioData';
import { navLinks } from './data/navigation';
import { useScrollSpy } from './hooks/useScrollSpy';
import './App.css';

const loadHero3D = () => import('./components/hero/Hero3D');
const Hero3D = lazy(loadHero3D);

function App() {
  const heroSectionRef = useRef(null);
  const hasPrefetchedHero3DRef = useRef(false);
  const heroPrefetchStartedAtRef = useRef(0);
  const heroPrefetchResolvedAtRef = useRef(0);
  const hasLoggedHeroMetricRef = useRef(false);
  const sectionIds = useMemo(() => navLinks.map((link) => link.id), []);
  const activeSection = useScrollSpy(sectionIds);
  const reducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const slowParallax = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -160]);
  const mediumParallax = useTransform(scrollYProgress, [0, 1], [0, reducedMotion ? 0 : -280]);

  const handleNavClick = (sectionId) => {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  const handleHero3DFirstRender = () => {
    if (!import.meta.env.DEV || hasLoggedHeroMetricRef.current) {
      return;
    }

    hasLoggedHeroMetricRef.current = true;
    const renderAt = performance.now();
    const prefetchResolvedAt = heroPrefetchResolvedAtRef.current;
    const prefetchStartedAt = heroPrefetchStartedAtRef.current;
    const prefetchWon = Boolean(prefetchResolvedAt && prefetchResolvedAt <= renderAt);

    console.info('[Hero3D metric] first render prefetch status', {
      prefetchResolvedBeforeFirstRender: prefetchWon,
      prefetchLeadMs: prefetchWon ? Math.round(renderAt - prefetchResolvedAt) : null,
      prefetchDurationMs: prefetchResolvedAt && prefetchStartedAt ? Math.round(prefetchResolvedAt - prefetchStartedAt) : null,
      firstRenderAtMs: Math.round(renderAt),
    });
  };

  useEffect(() => {
    const prefetchHero3D = () => {
      if (hasPrefetchedHero3DRef.current) {
        return;
      }

      hasPrefetchedHero3DRef.current = true;
      heroPrefetchStartedAtRef.current = performance.now();
      loadHero3D()
        .then(() => {
          heroPrefetchResolvedAtRef.current = performance.now();

          if (import.meta.env.DEV) {
            console.info('[Hero3D metric] prefetch resolved', {
              prefetchDurationMs: Math.round(
                heroPrefetchResolvedAtRef.current - heroPrefetchStartedAtRef.current
              ),
            });
          }
        })
        .catch((error) => {
          console.warn('Hero3D prefetch failed:', error);
        });
    };

    let idleHandle;
    let idleTimeout;

    if (typeof window.requestIdleCallback === 'function') {
      idleHandle = window.requestIdleCallback(prefetchHero3D, { timeout: 1500 });
    } else {
      idleTimeout = window.setTimeout(prefetchHero3D, 1200);
    }

    if (typeof IntersectionObserver !== 'undefined' && heroSectionRef.current) {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            prefetchHero3D();
            observer.disconnect();
          }
        },
        { rootMargin: '280px 0px' }
      );

      observer.observe(heroSectionRef.current);

      return () => {
        observer.disconnect();
        if (typeof window.cancelIdleCallback === 'function' && idleHandle) {
          window.cancelIdleCallback(idleHandle);
        }
        if (idleTimeout) {
          window.clearTimeout(idleTimeout);
        }
      };
    }

    return () => {
      if (typeof window.cancelIdleCallback === 'function' && idleHandle) {
        window.cancelIdleCallback(idleHandle);
      }
      if (idleTimeout) {
        window.clearTimeout(idleTimeout);
      }
    };
  }, []);

  return (
    <SmoothScroll>
      <CustomCursor />

      <div className="ambient-layer">
        <motion.div className="ambient-orb ambient-orb--cyan" style={{ y: slowParallax }} />
        <motion.div className="ambient-orb ambient-orb--magenta" style={{ y: mediumParallax }} />
      </div>

      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Navbar links={navLinks} activeSection={activeSection} onNavigate={handleNavClick} />

      <section id="home" className="hero-section" ref={heroSectionRef}>
        <div className="hero-grid">
          <HeroText name={portfolioData.personalInfo.name} onPrimaryClick={() => handleNavClick('projects')} />
          <Suspense fallback={<div className="hero-visual" aria-hidden="true" />}>
            <Hero3D onFirstRender={handleHero3DFirstRender} />
          </Suspense>
        </div>
        <ScrollIndicator onClick={() => handleNavClick('skills')} />
      </section>

      <main id="main-content" className="main-content" tabIndex={-1}>
        <PageTransition delay={0.05}>
          <SkillsSection skills={portfolioData.skills} />
        </PageTransition>
        <PageTransition delay={0.1}>
          <ExperienceSection experience={portfolioData.experience} />
        </PageTransition>
        <PageTransition delay={0.15}>
          <ProjectGrid projects={portfolioData.projects} />
        </PageTransition>
        <PageTransition delay={0.2}>
          <EducationSection education={portfolioData.education} />
        </PageTransition>
      </main>

      <Footer />
    </SmoothScroll>
  );
}

export default App;
