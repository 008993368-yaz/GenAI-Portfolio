import { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { fetchSuggestions } from '../services/chatApi';

/**
 * SuggestedQuestions Component (Memoized)
 * Displays clickable suggestion chips below the chat input
 * 
 * Wrapped with React.memo to prevent re-renders when parent updates unrelated state
 * Only re-renders when its own props change (lastUserMessage, refreshTrigger, onSuggestionClick)
 * 
 * Performance optimizations:
 * - React.memo: Prevents re-renders on parent re-renders
 * - Custom comparison: Deep comparison of props
 * - useCallback: Memoized handlers for suggestions
 * - useMemo: Memoized suggestion elements
 */
const SuggestedQuestions = memo(({ 
  lastUserMessage = null, 
  onSuggestionClick, 
  isVisible = true,
  refreshTrigger = 0 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch suggestions when component mounts or refreshTrigger changes
  useEffect(() => {
    if (!isVisible) return;

    // Initial load - show hardcoded questions without calling LLM
    if (lastUserMessage === null) {
      setSuggestions([
        "Can you tell me about your background?",
        "How much work experience do you have?"
      ]);
      setIsLoading(false);
      return;
    }

    // After user has sent a message - use LLM to generate contextual suggestions
    const loadSuggestions = async () => {
      setIsLoading(true);
      
      try {
        const data = await fetchSuggestions({
          last_user_message: lastUserMessage,
          conversation_summary: null, // Could be enhanced later
        });
        
        setSuggestions(data.suggestions || []);
      } catch (error) {
        console.error('Failed to load suggestions:', error);
        // fetchSuggestions already returns fallback on error
      } finally {
        setIsLoading(false);
      }
    };

    loadSuggestions();
  }, [lastUserMessage, isVisible, refreshTrigger]);

  /**
   * Memoized suggestion element creator
   * Prevents recreating suggestion buttons on every render
   */
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
      {isLoading ? (
        // Loading skeleton
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
  // Custom comparison for React.memo
  // Return true if props are equal (skip re-render), false if different (re-render)
  return (
    prevProps.lastUserMessage === nextProps.lastUserMessage &&
    prevProps.onSuggestionClick === nextProps.onSuggestionClick &&
    prevProps.isVisible === nextProps.isVisible &&
    prevProps.refreshTrigger === nextProps.refreshTrigger
  );
});

/**
 * SuggestionChip Component (Memoized)
 * Individual clickable suggestion button
 * Memoized to prevent re-renders when sibling suggestions update
 */
const SuggestionChip = memo(({ suggestion, onSuggestionClick }) => {
  // Memoized click handler
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
  // Only re-render if suggestion text or callback changes
  return (
    prevProps.suggestion === nextProps.suggestion &&
    prevProps.onSuggestionClick === nextProps.onSuggestionClick
  );
});

SuggestionChip.displayName = 'SuggestionChip';
SuggestedQuestions.displayName = 'SuggestedQuestions';

export default SuggestedQuestions;
