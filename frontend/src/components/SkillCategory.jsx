const SkillCategory = ({ title, content }) => {
  return (
    <div className="skill-category">
      <h3 className="skill-category-title">{title}</h3>
      <p>{content}</p>
    </div>
  );
};

export default SkillCategory;
