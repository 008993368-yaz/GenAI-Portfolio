import { useRef, useEffect, useId } from 'react';

const Accordion = ({ title, items, isOpen, onToggle }) => {
  const contentRef = useRef(null);
  const contentWrapperRef = useRef(null);
  const accordionId = useId();
  const buttonId = `${accordionId}-button`;
  const panelId = `${accordionId}-panel`;

  useEffect(() => {
    if (contentRef.current) {
      if (isOpen) {
        const height = contentRef.current.scrollHeight;
        contentWrapperRef.current.style.height = `${height}px`;
      } else {
        contentWrapperRef.current.style.height = '0px';
      }
    }
  }, [isOpen]);

  return (
    <div className={`accordion-item ${isOpen ? 'is-open' : ''}`}>
      <button 
        className={`accordion-header ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={panelId}
        id={buttonId}
      >
        <span className="accordion-title">{title}</span>
        <span className={`accordion-icon ${isOpen ? 'open' : ''}`}>
          ▼
        </span>
      </button>
      <div 
        ref={contentWrapperRef}
        className="accordion-content-wrapper"
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
      >
        <div 
          ref={contentRef}
          className={`accordion-content ${isOpen ? 'open' : ''}`}
        >
          <ul className="accordion-list">
            {items.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Accordion;
