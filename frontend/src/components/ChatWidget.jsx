import { useState, useRef, useEffect } from 'react';
import { sendMessage } from '../services/chatApi';
import SuggestedQuestions from './SuggestedQuestions';

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
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (messageText = null) => {
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
    setIsLoading(true);

    try {
      // Call API
      const reply = await sendMessage(userMessage);
      
      // Add assistant reply
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }]);
      
      // Refresh suggestions after assistant responds
      setRefreshSuggestions((prev) => prev + 1);
    } catch (error) {
      // Add error message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: "Sorry — I'm having trouble connecting right now. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
  };

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
          onClick={onClose}
          aria-label="Close chat"
        >
          ✕
        </button>
      </div>

      {/* Messages Area */}
      <div className="chat-messages">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : 'chat-message-assistant'}`}
          >
            <div className="chat-message-bubble">
              {msg.content}
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="chat-message chat-message-assistant">
            <div className="chat-message-bubble chat-typing">
              Typing...
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form className="chat-input-form" onSubmit={handleFormSubmit}>
        {/* Suggested Questions */}
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
            onChange={(e) => setInputValue(e.target.value)}
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
