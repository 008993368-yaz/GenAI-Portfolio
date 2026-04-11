import ProjectCard from './ProjectCard';
import RevealSection from './RevealSection';

const ProjectsSection = ({ projects }) => {
  return (
    <RevealSection id="projects" title="Projects">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </RevealSection>
  );
};

export default ProjectsSection;
