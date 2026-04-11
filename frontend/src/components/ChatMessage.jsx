import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/**
 * ChatMessage Component
 * Displays a single chat message (user or assistant)
 * 
 * Memoized to prevent unnecessary re-renders when other messages are updated
 * Only re-renders if the message content or role changes
 */
const ChatMessage = memo(({ 
  role, 
  content, 
  isLoading = false,
  onRetry,
  retryMessage,
  animationOrder = 0,
}) => {
  const isUser = role === 'user';
  const isRetry = retryMessage && !isLoading;
  const reduceMotion = useReducedMotion();

  const animationDelay = reduceMotion ? 0 : Math.min(animationOrder * 0.03, 0.2);
  const baseTransition = {
    duration: reduceMotion ? 0 : 0.3,
    delay: animationDelay,
    ease: [0.22, 1, 0.36, 1],
  };
  const bubbleInitial = reduceMotion
    ? false
    : {
        opacity: 0,
        y: 10,
        x: isUser ? 10 : -10,
        scale: 0.98,
      };
  const bubbleAnimate = { opacity: 1, y: 0, x: 0, scale: 1 };

  if (isLoading) {
    return (
      <motion.div className="chat-message chat-message-assistant" initial={bubbleInitial} animate={bubbleAnimate} transition={baseTransition}>
        <div className="chat-message-bubble chat-typing">
          Typing...
        </div>
      </motion.div>
    );
  }

  if (isRetry) {
    return (
      <motion.div className="chat-message chat-message-assistant" initial={bubbleInitial} animate={bubbleAnimate} transition={baseTransition}>
        <div className="chat-message-bubble chat-retry-box">
          <p className="chat-retry-text">Request timed out.</p>
          <button
            type="button"
            className="chat-retry-button"
            onClick={onRetry}
            aria-label="Retry last message"
          >
            Retry last message
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}
      initial={bubbleInitial}
      animate={bubbleAnimate}
      transition={baseTransition}
    >
      <div className="chat-message-bubble">
        {content}
      </div>
    </motion.div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.role === nextProps.role &&
    prevProps.content === nextProps.content &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.retryMessage === nextProps.retryMessage &&
    prevProps.animationOrder === nextProps.animationOrder
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
