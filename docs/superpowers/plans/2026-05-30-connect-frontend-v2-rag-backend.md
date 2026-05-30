# Connect frontend-v2 Console to RAG Backend — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace frontend-v2's fake local Console search with real RAG-backend chat, showing the latest question/answer exchange inline.

**Architecture:** Add a Vite dev proxy so the browser reaches the FastAPI backend at `/api`. A typed `chatApi.ts` client wraps `POST /chat` and `POST /suggestions`. A new `useChat` hook owns session id, the latest-exchange state, and live suggestion chips. The existing `Console` component is rewired from `useSearch` to `useChat`; the local keyword scorer (`useSearch.ts`) is deleted.

**Tech Stack:** React 18 + TypeScript, Vite 5, CSS modules. No test framework in frontend-v2 — verification is `npm run build` (which runs `tsc --noEmit && vite build`) plus a final manual end-to-end check against the running backend.

**Spec:** `docs/superpowers/specs/2026-05-30-connect-frontend-v2-rag-backend-design.md`

---

## File Structure

| File | Responsibility |
|------|----------------|
| `frontend-v2/vite.config.ts` | Dev proxy `/api` → `http://localhost:8000` |
| `frontend-v2/src/services/chatApi.ts` | Typed fetch client for `/chat` and `/suggestions` |
| `frontend-v2/src/hooks/useChat.ts` | Session id, latest-exchange state, suggestions, `send()` |
| `frontend-v2/src/hooks/useSearch.ts` | **Deleted** (replaced by useChat) |
| `frontend-v2/src/components/Console.tsx` | Hero UI rewired to chat |
| `frontend-v2/src/components/Console.module.css` | Multi-line answer readout + thinking state |
| `frontend-v2/.env.example` | Documents `VITE_API_BASE_URL` (committed) |
| `frontend-v2/.env` | Points dev at the deployed backend (gitignored) |

**Note on commands:** all paths below are relative to the repo root `c:\Users\yazhi\OneDrive\Desktop\Frontend\landing-page-yz`. Run `npm` commands from inside `frontend-v2`.

---

## Task 1: Add the Vite dev proxy

**Files:**
- Modify: `frontend-v2/vite.config.ts`

- [ ] **Step 1: Replace the config with the proxied version**

Replace the entire contents of `frontend-v2/vite.config.ts` with:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
```

- [ ] **Step 2: Verify the build still passes**

Run (from `frontend-v2`): `npm run build`
Expected: PASS — `tsc --noEmit` reports no errors and `vite build` completes. (The proxy only affects `vite dev`, but this confirms the config still parses.)

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/vite.config.ts
git commit -m "feat(frontend-v2): add dev proxy to RAG backend"
```

---

## Task 2: Add the typed API client

**Files:**
- Create: `frontend-v2/src/services/chatApi.ts`

- [ ] **Step 1: Create the API client**

Create `frontend-v2/src/services/chatApi.ts` with:

```ts
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
```

- [ ] **Step 2: Verify the build passes**

Run (from `frontend-v2`): `npm run build`
Expected: PASS — no TypeScript errors. (The new file is not imported yet; this confirms it type-checks on its own.)

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/services/chatApi.ts
git commit -m "feat(frontend-v2): add typed RAG chat API client"
```

---

## Task 3: Add the useChat hook

**Files:**
- Create: `frontend-v2/src/hooks/useChat.ts`

- [ ] **Step 1: Create the hook**

Create `frontend-v2/src/hooks/useChat.ts` with:

```ts
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

const SEED_SUGGESTIONS = profile.hero.suggestions.map((s) => s.q);

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
        setSuggestions(data.suggestions.slice(0, 3));
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
```

- [ ] **Step 2: Verify the build passes**

Run (from `frontend-v2`): `npm run build`
Expected: PASS — no TypeScript errors. (Hook is not imported yet; confirms it type-checks.)

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/hooks/useChat.ts
git commit -m "feat(frontend-v2): add useChat hook for backend chat"
```

---

## Task 4: Rewire the Console component to chat

**Files:**
- Modify: `frontend-v2/src/components/Console.tsx`

- [ ] **Step 1: Replace the Console component**

