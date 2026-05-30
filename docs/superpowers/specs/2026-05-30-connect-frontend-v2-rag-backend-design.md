# Connect frontend-v2 Console to the RAG backend

**Date:** 2026-05-30
**Status:** Approved, pending implementation plan

## Problem

`frontend-v2` is currently a static showcase. Its hero `Console` presents a
"query the corpus" search box, but the underlying `useSearch` hook is a purely
client-side keyword scorer over a local `profile.searchIndex`, with faked
latency (`Math.random()`). It never talks to a backend.

Meanwhile `rag-backend` (FastAPI) exposes a working RAG chat API that the
original `frontend` (v1) already consumes through its floating `ChatWidget`.

We want `frontend-v2` to deliver the **same chat experience as v1** — grounded,
backend-powered answers about Yazhini's background — but integrated into v2's
existing terminal/console aesthetic rather than as a separate floating widget.

## Decisions (locked in during brainstorming)

- **Integration point:** Wire the chat into v2's existing `Console` hero. No
  floating widget. The Console input becomes the chat composer; its readout
  area becomes the answer surface.
- **Transcript model:** Latest exchange only. Show the most recent
  question + assistant reply in the readout. No scrollback panel in the UI.
  (Server-side session memory still preserves multi-turn context.)
- **Fallback:** Backend only. The local keyword scorer is removed entirely;
  there is no offline search fallback.
- **Experience parity:** Same functionality as v1's `ChatWidget` — session id,
  dynamic suggestion chips, "thinking" state, error handling — restyled to fit
  v2's monospace console design.

## Backend contract (existing, unchanged)

From `rag-backend/app/main.py`:

- `POST /chat` — body `{ sessionId: string, message: string }` → `{ reply: string }`
- `POST /suggestions` — body `{ last_user_message?: string, conversation_summary?: string }`
  → `{ suggestions: string[] }`
- CORS already allows `http://localhost:5173` (Vite default), so dev works
  without backend changes.
- Backend keeps per-session conversation memory (10-message window) keyed by
  `sessionId`, plus guardrails for off-topic questions and rate limiting.

We do **not** modify the backend.

## Architecture

### 1. `frontend-v2/vite.config.ts` — add dev proxy

Mirror v1's proxy so the browser can call `/api/*` in development and have it
forwarded to the local backend without CORS friction:

```ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
      rewrite: (p) => p.replace(/^\/api/, ''),
    },
  },
}
```

### 2. `frontend-v2/src/services/chatApi.ts` — new, typed API client

TypeScript port of v1's `frontend/src/services/chatApi.js`:

- `const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')`
- Shared `request(path, payload)` helper that POSTs JSON, and on a non-OK
  response unwraps `detail`/`error` from the body before throwing an `Error`.
- `chatWithPortfolio({ sessionId, message }): Promise<{ reply: string }>`
  → `POST /chat`.
- `getSuggestions({ lastUserMessage }): Promise<{ suggestions: string[] }>`
  → `POST /suggestions` (maps `lastUserMessage` → `last_user_message`).

### 3. `frontend-v2/src/hooks/useChat.ts` — new, replaces `useSearch.ts`

`useSearch.ts` is **deleted**. New hook owns all chat state:

- `sessionId` — created via `crypto.randomUUID()` (with a timestamp+random
  fallback), persisted in `localStorage` under a stable key. Restored on mount.
- `exchange` — latest-exchange state, shape:
  `{ status: 'idle' | 'thinking' | 'done' | 'error', query: string, reply: string, ms: number, error: string }`.
  No transcript array.
- `suggestions: string[]` — seeded from `profile.hero.suggestions` (the `q`
  strings), refreshed from `/suggestions` after each reply. On suggestions
  fetch failure, keep the previous chips (non-fatal).
