import { useState } from 'react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';

const ContactSection = ({ personalInfo }) => {
  const { ref, isVisible } = useIntersectionObserver();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Show success message
    setSubmitted(true);
    // Reset form
    setFormData({
      name: '',
      email: '',
      message: ''
    });
    // Hide success message after 3 seconds
    setTimeout(() => {
      setSubmitted(false);
    }, 3000);
  };

  return (
    <section id="contact" className="section contact-section" ref={ref} style={{
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
      transition: 'opacity 0.6s ease, transform 0.6s ease'
    }}>
      <h2 className="section-title">Contact</h2>
      
      <div className="contact-container">
        {/* Contact Info */}
        <div className="contact-info-box">
          <h3 className="contact-subtitle">Get in Touch</h3>
          <div className="contact-details">
            <div className="contact-detail-item">
              <span className="contact-icon">📍</span>
              <div>
                <strong>Location</strong>
                <p>Redlands, CA</p>
              </div>
            </div>
            <div className="contact-detail-item">
              <span className="contact-icon">📞</span>
              <div>
                <strong>Phone</strong>
                <p>+1 909-871-6890</p>
              </div>
            </div>
            <div className="contact-detail-item">
              <span className="contact-icon">📧</span>
              <div>
                <strong>Email</strong>
                <p>yazhini.elanchezhian3368@coyote.csusb.edu</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="contact-form-box">
          <h3 className="contact-subtitle">Send a Message</h3>
          {submitted && (
            <div className="form-success">
              ✓ Message sent successfully!
            </div>
          )}
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Your name"
                aria-label="Your name"
              />
            </div>
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
                aria-label="Your email address"
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows="5"
                placeholder="Your message..."
                aria-label="Your message"
              ></textarea>
            </div>
            <button type="submit" className="form-submit-btn">
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
