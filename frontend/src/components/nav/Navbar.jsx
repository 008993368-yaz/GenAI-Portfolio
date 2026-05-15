import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { applyMagneticEffect } from '../../utils/gsapAnimations';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Navbar = ({ links, activeSection, onNavigate }) => {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const cleanup = applyMagneticEffect('.magnetic', reducedMotion);
    return cleanup;
  }, [reducedMotion]);

  const handleNavigate = (linkId) => {
    onNavigate(linkId);
    setIsMenuOpen(false);
  };

  return (
    <header className="nav nav-root">
      <div className="nav-brand">YE</div>

      <button
        type="button"
        className="nav-menu-toggle"
        aria-label={isMenuOpen ? 'Close section navigation' : 'Open section navigation'}
        aria-controls="primary-navigation"
        aria-expanded={isMenuOpen}
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <span />
        <span />
        <span />
      </button>

      <nav
        id="primary-navigation"
        className={`nav-links ${isMenuOpen ? 'is-open' : ''}`}
        aria-label="Primary navigation"
      >
        {links.map((link) => (
          <button
            type="button"
            key={link.id}
            className={`nav-link magnetic ${activeSection === link.id ? 'is-active' : ''}`}
            onClick={() => handleNavigate(link.id)}
          >
            {link.label}
            {activeSection === link.id && (
              <motion.span
                layoutId="active-indicator"
                className="nav-indicator"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
          </button>
        ))}
      </nav>
    </header>
  );
};

export default Navbar;
