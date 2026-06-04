# Real End-to-End Streaming for the Portfolio Chat — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the client-side typewriter illusion with real SSE token streaming from the LLM, smoothed on screen, with graceful fallback to the existing `/chat` endpoint.

**Architecture:** A new `POST /chat/stream` endpoint streams Server-Sent Events (`data: {json}\n\n`) produced by an async generator in `chat_orchestrator.py`, which drives LangChain's `retrieval_chain.astream(...)`. The frontend reads the stream via `fetch` + a `ReadableStream` reader, feeds tokens into a steady-rate reveal hook, and falls back to the non-streaming `/chat` path on any error.

**Tech Stack:** FastAPI + Starlette `StreamingResponse`, LangChain `astream`, slowapi rate limiting (backend); React 18 + Vite, `fetch`/`ReadableStream`, vitest for pure-function tests (frontend).

**Spec:** [docs/superpowers/specs/2026-06-03-real-streaming-chat-design.md](../specs/2026-06-03-real-streaming-chat-design.md)

**Branch:** `feat/real-streaming-chat` (already created).

**Commit convention:** Every commit message ends with the trailer line `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>` (omitted from the `-m` snippets below for brevity — append it to each).

**Working directories:** backend commands run from `rag-backend/`; frontend commands run from `frontend-v2/`.

---

## File Structure

**Backend (`rag-backend/`)**
- Create `app/services/sse.py` — pure `sse_encode(envelope: dict) -> str`. One job: serialize an envelope dict to an SSE record.
- Modify `app/services/rag.py` — add pure `_extract_answer_token(chunk)`, `RAGPipeline.stream_response(...)` async generator, and module-level `stream_rag_response(...)` async generator. Mirrors the existing non-streaming `generate_rag_response`.
- Modify `app/services/chat_orchestrator.py` — add `stream_chat_reply(session_id, message)` async generator. Existing sync `generate_chat_reply` untouched (fallback path).
- Modify `app/main.py` — add `POST /chat/stream` endpoint returning `StreamingResponse`.
- Modify `requirements.txt` — add `httpx` (test-only, needed by `TestClient`).
- Create `tests/test_sse.py`, `tests/test_rag_stream.py`, `tests/test_chat_stream_endpoint.py`; extend `tests/test_chat_orchestrator.py`.
- Ops: set `VERCEL_FORCE_PYTHON_STREAMING=1` in the backend's Vercel project env.

**Frontend (`frontend-v2/`)**
- Modify `package.json` — add `vitest` dev dependency + `test` script.
- Create `src/services/sseParser.ts` — pure incremental SSE parser (`createSSEParser()` → `push(chunk)`).
- Modify `src/services/chatApi.ts` — add `streamChatWithPortfolio(...)` using `fetch` + reader + the parser.
- Create `src/hooks/streamingReveal.ts` — pure `revealCount(elapsedMs, cps, targetLength)`.
- Create `src/hooks/useStreamingText.ts` — React hook wrapping `revealCount` for a *growing* target.
- Modify `src/hooks/useChat.ts` — add `streaming` status, stream-then-fallback `send()`, `AbortController`.
- Modify `src/components/Console.tsx` — wire the live answer to `useStreamingText`, a11y, time-to-first-token timing.
- Create `src/services/sseParser.test.ts`, `src/hooks/streamingReveal.test.ts`.

**Envelope shape (shared contract)**
- `{"type": "token", "text": "<chars>"}` — zero or more, in order.
- `{"type": "done"}` — terminal on success.
- `{"type": "error", "message": "<text>"}` — terminal on failure.

---

# Backend

### Task B1: SSE encoder (pure)

**Files:**
- Create: `rag-backend/app/services/sse.py`
- Test: `rag-backend/tests/test_sse.py`

- [ ] **Step 1: Write the failing test**

Create `rag-backend/tests/test_sse.py`:

```python
"""Unit tests for the SSE envelope encoder."""

from app.services.sse import sse_encode


def test_sse_encode_token():
    assert sse_encode({"type": "token", "text": "hi"}) == (
        'data: {"type": "token", "text": "hi"}\n\n'
    )


def test_sse_encode_done():
    assert sse_encode({"type": "done"}) == 'data: {"type": "done"}\n\n'


def test_sse_encode_preserves_unicode():
    out = sse_encode({"type": "token", "text": "café"})
    assert "café" in out
    assert out.endswith("\n\n")
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/test_sse.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.services.sse'`.

- [ ] **Step 3: Write the minimal implementation**

Create `rag-backend/app/services/sse.py`:

