import { useState, useEffect } from 'react';

export const useScrollSpy = (sectionIds) => {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || 'home');

  useEffect(() => {
    const getCurrentSectionFromScroll = () => {
      const navHeight = document.querySelector('.nav-root')?.offsetHeight || 0;
      const activationY = navHeight + 100;
      let currentSection = sectionIds[0] || 'home';

      for (const sectionId of sectionIds) {
        const section = document.getElementById(sectionId);
        if (section) {
          const { top, bottom } = section.getBoundingClientRect();

          if (top <= activationY && bottom > activationY) {
            currentSection = sectionId;
            break;
          }

          if (top <= activationY) {
            currentSection = sectionId;
          }
        }
      }

      return currentSection;
    };

    let frameId = null;

    const updateActiveSection = () => {
      frameId = null;
      setActiveSection(getCurrentSectionFromScroll());
    };

    const handleScroll = () => {
      if (frameId === null) {
        frameId = window.requestAnimationFrame(updateActiveSection);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    updateActiveSection();

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, [sectionIds]);

  return activeSection;
};
