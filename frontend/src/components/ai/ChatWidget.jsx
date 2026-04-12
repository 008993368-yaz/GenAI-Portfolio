import { useEffect, useMemo, useState } from 'react';
import { chatWithPortfolio, getSuggestions } from '../../services/chatApi';
import './chatWidget.css';

const SESSION_STORAGE_KEY = 'portfolio_chat_session_id';

const DEFAULT_SUGGESTIONS = [
  'Tell me about your work experience',
  'What are your core technical skills?'
];

function generateSessionId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function getOrCreateSessionId() {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const created = generateSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [hasUserMessaged, setHasUserMessaged] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hi! I can answer questions about Yazhini\'s experience, projects, and skills.',
    },
  ]);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const canSend = useMemo(() => {
    return inputValue.trim().length > 0 && !isSending && !!sessionId;
  }, [inputValue, isSending, sessionId]);

  const loadSuggestions = async (lastUserMessage = null) => {
    setIsLoadingSuggestions(true);

    try {
      const data = await getSuggestions({ lastUserMessage });
      setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (hasUserMessaged && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [isOpen, hasUserMessaged]);

  const sendMessage = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || !sessionId) {
      return;
    }

    setErrorMessage('');
    setIsSending(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setHasUserMessaged(true);

    try {
      const data = await chatWithPortfolio({
        sessionId,
        message: trimmed,
      });

      const assistantMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.reply || 'I could not generate a response right now.',
      };

      setMessages((prev) => [...prev, assistantMessage]);
      loadSuggestions(trimmed);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to reach the assistant right now.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSend) {
      return;
    }

    await sendMessage(inputValue);
  };

  const handleSuggestionClick = async (suggestion) => {
    if (!suggestion || isSending) {
      return;
    }

    await sendMessage(suggestion);
  };

  return (
    <div className="chat-widget" aria-live="polite">
      {isOpen && (
        <section
          id="portfolio-assistant-panel"
          className="chat-widget__panel"
          aria-label="Portfolio assistant chat panel"
        >
          <header className="chat-widget__header">
            <div>
              <h2>Portfolio Assistant</h2>
              <p>Ask about projects, skills, and experience</p>
            </div>
            <button
              type="button"
              className="chat-widget__ghost-button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              Close
            </button>
          </header>

          <div className="chat-widget__messages">
            {messages.map((message) => (
              <article
                key={message.id}
                className={`chat-widget__message chat-widget__message--${message.role}`}
              >
                {message.text}
              </article>
            ))}

            {isSending && <p className="chat-widget__status">Thinking...</p>}
            {errorMessage && <p className="chat-widget__error">{errorMessage}</p>}
          </div>

          <div className="chat-widget__suggestions">
            {isLoadingSuggestions && <p className="chat-widget__status">Loading suggestions...</p>}
            {!isLoadingSuggestions && suggestions.slice(0, 3).map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="chat-widget__chip"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <form className="chat-widget__composer" onSubmit={handleSubmit}>
            <label htmlFor="portfolio-chat-input" className="sr-only">
              Message portfolio assistant
            </label>
            <input
              id="portfolio-chat-input"
              type="text"
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              placeholder="Ask something about Yazhini..."
              autoComplete="off"
            />
            <button type="submit" disabled={!canSend}>
              Send
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        className="chat-widget__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="portfolio-assistant-panel"
      >
        {isOpen ? 'Hide Assistant' : 'Ask AI Assistant'}
      </button>
    </div>
  );
}

export default ChatWidget;
