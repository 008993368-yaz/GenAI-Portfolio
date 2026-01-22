/**
 * Chat API service for communicating with FastAPI backend
 */

const API_BASE_URL = 'http://localhost:8000';
const SESSION_STORAGE_KEY = 'portfolio_chat_session_id';

/**
 * Get or create a persistent session ID
 */
function getSessionId() {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  
  if (!sessionId) {
    // Generate a simple unique session ID (UUID-like)
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  
  return sessionId;
}

/**
 * Send a message to the chatbot backend
 * @param {string} message - User's message
 * @returns {Promise<string>} - Assistant's reply
 * @throws {Error} - If request fails
 */
export async function sendMessage(message) {
  const sessionId = getSessionId();
  
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionId,
        message,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.reply;
    
  } catch (error) {
    console.error('Chat API error:', error);
    throw new Error('Failed to connect to chat service. Please try again.');
  }
}

/**
 * Fetch suggested questions from the backend
 * @param {Object} payload - Request payload
 * @param {string|null} payload.last_user_message - Last user message for context
 * @param {string|null} payload.conversation_summary - Summary of conversation
 * @returns {Promise<{suggestions: string[]}>} - Object with suggestions array
 * @throws {Error} - If request fails
 */
export async function fetchSuggestions(payload = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}/suggestions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        last_user_message: payload.last_user_message || null,
        conversation_summary: payload.conversation_summary || null,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data; // { suggestions: string[] }
    
  } catch (error) {
    console.error('Suggestions API error:', error);
    
    // Return fallback suggestions on error
    return {
      suggestions: [
        "Can you tell me about your background?",
        "What kind of experience do you have?"
      ]
    };
  }
}

