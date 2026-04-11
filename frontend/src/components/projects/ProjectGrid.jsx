import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ProjectCard from './ProjectCard';
import { runStaggerIn } from '../../utils/gsapAnimations';

const ProjectModal = lazy(() => import('./ProjectModal'));

const normalizeFilter = (tech) => tech?.split(',')[0]?.trim() || 'Other';

const ProjectGrid = ({ projects }) => {
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeProject, setActiveProject] = useState(null);
  const scopeRef = useRef(null);

  const filters = useMemo(() => ['All', ...new Set(projects.map((project) => normalizeFilter(project.tech)))], [projects]);

  const filteredProjects = useMemo(() => {
    if (activeFilter === 'All') {
      return projects;
    }
    return projects.filter((project) => normalizeFilter(project.tech) === activeFilter);
  }, [activeFilter, projects]);

  useEffect(() => runStaggerIn(scopeRef, '.project-card'), [filteredProjects]);

  return (
    <section id="projects" className="section projects-section" ref={scopeRef}>
      <header className="section-header">
        <p className="section-kicker">Build</p>
        <h2>Selected Projects</h2>
      </header>

      <div className="filter-pills" role="tablist" aria-label="Project filters">
        {filters.map((filter) => (
          <motion.button
            key={filter}
            type="button"
            className={`filter-pill magnetic ${activeFilter === filter ? 'is-active' : ''}`}
            onClick={() => setActiveFilter(filter)}
            whileTap={{ scale: 0.96 }}
          >
            {filter}
          </motion.button>
        ))}
      </div>

      <div className="project-grid">
        {filteredProjects.map((project) => (
          <ProjectCard key={project.id} project={project} onOpen={setActiveProject} />
        ))}
      </div>

      <Suspense fallback={null}>
        <ProjectModal project={activeProject} onClose={() => setActiveProject(null)} />
      </Suspense>
    </section>
  );
};

export default ProjectGrid;
