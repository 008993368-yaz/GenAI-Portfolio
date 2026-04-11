import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { sendMessage } from '../services/chatApi';
import ChatMessage from './ChatMessage';
import SuggestedQuestions from './SuggestedQuestions';

/**
 * ChatWidget Component
 * Main chat interface with optimized rendering using memoization
 * 
 * Performance optimizations:
 * - useCallback: Memoized event handlers to prevent child re-renders
 * - useMemo: Memoized message elements to avoid recreating on every render
 * - ChatMessage: Memoized child component prevents unnecessary re-renders
 */
const ChatWidget = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "Hi, I'm Yazhini 👋 Ask me about my projects, skills, or experience.",
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState(null);
  const [refreshSuggestions, setRefreshSuggestions] = useState(0);
  const [retryMessage, setRetryMessage] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Memoized callback for sending messages
   * Prevents unnecessary re-creation on every render
   * Dependencies ensure it updates when needed
   */
  const handleSendMessage = useCallback(async (messageText = null) => {
    // Allow passing message text directly (for suggestion clicks)
    const userMessage = (messageText || inputValue).trim();
    
    if (!userMessage || isLoading) return;

    // Clear input only if it came from the input field
    if (!messageText) {
      setInputValue('');
    }

    // Add user message to chat
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setLastUserMessage(userMessage);
    setRetryMessage(null);
    setIsLoading(true);

    try {
      // Call API
      const reply = await sendMessage(userMessage);
      
      // Add assistant reply
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      setRetryMessage(null);
      
      // Refresh suggestions after assistant responds
      setRefreshSuggestions((prev) => prev + 1);
    } catch (error) {
      const isTimeout = error?.code === 'TIMEOUT';
      const fallbackMessage = isTimeout
        ? 'The request timed out after 30 seconds. You can retry your last message.'
        : "Sorry - I'm having trouble connecting right now. Please try again.";

      if (isTimeout) {
        setRetryMessage(userMessage);
      }

      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: error?.message || fallbackMessage,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading]);

  /**
   * Memoized callback for retrying the last message
   * Prevents SuggestedQuestions from unnecessary re-renders
   */
  const handleRetryLastMessage = useCallback(() => {
    if (!retryMessage || isLoading) return;
    handleSendMessage(retryMessage);
  }, [retryMessage, isLoading, handleSendMessage]);

  /**
   * Memoized callback for form submission
   * Prevents inline function creation
   */
  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    handleSendMessage();
  }, [handleSendMessage]);

  /**
   * Memoized callback for suggestion clicks
   * Passed to SuggestedQuestions (memoized child) - prevents re-renders
   */
  const handleSuggestionClick = useCallback((suggestion) => {
    handleSendMessage(suggestion);
  }, [handleSendMessage]);

  /**
   * Memoized callback for input changes
   * Prevents SuggestedQuestions from re-rendering on input change
   */
  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  /**
   * Memoized callback for close action
   */
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  /**
   * Memoized message list rendering
   * Avoids recreating message elements on every render
   * Optimization for chats with many messages
   */
  const messageElements = useMemo(() => {
    return messages.map((msg, index) => ({
      key: index,
      role: msg.role,
      content: msg.content,
      isLoading: false,
      onRetry: handleRetryLastMessage,
      retryMessage: null,
    }));
  }, [messages, handleRetryLastMessage]);

  if (!isOpen) return null;

  return (
    <div className="chat-widget">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">
          <span className="chat-header-icon">💬</span>
          <span className="chat-header-text">Yazhini AI</span>
        </div>
        <button 
          className="chat-close-button" 
          onClick={handleClose}
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {/* Render memoized ChatMessage components */}
        {messageElements.map((msgProps) => (
          <ChatMessage key={msgProps.key} {...msgProps} />
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <ChatMessage 
            role="assistant" 
            content="Typing..." 
            isLoading={true}
          />
        )}

        {/* Retry message (timeout state) */}
        {retryMessage && !isLoading && (
          <ChatMessage
            role="assistant"
            retryMessage={retryMessage}
            isLoading={false}
            onRetry={handleRetryLastMessage}
          />
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form className="chat-input-form" onSubmit={handleFormSubmit}>
        {/* Suggested Questions - Memoized component receives stable callback */}
        <SuggestedQuestions
          lastUserMessage={lastUserMessage}
          onSuggestionClick={handleSuggestionClick}
          isVisible={!isLoading}
          refreshTrigger={refreshSuggestions}
        />
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="chat-input"
            placeholder="Ask me anything..."
            value={inputValue}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={isLoading || !inputValue.trim()}
            aria-label="Send message"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              width="20"
              height="20"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWidget;
