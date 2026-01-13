import { useState } from 'react';
import Accordion from './Accordion';

const ExperienceItem = ({ experience }) => {
  const { title, company, duration, capabilities } = experience;
  const [openAccordionIndex, setOpenAccordionIndex] = useState(0);

  const handleAccordionToggle = (index) => {
    setOpenAccordionIndex(openAccordionIndex === index ? null : index);
  };

  return (
    <div className="experience-item">
      <div className="experience-header">
        <h3 className="job-title">{title}</h3>
        <span className="job-duration">{duration}</span>
      </div>
      <p className="company">{company}</p>
      <div className="capabilities-container">
        {capabilities.map((capability, index) => (
          <Accordion
            key={index}
            title={capability.title}
            items={capability.achievements}
            isOpen={openAccordionIndex === index}
            onToggle={() => handleAccordionToggle(index)}
          />
        ))}
      </div>
    </div>
  );
};

export default ExperienceItem;
