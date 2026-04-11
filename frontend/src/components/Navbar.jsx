import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';

const Navbar = ({ links, activeSection, onNavClick }) => {
  const reduceMotion = useReducedMotion();

  const handleClick = (e, id) => {
    e.preventDefault();
    onNavClick(id);
  };

  const handleKeyDown = (e, index) => {
    const key = e.key;
    const navLinks = document.querySelectorAll('.nav-pill .nav-link');
    if (!navLinks.length) return;

    if (key === 'ArrowRight' || key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % navLinks.length;
      navLinks[nextIndex].focus();
    }

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + navLinks.length) % navLinks.length;
      navLinks[prevIndex].focus();
    }

    if (key === 'Home') {
      e.preventDefault();
      navLinks[0].focus();
    }

    if (key === 'End') {
      e.preventDefault();
      navLinks[navLinks.length - 1].focus();
    }
  };

  return (
    <nav className="floating-nav" aria-label="Primary navigation">
      <LayoutGroup>
        <div className="nav-pill relative" role="menubar">
          {links.map((link, index) => {
            const isActive = activeSection === link.id;

            return (
              <a
                key={link.id}
                href={`#${link.id}`}
                className={`nav-link relative z-10 ${isActive ? 'active !bg-transparent !shadow-none text-white' : 'text-slate-700'}`}
                onClick={(e) => handleClick(e, link.id)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
              >
                {isActive && (
                  <motion.span
                    layoutId="nav-active-pill"
                    className="absolute inset-0 -z-10 rounded-full bg-sky-500/95 shadow-glow"
                    transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 450, damping: 34 }}
                    aria-hidden="true"
                  />
                )}
                {link.label}
              </a>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
};

export default Navbar;
