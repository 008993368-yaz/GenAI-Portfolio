import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { fetchSuggestions } from '../services/chatApi';

const SUGGESTION_STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

const SuggestedQuestions = memo(({
  lastUserMessage = null,
  onSuggestionClick,
  isVisible = true,
  refreshTrigger = 0,
  isOnline = true,
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [status, setStatus] = useState(SUGGESTION_STATUS.IDLE);
  const [errorMessage, setErrorMessage] = useState(null);

  const fallbackSuggestions = useMemo(() => [
    'Can you tell me about your background?',
    'How much work experience do you have?',
  ], []);

  const loadSuggestions = useCallback(async () => {
    if (!isVisible) return;

    if (!isOnline) {
      setSuggestions(fallbackSuggestions);
      setStatus(SUGGESTION_STATUS.ERROR);
      setErrorMessage('Suggestions are in offline mode. Showing defaults.');
      return;
    }

    if (lastUserMessage === null) {
      setSuggestions(fallbackSuggestions);
      setStatus(SUGGESTION_STATUS.SUCCESS);
      setErrorMessage(null);
      return;
    }

    setStatus(SUGGESTION_STATUS.LOADING);
    setErrorMessage(null);

    try {
      const data = await fetchSuggestions({
        last_user_message: lastUserMessage,
        conversation_summary: null,
      });

      const nextSuggestions = data?.suggestions?.length ? data.suggestions : fallbackSuggestions;
      setSuggestions(nextSuggestions);
      setStatus(SUGGESTION_STATUS.SUCCESS);
    } catch (error) {
      setSuggestions(fallbackSuggestions);
      setStatus(SUGGESTION_STATUS.ERROR);

      if (error?.code === 'OFFLINE') {
        setErrorMessage('You are offline. Showing default suggestions.');
      } else if (error?.code === 'TIMEOUT') {
        setErrorMessage('Suggestions timed out. Showing defaults.');
      } else if (error?.code === 'NETWORK_ERROR') {
        setErrorMessage('Cannot load suggestions right now. Showing defaults.');
      } else {
        setErrorMessage('Unable to refresh suggestions. Showing defaults.');
      }
    }
  }, [isVisible, isOnline, lastUserMessage, fallbackSuggestions]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions, refreshTrigger]);

  const suggestionElements = useMemo(() => {
    return suggestions.map((suggestion, index) => (
      <SuggestionChip
        key={index}
        suggestion={suggestion}
        onSuggestionClick={onSuggestionClick}
      />
    ));
  }, [suggestions, onSuggestionClick]);

  if (!isVisible) return null;

  return (
    <div className="suggested-questions">
      {status === SUGGESTION_STATUS.ERROR && errorMessage && (
        <div className="suggestions-error" role="alert">
          <span className="suggestions-error-text">{errorMessage}</span>
          {isOnline && (
            <button type="button" className="suggestions-retry-button" onClick={loadSuggestions}>
              Retry
            </button>
          )}
        </div>
      )}

      {status === SUGGESTION_STATUS.LOADING ? (
        <div className="suggestions-grid">
          {[1, 2].map((i) => (
            <div key={i} className="suggestion-chip suggestion-chip-skeleton">
              Loading...
            </div>
          ))}
        </div>
      ) : (
        <div className="suggestions-grid">
          {suggestionElements}
        </div>
      )}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.lastUserMessage === nextProps.lastUserMessage &&
    prevProps.onSuggestionClick === nextProps.onSuggestionClick &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.refreshTrigger === nextProps.refreshTrigger &&
    prevProps.isOnline === nextProps.isOnline
  );
});

const SuggestionChip = memo(({ suggestion, onSuggestionClick }) => {
  const handleClick = useCallback(() => {
    onSuggestionClick(suggestion);
  }, [suggestion, onSuggestionClick]);

  return (
    <button
      className="suggestion-chip"
      onClick={handleClick}
      type="button"
      aria-label={`Suggest: ${suggestion}`}
    >
      {suggestion}
    </button>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.suggestion === nextProps.suggestion &&
    prevProps.onSuggestionClick === nextProps.onSuggestionClick
  );
});

SuggestionChip.displayName = 'SuggestionChip';
SuggestedQuestions.displayName = 'SuggestedQuestions';

export default SuggestedQuestions;
