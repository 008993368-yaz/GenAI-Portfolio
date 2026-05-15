import { useState, useEffect } from 'react';

export const useScrollSpy = (sectionIds) => {
  const [activeSection, setActiveSection] = useState(sectionIds[0] || 'home');

  useEffect(() => {
    const getCurrentSectionFromScroll = () => {
      const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
      let currentSection = sectionIds[0] || 'home';

      for (const sectionId of sectionIds) {
        const section = document.getElementById(sectionId);
        if (section) {
          const sectionTop = section.offsetTop - navHeight - 100;
          const sectionHeight = section.offsetHeight;

          if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            currentSection = sectionId;
            break;
          }
        }
      }

      return currentSection;
    };

    if ('IntersectionObserver' in window) {
      const navHeight = document.querySelector('.nav')?.offsetHeight || 0;
      const sections = sectionIds
        .map((sectionId) => document.getElementById(sectionId))
        .filter(Boolean);

      const observer = new IntersectionObserver(
        (entries) => {
          const visibleEntry = entries
            .filter((entry) => entry.isIntersecting)
            .sort((a, b) => {
              if (b.intersectionRatio !== a.intersectionRatio) {
                return b.intersectionRatio - a.intersectionRatio;
              }

              return a.boundingClientRect.top - b.boundingClientRect.top;
            })[0];

          if (visibleEntry?.target?.id) {
            setActiveSection(visibleEntry.target.id);
          }
        },
        {
          rootMargin: `-${navHeight + 100}px 0px -55% 0px`,
          threshold: [0, 0.25, 0.5, 0.75, 1],
        }
      );

      sections.forEach((section) => observer.observe(section));

      return () => observer.disconnect();
    }

    const handleScroll = () => {
      setActiveSection(getCurrentSectionFromScroll());
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Set initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, [sectionIds]);

  return activeSection;
};
