# Real End-to-End Streaming for the Portfolio Chat

**Date:** 2026-06-03
**Status:** Approved design, ready for implementation plan
**Scope:** `rag-backend` (`/chat` pipeline) and `frontend-v2` Hero (`Console`) chat path. Replaces the client-side typewriter *illusion* on the live answer with real token streaming from the LLM, while keeping the smoothed visual feel.

---

## Problem

The hero chat looks like it streams, but it doesn't. The backend `/chat` endpoint generates the **entire** answer, returns it as one JSON blob, and the frontend reveals it character-by-character with a fake typewriter (`useTypewriter`). The user therefore stares at a "thinking…" state for the full generation time (~2–4s) before a single word appears.

### Current flow

1. `Console.tsx` → `useChat.send()` → `chatApi.chatWithPortfolio()` does `await fetch().json()`.
2. Backend `POST /chat` → `generate_chat_reply()` (`chat_orchestrator.py`) → guardrails → `generate_rag_response()` (`rag.py`) → LangChain `create_retrieval_chain.invoke()` → returns the whole answer string.
3. Frontend receives the full reply, flips status to `done`, and `useTypewriter` *fakes* the typing at 170 cps.

The "stream-like" effect lives entirely in [`useTypewriter.ts`](../../../frontend-v2/src/hooks/useTypewriter.ts); the backend never streams.

---

## Goal

Stream tokens from the LLM to the browser as they are generated, so the answer starts forming ~1s after submit (retrieval + first token) instead of after the whole response is ready — and do it for real, not as an effect. Keep the polished, steady on-screen reveal the demo has today.

**Time-to-first-token budget:** guardrails are pure keyword matching (instant, no LLM), so the only latency before the first token is Pinecone retrieval (~0.3–0.5s) + first OpenAI token (~0.3–0.8s) ≈ **~1s**.

**Non-goals:**
- The seeded hero **demo** (`profile.hero.demo.a`) stays a client-side `useTypewriter` — it's static data, no backend call.
- `/suggestions` is unchanged; it still fires once after the answer completes.
- No mid-stream retry (see Retry below); the existing `/chat` retry is retained on the fallback path.
- No host migration — streaming works on the current Vercel Python serverless deployment.

---

## Approach (chosen)

**SSE over `fetch`, new `/chat/stream` endpoint, with graceful fallback to `/chat`.** A new streaming endpoint sits alongside the untouched `/chat`. The frontend prefers streaming and falls back to the existing non-streaming path on any failure, so the hero demo never breaks even if a runtime/deploy quirk disables streaming.

Rejected alternatives: NDJSON framing (works, but SSE is the idiomatic token-streaming transport); replacing `/chat` outright (no safety net for the portfolio centerpiece).

---

## Design

### 1. Backend — new `POST /chat/stream` (`app/main.py`)

- New endpoint alongside the existing `/chat`, which stays as-is.
- Same request model (`ChatRequest`: `sessionId`, `message`) and the same `@limiter.limit(Config.CHAT_RATE_LIMIT)` rate-limit decorator.
- Returns `StreamingResponse(generator, media_type="text/event-stream")` with anti-buffering headers:
  - `Cache-Control: no-cache`
  - `X-Accel-Buffering: no`
- Wraps the same error taxonomy as `/chat` for failures that occur **before** the stream starts (configuration error → 500). Errors that occur **mid-stream** are delivered as an in-band `error` envelope (see §3), since headers are already sent.

### 2. Backend — SSE envelope format

One event channel (default `message` events), one small JSON object per `data:` line — simple to parse on a custom reader:

```
data: {"type":"token","text":"Hello"}

data: {"type":"token","text":" there"}

data: {"type":"done"}

data: {"type":"error","message":"Failed to generate chat response."}
```

`token` may repeat any number of times. The stream always terminates with exactly one `done` **or** one `error`.

### 3. Backend — orchestrator (`app/services/chat_orchestrator.py`)

Add an async generator `stream_chat_reply(session_id, message)` that yields envelope dicts (serialized to SSE by the endpoint):

