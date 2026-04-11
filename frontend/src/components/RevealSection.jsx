import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

const RevealSection = ({ id, title, className = '', children }) => {
  const { ref, isVisible } = useIntersectionObserver();
  const sectionClassName = `section ${isVisible ? 'visible' : 'fade-in'} ${className}`.trim();

  return (
    <section id={id} className={sectionClassName} ref={ref}>
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
};

export default RevealSection;
