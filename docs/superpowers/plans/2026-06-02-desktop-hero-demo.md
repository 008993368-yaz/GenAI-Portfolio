# Desktop Hero Chat Demo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the seeded, self-typing chat demo in the desktop Hero (scaled up) in place of the static bio sub-paragraph, while keeping the mobile Hero pixel-identical.

**Architecture:** The demo block (`.demo`) and bio (`.sub`) both already render in `Console.tsx`; CSS currently swaps them by breakpoint (`.demo` hidden by default / shown ≤720px; `.sub` shown by default / hidden ≤720px). The demo's answer typewriter and `data-collapsed` collapse wiring already run on every viewport. So this is: (1) remove the bio from markup and retarget its GSAP intro step to the demo, (2) restructure the CSS so `.demo` is the shown-by-default, scaled-up desktop treatment with the collapse transition in the base rule, and the `≤720px` block overrides back to the current compact mobile sizing, (3) remove the now-dead `hero.sub` data, (4) verify across breakpoints.

**Tech Stack:** React 18 + TypeScript, Vite, CSS Modules, GSAP. No test framework configured — verification is `npm run build` (type-check via `tsc --noEmit`) plus visual checks across viewport widths (Playwright MCP).

**Spec:** [docs/superpowers/specs/2026-06-02-desktop-hero-demo-design.md](../specs/2026-06-02-desktop-hero-demo-design.md)

---

## File Structure

- `frontend-v2/src/components/Console.tsx` — remove the `.sub` `<p>`; retarget the GSAP intro step from `.sub` to `.demo`.
- `frontend-v2/src/components/Console.module.css` — make `.demo` the shown-by-default, scaled-up desktop treatment; move the collapse transition + `[data-collapsed]` rule into the base; have the `≤720px` block override demo sizing back to compact; delete the `.sub` rules and its mobile hide.
- `frontend-v2/src/data/profile.ts` — remove the unused `hero.sub` field.

There is no test framework in this project (`package.json` scripts are `dev` / `build` / `preview`). Do not add one. Each code task verifies with `npm run build`; the final task verifies visually.

---

### Task 1: Remove the bio paragraph and retarget the GSAP intro to the demo

**Files:**
- Modify: `frontend-v2/src/components/Console.tsx:45` (GSAP target) and `frontend-v2/src/components/Console.tsx:132` (the `.sub` paragraph)

- [ ] **Step 1: Remove the bio `<p>` from the markup**

Delete this line (currently line 132):

```tsx
          <p className={styles.sub}>{profile.hero.sub}</p>
```

The `.demo` block above it stays exactly where it is — it already sits between the headline and the query console, where the bio was.

- [ ] **Step 2: Retarget the GSAP intro step from `.sub` to `.demo`**

In the load-in timeline, change the step that animates `.sub` (currently line 45):

```tsx
        .from(`.${styles.sub}`, { opacity: 0, y: 14, duration: 0.7 }, "-=0.5")
```

to animate the demo instead, keeping the same timing/beat:

```tsx
        .from(`.${styles.demo}`, { opacity: 0, y: 14, duration: 0.7 }, "-=0.5")
```

Leave the surrounding steps (`.kicker`, `.headLine > span`, `.console`, `.chip`, `.hud`) unchanged.

- [ ] **Step 3: Verify type-check + build passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS (no TypeScript errors). At this point `profile.hero.sub` is still defined (removed in Task 3), and `styles.sub` is still defined in CSS (removed in Task 2), so the build is clean.

- [ ] **Step 4: Commit**

```bash
git add frontend-v2/src/components/Console.tsx
git commit -m "Remove desktop hero bio line; ease the chat demo in via GSAP"
```

---

### Task 2: Make `.demo` the shown-by-default, scaled-up desktop treatment

**Files:**
- Modify: `frontend-v2/src/components/Console.module.css` — the `.sub` rule (lines 104-111), the demo block (lines 379-411), and the `@media (max-width: 720px)` block (lines 433-469)

