import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const containerVariants = {
  hidden: { opacity: 0, clipPath: 'inset(0 0 100% 0)' },
  visible: {
    opacity: 1,
    clipPath: 'inset(0 0 0% 0)',
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1], when: 'beforeChildren', staggerChildren: 0.08 },
  },
  exit: {
    opacity: 0,
    clipPath: 'inset(0 0 100% 0)',
    transition: { duration: 0.45, ease: [0.55, 0.08, 0.68, 0.53] },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const MenuOverlay = ({ isOpen, links, activeSection, onNavigate, onClose }) => {
  const overlayRef = useRef(null);

  useEffect(() => {
    if (!isOpen || !overlayRef.current) {
      return undefined;
    }

    const node = overlayRef.current;
    const focusables = Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    first?.focus();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || focusables.length === 0) {
        return;
      }

      const active = document.activeElement;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    node.addEventListener('keydown', onKeyDown);
    return () => node.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.aside
          ref={overlayRef}
          className="menu-overlay"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={containerVariants}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <button className="menu-close magnetic" type="button" onClick={onClose} aria-label="Close menu">
            Close
          </button>

          <nav aria-label="Overlay navigation">
            <ul className="menu-overlay__list">
              {links.map((link) => (
                <motion.li key={link.id} variants={itemVariants}>
                  <button
                    type="button"
                    className={`menu-overlay__link magnetic ${activeSection === link.id ? 'is-active' : ''}`}
                    onClick={() => {
                      onNavigate(link.id);
                      onClose();
                    }}
                  >
                    {link.label}
                  </button>
                </motion.li>
              ))}
            </ul>
          </nav>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default MenuOverlay;
