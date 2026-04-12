const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request(path, payload) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = 'Unexpected error while contacting assistant.';

    try {
      const errorBody = await response.json();
      detail = errorBody.detail || errorBody.error || detail;
    } catch {
      // Ignore JSON parsing failures and keep fallback message.
    }

    throw new Error(detail);
  }

  return response.json();
}

export async function chatWithPortfolio({ sessionId, message }) {
  return request('/chat', { sessionId, message });
}

export async function getSuggestions({ lastUserMessage = null, conversationSummary = null } = {}) {
  return request('/suggestions', {
    last_user_message: lastUserMessage,
    conversation_summary: conversationSummary,
  });
}

export { API_BASE_URL };
