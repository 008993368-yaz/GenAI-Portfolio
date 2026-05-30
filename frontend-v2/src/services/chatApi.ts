const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "/api").replace(/\/$/, "");

export interface ChatResponse {
  reply: string;
}

export interface SuggestionsResponse {
  suggestions: string[];
}

async function request<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let detail = "Unexpected error while contacting the assistant.";
    try {
      const body = await response.json();
      detail = body.detail || body.error || detail;
    } catch {
      // Ignore JSON parse failures; keep the fallback message.
    }
    throw new Error(detail);
  }

  return response.json() as Promise<T>;
}

export function chatWithPortfolio(args: {
  sessionId: string;
  message: string;
}): Promise<ChatResponse> {
  return request<ChatResponse>("/chat", {
    sessionId: args.sessionId,
    message: args.message,
  });
}

export function getSuggestions(
  args: { lastUserMessage?: string | null } = {}
): Promise<SuggestionsResponse> {
  return request<SuggestionsResponse>("/suggestions", {
    last_user_message: args.lastUserMessage ?? null,
    conversation_summary: null,
  });
}

export { API_BASE_URL };
