import { useEffect } from 'react';
import HeroSection from './components/HeroSection';
import Navbar from './components/Navbar';
import SkillsSection from './components/SkillsSection';
import ProjectsSection from './components/ProjectsSection';
import ExperienceSection from './components/ExperienceSection';
import EducationSection from './components/EducationSection';
import ContactSection from './components/ContactSection';
import Footer from './components/Footer';
import ChatbotButton from './components/ChatbotButton';
import { portfolioData } from './data/portfolioData';
import { navLinks } from './data/navigation';
import { useScrollSpy } from './hooks/useScrollSpy';
import { smoothScrollTo } from './utils/scroll';
import './App.css';

function App() {
  const sectionIds = navLinks.map(link => link.id);
  const activeSection = useScrollSpy(sectionIds);

  const handleNavClick = (sectionId) => {
    smoothScrollTo(sectionId);
  };

  useEffect(() => {
    // Console message for loaded portfolio
    console.log('%c Portfolio Loaded Successfully! ', 'background: #3498db; color: white; font-size: 16px; padding: 5px 10px; border-radius: 3px;');
  }, []);

  return (
    <>
      <Navbar 
        links={navLinks} 
        activeSection={activeSection} 
        onNavClick={handleNavClick}
      />
      <HeroSection 
        personalInfo={portfolioData.personalInfo}
        onNavClick={handleNavClick}
      />
      <main className="main">
        <div className="container">
          <SkillsSection skills={portfolioData.skills} />
          <ExperienceSection experience={portfolioData.experience} />
          <ProjectsSection projects={portfolioData.projects} />
          <EducationSection education={portfolioData.education} />
          <ContactSection personalInfo={portfolioData.personalInfo} />
        </div>
      </main>
      <Footer />
      <ChatbotButton />
    </>
  );
}

export default App;