```python
"""Server-Sent Events encoding for the streaming chat endpoint."""

import json
from typing import Dict


def sse_encode(envelope: Dict) -> str:
    """Serialize an event envelope dict to a single SSE record.

    Format: ``data: <json>\\n\\n``. ``ensure_ascii=False`` keeps unicode
    characters intact so the byte stream stays compact and readable.
    """
    return f"data: {json.dumps(envelope, ensure_ascii=False)}\n\n"
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/test_sse.py -v`
Expected: PASS (3 passed).

- [ ] **Step 5: Commit**

```bash
git add app/services/sse.py tests/test_sse.py
git commit -m "Add SSE envelope encoder for streaming chat"
```

---

### Task B2: RAG streaming generator

**Files:**
- Modify: `rag-backend/app/services/rag.py`
- Test: `rag-backend/tests/test_rag_stream.py`

- [ ] **Step 1: Write the failing test** (covers the pure token-extraction helper — the part with real logic)

Create `rag-backend/tests/test_rag_stream.py`:

```python
"""Unit tests for RAG streaming helpers."""

from app.services.rag import _extract_answer_token


def test_extract_answer_token_returns_answer_text():
    assert _extract_answer_token({"answer": "Hello"}) == "Hello"


def test_extract_answer_token_skips_context_only_chunk():
    assert _extract_answer_token({"context": ["doc"]}) is None


def test_extract_answer_token_skips_empty_answer():
    assert _extract_answer_token({"answer": ""}) is None


def test_extract_answer_token_skips_non_dict():
    assert _extract_answer_token("nope") is None
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `python -m pytest tests/test_rag_stream.py -v`
Expected: FAIL — `ImportError: cannot import name '_extract_answer_token'`.

- [ ] **Step 3: Write the implementation**

In `rag-backend/app/services/rag.py`, add the pure helper near the top (after the imports / `logger` definition, before `class RAGConfig`):

```python
def _extract_answer_token(chunk: Any) -> Optional[str]:
    """Pull the incremental answer text out of a LangChain retrieval-chain
    stream chunk. Retrieval/context chunks have no ``answer`` key (or an empty
    one) and are skipped by returning ``None``."""
    if isinstance(chunk, dict):
        answer = chunk.get("answer")
        if isinstance(answer, str) and answer:
            return answer
    return None
```

Add the streaming method to `RAGPipeline` (place it right after `generate_response`):

```python
    async def stream_response(
        self,
        query: str,
        conversation_history: Optional[List[Dict]] = None,
        top_k: Optional[int] = None,
        request_id: Optional[str] = None,
    ):
        """Yield answer tokens as the LLM generates them.

        Mirrors ``generate_response`` but streams via ``astream``. No tenacity
        retry here: a partially emitted stream cannot be safely replayed, so
        transient-failure robustness comes from the frontend fallback to the
        non-streaming ``/chat`` path.
        """
        req_id = request_id or "N/A"

        if top_k is not None and top_k != self.config.rag_top_k:
            self.retriever = self.retriever_instance.get_retriever(k=top_k)
            self.retrieval_chain = self._build_retrieval_chain(self.retriever)

        chat_history = self._convert_chat_history(conversation_history)
        logger.debug("[%s] Streaming response (history=%d msgs)", req_id, len(chat_history))

        async for chunk in self.retrieval_chain.astream({
            "input": query,
            "chat_history": chat_history if chat_history else [],
        }):
            token = _extract_answer_token(chunk)
            if token:
                yield token
```

Add the module-level async generator next to `generate_rag_response` (at the bottom of the file):

```python
async def stream_rag_response(
    query: str,
    conversation_history: Optional[List[Dict]] = None,
    top_k: Optional[int] = None,
):
    """Stream a RAG response token-by-token using the pipeline singleton.

    Raises:
        ValueError: If the RAG pipeline is not configured.
        Exception: If initialization fails.
    """
    pipeline, error = get_rag_pipeline()

    if error:
        raise ValueError(error)
    if not pipeline:
        raise Exception("RAG pipeline initialization failed")

    async for token in pipeline.stream_response(query, conversation_history, top_k):
        yield token
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `python -m pytest tests/test_rag_stream.py -v`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add app/services/rag.py tests/test_rag_stream.py
git commit -m "Add RAG astream streaming generator and token extractor"
```

---

### Task B3: Orchestrator streaming generator

**Files:**
- Modify: `rag-backend/app/services/chat_orchestrator.py`
- Test: `rag-backend/tests/test_chat_orchestrator.py` (extend)

- [ ] **Step 1: Write the failing tests**

Append to `rag-backend/tests/test_chat_orchestrator.py`:

```python
import asyncio


