import { useState, useEffect } from 'react';
import { fetchSuggestions } from '../services/chatApi';

/**
 * SuggestedQuestions component
 * Displays clickable suggestion chips below the chat input
 */
const SuggestedQuestions = ({ 
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
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              className="suggestion-chip"
              onClick={() => onSuggestionClick(suggestion)}
              type="button"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SuggestedQuestions;