1. `is_about_yazhini(message)` — instant keyword check (no LLM).
2. **Off-topic:** yield the canned `get_off_topic_response()` text as one `token` envelope, persist user+assistant to memory, yield `done`. No retrieval, no LLM.
3. **On-topic:** pull `memory.get_history_for_llm(session_id)`, call the RAG streaming method (§4), yield each token as a `token` envelope while accumulating the full text, then persist user+assistant to memory, then yield `done`.
4. **Exception:** yield an `error` envelope (generic message, matching `/chat`'s detail), log with `exc_info=True`. Memory is **not** written with a partial assistant message.

The existing synchronous `generate_chat_reply()` is left intact for the fallback path.

### 4. Backend — RAG streaming (`app/services/rag.py`)

Add `RAGPipeline.stream_response(query, conversation_history, top_k, request_id)` as an async generator:

- Reuse the existing `create_retrieval_chain` and `_convert_chat_history()`.
- Stream with `async for chunk in self.retrieval_chain.astream({"input": query, "chat_history": ...}):` and yield `chunk["answer"]` for chunks that carry a non-empty `"answer"` key (the retrieval/context chunks arrive without incremental answer text and are skipped).
- **Retry:** the streaming path does **not** use the `RETRY_POLICY` tenacity wrapper — a partially-emitted stream can't be safely replayed. Transient-failure robustness is provided by the frontend fallback to `/chat`, which keeps its retry. This trade-off is intentional and documented here.
- Keep a module-level `generate_rag_response()` (sync, retried) untouched for the fallback.

### 5. Frontend — stream consumption (`frontend-v2/src/services/chatApi.ts`)

Add `streamChatWithPortfolio({ sessionId, message, onToken, signal })`:

- `fetch(`${API_BASE_URL}/chat/stream`, { method: "POST", headers, body, signal })`.
- If `!response.ok` or `response.body == null`, throw (so the caller falls back).
- Read `response.body.getReader()`, decode with `TextDecoder`, maintain a buffer, split on the SSE record boundary (`\n\n`), strip the `data: ` prefix, `JSON.parse` each envelope:
  - `token` → `onToken(text)`
  - `done` → resolve
  - `error` → throw `new Error(message)`
- Handle partial lines split across chunk boundaries (keep the trailing incomplete record in the buffer).
- `signal` wires an `AbortController` for cancellation.

`chatWithPortfolio()` and `getSuggestions()` are unchanged.

### 6. Frontend — chat state (`frontend-v2/src/hooks/useChat.ts`)

- Extend `ChatStatus` to `"idle" | "thinking" | "streaming" | "done" | "error"`.
- `send()`:
  1. Set `thinking`, record `t0 = performance.now()`.
  2. Call `streamChatWithPortfolio` with an `onToken` that, on the **first** token, captures `ms = performance.now() - t0` (time-to-first-token, see §8) and flips status to `streaming`; every token appends to `exchange.reply`.
  3. On `done`, set status `done`, then fire `refreshSuggestions(message)` as today.
  4. On **any** thrown error, **fall back**: call the existing `chatWithPortfolio()`, set the full reply with status `done`. Only if the fallback also fails → status `error`.
- Keep the `inFlight` guard; add an `AbortController` so an in-flight stream is cancelled if a new send starts or the component unmounts.

### 7. Frontend — smoothing hook (`frontend-v2/src/hooks/useStreamingText.ts`)

New hook `useStreamingText(target, { streaming, cps = 170 })` — the streamed counterpart to `useTypewriter`:

- Treats `target` as a **growing** string. It advances a revealed-character count over time at `cps` (time-based via `requestAnimationFrame`), clamped to `target.length` — so it keeps pace with incoming tokens and never outruns what's been received.
- Crucially it does **not** reset `shown` when `target` changes (tokens change it constantly); it only resets when a new exchange begins (e.g. `target` returns to `""`).
- `done = !streaming && shown === target`.
- Honors `prefers-reduced-motion` by revealing received text immediately.

The existing `useTypewriter` is kept **unchanged** for the static seeded demo. The live answer — whether it arrived via stream or via the fallback's one-shot reply — is rendered through `useStreamingText` (a one-shot reply is just a target that never grows).

### 8. Frontend — `Console.tsx` wiring

- Render the live answer region from `useStreamingText(exchange.reply, { streaming: exchange.status === "streaming" })`.
- "thinking…" shows only while `status === "thinking"` (before the first token). Once `streaming`/`done`, show the smoothed answer with the caret until `done`.
- **Accessibility:** keep the visibly-typing span `aria-hidden` and populate the `sr-only` full-reply span **once, when `done`** — so screen-reader users get one clean read of the final answer instead of one announcement per token.
- "replied in **Xms**" continues to use `exchange.ms`, now meaning **time-to-first-token** (send → first token) rather than total round-trip. This is the honest "how fast did it start responding" number for a streaming UI and stays small. *(Reversible — switch to total stream duration by capturing `ms` on `done` instead of on first token.)*

### 9. Deployment (`rag-backend/vercel.json` / Vercel env)

- Add `VERCEL_FORCE_PYTHON_STREAMING=1` to the backend's Vercel environment to disable response buffering for the Python runtime (supported since Jan 2025).
- Local dev is unaffected: Vite's `/api` proxy forwards the streamed response transparently.

---

## Error handling

| Failure | Behavior |
| --- | --- |
| `/chat/stream` non-200 or no body | `streamChatWithPortfolio` throws → `useChat` falls back to `/chat`. |
| Mid-stream LLM/network error (server) | Server emits `error` envelope + logs → client throws → falls back to `/chat`. |
| Fallback `/chat` also fails | Status `error`, existing error line shown. |
| User starts a new send / unmount | `AbortController` cancels the in-flight stream. |

---

## Testing

**Backend** (extend `rag-backend/tests/test_chat_orchestrator.py`):
- `stream_chat_reply` yields `token` envelopes then `done` for an on-topic message (mock the RAG async stream).
- Off-topic message yields the canned redirect with **no** retrieval/LLM call, then `done`, and persists both messages to memory.
- An exception from the RAG stream yields an `error` envelope and does **not** persist a partial assistant message.
- Endpoint test (FastAPI `TestClient` / httpx ASGI) asserting `text/event-stream` and the SSE chunk sequence.

**Frontend:**
- SSE parser: envelopes split across chunk boundaries reassemble correctly; `token`/`done`/`error` dispatch correctly.
- `useStreamingText`: reveal advances at `cps`, clamps to a growing target, never resets mid-stream, and reports `done` only when `!streaming && shown === target`; reduced-motion reveals immediately.

---

## Files touched

- `rag-backend/app/main.py` — new `/chat/stream` endpoint.
- `rag-backend/app/services/chat_orchestrator.py` — `stream_chat_reply` async generator.
- `rag-backend/app/services/rag.py` — `RAGPipeline.stream_response` async generator.
- `rag-backend/vercel.json` / Vercel env — `VERCEL_FORCE_PYTHON_STREAMING=1`.
- `frontend-v2/src/services/chatApi.ts` — `streamChatWithPortfolio`.
- `frontend-v2/src/hooks/useChat.ts` — `streaming` status, stream + fallback.
- `frontend-v2/src/hooks/useStreamingText.ts` — new smoothing hook.
- `frontend-v2/src/components/Console.tsx` — wire the live answer to `useStreamingText`, a11y, TTFT timing.
- Tests as above.
