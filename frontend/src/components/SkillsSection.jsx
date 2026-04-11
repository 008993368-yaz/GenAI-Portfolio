import SkillCategory from './SkillCategory';
import RevealSection from './RevealSection';

const SkillsSection = ({ skills }) => {
  return (
    <RevealSection id="skills" title="Skills">
      <div className="skills-grid">
        {skills.map((skill) => (
          <SkillCategory
            key={skill.id}
            title={skill.title}
            content={skill.content}
          />
        ))}
      </div>
    </RevealSection>
  );
};

export default SkillsSection;
