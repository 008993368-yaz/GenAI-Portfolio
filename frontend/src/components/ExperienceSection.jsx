import ExperienceItem from './ExperienceItem';
import RevealSection from './RevealSection';

const ExperienceSection = ({ experience }) => {
  return (
    <RevealSection id="experience" title="Work Experience">
      {experience.map((exp) => (
        <ExperienceItem key={exp.id} experience={exp} />
      ))}
    </RevealSection>
  );
};

export default ExperienceSection;
