import ExperienceItem from './ExperienceItem';
import RevealSection from './RevealSection';

const ExperienceSection = ({ experience }) => {
  return (
    <RevealSection
      id="experience"
      title="Work Experience"
      className="rounded-3xl bg-white/78 p-6 shadow-glow backdrop-blur-md sm:p-8"
    >
      {experience.map((exp) => (
        <ExperienceItem key={exp.id} experience={exp} />
      ))}
    </RevealSection>
  );
};

export default ExperienceSection;
