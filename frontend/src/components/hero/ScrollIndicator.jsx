import { motion } from 'framer-motion';

const ScrollIndicator = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Scroll to skills section"
    className="scroll-indicator magnetic"
  >
    <span>Scroll</span>
    <motion.span
      className="scroll-indicator__arrow"
      animate={{ y: [0, 8, 0] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      ↓
    </motion.span>
  </button>
);

export default ScrollIndicator;
