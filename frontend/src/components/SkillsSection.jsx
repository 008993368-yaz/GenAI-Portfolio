import SkillCategory from './SkillCategory';
import RevealSection from './RevealSection';

const SkillsSection = ({ skills }) => {
  return (
    <RevealSection
      id="skills"
      title="Skills"
      className="rounded-3xl bg-white/78 p-6 shadow-glow backdrop-blur-md sm:p-8"
    >
      <div className="skills-grid grid gap-5 md:grid-cols-2">
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
