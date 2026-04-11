import ProjectCard from './ProjectCard';
import RevealSection from './RevealSection';

const ProjectsSection = ({ projects }) => {
  return (
    <RevealSection
      id="projects"
      title="Projects"
      className="rounded-3xl bg-white/78 p-6 shadow-glow backdrop-blur-md sm:p-8"
    >
      <div className="grid gap-6 md:gap-8">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </RevealSection>
  );
};

export default ProjectsSection;
