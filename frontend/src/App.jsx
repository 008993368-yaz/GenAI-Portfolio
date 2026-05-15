import { useMemo, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
import Navbar from './components/nav/Navbar';
import HeroText from './components/hero/HeroText';
import ScrollIndicator from './components/hero/ScrollIndicator';
import SmoothScroll from './components/shared/SmoothScroll';
import PageTransition from './components/shared/PageTransition';
import SkillsSection from './components/SkillsSection';
import ProjectGrid from './components/projects/ProjectGrid';
import ExperienceSection from './components/ExperienceSection';
import EducationSection from './components/EducationSection';
import Footer from './components/Footer';
import ChatWidget from './components/ai/ChatWidget';
import { portfolioData } from './data/portfolioData';
import { navLinks } from './data/navigation';
import { useScrollSpy } from './hooks/useScrollSpy';
import './App.css';

function App() {
  const heroSectionRef = useRef(null);
  const sectionIds = useMemo(() => navLinks.map((link) => link.id), []);
  const activeSection = useScrollSpy(sectionIds);
  const reducedMotion = useReducedMotion();

  const handleNavClick = (sectionId) => {
    const section = document.getElementById(sectionId);
    section?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <SmoothScroll>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>

      <Navbar links={navLinks} activeSection={activeSection} onNavigate={handleNavClick} />

      <section id="home" className="hero-section" ref={heroSectionRef}>
        <div className="hero-grid">
          <HeroText name={portfolioData.personalInfo.name} onPrimaryClick={() => handleNavClick('projects')} />
        </div>
        <ChatWidget />
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
