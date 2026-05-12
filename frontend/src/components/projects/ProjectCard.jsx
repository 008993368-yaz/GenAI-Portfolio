import { motion } from 'framer-motion';

const ProjectCard = ({ project, onOpen }) => {
  return (
    <motion.article
      className="project-card cursor-hover"
      whileHover={{ scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
    >
      <button type="button" className="project-card__button" onClick={() => onOpen(project)}>
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
