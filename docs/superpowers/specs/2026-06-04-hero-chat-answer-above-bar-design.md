# Hero Chat — Render Live Answer Above the Bar (Demo Parity)

**Date:** 2026-06-04
**Status:** Approved design (Approach A)
**Area:** `frontend-v2` hero / Console component

## Problem

The hero has two chat experiences that read differently:

- **Demo chat (desired feel):** the seeded Q&A renders *above* the input bar, and
  the bar sits at the bottom of the block.
- **Real chat (current):** the input bar is on top and the streamed answer renders
  in `.readout` *below* it ([Console.tsx:185-217](../../../frontend-v2/src/components/Console.tsx#L185-L217)),
  pushing the suggestion chips down. The typed question is also never cleared from
  the input after submit ([Console.tsx:62-65](../../../frontend-v2/src/components/Console.tsx#L62-L65)),
  so it stays in the bar and is echoed below it.

When the user submits a real question, the demo collapses (bar jumps up) and the
answer appears below the bar. The user wants the real chat to behave like the demo:
on submit, the previous Q&A disappears, the new question moves up into the slot
above the bar, the bar clears for the next question, and the answer streams in
that same above-the-bar slot.

Both chats already share a single `exchange` object in `useChat` state (there is no
message history array), so "replace the previous Q&A" is already how the data
behaves. This is a layout + input-reset change, not a state-model change.

## Goals

- Live (real) chat renders its question + streaming answer in the **same region the
  demo occupies — above the input bar**.
- On submit (typed or chip), the **input clears** and is ready for the next question.
- Each new question **replaces** the previous Q&A (already true in state) with a
  **quick fade/slide** swap.
- The input bar and chips **stay below** the answer region; the region **grows
  naturally** with the answer (no fixed reserved height).
- Input/run remain **disabled while thinking or streaming** (no mid-stream submit).

## Non-Goals

- No conversation history / multi-turn transcript UI.
- No changes to the backend, `/chat/stream` SSE wiring, or `useChat` state shape.
- No interrupt/cancel-on-resubmit behavior.
- No fixed-height / internal-scroll answer area.

## Decisions (from brainstorming)

| Question | Decision |
| --- | --- |
| Swap style when a new question replaces the old | **Quick fade/slide** (~200-300ms), reusing existing easing vars |
| Answer area height | **Grow naturally** (push bar/chips down as it streams); no reserved min-height |
| Submit while streaming | **Disabled until done** (keep current `busy` gating) |
| Demo vs live answer placement | **Approach A:** one shared "stage" region above the bar |

## Approach A — Unified stage above the bar

Restructure the hero body into three stacked regions:

```
<stage>          ← shared slot ABOVE the bar
   idle     → demo Q&A (existing useTypewriter)
   thinking → ↳ thinking…
   active   → live Q&A: › question / ↳ streaming answer / replied in Xms
   error    → ↳ error message
<form .console>  ← input bar (prompt) ONLY; clears on submit
<chips>          ← starter chips / live suggestions (unchanged)
```

The current `.readout` block moves *out* of the `<form>` and *up* into this stage.
The demo and the live answer become mutually-exclusive states of the same region,
so they occupy identical space and the bar no longer jumps when the demo collapses.

### Rejected alternative — Approach B (CSS-only `flex order`)

Keep the JSX as-is, make `.console` a flex column, and use `order` to paint
`.readout` above `.prompt`. Rejected: visual order would diverge from DOM order
(harms tab/screen-reader flow), it doesn't fully remove the demo-collapse jump, and
the swap animation is awkward to attach to reordered elements.

## Detailed changes

### 1. Component structure — [Console.tsx](../../../frontend-v2/src/components/Console.tsx)

- Introduce a single stage element (e.g. `.stage`) above the `<form>` that renders,
  by `exchange.status`:
  - `idle` → the existing demo block (`demoTyped`, caret, `replied in {ms}ms`).
  - `thinking` → `↳ thinking…` with caret.
  - `streaming` / `done` → the existing `.answer` block (question line, streamed
    reply via `useStreamingText`, `replied in {ms}ms`, plus the screen-reader-only
    full reply).
  - `error` → the existing `.miss` message.
- Move the `.readout` JSX content into this stage; remove it from inside `<form>`.
- `<form className={styles.console}>` now contains only `.prompt` (input + run).

### 2. Input reset & focus — [submit / pick, Console.tsx:62-70](../../../frontend-v2/src/components/Console.tsx#L62-L70)

- In `submit`: after `send(value)`, call `setValue("")` and refocus the input.
- In `pick`: keep `send(q)` but clear `value` (`setValue("")`) instead of leaving the
  chip text in the bar, then refocus.
- `busy` gating and the disabled run button are unchanged.

### 3. Swap animation (fade/slide)

- Wrap the live answer node in an element **keyed by `exchange.query`** so a new
  question remounts the node and plays a short CSS enter transition (new question +
  answer fade in / slide up ~200-300ms) using the existing `--ease` / transition
  variables.
- Keep the demo's existing `data-collapsed` max-height + opacity transition for the
  idle → first-query handoff.

### 4. Layout / CSS — [Console.module.css](../../../frontend-v2/src/components/Console.module.css)

- Relocate `.readout` / `.answer` / `.qline` / `.replyLine` / `.meta` styling so the
  stage sits above `.prompt`.
- Stage grows naturally with content (no `min-height` lock); preserve current spacing
  rhythm between stage, bar, and chips.
- Add the enter-transition rule for the keyed answer node.

### 5. GSAP load-in — [Console.tsx:35-60](../../../frontend-v2/src/components/Console.tsx#L35-L60)

- Update the intro timeline selector that currently targets `.demo` so the new stage
  element animates in identically on first paint.

### 6. State / hooks — unchanged

- `useChat` (single `exchange`), `useStreamingText`, `useTypewriter`, and the
  `/chat/stream` SSE wiring are untouched. Purely presentational reorganization.

## Accessibility

- Keep `aria-live="polite"` on the stage so streamed answers are announced.
- Preserve the existing screen-reader-only full-reply copy (rendered once on `done`).
- Answer region remains above the input in DOM order, matching reading order.

## Behavior walkthrough (after change)

1. **Load:** demo Q&A types out above the bar; bar empty below; starter chips below.
2. **Submit "What's your strongest tech stack?":** input clears; demo collapses and
   the question slides up into the same slot; `↳ thinking…` then the answer streams
   there; `replied in Xms` appears; bar stays empty and focused; live suggestion
   chips replace starters.
3. **Submit a second question:** previous Q&A fades out, new question slides up in the
   same slot, answer streams; bar clears again. No content ever renders below the bar.

## Verification

- Frontend: `npm run test` (vitest) for any affected component/unit tests.
- Manual: run the app, submit a typed question and a chip question, confirm the
  answer renders above the bar, the input clears, the previous Q&A is replaced with a
  fade/slide, and chips/bar are pushed down (not the answer below the bar).
- Reduced motion: confirm `prefers-reduced-motion` still skips the GSAP intro and the
  swap degrades gracefully.
