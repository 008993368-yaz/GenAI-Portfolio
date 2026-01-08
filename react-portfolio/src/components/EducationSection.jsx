import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import EducationItem from './EducationItem';

const EducationSection = ({ education }) => {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="education" className="section" ref={ref} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease'
    }}>
      <h2 className="section-title">Education</h2>
      {education.map((edu) => (
        <EducationItem key={edu.id} education={edu} />
      ))}
    </section>
  );
};

export default EducationSection;
