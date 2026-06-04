# Hero Chat — Render Live Answer Above the Bar (Demo Parity) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the real (streaming) hero chat behave like the seeded demo — render the question + streaming answer in a single region *above* the input bar, clear the bar on submit, and swap each new Q&A in with a quick fade/slide instead of stacking answers below the bar.

**Architecture:** Purely presentational. The current answer area (`.readout`) is moved out of the `<form>` to sit directly above the input bar, next to the demo block, so both occupy the same vertical slot (demo when idle, live Q&A when active). The submit/chip handlers clear the input. A React `key` on the answer node tied to the current question replays a CSS enter animation on each new question. No backend, state, or hook changes.

**Tech Stack:** React 18 + TypeScript, Vite, CSS Modules, GSAP (intro only), vitest (existing pure-logic tests only — no component tests).

> **Verification note (user decision):** This repo has no component-test harness (no jsdom / React Testing Library), and the change is layout/animation that jsdom cannot assert. Per the user's explicit choice, verification is **manual + build + existing unit tests**, not TDD test-first. This overrides the writing-plans TDD default (user instructions take precedence). Each task's verification runs the type-check/build, keeps the existing vitest suite green, and manually exercises the behavior in the running app.

**Spec:** [docs/superpowers/specs/2026-06-04-hero-chat-answer-above-bar-design.md](../specs/2026-06-04-hero-chat-answer-above-bar-design.md)

**Key files:**
- Modify: `frontend-v2/src/components/Console.tsx` (handlers + JSX move)
- Modify: `frontend-v2/src/components/Console.module.css` (reposition `.readout`, add enter animation)

**What does NOT change:** `frontend-v2/src/hooks/useChat.ts`, `frontend-v2/src/hooks/useStreamingText.ts`, `frontend-v2/src/hooks/useTypewriter.ts`, `frontend-v2/src/services/chatApi.ts`, and the GSAP intro timeline (the `.demo` and `.console` selectors it targets still exist).

---

## Task 1: Clear and refocus the input on submit and chip select

**Why:** Today `submit` leaves the typed text in the bar, and `pick` sets the bar to the chip's text (`setValue(q)`). The demo behavior wants an empty bar ready for the next question.

**Files:**
- Modify: `frontend-v2/src/components/Console.tsx:62-70`

- [ ] **Step 1: Update the `submit` and `pick` handlers**

