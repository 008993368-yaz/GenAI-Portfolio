import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { applyMagneticEffect } from '../../utils/gsapAnimations';
import { useMediaQuery } from '../../hooks/useMediaQuery';

const Navbar = ({ links, activeSection, onNavigate }) => {
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
    </header>
  );
};

export default Navbar;
