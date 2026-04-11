import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const ProjectModal = ({ project, onClose }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!project || !modalRef.current) {
      return undefined;
    }

    const node = modalRef.current;
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
  }, [project, onClose]);

  return (
    <AnimatePresence>
      {project && (
        <motion.div
          className="project-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.article
            ref={modalRef}
            className="project-modal"
            initial={{ opacity: 0, scale: 0.94, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.35 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="project-modal__close magnetic" onClick={onClose} aria-label="Close project details">
              Close
            </button>
            <h3 id="project-modal-title">{project.title}</h3>
            <p className="project-modal__tech">{project.tech}</p>
            <p>{project.description}</p>
            <ul>
              {project.highlights?.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
            {project.githubUrl ? (
              <a href={project.githubUrl} target="_blank" rel="noreferrer" className="project-modal__link magnetic">
                View Repository
              </a>
            ) : null}
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ProjectModal;
