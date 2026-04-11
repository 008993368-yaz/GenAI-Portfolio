import { motion } from 'framer-motion';

const ProjectCard = ({ project, onOpen }) => {
  const onMouseMove = (event) => {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    // Convert pointer position into subtle rotateX/rotateY for pseudo-3D tilt.
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * -12;

    card.style.setProperty('--rotate-x', `${y}deg`);
    card.style.setProperty('--rotate-y', `${x}deg`);
  };

  const onMouseLeave = (event) => {
    const card = event.currentTarget;
    card.style.setProperty('--rotate-x', '0deg');
    card.style.setProperty('--rotate-y', '0deg');
  };

  return (
    <motion.article
      className="project-card cursor-hover"
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      <button type="button" className="project-card__button" onClick={() => onOpen(project)}>
        <div className="project-card__media" style={{ background: project.gradient }}>
          <span>{project.icon}</span>
        </div>

        <div className="project-card__body">
          <h3>{project.title}</h3>
          <p>{project.description}</p>
          <div className="project-card__meta">{project.tech}</div>
        </div>
      </button>
    </motion.article>
  );
};

export default ProjectCard;
