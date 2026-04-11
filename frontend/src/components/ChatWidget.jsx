import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { sendMessage } from '../services/chatApi';
import ChatMessage from './ChatMessage';
import SuggestedQuestions from './SuggestedQuestions';
import {
  CHAT_GREETING_MESSAGE,
  CHAT_OFFLINE_MESSAGE,
  HTTP_STATUS_SERVER_ERROR,
  HTTP_STATUS_UNKNOWN,
  HTTP_STATUS_TOO_MANY_REQUESTS,
  MAX_CHAT_MESSAGES,
} from '../constants';

const CHAT_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

function limitMessages(messages) {
  return messages.slice(-MAX_CHAT_MESSAGES);
}

const CHAT_STATUS_LABELS = {
  [CHAT_STATUS.IDLE]: 'Ready',
  [CHAT_STATUS.LOADING]: 'Sending...',
  [CHAT_STATUS.ERROR]: 'Error',
  [CHAT_STATUS.SUCCESS]: 'Connected',
};

const ChatWidget = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: CHAT_GREETING_MESSAGE,
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastUserMessage, setLastUserMessage] = useState(null);
  const [refreshSuggestions, setRefreshSuggestions] = useState(0);
  const [retryMessage, setRetryMessage] = useState(null);
  const [chatStatus, setChatStatus] = useState(CHAT_STATUS.IDLE);
  const [chatError, setChatError] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [announcement, setAnnouncement] = useState('');
  const messagesEndRef = useRef(null);
  const widgetRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleDialogKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }

      if (e.key !== 'Tab' || !widgetRef.current) return;

      const focusable = widgetRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleDialogKeyDown);
    return () => document.removeEventListener('keydown', handleDialogKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setChatStatus((prev) => (prev === CHAT_STATUS.ERROR ? CHAT_STATUS.IDLE : prev));
      setChatError(null);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setChatStatus(CHAT_STATUS.ERROR);
      setChatError({
        type: 'OFFLINE',
        message: CHAT_OFFLINE_MESSAGE,
        retryable: true,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const mapErrorToUi = useCallback((error) => {
    switch (error?.code) {
      case 'OFFLINE':
        return {
          type: 'OFFLINE',
          message: CHAT_OFFLINE_MESSAGE,
          retryable: true,
        };
      case 'TIMEOUT':
        return {
          type: 'TIMEOUT',
          message: 'The request timed out. Please retry your last message.',
          retryable: true,
        };
      case 'NETWORK_ERROR':
        return {
          type: 'NETWORK_ERROR',
          message: 'Cannot reach the server. Check your internet connection and try again.',
          retryable: true,
        };
      case 'HTTP_ERROR':
        if (error?.status === HTTP_STATUS_TOO_MANY_REQUESTS) {
          return {
            type: 'RATE_LIMIT',
            message: 'Too many requests right now. Please wait a moment and retry.',
            retryable: true,
          };
        }
        if ((error?.status || HTTP_STATUS_UNKNOWN) >= HTTP_STATUS_SERVER_ERROR) {
          return {
            type: 'SERVER_ERROR',
            message: 'The server is having trouble. Please try again shortly.',
            retryable: true,
          };
        }
        return {
          type: 'REQUEST_ERROR',
          message: 'This request could not be processed. Please try again.',
          retryable: true,
        };
      default:
        return {
          type: 'UNKNOWN_ERROR',
          message: 'Something unexpected happened. Please try again.',
          retryable: true,
        };
    }
  }, []);

  const handleSendMessage = useCallback(async (messageText = null) => {
    const userMessage = (messageText || inputValue).trim();

    if (!userMessage || isLoading) return;

    if (!isOnline) {
      setChatStatus(CHAT_STATUS.ERROR);
      setChatError({
        type: 'OFFLINE',
        message: CHAT_OFFLINE_MESSAGE,
        retryable: true,
      });
      setRetryMessage(userMessage);
      return;
    }

    if (!messageText) {
      setInputValue('');
    }

    setMessages((prev) => limitMessages([...prev, { role: 'user', content: userMessage }]));
    setLastUserMessage(userMessage);
    setRetryMessage(null);
    setChatError(null);
    setIsLoading(true);
    setChatStatus(CHAT_STATUS.LOADING);

    try {
      const reply = await sendMessage(userMessage);
      setMessages((prev) => limitMessages([...prev, { role: 'assistant', content: reply }]));
      setRetryMessage(null);
      setRefreshSuggestions((prev) => prev + 1);
      setChatStatus(CHAT_STATUS.SUCCESS);
      setAnnouncement('Assistant response received.');
    } catch (error) {
      const uiError = mapErrorToUi(error);
      if (uiError.retryable) {
        setRetryMessage(userMessage);
      }

      setChatError(uiError);
      setChatStatus(CHAT_STATUS.ERROR);

      setMessages((prev) => limitMessages([
        ...prev,
        {
          role: 'assistant',
          content: uiError.message,
        },
      ]));
      setAnnouncement(`Error: ${uiError.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, isOnline, mapErrorToUi]);

  const handleRetryLastMessage = useCallback(() => {
    if (!retryMessage || isLoading) return;
    handleSendMessage(retryMessage);
  }, [retryMessage, isLoading, handleSendMessage]);

  const handleRetryBanner = useCallback(() => {
    if (!retryMessage) return;
    handleSendMessage(retryMessage);
  }, [retryMessage, handleSendMessage]);

  const handleFormSubmit = useCallback((e) => {
    e.preventDefault();
    handleSendMessage();
  }, [handleSendMessage]);

  const handleSuggestionClick = useCallback((suggestion) => {
    handleSendMessage(suggestion);
  }, [handleSendMessage]);

  const handleInputChange = useCallback((e) => {
    setInputValue(e.target.value);
  }, []);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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

  const statusLabel = useMemo(() => {
    if (!isOnline) return 'Offline';
    return CHAT_STATUS_LABELS[chatStatus] || CHAT_STATUS_LABELS[CHAT_STATUS.IDLE];
  }, [chatStatus, isOnline]);

  if (!isOpen) return null;

  return (
    <div
      className="chat-widget"
      role="dialog"
      aria-modal="true"
      aria-labelledby="chat-widget-title"
      ref={widgetRef}
    >
      <div className="chat-header">
        <div className="chat-header-title">
          <span className="chat-header-text" id="chat-widget-title">Yazhini AI Assistant</span>
        </div>
        <button
          className="chat-close-button"
          onClick={handleClose}
          aria-label="Close chat"
        >
          x
        </button>
      </div>

      <div className="chat-status-bar" role="status" aria-live="polite">
        <span className={`chat-status-dot ${isOnline ? 'chat-status-online' : 'chat-status-offline'}`} />
        <span className="chat-status-text">{statusLabel}</span>
      </div>

      {chatStatus === CHAT_STATUS.ERROR && chatError && (
        <div className="chat-error-banner" role="alert">
          <p className="chat-error-text">{chatError.message}</p>
          {chatError.retryable && retryMessage && (
            <button type="button" className="chat-error-retry" onClick={handleRetryBanner}>
              Retry
            </button>
          )}
        </div>
      )}

      <div className="chat-messages" aria-live="polite" aria-relevant="additions text">
        {messageElements.map((msgProps) => (
          <ChatMessage key={msgProps.key} {...msgProps} />
        ))}

        {isLoading && (
          <ChatMessage
            role="assistant"
            content="Typing..."
            isLoading={true}
          />
        )}

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

      <form className="chat-input-form" onSubmit={handleFormSubmit}>
        <SuggestedQuestions
          lastUserMessage={lastUserMessage}
          onSuggestionClick={handleSuggestionClick}
          isVisible={!isLoading}
          refreshTrigger={refreshSuggestions}
          isOnline={isOnline}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="chat-input"
            placeholder={isOnline ? 'Ask me anything...' : 'You are offline. Reconnect to continue...'}
            value={inputValue}
            onChange={handleInputChange}
            disabled={isLoading || !isOnline}
            aria-label="Message input"
            ref={inputRef}
          />
          <button
            type="submit"
            className="chat-send-button"
            disabled={isLoading || !inputValue.trim() || !isOnline}
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
      <div className="sr-only" aria-live="polite">{announcement}</div>
    </div>
  );
};

export default ChatWidget;
