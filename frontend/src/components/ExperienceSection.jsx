import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import ExperienceItem from './ExperienceItem';

const ExperienceSection = ({ experience }) => {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="experience" className="section" ref={ref} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease'
    }}>
      <h2 className="section-title">Work Experience</h2>
      {experience.map((exp) => (
        <ExperienceItem key={exp.id} experience={exp} />
      ))}
    </section>
  );
};

export default ExperienceSection;
