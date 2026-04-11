import { useEffect, Suspense, lazy, useRef } from 'react';
import HeroSection from './components/HeroSection';
import Navbar from './components/Navbar';
import SkillsSection from './components/SkillsSection';
import ProjectsSection from './components/ProjectsSection';
import ExperienceSection from './components/ExperienceSection';
import EducationSection from './components/EducationSection';
import Footer from './components/Footer';
import ChatbotSkeleton from './components/ChatbotSkeleton';
import ErrorBoundary from './components/ErrorBoundary';
import { portfolioData } from './data/portfolioData';
import { navLinks } from './data/navigation';
import { useScrollSpy } from './hooks/useScrollSpy';
import { smoothScrollTo } from './utils/scroll';
import './App.css';

// Lazy load the ChatbotButton component to reduce initial bundle size
// Code splitting: ChatbotButton and its dependency (ChatWidget) are loaded on demand
const ChatbotButton = lazy(() => import('./components/ChatbotButton'));

function App() {
  const sectionIds = navLinks.map(link => link.id);
  const activeSection = useScrollSpy(sectionIds);
  const chatbotPreloadRef = useRef(null);
  const isPreloadedRef = useRef(false);

  const handleNavClick = (sectionId) => {
    smoothScrollTo(sectionId);
  };

  /**
   * Preload the ChatbotButton component when user hovers near the bottom-right corner
   * This improves perceived performance by loading the component before the user clicks
   */
  const preloadChatbotComponent = () => {
    if (!isPreloadedRef.current) {
      isPreloadedRef.current = true;
      // Dynamically import the component to trigger code splitting and preload
      import('./components/ChatbotButton').catch(err => {
        console.warn('Failed to preload ChatbotButton:', err);
      });
    }
  };

  const handleChatbotHover = () => {
    preloadChatbotComponent();
  };

  const handleChatbotFocus = () => {
    preloadChatbotComponent();
  };

  useEffect(() => {
    // Console message for loaded portfolio
    console.log('%c Portfolio Loaded Successfully! ', 'background: #3498db; color: white; font-size: 16px; padding: 5px 10px; border-radius: 3px;');

    // Add event listeners for preloading on interaction
    // Preload when user moves towards bottom-right corner (where chatbot button is)
    const handleMouseMove = (e) => {
      const chatbotArea = {
        x: window.innerWidth - 150,
        y: window.innerHeight - 150,
        width: 150,
        height: 150
      };

      if (
        e.clientX >= chatbotArea.x &&
        e.clientY >= chatbotArea.y
      ) {
        preloadChatbotComponent();
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <Navbar 
        links={navLinks} 
        activeSection={activeSection} 
        onNavClick={handleNavClick}
      />
      <HeroSection 
        personalInfo={portfolioData.personalInfo}
        onNavClick={handleNavClick}
      />
      <main id="main-content" className="main" tabIndex={-1}>
        <div className="container">
          <SkillsSection skills={portfolioData.skills} />
          <ExperienceSection experience={portfolioData.experience} />
          <ProjectsSection projects={portfolioData.projects} />
          <EducationSection education={portfolioData.education} />
        </div>
      </main>
      <Footer />
      
      {/* 
        Lazy load the ChatbotButton component with error boundary and suspense
        - ErrorBoundary: Catches errors in lazy-loaded component and displays fallback UI
        - Suspense: Shows loading skeleton while component is being loaded
        - Fallback: ChatbotSkeleton displays a shimmer animation during load
        - Preload handlers: Triggers component load on hover/focus for instant interaction
      */}
      <div 
        ref={chatbotPreloadRef}
        onMouseEnter={handleChatbotHover}
        onFocus={handleChatbotFocus}
      >
        <ErrorBoundary>
          <Suspense fallback={<ChatbotSkeleton />}>
            <ChatbotButton />
          </Suspense>
        </ErrorBoundary>
      </div>
    </>
  );
}

export default App;
