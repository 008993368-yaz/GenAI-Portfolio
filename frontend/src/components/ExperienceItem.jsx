const ExperienceItem = ({ experience }) => {
  const { title, company, duration, achievements } = experience;

  return (
    <div className="experience-item">
      <div className="experience-header">
        <h3 className="job-title">{title}</h3>
        <span className="job-duration">{duration}</span>
      </div>
      <p className="company">{company}</p>
      <ul className="achievements">
        {achievements.map((achievement, index) => (
          <li key={index}>{achievement}</li>
        ))}
      </ul>
    </div>
  );
};

export default ExperienceItem;
