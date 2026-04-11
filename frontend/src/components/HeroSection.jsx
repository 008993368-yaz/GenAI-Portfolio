import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
import { motion, useReducedMotion } from 'framer-motion';

const HeroSection = ({ personalInfo, onNavClick }) => {
  const { ref, isVisible } = useIntersectionObserver();
  const reduceMotion = useReducedMotion();

  const containerVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 28 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.8,
        ease: [0.22, 1, 0.36, 1],
        staggerChildren: reduceMotion ? 0 : 0.12,
      },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, y: reduceMotion ? 0 : 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.55,
        ease: [0.22, 1, 0.36, 1],
      },
    },
  };

  return (
    <section id="home" className="hero-section relative flex items-center justify-center" ref={ref}>
      <motion.div
        className="hero-content mx-auto max-w-5xl px-4 sm:px-6 w-full flex flex-col items-center"
        variants={containerVariants}
        initial="hidden"
        animate={isVisible ? 'visible' : 'hidden'}
      >
        {/* Avatar with initials */}
        <motion.div
          className="hero-avatar mb-6 sm:mb-8"
          variants={childVariants}
          whileHover={reduceMotion ? undefined : { scale: 1.05 }}
          transition={reduceMotion ? undefined : { type: 'spring', stiffness: 400, damping: 30 }}
        >
          <div className="avatar-ring ring-4 ring-white/30">
            <div className="avatar-circle bg-gradient-to-br from-sky-300/40 to-purple-300/40">
              <span className="avatar-initials text-white drop-shadow-lg">{personalInfo.initials}</span>
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1 className="hero-headline text-balance text-center text-3xl sm:text-5xl font-bold leading-tight text-white mb-4 sm:mb-6" variants={childVariants}>
          Hello, I'm Yazhini. <br></br>
          I’m a full stack developer and also enjoy developing AI powered applications.
        </motion.h1>

        {/* Secondary line */}
        {/* <p className="hero-tagline">
            I build beautiful frontends. <br></br>
            I engineer intelligent AI systems. <br></br>
            And I bring them together to create impactful products.
        </p> */}

        {/* Tech stack highlight */}
        <motion.div className="hero-tech flex flex-wrap justify-center items-center gap-3 sm:gap-4 text-center" variants={childVariants}>
            <span className="tech-highlight inline-block px-3 py-1 rounded-full text-sm sm:text-base">Redlands, CA</span>
            <span className="tech-separator hidden sm:inline text-white/60">•</span>
            <span className="tech-highlight inline-block px-3 py-1 rounded-full text-sm sm:text-base">+1 909-871-6890</span>
            <span className="tech-separator hidden sm:inline text-white/60">•</span>
            <span className="tech-highlight inline-block px-3 py-1 rounded-full text-sm sm:text-base">yazhini.elanchezhian3368@coyote.csusb.edu</span>
        </motion.div>

        {/* CTA Buttons */}
        {/* <div className="hero-cta">
          <button className="cta-button cta-primary" onClick={handleProjectsClick}>
            View Projects
          </button>
          <button className="cta-button cta-secondary" onClick={handleContactClick}>
            Contact Me
          </button>
        </div> */}
      </motion.div>
    </section>
  );
};

export default HeroSection;
