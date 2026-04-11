import { motion } from 'framer-motion';

const EducationSection = ({ education }) => (
  <section id="education" className="section education-section">
    <header className="section-header">
      <p className="section-kicker">Foundation</p>
      <h2>Education</h2>
    </header>

    <div className="education-grid">
      {education.map((item, index) => (
        <motion.article
          key={item.id}
          className="education-card"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45, delay: index * 0.08 }}
        >
          <h3>{item.degree}</h3>
          <p>{item.institution}</p>
          <small>{item.duration}</small>
          <strong>{item.gpa}</strong>
        </motion.article>
      ))}
    </div>
  </section>
);

export default EducationSection;
