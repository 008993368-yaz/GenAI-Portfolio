# Mobile Hero — "Ask-me" Instrument (frontend-v2)

**Date:** 2026-05-31
**Status:** Approved design, ready for implementation plan
**Scope:** `frontend-v2` Hero (`Console`) section, mobile viewport only. Proof-of-concept for a broader mobile pass.

---

## Problem

On desktop, each section of the portfolio reads like a little instrument — an interactive
2D embedding scatter plot, a live `corpus.meta` HUD, score meters. On mobile, most of that
visual character is stripped away and the page collapses into prose and flat lists, so it
reads like a resume / document rather than a living product.

The user prioritized two sections (**Hero/Console** and **About/Context**) and chose to
**prove the approach on the Hero first** before committing to the rest. This spec covers the
Hero only.

### Current mobile Hero (what it loses)

The desktop Hero is a two-column grid: a main column (kicker, animated headline, sub-paragraph,
query console, suggestion chips) and an aside HUD panel (`corpus.meta` — sections / skills /
projects counts). On mobile:

- The HUD panel is hidden below 940px — its "instrument" character disappears entirely.
- What remains is headline + a long sub-paragraph + a search box + chips: text-forward, static.

---

## Goal

Make the mobile Hero feel like a **living instrument you talk to**, not a paragraph you read —
while keeping the existing "retrieval engine" dark theme, IBM Plex Mono type, and lime
(`--signal`) accent. Reduce prose; add purposeful motion tied to real state.

**Non-goals:** No change to the desktop Hero. No backend changes. No other sections (those
follow as a separate effort once this is validated on a real phone).

---

## Design

Mobile-only treatment, gated at **≤720px** (the breakpoint already used by `EmbeddingSpace`
and `Results`). Above 720px the Hero is unchanged.

### Layout, top → bottom

1. **Status bar** — unchanged (`yazhini.systems` · `● ready`).
2. **Kicker** — `// full-stack & gen-ai engineer · redlands ca` (kept; orients recruiters).
3. **Headline** — brand line "I build software that *retrieves, reasons, responds*." with the
   existing animated verbs + lime caret (kept).
4. **Seeded chat demo** *(replaces the sub-paragraph on mobile)* — a canned exchange that types
   itself out on load:
   - `› what do you build?`
   - `↳ Grounded, fast AI — RAG systems, agents, and the full stack around them.`
   - `replied in 240ms`
5. **Query input** — `› ask anything…` with the `run ↵` button (kept visible on mobile).
6. **Two chips** — `› Experience` · `› Skills` (one word each).
7. **Corpus signal meter** — a slim bottom line: `corpus ● live` + a 7-bar equalizer.

### Behaviors

**Seeded chat demo (replaces sub-paragraph).**
A mobile-only demo block sits **above** the query input. It is visible only while
`exchange.status === "idle"` (i.e., before the visitor asks anything). Its answer text types
out via the existing `useTypewriter` hook. The instant a visitor submits a real query
(status leaves `idle`), the demo **fades out**; the live answer renders **below** the input in
the existing `readout`, exactly as it does today. So the seeded demo never competes with a
real answer, and live behavior is unchanged. The demo copy (question, answer, latency) lives
in `profile.ts` so it is editable as content.

**Corpus signal meter (the equalizer the user kept).**
A slim line at the bottom of the Hero: `corpus ● live` on the left, a 7-bar equalizer on the
right. The bars **idle as a gentle low-amplitude pulse** and **spike to full height while
`exchange.status === "thinking"`**, then settle — a genuine activity meter wired to the chat
state, not decoration. Carries the lime→deep-lime palette already used elsewhere.

**Chips (mobile = two, one word each).**
Mobile shows exactly **two** chips, **Experience** and **Skills**. Each chip displays a single
word but sends a fuller natural-language question to the assistant for a better answer
(e.g. `Skills` → "What's your strongest tech stack?"). This requires splitting the chip's
display label from its sent query. After a real query, `useChat` refreshes suggestions from
the backend; on mobile the rendered list is **capped to two**. The desktop chip set (current
three) is **unchanged**.

### Removed / hidden on mobile

- The long sub-paragraph (`profile.hero.sub`) — replaced by the chat demo.
- The `corpus.meta` HUD aside — its character returns via the signal meter.
- The numeric stat strip explored in mockups — intentionally dropped per user.

### Accessibility & reduced motion

- The demo answer exposes one clean, un-typed copy to screen readers using the existing
  `.srOnly` pattern; the visible typed copy is `aria-hidden`.
- The equalizer and caret freeze (no animation) under `prefers-reduced-motion`; the demo answer
  appears in full immediately (already handled by `useTypewriter`).
- The signal meter is decorative — `aria-hidden`. Chips remain real, focusable buttons.

---

## Data changes (`src/data/profile.ts`)

- Add `hero.demo`: `{ q: string; a: string; ms: number }` — the seeded exchange copy.
- Add a mobile chip set with split label/query, e.g. `hero.mobileSuggestions`:
  `[{ label: "Experience", q: "Tell me about your experience" },
    { label: "Skills", q: "What's your strongest tech stack?" }]`.
- Leave `hero.suggestions` (desktop seed, three entries) unchanged.

## Implementation touch-points

- **`src/components/Console.tsx`** — render the mobile-only seeded demo block (gated on
  `exchange.status === "idle"` + viewport), the signal meter, and the two mobile chips; cap
  mobile chips to two after refresh.
- **`src/components/Console.module.css`** — mobile (`≤720px`) layout: hide `.sub`, lay out demo
  above input, style the `corpus ● live` signal line and equalizer (idle vs `thinking`
  amplitude via a state class), reduced-motion freeze.
- **`src/data/profile.ts`** — the data additions above.
- No changes to `useChat`, `useTypewriter`, `chatApi`, or the backend.

---

## Out of scope (follow-ups, after validating on a real phone)

- About/Context: condense the two prose paragraphs into a more visual module.
- Skills: a mobile-native take on the embedding viz (currently a flat chip list).
- Experience: break up the five dense bullets.

These are deliberately deferred until the Hero approach is confirmed on-device.

## Open questions

None — design approved. Recommended choices taken: seeded demo above the input (fades on first
real query); two chips scoped to mobile only.
