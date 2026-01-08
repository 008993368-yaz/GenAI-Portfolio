import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import SkillCategory from './SkillCategory';

const SkillsSection = ({ skills }) => {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="skills" className="section" ref={ref} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease'
    }}>
      <h2 className="section-title">Skills</h2>
      <div className="skills-grid">
        {skills.map((skill) => (
          <SkillCategory
            key={skill.id}
            title={skill.title}
            content={skill.content}
          />
        ))}
      </div>
    </section>
  );
};

export default SkillsSection;
