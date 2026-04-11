import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { applyMagneticEffect } from '../../utils/gsapAnimations';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import MenuOverlay from './MenuOverlay';

const Navbar = ({ links, activeSection, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');

  useEffect(() => {
    const cleanup = applyMagneticEffect('.magnetic', reducedMotion);
    return cleanup;
  }, [reducedMotion]);

  return (
    <header className="nav nav-root">
      <div className="nav-brand">YE</div>

      <nav className="nav-links" aria-label="Primary navigation">
        {links.map((link) => (
          <button
            type="button"
            key={link.id}
            className={`nav-link magnetic ${activeSection === link.id ? 'is-active' : ''}`}
            onClick={() => onNavigate(link.id)}
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

      <button className="menu-trigger magnetic" type="button" onClick={() => setOpen(true)} aria-label="Open menu">
        Menu
      </button>

      <MenuOverlay
        isOpen={open}
        links={links}
        activeSection={activeSection}
        onNavigate={onNavigate}
        onClose={() => setOpen(false)}
      />
    </header>
  );
};

export default Navbar;