Replace the entire contents of `frontend-v2/src/components/Console.tsx` with the version below. Changes from the original: imports `useChat` instead of `useSearch`; `submit`/`pick` call `send`; the readout renders the latest exchange by status; chips come from live `suggestions`; the run button disables while thinking; the HUD status indicator reflects connection state. The GSAP load-in animation is unchanged.

```tsx
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { profile } from "../data/profile";
import { useChat } from "../hooks/useChat";
import styles from "./Console.module.css";

const skillCount = profile.skills.reduce((n, g) => n + g.items.length, 0);

export default function Console() {
  const root = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const { exchange, suggestions, send, sessionReady } = useChat();

  // Global ⌘K / Ctrl-K and status-bar button focus the query.
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focus();
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("focus-query", focus);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("focus-query", focus);
    };
  }, []);

  // Load-in choreography
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from(`.${styles.kicker}`, { opacity: 0, y: 12, duration: 0.6 })
        .from(
          `.${styles.headLine} > span`,
          { yPercent: 110, duration: 0.95, stagger: 0.08, ease: "power4.out" },
          "-=0.25"
        )
        .from(`.${styles.sub}`, { opacity: 0, y: 14, duration: 0.7 }, "-=0.5")
        .from(`.${styles.console}`, { opacity: 0, y: 18, duration: 0.7 }, "-=0.45")
        .from(
          `.${styles.chip}`,
          { opacity: 0, y: 10, duration: 0.5, stagger: 0.06 },
          "-=0.4"
        )
        .from(`.${styles.hud}`, { opacity: 0, duration: 0.8 }, "-=0.6");
    }, root);
    return () => ctx.revert();
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send(value);
  };

  const pick = (q: string) => {
    setValue(q);
    send(q);
  };

  const verbs = profile.hero.headVerbs;
  const thinking = exchange.status === "thinking";

  return (
    <section className={styles.hero} id="top" ref={root}>
      <div className={styles.scan} aria-hidden="true" />

      <div className={styles.shell}>
        <div className={styles.main}>
          <p className={styles.kicker}>
            <span className={styles.comment}>//</span> {profile.hero.kicker}
          </p>

          <h1 className={styles.head}>
            <span className={styles.headLine}>
              <span>{profile.hero.headStart}</span>
            </span>
            <span className={styles.headLine}>
              <span className={styles.verbs}>
                {verbs.map((v, i) => (
                  <span key={v}>
                    <span className={styles.verb}>{v}</span>
                    {i < verbs.length - 1
                      ? i === verbs.length - 2
                        ? ", and "
                        : ", "
                      : "."}
                  </span>
                ))}
                <span className={styles.caret} aria-hidden="true" />
              </span>
            </span>
          </h1>

          <p className={styles.sub}>{profile.hero.sub}</p>

          <form className={styles.console} onSubmit={submit}>
            <div className={styles.prompt}>
              <span className={styles.chevron} aria-hidden="true">
                ›
              </span>
              <input
                ref={inputRef}
                className={styles.input}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={profile.hero.placeholder}
                aria-label="Ask the assistant"
                spellCheck={false}
                autoComplete="off"
              />
              <button
                type="submit"
                className={styles.run}
                aria-label="Send message"
                disabled={thinking || !sessionReady}
              >
                run ↵
              </button>
            </div>

            <div className={styles.readout} aria-live="polite">
              {thinking && (
                <span>
                  ↳ thinking<span className={styles.caret} aria-hidden="true" />
                </span>
              )}
              {exchange.status === "done" && (
                <span className={styles.answer}>
                  <span className={styles.qline}>› {exchange.query}</span>
                  <span className={styles.replyLine}>↳ {exchange.reply}</span>
                  <span className={styles.meta}>
                    replied in <b>{exchange.ms}ms</b>
                  </span>
                </span>
              )}
              {exchange.status === "error" && (
                <span className={styles.miss}>
                  ↳ {exchange.error || "couldn't reach the assistant"}
                </span>
              )}
            </div>
          </form>

          <div className={styles.chips}>
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.chip}
                onClick={() => pick(s)}
                disabled={thinking}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <aside className={styles.hud} aria-hidden="true">
          <div className={styles.hudHead}>
            <span>corpus.meta</span>
            <span className={styles.hudOk}>{thinking ? "● thinking" : "● ready"}</span>
          </div>
          <ul className={styles.hudList}>
            <li>
              <span>sections</span>
              <span>{profile.searchIndex.length}</span>
            </li>
            <li>
              <span>skills</span>
              <span>{skillCount}</span>
            </li>
            <li>
              <span>projects</span>
              <span>{profile.projects.length}</span>
            </li>
          </ul>
        </aside>
      </div>

      <a href="#about" className={styles.cue}>
        scroll
        <span className={styles.cueArrow}>↓</span>
      </a>
    </section>
  );
}
```

