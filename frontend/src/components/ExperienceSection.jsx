import { useState } from 'react';
import { motion } from 'framer-motion';

const ExperienceSection = ({ experience }) => {
  const [expandedCard, setExpandedCard] = useState(null);

  return (
    <section id="experience" className="section experience-section">
      <header className="section-header">
        <p className="section-kicker">Experience</p>
      </header>

      <div className="experience-grid">
        {experience.map((role) => {
          const isExpanded = expandedCard === role.id;

          return (
            <motion.article
              key={role.id}
              className="experience-card"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45 }}
            >
              <div className="experience-card__header">
                <h3>{role.title}</h3>
                <p>{role.company}</p>
                <small>{role.duration}</small>
              </div>

              <button
                className="experience-card__toggle magnetic"
                type="button"
                onClick={() => setExpandedCard(isExpanded ? null : role.id)}
                aria-expanded={isExpanded}
              >
                {isExpanded ? 'Hide details' : 'Show details'}
              </button>

              <motion.div
                className="experience-card__body"
                initial={false}
                animate={{ height: isExpanded ? 'auto' : 0, opacity: isExpanded ? 1 : 0 }}
                transition={{ duration: 0.32 }}
              >
                {role.capabilities?.map((capability) => (
                  <div key={capability.title} className="experience-card__capability">
                    <h4>{capability.title}</h4>
                    <ul className="experience-list">
                      {capability.achievements?.map((item) => (
                        <li key={item.slice(0, 24)}>{item}</li>
                      ))}
                    </ul>
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
