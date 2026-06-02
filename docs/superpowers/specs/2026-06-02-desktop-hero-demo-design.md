# Desktop Hero — Chat Demo Replaces Bio Line (frontend-v2)

**Date:** 2026-06-02
**Status:** Approved design, ready for implementation plan
**Scope:** `frontend-v2` Hero (`Console`) section, desktop/tablet viewport (>720px). Builds on the [mobile-hero instrument](2026-05-31-mobile-hero-instrument-design.md) work.

---

## Problem

The mobile Hero already shows a seeded, self-typing chat demo ("› what do you build?" → "↳ Grounded, fast AI — RAG systems, agents, and the full stack around them." → "replied in 240ms") in place of the bio sub-paragraph. The desktop Hero still shows the static bio line:

> Master's CS candidate and ex-Accenture engineer working across React, FastAPI, and LangChain to ship grounded, fast AI.

The user wants the **same demo on desktop too**, in place of that bio line — so the "living instrument you talk to" character carries across all viewports instead of being mobile-only.

### Current behavior (the existing mobile/desktop swap)

The demo block (`.demo`) and the bio (`.sub`) are both rendered in `Console.tsx`, and CSS swaps them by breakpoint:

- `.demo` is `display: none` by default and only revealed at `max-width: 720px`.
- `.sub` is shown by default and hidden at `max-width: 720px`.
- The demo's answer typewriter (`useTypewriter(profile.hero.demo.a)`) and its `data-collapsed` collapse wiring already run on **every** viewport — only CSS hides the demo on desktop.

So the demo is functionally present on desktop already; it is purely CSS-hidden.

---

## Goal

On desktop (>720px), show the seeded chat demo where the bio line used to be, scaled up to suit the wider hero column, and remove the bio line entirely. Keep the mobile Hero pixel-identical to today.

**Non-goals:** No backend changes. No changes to `useChat`, `useTypewriter`, or `chatApi`. No change to the `corpus.meta` HUD aside (stays as-is). No change to mobile sizing or behavior. No other sections.

---

## Design

### Markup (`src/components/Console.tsx`)

- **Remove** the `<p className={styles.sub}>{profile.hero.sub}</p>` line. The `.demo` block already sits between the headline and the query console — exactly where the bio was — so nothing needs to move.
- No change to the demo's JSX or its `data-collapsed={exchange.status !== "idle"}` wiring; it already works on any viewport.

### Styling (`src/components/Console.module.css`)

Restructure so the demo is the **default** (desktop) treatment and mobile overrides back down to its current compact form:

- `.demo` base becomes `display: flex` (shown on all viewports) with a **scaled-up desktop treatment**:
  - Larger answer text — `.demoA` at `var(--step-1)` (currently `var(--step-0)`).
  - More generous vertical gap between the question, answer, and latency line.
  - `margin-top` matching the spacing the bio occupied (the `.sub` `margin-top` clamp).
  - A `max-width` (~600px, aligned with the console's 640px) so the answer doesn't stretch toward the HUD card.
- **Move the collapse transition into the base rule:** the `max-height` / `opacity` / `margin` transition and the `.demo[data-collapsed="true"]` rule currently live inside the `max-width: 720px` block. Move them to the base so the demo also collapses gracefully on desktop when a real query runs.
- The `max-width: 720px` (mobile) block now **overrides back to the compact sizing** — `.demoA` back to `var(--step-0)`, the tighter gap, and the existing mobile `margin-top`. Mobile stays pixel-identical to today.
- **Delete** the now-unused `.sub` rules and the `.sub { display: none }` mobile override.

### Load-in animation (`src/components/Console.tsx`)

The GSAP intro timeline animates `.sub` (`gsap...from('.${styles.sub}', …)`). Since `.sub` is gone, **retarget that step to `.demo`** so the demo eases in at the same beat in the choreography, then types out as it does today. Under `prefers-reduced-motion`, the whole GSAP timeline is already skipped and the typewriter renders the answer in full immediately — unchanged.

### Data (`src/data/profile.ts`)

- `profile.hero.sub` becomes unused — **remove the field** to avoid dead data.
- `profile.hero.demo` (q / a / ms) is unchanged and now drives both viewports.

### Behavior

- On desktop, when a visitor submits a real query (`exchange.status` leaves `"idle"`), the seeded demo **collapses away** (same as mobile) so the live answer rendered below in the `readout` doesn't compete with a stale seeded answer above it.
- The `corpus.meta` HUD aside is unchanged.

### Accessibility & reduced motion

- The demo already exposes one clean, un-typed copy of the exchange to screen readers via the `.srOnly` span; the visible typed copy is `aria-hidden`. Removing the bio means that value-prop sentence is no longer in the DOM on any viewport — accepted by the user.
- Under `prefers-reduced-motion`, the caret freezes and the answer appears in full immediately (already handled); the GSAP timeline is skipped.

---

## Implementation touch-points

- **`src/components/Console.tsx`** — remove the `.sub` paragraph; retarget the GSAP `.sub` step to `.demo`.
- **`src/components/Console.module.css`** — make `.demo` the shown-by-default, scaled-up desktop treatment; move the collapse transition to the base rule; have the `≤720px` block override back to compact sizing; delete `.sub` rules and its mobile hide.
- **`src/data/profile.ts`** — remove the unused `hero.sub` field.
- No changes to `useChat`, `useTypewriter`, `chatApi`, or the backend.

## Verification

Run the frontend dev server and confirm:

- **Desktop (>720px):** the typed demo appears where the bio was, scaled up; it eases in via GSAP, then types out; the bio line is gone; the `corpus.meta` HUD is unchanged.
- **940px breakpoint:** HUD hides as before; demo and console reflow into one column cleanly.
- **Mobile (<720px):** pixel-identical to today.
- **Collapse:** submitting a real query collapses the demo on both desktop and mobile, and the live answer renders in the `readout` below.
- **`prefers-reduced-motion`:** no caret/scan animation; demo answer shown in full immediately.

## Open questions

None — design approved. Confirmed choices: remove the bio entirely (both viewports); scale the demo up on desktop; collapse the demo on first real query on desktop (matching mobile).
