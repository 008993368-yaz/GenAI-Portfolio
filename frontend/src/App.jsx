import { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
import Navbar from './components/nav/Navbar';
import ParallaxHero from './components/hero/ParallaxHero';
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

      <ParallaxHero
        name={portfolioData.personalInfo.name}
        onPrimaryClick={() => handleNavClick('projects')}
        onScrollCue={() => handleNavClick('skills')}
      />
      <ChatWidget />

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