- [ ] **Step 1: Delete the `.sub` rule**

Remove this entire rule (currently lines 104-111):

```css
.sub {
  margin-top: clamp(1.6rem, 1.2rem + 1.5vw, 2.2rem);
  max-width: 48ch;
  font-size: var(--step-1);
  line-height: 1.5;
  color: var(--text-mid);
  font-weight: 400;
}
```

- [ ] **Step 2: Replace the demo block with the shown-by-default, scaled-up version**

Replace the existing demo block (currently lines 379-411, from the `/* ---- seeded chat demo ... */` comment through the `.demoMeta b` rule) with:

```css
/* ---- seeded chat demo (shown on all viewports; scaled up on desktop) ---- */
.demo {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  border-left: 2px solid var(--signal-deep);
  padding-left: 1.1rem;
  margin-top: clamp(1.8rem, 1.2rem + 1.8vw, 2.6rem);
  max-width: 600px;
  max-height: 320px;
  opacity: 1;
  overflow: hidden;
  transition: max-height 0.5s var(--ease), opacity 0.4s var(--ease),
    margin 0.5s var(--ease);
}

.demo[data-collapsed="true"] {
  max-height: 0;
  opacity: 0;
  margin-top: 0;
  pointer-events: none;
}

.demoQ {
  font-family: var(--font-mono);
  font-size: var(--step-0);
  color: var(--text-mid);
}

.demoA {
  font-family: var(--font-mono);
  font-size: var(--step-1);
  line-height: 1.55;
  color: var(--text);
}

.demoMeta {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-faint);
}

.demoMeta b {
  color: var(--signal);
  font-weight: 500;
}
```

(Leave the `@media (prefers-reduced-motion: reduce) { .demo { transition: none; } }` block that follows it unchanged — it now applies on all viewports, which is correct.)

- [ ] **Step 3: Update the `@media (max-width: 720px)` block to override the demo back to compact mobile sizing**

Replace the existing mobile block (currently lines 433-469) with:

```css
@media (max-width: 720px) {
  /* scroll cue gives way to the instrument elements */
  .cue {
    display: none;
  }
  /* keep the run button visible on mobile (it is part of the instrument look) */
  .run {
    display: inline-block;
  }

  /* revert the demo to the compact mobile sizing (pixel-identical to before) */
  .demo {
    gap: 0.45rem;
    padding-left: 0.9rem;
    margin-top: clamp(1.6rem, 1.2rem + 1.5vw, 2.2rem);
    max-width: none;
    max-height: 260px;
  }
  .demoQ {
    font-size: var(--step--1);
  }
  .demoA {
    font-size: var(--step-0);
  }
  .demoMeta {
    font-size: var(--step--2);
  }

  /* swap chip groups */
  .chipsDesktop {
    display: none;
  }
  .chipsMobile {
    display: flex;
  }
}
```

Note what changed vs. the old mobile block: the `.sub { display: none }` rule is gone (the `.sub` element no longer exists), and the demo's `display: flex` / collapse transition / `[data-collapsed]` rule are no longer here because they now live in the base `.demo` rule — the mobile block only overrides sizing.

- [ ] **Step 4: Verify type-check + build passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS. No references to a `.sub` class remain in CSS; `styles.sub` is no longer used in `Console.tsx` (removed in Task 1).

- [ ] **Step 5: Commit**

```bash
git add frontend-v2/src/components/Console.module.css
git commit -m "Show hero chat demo on desktop (scaled up), keep mobile compact"
```

---

### Task 3: Remove the now-unused `hero.sub` data field

**Files:**
- Modify: `frontend-v2/src/data/profile.ts:57`

- [ ] **Step 1: Delete the `sub` field**

Remove this line from the `hero` object (currently line 57):

```ts
    sub: "Master's CS candidate and ex-Accenture engineer working across React, FastAPI, and LangChain to ship grounded, fast AI.",
```

