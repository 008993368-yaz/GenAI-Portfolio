import { useCallback, useEffect, useRef, useState } from "react";
import { profile } from "../data/profile";
import { chatWithPortfolio, getSuggestions } from "../services/chatApi";

const SESSION_STORAGE_KEY = "portfolio_chat_session_id";

export type ChatStatus = "idle" | "thinking" | "done" | "error";

export interface ChatExchange {
  status: ChatStatus;
  query: string;
  reply: string;
  ms: number;
  error: string;
}

const INITIAL_EXCHANGE: ChatExchange = {
  status: "idle",
  query: "",
  reply: "",
  ms: 0,
  error: "",
};

const SEED_SUGGESTIONS = profile.hero.chips.map((c) => c.q);

function generateSessionId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `session-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function getOrCreateSessionId(): string {
  const existing = localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const created = generateSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
}

export function useChat() {
  const [sessionId, setSessionId] = useState("");
  const [exchange, setExchange] = useState<ChatExchange>(INITIAL_EXCHANGE);
  const [suggestions, setSuggestions] = useState<string[]>(SEED_SUGGESTIONS);
  const inFlight = useRef(false);

  useEffect(() => {
    setSessionId(getOrCreateSessionId());
  }, []);

  const refreshSuggestions = useCallback(async (lastUserMessage: string) => {
    try {
      const data = await getSuggestions({ lastUserMessage });
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        // Dedupe so two identical suggestions can't collide as React keys.
        setSuggestions([...new Set(data.suggestions)].slice(0, 3));
      }
    } catch {
      // Non-fatal: keep the existing chips.
    }
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || !sessionId || inFlight.current) return;

      inFlight.current = true;
      setExchange({ status: "thinking", query: message, reply: "", ms: 0, error: "" });
      const t0 = performance.now();

      try {
        const data = await chatWithPortfolio({ sessionId, message });
        const ms = Math.round(performance.now() - t0);
        setExchange({
          status: "done",
          query: message,
          reply: data.reply || "No response was generated.",
          ms,
          error: "",
        });
        void refreshSuggestions(message);
      } catch (err) {
        setExchange({
          status: "error",
          query: message,
          reply: "",
          ms: 0,
          error: err instanceof Error ? err.message : "Unable to reach the assistant.",
        });
      } finally {
        inFlight.current = false;
      }
    },
    [sessionId, refreshSuggestions]
  );

  return { exchange, suggestions, send, sessionReady: Boolean(sessionId) };
}