def _drain(async_gen):
    """Collect every item from an async generator into a list (sync helper)."""
    async def _collect():
        return [item async for item in async_gen]
    return asyncio.run(_collect())


def test_stream_chat_reply_off_topic_skips_rag(monkeypatch):
    fake_memory = _FakeMemory()
    monkeypatch.setattr(chat_orchestrator, "get_memory", lambda: fake_memory)
    monkeypatch.setattr(chat_orchestrator, "is_about_yazhini", lambda message: False)
    monkeypatch.setattr(chat_orchestrator, "get_off_topic_response", lambda: "Off-topic reply")

    rag_called = {"value": False}

    async def _fake_stream(query, conversation_history):
        rag_called["value"] = True
        if False:
            yield ""  # pragma: no cover  (makes this an async generator)

    monkeypatch.setattr(chat_orchestrator, "stream_rag_response", _fake_stream)

    events = _drain(chat_orchestrator.stream_chat_reply("s1", "favorite movies?"))

    assert events == [
        {"type": "token", "text": "Off-topic reply"},
        {"type": "done"},
    ]
    assert rag_called["value"] is False
    assert fake_memory.added == [
        ("s1", "user", "favorite movies?"),
        ("s1", "assistant", "Off-topic reply"),
    ]


def test_stream_chat_reply_on_topic_streams_and_persists(monkeypatch):
    history = [{"role": "user", "content": "Tell me your background"}]
    fake_memory = _FakeMemory(history=history)
    monkeypatch.setattr(chat_orchestrator, "get_memory", lambda: fake_memory)
    monkeypatch.setattr(chat_orchestrator, "is_about_yazhini", lambda message: True)

    seen = {}

    async def _fake_stream(query, conversation_history):
        seen["query"] = query
        seen["history"] = conversation_history
        for part in ["I ", "have ", "experience."]:
            yield part

    monkeypatch.setattr(chat_orchestrator, "stream_rag_response", _fake_stream)

    events = _drain(chat_orchestrator.stream_chat_reply("s2", "your experience?"))

    assert events == [
        {"type": "token", "text": "I "},
        {"type": "token", "text": "have "},
        {"type": "token", "text": "experience."},
        {"type": "done"},
    ]
    assert seen["query"] == "your experience?"
    assert seen["history"] == history
    assert fake_memory.added == [
        ("s2", "user", "your experience?"),
        ("s2", "assistant", "I have experience."),
    ]


def test_stream_chat_reply_emits_error_and_skips_persist_on_failure(monkeypatch):
    fake_memory = _FakeMemory()
    monkeypatch.setattr(chat_orchestrator, "get_memory", lambda: fake_memory)
    monkeypatch.setattr(chat_orchestrator, "is_about_yazhini", lambda message: True)

    async def _boom(query, conversation_history):
        raise RuntimeError("openai down")
        yield ""  # pragma: no cover

    monkeypatch.setattr(chat_orchestrator, "stream_rag_response", _boom)

    events = _drain(chat_orchestrator.stream_chat_reply("s3", "your skills?"))

    assert events == [{"type": "error", "message": "Failed to generate chat response."}]
    assert fake_memory.added == []
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `python -m pytest tests/test_chat_orchestrator.py -v`
Expected: FAIL — `AttributeError: module 'app.services.chat_orchestrator' has no attribute 'stream_chat_reply'`.

- [ ] **Step 3: Write the implementation**

Edit `rag-backend/app/services/chat_orchestrator.py`. Update the imports and add a logger + the async generator:

