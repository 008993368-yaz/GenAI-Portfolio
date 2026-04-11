import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';

const makeSkillItems = (content) =>
  content.split(',').map((item, index) => {
    const label = item.trim();
    return { label, index };
  });

const EXCLUDED_TITLES = new Set(['testing', 'bi & automation']);

const SkillsSection = ({ skills }) => {
  const groups = useMemo(() => {
    return skills
      .filter((group) => !EXCLUDED_TITLES.has(group.title.trim().toLowerCase()))
      .map((group) => ({
        ...group,
        items: makeSkillItems(group.content),
      }));
  }, [skills]);

  const [activeId, setActiveId] = useState(groups[0]?.id ?? null);

  useEffect(() => {
    if (!groups.length) {
      setActiveId(null);
      return;
    }

    const activeExists = groups.some((group) => group.id === activeId);
    if (!activeExists) {
      setActiveId(groups[0].id);
    }
  }, [activeId, groups]);

  const activeGroup = groups.find((group) => group.id === activeId) ?? groups[0];

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, ease: 'easeOut' },
    },
  };

  return (
    <section id="skills" className="section skills-section">
      <header className="section-header">
        <p className="section-kicker">Skills</p>
      </header>

      <div className="skills-tabs-shell">
        <div className="skills-tabs" role="tablist" aria-label="Skill categories">
          {groups.map((group) => {
            const isActive = group.id === activeGroup?.id;
            return (
              <button
                key={group.id}
                id={`skills-tab-${group.id}`}
                type="button"
                role="tab"
                className={`skills-tab ${isActive ? 'is-active' : ''}`}
                aria-selected={isActive}
                aria-controls={`skills-panel-${group.id}`}
                onClick={() => setActiveId(group.id)}
              >
                {group.title}
              </button>
            );
          })}
        </div>

        {activeGroup && (
          <motion.section
            key={activeGroup.id}
            id={`skills-panel-${activeGroup.id}`}
            role="tabpanel"
            aria-labelledby={`skills-tab-${activeGroup.id}`}
            className="skills-tab-panel"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <motion.ul
              className="skills-pill-grid"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.04, delayChildren: 0.06 },
                },
              }}
              initial="hidden"
              animate="visible"
            >
              {activeGroup.items.map((skill) => (
                <motion.li
                  key={skill.label}
                  className="skills-pill"
                  variants={itemVariants}
                >
                  {skill.label}
                </motion.li>
              ))}
            </motion.ul>
          </motion.section>
        )}
      </div>
    </section>
  );
};

export default SkillsSection;