- `send(message)` — trims/guards empty input; sets `status:'thinking'`;
  measures real round-trip via `performance.now()`; calls `chatWithPortfolio`;
  stores `reply` + `ms` + `status:'done'`; then calls `getSuggestions` with the
  message. On error, sets `status:'error'` and an error message.

Returns `{ exchange, suggestions, send, sessionReady }`.

### 4. `frontend-v2/src/components/Console.tsx` — rewire

Markup structure stays close to current. Changes:

- Form `submit` and chip `onClick` call `send(value)` instead of `run(value)`.
- Readout area renders the latest exchange by `status`:
  - `thinking` → `↳ thinking…` with the existing blinking caret.
  - `done` → `› {query}` line, `↳ {reply}` line, and a dim `replied in {ms}ms`
    line (real measured latency, preserving the console's latency aesthetic).
  - `error` → `↳ couldn't reach the assistant` using the existing `.miss` style.
  - `idle` → empty (as today).
- Chips are driven by the hook's live `suggestions` instead of the static
  `profile.hero.suggestions`. Clicking a chip sends it as a chat message.
- The run button is disabled while `status === 'thinking'`.
- HUD aside (`corpus.meta`): the `● ready` indicator flips to `● thinking`
  while a request is in flight, otherwise `● ready`. The static section/skill/
  project counts remain.
- The old `scrollToId` / jump-to-section behavior is dropped (it belonged to
  local search). `lib/scroller.ts` itself is untouched — it is still used by
  smooth-scroll / nav elsewhere.

### 5. `frontend-v2/.env.example` — new

Documents `VITE_API_BASE_URL` for production deployment (point at the deployed
backend origin, e.g. `https://<backend-host>`). Unused in dev because of the
Vite proxy.

## Data flow

```
mount
  └─ restore or create sessionId (localStorage)
user submits input / clicks a suggestion chip
  └─ send(message)
       ├─ status = 'thinking'  (HUD shows ● thinking, run disabled)
       ├─ t0 = performance.now()
       ├─ POST /api/chat { sessionId, message }
       ├─ status = 'done', reply, ms = now - t0
       └─ POST /api/suggestions { last_user_message: message } → refresh chips
```

Backend retains session memory server-side, so follow-up questions stay in
context even though the UI only renders the latest exchange.

## Error handling

- Network/HTTP errors from `/chat` are caught; `status:'error'` with an inline
  readout message. No crash, no fallback search.
- `/suggestions` failures are non-fatal — keep existing chips.
- Empty/whitespace input is ignored before any network call.
- Run button disabled during in-flight requests to prevent double submits.

## Testing

`frontend-v2` has no test harness today (unlike v1). Scope is kept tight:
verification is manual.

1. Start backend: `uvicorn app.main:app --reload` on port 8000 (requires the
   backend `.env` with Pinecone/OpenAI keys).
2. Start frontend: `npm run dev` in `frontend-v2` (Vite on 5173).
3. Confirm: typing a question returns a grounded reply with a real latency
   readout; suggestion chips refresh after a reply; clicking a chip sends it;
   backend-down shows the inline error state.

Adding vitest/component tests is explicitly out of scope unless requested
later.

## Out of scope

- Any backend changes.
- A floating widget UI (rejected in favor of Console integration).
- Scrollback / full transcript UI.
- Offline keyword-search fallback.
- Automated test infrastructure for frontend-v2.

## Files touched

| File | Change |
|------|--------|
| `frontend-v2/vite.config.ts` | add `server.proxy` for `/api` |
| `frontend-v2/src/services/chatApi.ts` | new typed API client |
| `frontend-v2/src/hooks/useChat.ts` | new chat hook |
| `frontend-v2/src/hooks/useSearch.ts` | deleted |
| `frontend-v2/src/components/Console.tsx` | rewire to chat |
| `frontend-v2/src/components/Console.module.css` | readout max-height/overflow; thinking state |
| `frontend-v2/.env.example` | new, documents `VITE_API_BASE_URL` |
