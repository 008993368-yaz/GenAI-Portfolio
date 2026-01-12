import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import ProjectCard from './ProjectCard';

const ProjectsSection = ({ projects }) => {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="projects" className="section" ref={ref} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease'
    }}>
      <h2 className="section-title">Projects</h2>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </section>
  );
};

export default ProjectsSection;