- [ ] **Step 2: Verify the build passes**

Run (from `frontend-v2`): `npm run build`
Expected: PASS — no TypeScript errors. The new CSS class names (`answer`, `qline`, `replyLine`, `meta`) are referenced here but added in Task 6; CSS modules are typed loosely (`styles` is `Record<string, string>`-like by default), so missing classes do **not** fail `tsc`. They will render unstyled until Task 6. This is expected mid-plan.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/components/Console.tsx
git commit -m "feat(frontend-v2): rewire Console to backend chat"
```

---

## Task 5: Delete the obsolete useSearch hook

**Files:**
- Delete: `frontend-v2/src/hooks/useSearch.ts`

(Verified during planning: `useSearch` is imported only by `Console.tsx`, which no longer references it after Task 4. `scrollToId` from `lib/scroller.ts` is still used by `useSmoothScroll.ts`, so `scroller.ts` stays.)

- [ ] **Step 1: Delete the file**

```bash
git rm frontend-v2/src/hooks/useSearch.ts
```

- [ ] **Step 2: Verify no dangling references remain**

Run (from repo root): `git grep -n "useSearch" frontend-v2/src` (PowerShell: `git grep -n "useSearch" frontend-v2/src`)
Expected: no output (exit code 1 / no matches).

- [ ] **Step 3: Verify the build passes**

Run (from `frontend-v2`): `npm run build`
Expected: PASS — no TypeScript errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(frontend-v2): remove local keyword search hook"
```

---

## Task 6: Style the answer readout and thinking state

**Files:**
- Modify: `frontend-v2/src/components/Console.module.css`

- [ ] **Step 1: Allow the readout to grow, and add answer styles**

In `frontend-v2/src/components/Console.module.css`, find the existing `.readout` rule:

```css
.readout {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-top: 0.8rem;
  padding-left: 0.2rem;
  min-height: 1.4em;
}
```

Replace it with (keeps the same rule, then adds the answer block styles immediately after):

```css
.readout {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-top: 0.8rem;
  padding-left: 0.2rem;
  min-height: 1.4em;
}

.answer {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 10rem;
  overflow-y: auto;
  padding-right: 0.4rem;
}

.qline {
  color: var(--text-mid);
}

.replyLine {
  color: var(--text);
  line-height: 1.55;
  white-space: pre-wrap;
}

.meta {
  color: var(--text-faint);
}

.meta b {
  color: var(--signal);
  font-weight: 500;
}
```

- [ ] **Step 2: Verify the build passes**

Run (from `frontend-v2`): `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/components/Console.module.css
git commit -m "style(frontend-v2): answer readout and thinking state"
```

---

## Task 7: Configure the API base URL

We point frontend-v2 at the **already-deployed** backend (the same one v1 uses,
per `frontend/.env`), so development/verification needs no local backend. The
real URL lives in a gitignored `.env`; `.env.example` documents the knob.

**Files:**
- Create: `frontend-v2/.env.example` (committed)
- Create: `frontend-v2/.env` (gitignored — NOT committed)

- [ ] **Step 1: Create the env example (committed)**

Create `frontend-v2/.env.example` with:

```
# Base URL for the RAG backend API (no trailing slash).
# Leave blank to use the Vite dev proxy (/api -> http://localhost:8000).
# Set to a full origin to call a deployed backend directly, e.g.:
#   VITE_API_BASE_URL=https://gen-ai-portfolio-theta.vercel.app
VITE_API_BASE_URL=
```

- [ ] **Step 2: Create the local .env pointing at the deployed backend (gitignored)**

Create `frontend-v2/.env` with the same value v1 uses in `frontend/.env`:

```
VITE_API_BASE_URL=https://gen-ai-portfolio-theta.vercel.app
```

When this full URL is set, the browser calls the deployed backend directly and
the Vite `/api` proxy is bypassed. (The deployed backend's CORS already allows
`localhost:5173`, since v1 dev uses this exact setup.)

