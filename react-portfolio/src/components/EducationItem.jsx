const EducationItem = ({ education }) => {
  const { degree, institution, duration, gpa } = education;

  return (
    <div className="education-item">
      <div className="education-header">
        <h3 className="degree">{degree}</h3>
        <span className="education-duration">{duration}</span>
      </div>
      <p className="institution">{institution}</p>
      <p className="gpa">{gpa}</p>
    </div>
  );
};

export default EducationItem;
