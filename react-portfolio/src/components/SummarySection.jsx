import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

const SummarySection = ({ summary }) => {
  const { ref, isVisible } = useIntersectionObserver();

  return (
    <section id="home" className="section" ref={ref} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease'
    }}>
      <h2 className="section-title">Summary</h2>
      <p className="summary-text">{summary}</p>
    </section>
  );
};

export default SummarySection;