Replace the current handlers ([Console.tsx:62-70](../../../frontend-v2/src/components/Console.tsx#L62-L70)):

```tsx
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send(value);
  };

  const pick = (q: string) => {
    setValue(q);
    send(q);
  };
```

with:

```tsx
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    send(value);
    setValue("");
    inputRef.current?.focus();
  };

  const pick = (q: string) => {
    send(q);
    setValue("");
    inputRef.current?.focus();
  };
```

Notes: `send` already trims its argument and no-ops on empty/in-flight ([useChat.ts:70-71](../../../frontend-v2/src/hooks/useChat.ts#L70-L71)), so clearing right after the call is safe — `send` has already captured the message. `inputRef` is already defined ([Console.tsx:13](../../../frontend-v2/src/components/Console.tsx#L13)).

- [ ] **Step 2: Type-check / build**

Run (from `frontend-v2/`): `npm run build`
Expected: `tsc --noEmit` and `vite build` both succeed with no errors.

- [ ] **Step 3: Existing unit tests stay green**

Run (from `frontend-v2/`): `npm run test`
Expected: PASS (the existing `streamingReveal.test.ts` and `sseParser.test.ts` are unaffected).

- [ ] **Step 4: Manual check**

Run (from `frontend-v2/`): `npm run dev`, open the app.
- Type a question and press Enter (or click `run`): the input bar goes **empty** and keeps focus.
- Click a chip: the bar does **not** fill with the chip text; it stays empty and focused.
- (At this point the answer still renders *below* the bar — that is fixed in Task 2. This task only verifies the bar clears.)

- [ ] **Step 5: Commit**

```bash
git add frontend-v2/src/components/Console.tsx
git commit -m "Clear and refocus hero chat input on submit/chip select"
```

---

## Task 2: Move the answer region above the bar and add the fade/slide swap

**Why:** The answer (`.readout`) currently lives inside the `<form>`, below the input ([Console.tsx:185-217](../../../frontend-v2/src/components/Console.tsx#L185-L217)). Moving it above the form puts the live Q&A in the same slot the demo uses, so the bar no longer jumps and answers never stack below it. A `key` on the answer node replays an enter animation per question.

**Files:**
- Modify: `frontend-v2/src/components/Console.tsx` (move `.readout` block; add `key`)
- Modify: `frontend-v2/src/components/Console.module.css` (reposition `.readout`; add `answerIn` animation)

- [ ] **Step 1: Move the `.readout` block out of the form and above it, and key the answer node**

In [Console.tsx](../../../frontend-v2/src/components/Console.tsx), the region from the demo block through the form (current lines 137-218) becomes the following. Two changes: (a) the `.readout` `<div>` now sits **between** the demo block and the `<form>` instead of inside it, and (b) the `.answer` span gains `key={exchange.query}`.

```tsx
          <div
            className={styles.demo}
            data-collapsed={exchange.status !== "idle"}
          >
            <span className={styles.demoQ} aria-hidden="true">
              › {profile.hero.demo.q}
            </span>
            <span className={styles.demoA}>
              <span aria-hidden="true">
                ↳ {demoTyped}
                {!demoDone && <span className={styles.caret} />}
              </span>
              <span className={styles.srOnly}>
                {profile.hero.demo.q} — {profile.hero.demo.a}
              </span>
            </span>
            {demoDone && (
              <span className={styles.demoMeta} aria-hidden="true">
                replied in <b>{profile.hero.demo.ms}ms</b>
              </span>
            )}
          </div>

          <div className={styles.readout} aria-live="polite">
            {thinking && (
              <span>
                ↳ thinking<span className={styles.caret} aria-hidden="true" />
              </span>
            )}
            {answering && (
              <span className={styles.answer} key={exchange.query}>
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
                disabled={busy || !sessionReady}
              >
                run ↵
              </button>
            </div>
          </form>
```

The `<form>` now contains only `.prompt`; the `.readout` `<div>` is no longer a child of the form. Nothing else in the file changes.

- [ ] **Step 2: Reposition `.readout` in the CSS (above the bar, no empty stub)**

In [Console.module.css](../../../frontend-v2/src/components/Console.module.css), replace the current `.readout` rule (lines 171-178):

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

with:

```css
.readout {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-top: clamp(1.1rem, 0.8rem + 1vw, 1.7rem);
  padding-left: 0.2rem;
  max-width: 640px;
}

/* When idle there is no inner content; collapse the slot so the bar sits
   directly under the demo with no empty gap. */
.readout:empty {
  margin-top: 0;
}
```

Changes: dropped `min-height: 1.4em` (no reserved empty space), changed `margin-top` to the demo-matching clamp so the answer sits where the demo did, added `max-width: 640px` to align with the input bar, and added the `:empty` rule to remove the slot when there is no answer/thinking/error showing.

- [ ] **Step 3: Add the fade/slide enter animation to `.answer`**

In [Console.module.css](../../../frontend-v2/src/components/Console.module.css), replace the current `.answer` rule (lines 180-184):

```css
.answer {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
```

with:

```css
.answer {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  animation: answerIn 0.28s var(--ease) both;
}

@keyframes answerIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

The `key={exchange.query}` from Step 1 remounts this node on each new question, so `answerIn` replays — the new question slides up and fades in. The `key` stays constant while a single answer streams, so the animation does **not** retrigger token-by-token. (Edge case: asking the exact same question twice in a row keeps the same `key` and will not replay the animation — acceptable.)

- [ ] **Step 4: Disable the swap animation under reduced motion**

In [Console.module.css](../../../frontend-v2/src/components/Console.module.css), extend the existing reduced-motion block (lines 368-373):

```css
@media (prefers-reduced-motion: reduce) {
  .caret,
  .cueArrow {
    animation: none;
  }
}
```

to:

```css
@media (prefers-reduced-motion: reduce) {
  .caret,
  .cueArrow,
  .answer {
    animation: none;
  }
}
```

- [ ] **Step 5: Type-check / build**

Run (from `frontend-v2/`): `npm run build`
Expected: `tsc --noEmit` and `vite build` both succeed with no errors.

- [ ] **Step 6: Existing unit tests stay green**

Run (from `frontend-v2/`): `npm run test`
Expected: PASS.

- [ ] **Step 7: Manual verification**

Run (from `frontend-v2/`): `npm run dev`, open the app. (The streaming endpoint needs the `rag-backend` running; if it is not up, the code falls back to the non-streaming endpoint — either way the layout behavior is the same to verify.)

Confirm:
1. **Load:** the demo Q&A types out above the bar; the input is empty; chips sit below the bar.
2. **First real question (typed):** input clears; the demo collapses and the question appears in that same slot above the bar; `↳ thinking…` then the answer streams there; `replied in Xms` shows; **nothing renders below the bar**; the bar stays empty and focused; chips switch to live suggestions.
3. **Second question (typed or chip):** the previous Q&A is replaced and the new question **fades/slides up** (`answerIn`), then its answer streams. No stacking.
4. **Idle gap:** before the first question there is no empty gap between the demo and the bar (the `:empty` rule).
5. **Reduced motion:** with OS "reduce motion" enabled, the new question appears without the slide animation and all content is still readable.

- [ ] **Step 8: Commit**

```bash
git add frontend-v2/src/components/Console.tsx frontend-v2/src/components/Console.module.css
git commit -m "Render hero live answer above the bar with fade/slide swap"
```

---

## Self-Review

**Spec coverage:**
- Live answer renders above the bar in the demo's slot → Task 2 Step 1-2. ✓
- Input clears + refocus on submit/chip → Task 1. ✓
- Each new question replaces the previous with a quick fade/slide → Task 2 Step 1 (`key`) + Step 3 (`answerIn`). ✓
- Grows naturally, no reserved height → Task 2 Step 2 (dropped `min-height`, no fixed height). ✓
- Input/run disabled while thinking/streaming → unchanged (`busy` gating at [Console.tsx:179](../../../frontend-v2/src/components/Console.tsx#L179)), preserved in Task 2 Step 1. ✓
- Bar and chips stay below the answer → Task 2 (readout moved above the form; chips already below). ✓
- `aria-live` + screen-reader full reply preserved → Task 2 Step 1 keeps both. ✓
- GSAP intro unchanged (`.demo`/`.console` still exist) → confirmed in plan header. ✓
- Reduced-motion handled → Task 2 Step 4. ✓
- State/hooks/backend unchanged → none touched. ✓

**Placeholder scan:** No TBD/TODO; every code step shows the full before/after. ✓

**Type/name consistency:** Reuses existing identifiers only — `exchange`, `value`, `setValue`, `send`, `inputRef`, `styles.readout`, `styles.answer`, `styles.console`, `styles.demo`. New CSS names: `answerIn` keyframe and `.readout:empty` selector, both defined where used. ✓
