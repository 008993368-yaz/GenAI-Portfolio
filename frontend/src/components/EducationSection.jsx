import EducationItem from './EducationItem';
import RevealSection from './RevealSection';

const EducationSection = ({ education }) => {
  return (
    <RevealSection id="education" title="Education">
      {education.map((edu) => (
        <EducationItem key={edu.id} education={edu} />
      ))}
    </RevealSection>
  );
};

export default EducationSection;