```python
"""
Chat Orchestrator Service
Keeps endpoint handlers thin by coordinating guardrails, memory, and RAG generation.
"""

import logging

from app.services.guardrails import get_off_topic_response, is_about_yazhini
from app.services.memory import get_memory
from app.services.rag import generate_rag_response, stream_rag_response

logger = logging.getLogger(__name__)


def generate_chat_reply(session_id: str, message: str) -> str:
    """Generate and persist a chat reply for a session."""
    memory = get_memory()

    if not is_about_yazhini(message):
        reply = get_off_topic_response()
        memory.add_message(session_id, "user", message)
        memory.add_message(session_id, "assistant", reply)
        return reply

    conversation_history = memory.get_history_for_llm(session_id)
    reply = generate_rag_response(query=message, conversation_history=conversation_history)

    memory.add_message(session_id, "user", message)
    memory.add_message(session_id, "assistant", reply)
    return reply


async def stream_chat_reply(session_id: str, message: str):
    """Stream a chat reply as a sequence of event envelopes.

    Yields ``{"type": "token", "text": ...}`` envelopes followed by exactly one
    ``{"type": "done"}`` on success, or a single ``{"type": "error", ...}`` if
    generation fails. The full reply is persisted to memory only on success.
    """
    memory = get_memory()

    if not is_about_yazhini(message):
        reply = get_off_topic_response()
        yield {"type": "token", "text": reply}
        memory.add_message(session_id, "user", message)
        memory.add_message(session_id, "assistant", reply)
        yield {"type": "done"}
        return

    conversation_history = memory.get_history_for_llm(session_id)
    parts = []
    try:
        async for token in stream_rag_response(
            query=message, conversation_history=conversation_history
        ):
            parts.append(token)
            yield {"type": "token", "text": token}
    except Exception:
        logger.exception("Streaming chat generation failed for session %s", session_id)
        yield {"type": "error", "message": "Failed to generate chat response."}
        return

    reply = "".join(parts)
    memory.add_message(session_id, "user", message)
    memory.add_message(session_id, "assistant", reply)
    yield {"type": "done"}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `python -m pytest tests/test_chat_orchestrator.py -v`
Expected: PASS (all 5 — the 2 original + 3 new).

- [ ] **Step 5: Commit**

```bash
git add app/services/chat_orchestrator.py tests/test_chat_orchestrator.py
git commit -m "Add streaming chat orchestrator generator"
```

---

### Task B4: `POST /chat/stream` endpoint

**Files:**
- Modify: `rag-backend/app/main.py`
- Modify: `rag-backend/requirements.txt`
- Test: `rag-backend/tests/test_chat_stream_endpoint.py`

- [ ] **Step 1: Add the test-only dependency**

In `rag-backend/requirements.txt`, under the `# Testing` section, add:

```
httpx==0.27.2
```

Then install it:

