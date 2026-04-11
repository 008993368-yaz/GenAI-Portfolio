import { useMemo, useRef, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { runSkillBars } from '../utils/gsapAnimations';

const makeSkillItems = (content) =>
  content.split(',').map((item) => {
    const label = item.trim();
    const score = 65 + (label.length % 30);
    return { label, score };
  });

const SkillsSection = ({ skills }) => {
  const [openId, setOpenId] = useState(skills[0]?.id);
  const scopeRef = useRef(null);

  const groups = useMemo(
    () =>
      skills.map((group) => ({
        ...group,
        items: makeSkillItems(group.content),
      })),
    [skills]
  );

  useEffect(() => runSkillBars(scopeRef), [groups]);

  return (
    <section id="skills" className="section skills-section" ref={scopeRef}>
      <header className="section-header">
        <p className="section-kicker">Capabilities</p>
        <h2>Skills & Toolkit</h2>
      </header>

      <div className="skills-accordion">
        {groups.map((group, index) => {
          const isOpen = openId === group.id;

          return (
            <article key={group.id} className="skill-group">
              <button
                type="button"
                className="skill-group__trigger magnetic"
                aria-expanded={isOpen}
                onClick={() => setOpenId(isOpen ? null : group.id)}
              >
                <span>{group.title}</span>
                <span>{isOpen ? '−' : '+'}</span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    className="skill-group__panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35 }}
                  >
                    <div className="skill-icon-grid">
                      {group.items.map((skill) => (
                        <motion.div
                          key={skill.label}
                          className="skill-icon"
                          initial={{ opacity: 0, y: 14 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.3, delay: index * 0.04 }}
                          title={`${skill.label}: ${skill.score}%`}
                        >
                          <span>{skill.label.slice(0, 2).toUpperCase()}</span>
                          <small>{skill.score}%</small>
                        </motion.div>
                      ))}
                    </div>

                    <div className="skill-bars">
                      {group.items.map((skill) => (
                        <div key={skill.label} className="skill-bar-row">
                          <div className="skill-bar-row__label">
                            <span>{skill.label}</span>
                            <span>{skill.score}%</span>
                          </div>
                          <div className="skill-track">
                            <div className="skill-fill" data-width={`${skill.score}%`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default SkillsSection;