Leave `kicker`, `headStart`, `headVerbs`, `placeholder`, `suggestions`, `demo`, and `mobileSuggestions` unchanged.

- [ ] **Step 2: Verify type-check + build passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS. `profile.hero.sub` has no remaining references (the only one was removed in Task 1), so dropping the field does not break the build.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/data/profile.ts
git commit -m "Drop unused hero.sub bio copy"
```

---

### Task 4: Visual verification across breakpoints

No automated test framework exists, so this is a manual/Playwright visual pass. The Playwright MCP browser tools are available.

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run (in the background): `cd frontend-v2 && npm run dev`
Expected: Vite prints a Local URL, typically `http://localhost:5173/`. Note the exact port from the output.

- [ ] **Step 2: Desktop view (>720px, HUD visible)**

Use Playwright: navigate to the dev URL, resize the browser to `1280 × 800`, wait ~1.5s for the GSAP intro + typewriter, then take a screenshot.
Confirm:
- The typed demo (`› what do you build?` → `↳ Grounded, fast AI — RAG systems, agents, and the full stack around them.` → `replied in 240ms`) appears between the headline and the `› ask my corpus…` console, where the bio used to be.
- The bio sentence ("Master's CS candidate…") is gone.
- The `corpus.meta` HUD card on the right is unchanged.
- The demo answer is visibly larger than the mobile version (scaled up) and capped to a readable width (does not stretch to the HUD).

- [ ] **Step 3: Tablet view (721–940px, HUD hidden, single column)**

Resize to `900 × 800`, wait for the intro, take a screenshot.
Confirm: the HUD is hidden (as before this change), and the demo + console reflow into a single column cleanly with no overlap or overflow.

- [ ] **Step 4: Mobile view (<720px) — must be pixel-identical to before**

Resize to `375 × 800`, wait for the intro, take a screenshot.
Confirm: the demo uses the compact mobile sizing (smaller answer text, tighter spacing) exactly as it did before this change; the two mobile chips (`Experience`, `Skills`) show; the scroll cue is hidden.

- [ ] **Step 5: Collapse-on-query behavior (desktop)**

Back at `1280 × 800`, type a query into the `ask my corpus…` input and submit (click `run ↵` or press Enter). 
Confirm: the seeded demo collapses away (height/opacity transition) and the live answer renders below in the readout — the seeded demo does not sit stale above the live answer. Repeat the check at `375 × 800` to confirm mobile still collapses too.

- [ ] **Step 6: Reduced motion**

Emulate `prefers-reduced-motion: reduce` (Playwright `browser_run_code_unsafe` / emulateMedia, or OS setting), reload at `1280 × 800`.
Confirm: no scan-sweep/caret animation; the demo and its answer appear in full immediately (no GSAP fade, no typing) and the bio is still absent.

- [ ] **Step 7: Stop the dev server**

Stop the background `npm run dev` process.

- [ ] **Step 8: Final build check**

Run: `cd frontend-v2 && npm run build`
Expected: PASS (clean type-check + production build).

---

## Notes for the implementer

- **GSAP/CSS opacity interaction (watch in Step 2 of Task 4):** the base `.demo` rule now has a CSS `transition` on `opacity`, and Task 1 adds a GSAP `.from(..., { opacity: 0 })` intro on the same element. GSAP writes inline styles every frame and normally wins, so the intro should look like a clean single fade-in. If the fade looks doubled/janky on desktop, change the GSAP step in `Console.tsx` to animate transform only — `.from(`.${styles.demo}`, { y: 14, duration: 0.7 }, "-=0.5")` (drop `opacity: 0`) — and re-verify.
- The demo's screen-reader copy (`.srOnly` span inside `.demoA`) and the `data-collapsed` wiring are unchanged; do not touch them.
- Mobile sizing values in Task 2 Step 3 (gap `0.45rem`, padding-left `0.9rem`, the `margin-top` clamp, `max-height` 260px, and the three font-size steps) are the exact pre-change values — keep them as written so mobile stays identical.