Run: `python -m pip install "httpx==0.27.2"`
Expected: installs successfully (required by FastAPI's `TestClient`).

- [ ] **Step 2: Write the failing test**

Create `rag-backend/tests/test_chat_stream_endpoint.py`:

```python
"""Endpoint test for the streaming chat route."""

from fastapi.testclient import TestClient

from app import main


def test_chat_stream_returns_sse_events(monkeypatch):
    async def _fake_stream(session_id, message):
        yield {"type": "token", "text": "Hello"}
        yield {"type": "token", "text": " there"}
        yield {"type": "done"}

    monkeypatch.setattr(main, "stream_chat_reply", _fake_stream)

    client = TestClient(main.app)
    resp = client.post("/chat/stream", json={"sessionId": "s1", "message": "hi there"})

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    body = resp.text
    assert 'data: {"type": "token", "text": "Hello"}' in body
    assert 'data: {"type": "token", "text": " there"}' in body
    assert 'data: {"type": "done"}' in body
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `python -m pytest tests/test_chat_stream_endpoint.py -v`
Expected: FAIL — 404 (route not defined) so the body assertions fail.

- [ ] **Step 4: Write the implementation**

In `rag-backend/app/main.py`:

1. Add `StreamingResponse` to the starlette import (line ~22):

```python
from starlette.responses import JSONResponse, Response, StreamingResponse
```

2. Extend the orchestrator import (line ~25) and add the SSE encoder import:

```python
from app.services.chat_orchestrator import generate_chat_reply, stream_chat_reply
from app.services.sse import sse_encode
```

3. Add the endpoint immediately after the existing `/chat` handler (after its closing, ~line 443):

```python
# Streaming chat endpoint - same pipeline as /chat, streamed as SSE
@app.post("/chat/stream")
@limiter.limit(Config.CHAT_RATE_LIMIT)
async def chat_stream(request: Request, payload: ChatRequest):
    """Stream the assistant's reply as Server-Sent Events.

    Emits ``token`` envelopes as the LLM generates them, then a terminal
    ``done`` (or ``error``). The frontend falls back to ``/chat`` on failure.
    """
    async def event_source():
        try:
            async for envelope in stream_chat_reply(payload.sessionId, payload.message):
                yield sse_encode(envelope)
        except Exception:
            ERROR_COUNT.labels(endpoint="/chat/stream", error_type="chat_error").inc()
            yield sse_encode({"type": "error", "message": "Failed to generate chat response."})

    return StreamingResponse(
        event_source(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `python -m pytest tests/test_chat_stream_endpoint.py -v`
Expected: PASS (1 passed).

- [ ] **Step 6: Run the full backend suite (no regressions)**

Run: `python -m pytest -q`
Expected: all tests pass and coverage gate (`--cov-fail-under=80` on guardrails+memory) still passes — new code lives in modules outside the coverage targets, so it neither helps nor breaks the gate.

- [ ] **Step 7: Commit**

```bash
git add app/main.py requirements.txt tests/test_chat_stream_endpoint.py
git commit -m "Add /chat/stream SSE endpoint"
```

---

### Task B5: Enable streaming on Vercel (ops)

**Files:** none in-repo (Vercel project setting).

- [ ] **Step 1: Set the env var**

In the backend's Vercel project, add environment variable `VERCEL_FORCE_PYTHON_STREAMING=1` (Production + Preview). Via CLI from `rag-backend/`:

```bash
vercel env add VERCEL_FORCE_PYTHON_STREAMING production
# enter value: 1
vercel env add VERCEL_FORCE_PYTHON_STREAMING preview
# enter value: 1
```

(Or add it in the Vercel dashboard → Project → Settings → Environment Variables.)

- [ ] **Step 2: Note for redeploy**

This takes effect on the next production deployment. No code change; the existing `api/index.py` entry already exposes the new route. Verify after deploy that `POST /chat/stream` streams incrementally (the frontend verification in Task F8 confirms this end-to-end).

---

# Frontend

### Task F0: Add vitest

**Files:**
- Modify: `frontend-v2/package.json`

- [ ] **Step 1: Install vitest**

Run (from `frontend-v2/`): `npm install -D vitest@^2.1.0`
Expected: adds `vitest` to `devDependencies`.

- [ ] **Step 2: Add the test script**

In `frontend-v2/package.json`, add a `test` script to `scripts`:

```json
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
```

Note: tests import `{ describe, it, expect }` explicitly from `vitest` (no globals), so no `tsconfig`/`vite.config` change is needed. The two test files are pure (no DOM), so vitest's default node environment is sufficient.

- [ ] **Step 3: Verify the runner works (no tests yet)**

Run: `npx vitest run --passWithNoTests`
Expected: exits 0 with "No test files found, exiting with code 0" — confirms vitest is wired up.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "Add vitest for frontend unit tests"
```

---

### Task F1: SSE parser (pure)

**Files:**
- Create: `frontend-v2/src/services/sseParser.ts`
- Test: `frontend-v2/src/services/sseParser.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend-v2/src/services/sseParser.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { createSSEParser } from "./sseParser";

describe("createSSEParser", () => {
  it("parses a single complete record", () => {
    const push = createSSEParser();
    expect(push('data: {"type":"token","text":"hi"}\n\n')).toEqual([
      { type: "token", text: "hi" },
    ]);
  });

  it("reassembles a record split across chunks", () => {
    const push = createSSEParser();
    expect(push('data: {"type":"to')).toEqual([]);
    expect(push('ken","text":"hi"}\n\n')).toEqual([{ type: "token", text: "hi" }]);
  });

  it("parses multiple records in one chunk", () => {
    const push = createSSEParser();
    expect(
      push('data: {"type":"token","text":"a"}\n\ndata: {"type":"done"}\n\n')
    ).toEqual([
      { type: "token", text: "a" },
      { type: "done" },
    ]);
  });

  it("ignores malformed records without throwing", () => {
    const push = createSSEParser();
    expect(push("data: not-json\n\n")).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — cannot resolve `./sseParser`.

- [ ] **Step 3: Write the implementation**

Create `frontend-v2/src/services/sseParser.ts`:

```ts
export type StreamEnvelope =
  | { type: "token"; text: string }
  | { type: "done" }
  | { type: "error"; message: string };

/**
 * Incremental SSE parser. Call the returned `push` with each decoded text
 * chunk; it returns whatever complete `data:` envelopes are now available,
 * buffering any partial trailing record across calls.
 */
export function createSSEParser() {
  let buffer = "";

  return function push(chunk: string): StreamEnvelope[] {
    buffer += chunk;
    const envelopes: StreamEnvelope[] = [];

    let boundary: number;
    while ((boundary = buffer.indexOf("\n\n")) !== -1) {
      const record = buffer.slice(0, boundary).trim();
      buffer = buffer.slice(boundary + 2);

      if (!record.startsWith("data:")) continue;
      const json = record.slice("data:".length).trim();
      if (!json) continue;

      try {
        envelopes.push(JSON.parse(json) as StreamEnvelope);
      } catch {
        // Skip a malformed record rather than aborting the whole stream.
      }
    }

    return envelopes;
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add src/services/sseParser.ts src/services/sseParser.test.ts
git commit -m "Add incremental SSE parser"
```

---

### Task F2: `streamChatWithPortfolio`

**Files:**
- Modify: `frontend-v2/src/services/chatApi.ts`

(No unit test: this is thin glue over `fetch`/`ReadableStream` and the already-tested parser. It is exercised end-to-end in Task F8.)

- [ ] **Step 1: Implement the streaming client**

In `frontend-v2/src/services/chatApi.ts`, add the parser import at the top:

```ts
import { createSSEParser } from "./sseParser";
```

Then add this exported function (after `chatWithPortfolio`):

```ts
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
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/chatApi.ts
git commit -m "Add streaming chat API client"
```

---

### Task F3: Reveal math (pure)

**Files:**
- Create: `frontend-v2/src/hooks/streamingReveal.ts`
- Test: `frontend-v2/src/hooks/streamingReveal.test.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend-v2/src/hooks/streamingReveal.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { revealCount } from "./streamingReveal";

describe("revealCount", () => {
  it("reveals characters proportional to elapsed time and cps", () => {
    expect(revealCount(1000, 170, 1000)).toBe(170);
  });

  it("never exceeds the available target length", () => {
    expect(revealCount(1000, 170, 5)).toBe(5);
  });

  it("reveals nothing at time zero", () => {
    expect(revealCount(0, 170, 100)).toBe(0);
  });

  it("floors fractional character counts", () => {
    expect(revealCount(100, 170, 1000)).toBe(17);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test`
Expected: FAIL — cannot resolve `./streamingReveal`.

- [ ] **Step 3: Write the implementation**

Create `frontend-v2/src/hooks/streamingReveal.ts`:

```ts
/**
 * How many characters of a target string should be visible after `elapsedMs`
 * at `cps` characters/second, clamped to `targetLength`. Time-based so the
 * reveal runs at a steady rate regardless of frame rate, and clamping to the
 * received length is what lets it track a *growing* (streamed) target.
 */
export function revealCount(
  elapsedMs: number,
  cps: number,
  targetLength: number
): number {
  return Math.min(targetLength, Math.floor((elapsedMs / 1000) * cps));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test`
Expected: PASS (4 passed).

- [ ] **Step 5: Commit**

```bash
git add src/hooks/streamingReveal.ts src/hooks/streamingReveal.test.ts
git commit -m "Add steady-rate reveal math for streamed text"
```

---

### Task F4: `useStreamingText` hook

**Files:**
- Create: `frontend-v2/src/hooks/useStreamingText.ts`

(No unit test: React/RAF glue, verified end-to-end in Task F8. The reveal math it depends on is tested in F3.)

- [ ] **Step 1: Implement the hook**

Create `frontend-v2/src/hooks/useStreamingText.ts`:

```ts
import { useEffect, useRef, useState } from "react";
import { revealCount } from "./streamingReveal";

interface StreamingTextOptions {
  /** True while tokens are still arriving. */
  streaming: boolean;
  /** Characters revealed per second. */
  cps?: number;
}

/**
 * Reveals a *growing* `target` string at a steady character rate, so a real
 * token stream reads as smooth typing. Unlike a one-shot typewriter, it does
 * NOT reset when `target` grows (every token changes it) — it only resets when
 * `target` becomes empty (a new exchange). Honors prefers-reduced-motion by
 * showing whatever has been received immediately.
 *
 * `done` is true only once streaming has stopped AND the revealed text has
 * caught up to the full target.
 */
export function useStreamingText(
  target: string,
  { streaming, cps = 170 }: StreamingTextOptions
) {
  const [shown, setShown] = useState("");
  const startRef = useRef<number | null>(null);
  const frameRef = useRef(0);
  const targetRef = useRef(target);
  targetRef.current = target;

  useEffect(() => {
    if (!target) {
      startRef.current = null;
      setShown("");
      return;
    }

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reducedMotion) {
      setShown(target);
      return;
    }

    // Start the clock at the first non-empty target (the first token), and keep
    // it across re-renders so the reveal stays continuous as tokens arrive.
    if (startRef.current === null) startRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - (startRef.current as number);
      const count = revealCount(elapsed, cps, targetRef.current.length);
      setShown(targetRef.current.slice(0, count));
      if (count < targetRef.current.length || streaming) {
        frameRef.current = requestAnimationFrame(step);
      }
    };

    frameRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, streaming, cps]);

  const done = !streaming && shown === target;
  return { shown, done };
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useStreamingText.ts
git commit -m "Add useStreamingText hook for smoothed token reveal"
```

---

### Task F5: `useChat` — stream then fall back

**Files:**
- Modify: `frontend-v2/src/hooks/useChat.ts`

- [ ] **Step 1: Add the `streaming` status**

In `frontend-v2/src/hooks/useChat.ts`, extend the status union:

```ts
export type ChatStatus = "idle" | "thinking" | "streaming" | "done" | "error";
```

- [ ] **Step 2: Import the streaming client and add an abort ref**

Update the import line to include the streaming client:

```ts
import { chatWithPortfolio, getSuggestions, streamChatWithPortfolio } from "../services/chatApi";
```

Inside `useChat`, alongside `const inFlight = useRef(false);`, add:

```ts
  const abortRef = useRef<AbortController | null>(null);
```

- [ ] **Step 3: Replace `send` with the stream-then-fallback version**

Replace the entire `send` `useCallback` with:

```ts
  const send = useCallback(
    async (raw: string) => {
      const message = raw.trim();
      if (!message || !sessionId || inFlight.current) return;

      inFlight.current = true;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setExchange({ status: "thinking", query: message, reply: "", ms: 0, error: "" });
      const t0 = performance.now();

      let firstToken = true;
      let acc = "";

      try {
        await streamChatWithPortfolio({
          sessionId,
          message,
          signal: controller.signal,
          onToken: (text) => {
            acc += text;
            const ms = firstToken ? Math.round(performance.now() - t0) : undefined;
            firstToken = false;
            setExchange((prev) => ({
              ...prev,
              status: "streaming",
              reply: acc,
              ms: ms ?? prev.ms,
            }));
          },
        });

        setExchange((prev) => ({ ...prev, status: "done", reply: acc }));
        void refreshSuggestions(message);
      } catch (streamErr) {
        // A deliberate abort (new send / unmount) is not an error.
        if (controller.signal.aborted) {
          inFlight.current = false;
          return;
        }

        // Streaming failed — fall back to the non-streaming endpoint.
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
        }
      } finally {
        inFlight.current = false;
      }
    },
    [sessionId, refreshSuggestions]
  );
```

- [ ] **Step 4: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useChat.ts
git commit -m "Stream chat replies with non-streaming fallback in useChat"
```

---

### Task F6: `Console.tsx` — wire the live answer

**Files:**
- Modify: `frontend-v2/src/components/Console.tsx`

- [ ] **Step 1: Swap the reply hook**

Replace the import of `useTypewriter` so both hooks are available:

```ts
import { useTypewriter } from "../hooks/useTypewriter";
import { useStreamingText } from "../hooks/useStreamingText";
```

Replace the live-reply typewriter (currently lines ~92-95):

```tsx
  // Type the answer out character by character once it arrives.
  const { shown: typedReply, done: typedDone } = useTypewriter(
    exchange.status === "done" ? exchange.reply : ""
  );
```

with the streaming-aware version:

```tsx
  // Reveal the live answer as it streams in (smoothed), and keep revealing the
  // one-shot reply when we fell back to the non-streaming endpoint.
  const answering =
    exchange.status === "streaming" || exchange.status === "done";
  const { shown: typedReply, done: typedDone } = useStreamingText(
    answering ? exchange.reply : "",
    { streaming: exchange.status === "streaming" }
  );
```

- [ ] **Step 2: Treat streaming as "busy" for controls**

Replace:

```tsx
  const thinking = exchange.status === "thinking";
```

with:

```tsx
  const thinking = exchange.status === "thinking";
  const busy = thinking || exchange.status === "streaming";
```

Then update the three `disabled` / status usages that should also block during streaming:
- In `renderChips`, change `disabled={thinking}` → `disabled={busy}`.
- On the submit button, change `disabled={thinking || !sessionReady}` → `disabled={busy || !sessionReady}`.
- In the HUD status line, change `{thinking ? "● thinking" : "● ready"}` → `{busy ? "● thinking" : "● ready"}`.

- [ ] **Step 3: Render the answer during streaming and done**

Replace the readout block (currently the `{thinking && ...}`, `{exchange.status === "done" && ...}`, `{exchange.status === "error" && ...}` group, lines ~179-208) with:

```tsx
            <div className={styles.readout} aria-live="polite">
              {thinking && (
                <span>
                  ↳ thinking<span className={styles.caret} aria-hidden="true" />
                </span>
              )}
              {answering && (
                <span className={styles.answer}>
                  <span className={styles.qline}>› {exchange.query}</span>
                  <span className={styles.replyLine}>
                    {/* Visible typing is decorative; screen readers get one
                        clean copy of the full reply once it's complete. */}
                    <span aria-hidden="true">
                      ↳ {typedReply}
                      {!typedDone && <span className={styles.caret} />}
                    </span>
                    <span className={styles.srOnly}>
                      {exchange.status === "done" ? `↳ ${exchange.reply}` : ""}
                    </span>
                  </span>
                  {typedDone && (
                    <span className={styles.meta}>
                      replied in <b>{exchange.ms}ms</b>
                    </span>
                  )}
                </span>
              )}
              {exchange.status === "error" && (
                <span className={styles.miss}>
                  ↳ {exchange.error || "couldn't reach the assistant"}
                </span>
              )}
            </div>
```

Notes:
- `typedDone` is `false` throughout streaming (the hook's `done` requires `!streaming`), so "replied in Xms" only appears once the stream completes — and `exchange.ms` is the time-to-first-token captured in Task F5.
- The `sr-only` span stays empty until `done`, so assistive tech reads the final answer once instead of per token.

- [ ] **Step 4: Type-check and build**

Run: `npx tsc --noEmit && npm run build`
Expected: type-checks and builds with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/Console.tsx
git commit -m "Wire Console live answer to real streaming with smoothed reveal"
```

---

### Task F7: Full test + lint gate

**Files:** none.

- [ ] **Step 1: Run all frontend unit tests**

Run (from `frontend-v2/`): `npm run test`
Expected: PASS (sseParser + streamingReveal suites, 8 tests total).

- [ ] **Step 2: Run all backend tests**

Run (from `rag-backend/`): `python -m pytest -q`
Expected: all pass, coverage gate satisfied.

- [ ] **Step 3: Commit (if anything changed)**

No changes expected; skip if the tree is clean.

---

### Task F8: End-to-end manual verification

**Files:** none. Use the `verify` skill or run the stack locally.

- [ ] **Step 1: Start the backend**

From `rag-backend/` (with real `OPENAI_API_KEY` / Pinecone env set):

Run: `python -m uvicorn app.main:app --port 8000`

- [ ] **Step 2: Start the frontend**

From `frontend-v2/`:

Run: `npm run dev`
Open the printed local URL. The Vite proxy forwards `/api` → `localhost:8000`.

- [ ] **Step 3: Verify real streaming**

Ask a real question (e.g. "What's your experience?"). Confirm:
- The answer **starts appearing within ~1s** (words forming progressively), not after a long "thinking…" pause.
- The reveal is smooth (no jumpy bursts) — the smoothing hook is working.
- "replied in Xms" shows a small number (time-to-first-token) once the answer completes.
- In DevTools → Network, the `/chat/stream` request shows an incrementally growing `text/event-stream` response (not delivered all at once).

- [ ] **Step 4: Verify graceful fallback**

Temporarily simulate a streaming failure (e.g. stop the backend mid-answer, or rename the route to force a 404) and confirm the UI falls back to a single non-streaming reply via `/chat` and still renders correctly (no error state when `/chat` succeeds). Restore the route afterward.

- [ ] **Step 5: Verify reduced-motion**

Enable "Reduce motion" in OS settings; confirm the answer appears in full immediately (no per-character reveal) and "replied in Xms" still shows.

- [ ] **Step 6: Verify the seeded demo is unchanged**

Confirm the hero's seeded demo answer still types via the original `useTypewriter` and collapses on the first real query.

---

## Self-review — spec coverage

| Spec section | Task(s) |
| --- | --- |
| §1 `/chat/stream` endpoint + headers | B4 |
| §2 SSE envelope format | B1 (encoder), F1 (parser) |
| §3 orchestrator generator (off-topic / on-topic / error / persist) | B3 |
| §4 RAG `astream`, answer filtering, no retry | B2 |
| §5 `streamChatWithPortfolio` (fetch + reader + parser) | F2 |
| §6 `useChat` streaming status + fallback + AbortController | F5 |
| §7 `useStreamingText` smoothing (growing target) | F3, F4 |
| §8 Console wiring, a11y sr-only-on-done, TTFT ms | F6 |
| §9 `VERCEL_FORCE_PYTHON_STREAMING=1` | B5 |
| Testing — backend generator/encoder/extractor/endpoint | B1, B2, B3, B4 |
| Testing — frontend SSE parser + reveal math | F1, F3 |
| Non-goals (demo stays typewriter, suggestions unchanged) | F6 step 6, F5 (suggestions still fire on done) |
```
