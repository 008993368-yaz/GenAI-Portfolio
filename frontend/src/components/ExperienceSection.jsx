import { useState } from 'react';
import { motion, useTransform } from 'framer-motion';
import { useScrollProgress } from '../hooks/useScrollProgress';

const ExperienceSection = ({ experience }) => {
  const [expandedCard, setExpandedCard] = useState(null);
  const { ref, progress } = useScrollProgress();
  const scaleY = useTransform(progress, [0, 1], [0, 1]);

  return (
    <section id="experience" className="section experience-section" ref={ref}>
      <header className="section-header">
        <p className="section-kicker">Journey</p>
        <h2>Experience Timeline</h2>
      </header>

      <div className="timeline-wrap">
        <motion.div className="timeline-progress" style={{ scaleY }} />

        {experience.map((role, index) => {
          const isExpanded = expandedCard === role.id;

          return (
            <motion.article
              key={role.id}
              className={`timeline-card ${index % 2 === 0 ? 'left' : 'right'}`}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
            >
              <div className="timeline-card__top">
                <h3>{role.title}</h3>
                <p>{role.company}</p>
                <small>{role.duration}</small>
              </div>

              <button
                className="timeline-card__toggle magnetic"
                type="button"
                onClick={() => setExpandedCard(isExpanded ? null : role.id)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>

              <motion.div
                className="timeline-card__body"
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.35 }}
              >
                {role.capabilities?.map((capability) => (
                  <div key={capability.title} className="timeline-capability">
                    <h4>{capability.title}</h4>
                    <div className="timeline-pills">
                      {capability.achievements?.map((item) => (
                        <span className="timeline-pill" key={item.slice(0, 24)}>
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
};

export default ExperienceSection;
