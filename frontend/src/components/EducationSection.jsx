import EducationItem from './EducationItem';
import RevealSection from './RevealSection';

const EducationSection = ({ education }) => {
  return (
    <RevealSection
      id="education"
      title="Education"
      className="rounded-3xl bg-white/78 p-6 shadow-glow backdrop-blur-md sm:p-8"
    >
      {education.map((edu) => (
        <EducationItem key={edu.id} education={edu} />
      ))}
    </RevealSection>
  );
};

export default EducationSection;
