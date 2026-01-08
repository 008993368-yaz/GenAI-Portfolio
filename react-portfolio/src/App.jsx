import { useEffect } from 'react';
import Header from './components/Header';
import Navbar from './components/Navbar';
import SummarySection from './components/SummarySection';
import SkillsSection from './components/SkillsSection';
import ProjectsSection from './components/ProjectsSection';
import ExperienceSection from './components/ExperienceSection';
import EducationSection from './components/EducationSection';
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
      <Header personalInfo={portfolioData.personalInfo} />
      <Navbar 
        links={navLinks} 
        activeSection={activeSection} 
        onNavClick={handleNavClick}
      />
      <main className="main">
        <div className="container">
          <SummarySection summary={portfolioData.summary} />
          <SkillsSection skills={portfolioData.skills} />
          <ProjectsSection projects={portfolioData.projects} />
          <ExperienceSection experience={portfolioData.experience} />
          <EducationSection education={portfolioData.education} />
        </div>
      </main>
      <Footer />
      <ChatbotButton />
    </>
  );
}

export default App;
