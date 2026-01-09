import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

const HeroSection = ({ personalInfo, onNavClick }) => {
  const { ref, isVisible } = useIntersectionObserver();

//   const handleProjectsClick = (e) => {
//     e.preventDefault();
//     onNavClick('projects');
//   };

//   const handleContactClick = (e) => {
//     e.preventDefault();
//     onNavClick('contact');
//   };

  return (
    <section id="home" className="hero-section" ref={ref}>
      <div className="hero-content" style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.8s ease, transform 0.8s ease'
      }}>
        {/* Avatar with initials */}
        <div className="hero-avatar">
          <div className="avatar-ring">
            <div className="avatar-circle">
              <span className="avatar-initials">{personalInfo.initials}</span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <h1 className="hero-headline">
          Hello, I'm Yazhini. <br></br>
          I’m a full stack developer and also enjoy developing AI powered applications.
        </h1>

        {/* Secondary line */}
        <p className="hero-tagline">
            I build beautiful frontends. <br></br>
            I engineer intelligent AI systems. <br></br>
            And I bring them together to create impactful products.
        </p>

        {/* Tech stack highlight */}
        <div className="hero-tech">
            <span className="tech-highlight">Angular</span>
            <span className="tech-separator">•</span>
            <span className="tech-highlight">LLMs</span>
            <span className="tech-separator">•</span>
            <span className="tech-highlight">LangGraph</span>
            <span className="tech-separator">•</span>
            <span className="tech-highlight">AWS</span>
        </div>

        {/* CTA Buttons */}
        {/* <div className="hero-cta">
          <button className="cta-button cta-primary" onClick={handleProjectsClick}>
            View Projects
          </button>
          <button className="cta-button cta-secondary" onClick={handleContactClick}>
            Contact Me
          </button>
        </div> */}
      </div>
    </section>
  );
};

export default HeroSection;
