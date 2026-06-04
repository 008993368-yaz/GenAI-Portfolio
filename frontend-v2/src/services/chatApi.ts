import { createSSEParser } from "./sseParser";

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

/**
 * POST to the streaming chat endpoint and invoke `onToken` for each token as
 * it arrives. Resolves when the server sends `done`. Throws on a non-OK
 * response, a missing body, or a server `error` envelope — the caller is
 * expected to fall back to the non-streaming `chatWithPortfolio`.
 */
export async function streamChatWithPortfolio(args: {
  sessionId: string;
  message: string;
  onToken: (text: string) => void;
  signal?: AbortSignal;
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: args.sessionId, message: args.message }),
    signal: args.signal,
  });

  if (!response.ok || !response.body) {
    throw new Error("Streaming request failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const push = createSSEParser();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    for (const envelope of push(decoder.decode(value, { stream: true }))) {
      if (envelope.type === "token") {
        args.onToken(envelope.text);
      } else if (envelope.type === "done") {
        return;
      } else if (envelope.type === "error") {
        throw new Error(envelope.message);
      }
    }
  }
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
