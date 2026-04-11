import { memo } from 'react';

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
  retryMessage 
}) => {
  const isUser = role === 'user';
  const isRetry = retryMessage && !isLoading;

  if (isLoading) {
    return (
      <div className="chat-message chat-message-assistant">
        <div className="chat-message-bubble chat-typing">
          Typing...
        </div>
      </div>
    );
  }

  if (isRetry) {
    return (
      <div className="chat-message chat-message-assistant">
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
      </div>
    );
  }

  return (
    <div className={`chat-message ${isUser ? 'chat-message-user' : 'chat-message-assistant'}`}>
      <div className="chat-message-bubble">
        {content}
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for memo optimization
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.role === nextProps.role &&
    prevProps.content === nextProps.content &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.retryMessage === nextProps.retryMessage
  );
});

ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