- [ ] **Step 3: Confirm .env is gitignored (do NOT commit it)**

Run (from repo root): `git check-ignore frontend-v2/.env`
Expected: prints `frontend-v2/.env` (confirms it is ignored). If it prints
nothing, STOP and do not commit the file.

- [ ] **Step 4: Commit only the example**

```bash
git add frontend-v2/.env.example
git commit -m "docs(frontend-v2): document VITE_API_BASE_URL"
```

---

## Task 8: Manual end-to-end verification

No automated tests exist in frontend-v2; this task verifies the integration by
hand against the **deployed** backend configured in Task 7 (no local backend
needed).

- [ ] **Step 1: Sanity-check the deployed backend is reachable**

Run: `curl https://gen-ai-portfolio-theta.vercel.app/`
Expected: JSON like `{"status":"healthy","service":"Portfolio RAG Backend",...}`.
(If it errors, the deployment may be cold/asleep — retry once.)

- [ ] **Step 2: Start the frontend dev server**

Run (from `frontend-v2`): `npm run dev`
Expected: Vite serves on `http://localhost:5173`. The app reads
`VITE_API_BASE_URL` from `.env` and calls the deployed backend directly.

- [ ] **Step 3: Verify a chat exchange**

In the browser at `http://localhost:5173`:
1. Type a question (e.g. "what did you do at Accenture?") and press Enter / click `run ↵`.
2. Expected: readout shows `↳ thinking…` (caret blinks), then `› your question`, `↳ <grounded reply>`, and `replied in <N>ms` with a real number. HUD shows `● thinking` during the request, `● ready` after.
3. Expected: suggestion chips refresh to new questions after the reply.
4. Click a suggestion chip. Expected: it sends as a new message and a new reply renders.
5. Ask a follow-up that depends on the prior turn (e.g. "what tools did that use?"). Expected: reply stays in context (server-side session memory).

- [ ] **Step 4: Verify the error path**

Temporarily point at a bad backend: stop the dev server, set
`VITE_API_BASE_URL=https://gen-ai-portfolio-theta.vercel.app/does-not-exist`
in `frontend-v2/.env`, restart `npm run dev`, and send a message. (Or use
browser devtools to set Network → Offline and send a message.)
Expected: readout shows `↳ <error message>` in the muted/miss style; the page
does not crash; no fallback search runs. Afterward, restore `.env` to the real
URL and restart the dev server.

- [ ] **Step 5: Confirm the production build**

Run (from `frontend-v2`): `npm run build`
Expected: PASS — clean `tsc --noEmit` and successful `vite build`.

- [ ] **Step 6: (Optional) Final commit if any tweaks were needed**

If manual testing surfaced small fixes, commit them with a clear message. Otherwise this task is verification-only.

---

## Self-Review

**Spec coverage:**
- Vite proxy → Task 1. ✓
- `chatApi.ts` typed client (`/chat`, `/suggestions`, base-URL handling, error unwrap) → Task 2. ✓
- `useChat.ts` (session id in localStorage, latest-exchange state, seeded + refreshed suggestions, real ms, send guard) → Task 3. ✓
- Console rewire (submit/chip → send, readout by status, live chips, run disabled while thinking, HUD status flip, drop scrollToId) → Task 4. ✓
- Delete `useSearch.ts` (backend-only, no fallback) → Task 5. ✓
- CSS: readout max-height/overflow + answer/thinking styling → Task 6. ✓
- `.env.example` for `VITE_API_BASE_URL` → Task 7. ✓
- Manual testing approach (backend + dev server, success + error paths) → Task 8. ✓
- Backend unchanged → no backend tasks. ✓

**Placeholder scan:** No TBD/TODO/vague steps; every code step shows full code; every run step states the expected result.

**Type consistency:** `ChatExchange` fields (`status`, `query`, `reply`, `ms`, `error`) and `ChatStatus` values (`idle`/`thinking`/`done`/`error`) defined in Task 3 are used identically in Task 4. `useChat` returns `{ exchange, suggestions, send, sessionReady }` (Task 3) — exactly the names destructured in Task 4. `chatApi` exports `chatWithPortfolio` / `getSuggestions` (Task 2) — the names imported in Task 3. CSS classes `answer`/`qline`/`replyLine`/`meta` referenced in Task 4 are defined in Task 6.
