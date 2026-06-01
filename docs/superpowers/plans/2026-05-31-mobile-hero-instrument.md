# Mobile Hero "Instrument" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `frontend-v2`'s Hero a mobile-only (≤720px) "instrument" treatment — a seeded chat demo that replaces the sub-paragraph, a live "corpus signal" equalizer wired to the thinking state, and two one-word chips — without changing the desktop Hero.

**Architecture:** All changes live in the `Console` component, its CSS module, and `profile.ts` (content). We follow the codebase's existing dual-render-by-CSS pattern (see `EmbeddingSpace`, which renders both `.field` and `.fallback` and swaps them at 720px): desktop and mobile markup both render; CSS media queries at `max-width: 720px` decide what shows. No JS viewport detection, no new hooks, no backend changes.

**Tech Stack:** React 18 + TypeScript, Vite, CSS Modules, GSAP (already used for hero choreography), the existing `useChat` and `useTypewriter` hooks.

---

## Verification approach (read first)

This project has **no unit-test framework** (package.json scripts are `dev`, `build`, `preview` only). Adding one is out of scope. Verification per task is therefore:

- **Type/compile:** `cd frontend-v2 && npm run build` (runs `tsc --noEmit && vite build`) must pass.
- **Visual:** run `npm run dev`, then use the Playwright browser tools to load the app at a **390px** viewport (mobile) and a **1280px** viewport (desktop) and confirm the expected elements. Steps below give the exact checks.

Commit after each task that builds clean.

---

## File structure

- **Modify** `frontend-v2/src/data/profile.ts` — add `hero.demo` and `hero.mobileSuggestions` content.
- **Modify** `frontend-v2/src/components/Console.tsx` — render the seeded demo block, the signal meter, and dual desktop/mobile chip groups.
- **Modify** `frontend-v2/src/components/Console.module.css` — mobile (`≤720px`) styles: hide `.sub`/`.cue`, show + collapse the demo, style the signal meter + equalizer (idle vs thinking), reduced-motion freeze, keep `.run` visible.

---

### Task 1: Add Hero demo + mobile-chip content to `profile.ts`

**Files:**
- Modify: `frontend-v2/src/data/profile.ts` (the `hero` object, currently lines 53-64)

- [ ] **Step 1: Add `demo` and `mobileSuggestions` to the `hero` object**

In `frontend-v2/src/data/profile.ts`, the `hero` object currently ends like this:

```ts
    placeholder: "ask my corpus…",
    suggestions: [
      { q: "rag systems", to: "projects" },
      { q: "experience", to: "work" },
      { q: "say hello", to: "contact" },
    ],
  },
```

Replace that block with (adds two new keys; leaves `suggestions` untouched for desktop):

```ts
    placeholder: "ask my corpus…",
    suggestions: [
      { q: "rag systems", to: "projects" },
      { q: "experience", to: "work" },
      { q: "say hello", to: "contact" },
    ],
    // Seeded sample exchange shown in the mobile hero before the visitor asks.
    demo: {
      q: "what do you build?",
      a: "Grounded, fast AI — RAG systems, agents, and the full stack around them.",
      ms: 240,
    },
    // Mobile-only chips: a one-word label shown, a fuller query sent to the assistant.
    mobileSuggestions: [
      { label: "Experience", q: "Tell me about your experience" },
      { label: "Skills", q: "What's your strongest tech stack?" },
    ],
  },
```

- [ ] **Step 2: Verify the build still passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS (no TypeScript errors). `profile` is `as const`; the new keys are inferred automatically and need no interface change.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/data/profile.ts
git commit -m "feat(hero): add mobile demo + chip content to profile"
```

---

### Task 2: Render the seeded chat demo in `Console.tsx`

**Files:**
- Modify: `frontend-v2/src/components/Console.tsx`

The demo is rendered in all states (it's `display:none` on desktop via CSS, Task 5) and **collapses** when a real query starts (`exchange.status !== "idle"`). It reuses the existing `useTypewriter` hook and the existing `.srOnly` + `.caret` classes.

- [ ] **Step 1: Add a typewriter for the demo answer**

In `Console.tsx`, just below the existing typewriter call (around line 71-73):

```tsx
  // Type the answer out character by character once it arrives.
  const { shown: typedReply, done: typedDone } = useTypewriter(
    exchange.status === "done" ? exchange.reply : ""
  );
```

add a second typewriter for the seeded demo answer:

```tsx
  // Seeded mobile demo answer types out on load (desktop hides it via CSS).
  const { shown: demoTyped, done: demoDone } = useTypewriter(profile.hero.demo.a);
```

- [ ] **Step 2: Insert the demo block between the headline and the sub-paragraph**

In the JSX, find the end of the headline `</h1>` and the sub-paragraph that follows:

```tsx
          </h1>

          <p className={styles.sub}>{profile.hero.sub}</p>
```

Insert the demo block between them so the result is:

```tsx
          </h1>

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

          <p className={styles.sub}>{profile.hero.sub}</p>
```

- [ ] **Step 3: Verify the build passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS. (The demo is unstyled until Task 5, so it will appear on desktop too at this point — that's fixed in Task 5.)

- [ ] **Step 4: Commit**

```bash
git add frontend-v2/src/components/Console.tsx
git commit -m "feat(hero): render seeded chat demo block"
```

---

### Task 3: Render the corpus signal meter (equalizer) in `Console.tsx`

**Files:**
- Modify: `frontend-v2/src/components/Console.tsx`

The meter is decorative (`aria-hidden`) and mobile-only (hidden on desktop via CSS, Task 5). Its `data-thinking` attribute drives the idle-vs-active equalizer animation. `thinking` is already computed in the component (`const thinking = exchange.status === "thinking";`).

- [ ] **Step 1: Insert the signal meter after the chips block**

Find the closing of the chips `<div>` and the `</div>` that closes `.main`:

```tsx
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
```

Insert the signal meter right before that `</div>` (so it lives inside `.main`, after the chips):

```tsx
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

          <div
            className={styles.signal}
            data-thinking={thinking}
            aria-hidden="true"
          >
            <span className={styles.signalLabel}>
              corpus <span className={styles.signalLive}>● live</span>
            </span>
            <span className={styles.eq}>
              {Array.from({ length: 7 }).map((_, i) => (
                <i key={i} />
              ))}
            </span>
          </div>
        </div>
```

> Note: the chips block above is replaced entirely in Task 4 — this task only adds the signal meter. If you do Task 4 first, keep the signal meter insertion point (after whichever chips markup exists, before `.main`'s closing `</div>`).

- [ ] **Step 2: Verify the build passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS. (Unstyled, so the meter shows on desktop too until Task 5.)

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/components/Console.tsx
git commit -m "feat(hero): add corpus signal equalizer meter"
```

---

### Task 4: Dual desktop/mobile chip groups in `Console.tsx`

**Files:**
- Modify: `frontend-v2/src/components/Console.tsx`

Desktop keeps the current chips (`suggestions`, up to three). Mobile shows **two** chips: the curated one-word `mobileSuggestions` while idle, or the first two backend `suggestions` after a real query. Both groups render; CSS (Task 5) shows exactly one. This mirrors `EmbeddingSpace`'s `.field`/`.fallback` pattern.

- [ ] **Step 1: Replace the single chips block with two groups**

Replace the chips `<div className={styles.chips}>…</div>` block (shown in Task 3, Step 1) with:

```tsx
          {/* Desktop chips: existing behavior, up to three suggestions. */}
          <div className={`${styles.chips} ${styles.chipsDesktop}`}>
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

          {/* Mobile chips: two only. Curated one-word labels before the first
              query; first two backend suggestions afterwards. */}
          <div className={`${styles.chips} ${styles.chipsMobile}`}>
            {(exchange.status === "idle"
              ? profile.hero.mobileSuggestions
              : suggestions.slice(0, 2).map((q) => ({ label: q, q }))
            ).map((c) => (
              <button
                key={c.label}
                type="button"
                className={styles.chip}
                onClick={() => pick(c.q)}
                disabled={thinking}
              >
                {c.label}
              </button>
            ))}
          </div>
```

- [ ] **Step 2: Verify the build passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS. (Both chip groups show stacked on every viewport until Task 5 hides one.)

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/components/Console.tsx
git commit -m "feat(hero): dual desktop/mobile chip groups"
```

---

### Task 5: Mobile (`≤720px`) styles in `Console.module.css`

**Files:**
- Modify: `frontend-v2/src/components/Console.module.css`

This task adds all the new styles and the media query that makes the treatment mobile-only. After it, desktop is unchanged and mobile shows the full instrument.

- [ ] **Step 1: Add base (desktop-hidden) styles for the new elements**

Append to `Console.module.css`, before the `@media (max-width: 940px)` block:

```css
/* ---- seeded chat demo (mobile only; hidden on desktop) ---- */
.demo {
  display: none;
  flex-direction: column;
  gap: 0.45rem;
  border-left: 2px solid var(--signal-deep);
  padding-left: 0.9rem;
  overflow: hidden;
}

.demoQ {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-mid);
}

.demoA {
  font-family: var(--font-mono);
  font-size: var(--step-0);
  line-height: 1.55;
  color: var(--text);
}

.demoMeta {
  font-family: var(--font-mono);
  font-size: var(--step--2);
  color: var(--text-faint);
}

.demoMeta b {
  color: var(--signal);
  font-weight: 500;
}

/* ---- corpus signal meter (mobile only; hidden on desktop) ---- */
.signal {
  display: none;
  align-items: center;
  gap: 0.7rem;
  font-family: var(--font-mono);
  font-size: var(--step--2);
  color: var(--text-dim);
}

.signalLive {
  color: var(--signal);
}

.eq {
  margin-left: auto;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 18px;
}

.eq i {
  width: 3px;
  border-radius: 1px;
  background: var(--signal-deep);
  animation-name: eqIdle;
  animation-duration: 1.6s;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

.eq i:nth-child(2),
.eq i:nth-child(6) {
  background: var(--signal);
}

.eq i:nth-child(2) { animation-delay: 0.2s; }
.eq i:nth-child(3) { animation-delay: 0.4s; }
.eq i:nth-child(4) { animation-delay: 0.6s; }
.eq i:nth-child(5) { animation-delay: 0.8s; }
.eq i:nth-child(6) { animation-delay: 1s; }
.eq i:nth-child(7) { animation-delay: 1.2s; }

/* spikes while the assistant is thinking; delay (set above) is preserved
   because only name + duration are overridden here. */
.signal[data-thinking="true"] .eq i {
  animation-name: eqActive;
  animation-duration: 0.55s;
}

@keyframes eqIdle {
  0%, 100% { height: 4px; }
  50% { height: 9px; }
}

@keyframes eqActive {
  0%, 100% { height: 5px; }
  50% { height: 18px; }
}

/* mobile chip groups: desktop set shown by default, mobile set hidden */
.chipsMobile {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  .eq i {
    animation: none !important;
    height: 9px;
  }
}
```

- [ ] **Step 2: Add the `≤720px` mobile treatment block**

Append a new media query after the styles from Step 1 (and before/after the existing `@media (max-width: 560px)` block — order is fine since selectors differ):

```css
@media (max-width: 720px) {
  /* prose + scroll cue give way to the instrument elements */
  .sub {
    display: none;
  }
  .cue {
    display: none;
  }
  /* keep the run button visible on mobile (it is part of the instrument look) */
  .run {
    display: inline-block;
  }

  /* show + animate the seeded demo; collapse it on first real query */
  .demo {
    display: flex;
    margin-top: clamp(1.6rem, 1.2rem + 1.5vw, 2.2rem);
    max-height: 260px;
    opacity: 1;
    transition: max-height 0.5s var(--ease), opacity 0.4s var(--ease),
      margin 0.5s var(--ease);
  }
  .demo[data-collapsed="true"] {
    max-height: 0;
    opacity: 0;
    margin-top: 0;
    pointer-events: none;
  }

  /* show the signal meter under the chips */
  .signal {
    display: flex;
    margin-top: clamp(1.6rem, 1.2rem + 1.5vw, 2.2rem);
    padding-top: 1rem;
    border-top: 1px solid var(--line-soft);
  }

  /* swap chip groups */
  .chipsDesktop {
    display: none;
  }
  .chipsMobile {
    display: flex;
  }
}

@media (prefers-reduced-motion: reduce) {
  .demo {
    transition: none;
  }
}
```

> Note: the existing `@media (max-width: 560px)` block currently contains `.run { display: none; }`. Remove that one line so the run button stays visible on mobile (the `.run { display: inline-block; }` rule above also covers it, but delete the stale `display:none` to avoid confusion). Leave `.cue { display: none; }` in that block as-is.

- [ ] **Step 3: Verify the build passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add frontend-v2/src/components/Console.module.css
git commit -m "feat(hero): mobile instrument styles (demo, signal, chips)"
```

---

### Task 6: Visual verification (mobile + desktop)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run (background): `cd frontend-v2 && npm run dev`
Expected: Vite prints a Local URL (typically `http://localhost:5173`). Note the port.

- [ ] **Step 2: Verify the MOBILE hero at 390px**

Using the Playwright browser tools:
1. `browser_resize` to width **390**, height **844**.
2. `browser_navigate` to the dev URL.
3. `browser_snapshot`.

Expected on screen:
- The brand headline "I build software that retrieves, reasons, responds." is present.
- The seeded demo is visible: `› what do you build?` and a typed answer ending `replied in 240ms`.
- The sub-paragraph (`profile.hero.sub` text) is **not** visible.
- Exactly **two** chips: `Experience` and `Skills`.
- A `corpus ● live` line with the equalizer below the chips.

- [ ] **Step 3: Verify the demo collapses after a query**

1. `browser_click` the query input, `browser_type` "what is your stack" and submit (Enter), OR click the `Skills` chip.
2. `browser_snapshot`.

Expected: the seeded demo collapses/disappears; the live answer renders below the input; the equalizer spikes while status is "thinking".

> If the backend isn't running locally, the exchange will show an error state — that's fine for this check; the key behavior is that the **seeded demo collapses** once `exchange.status` leaves `idle`.

- [ ] **Step 4: Verify the DESKTOP hero is unchanged at 1280px**

1. `browser_resize` to width **1280**, height **800**.
2. `browser_navigate` to the dev URL (fresh load).
3. `browser_snapshot`.

Expected:
- The sub-paragraph IS visible again.
- The seeded demo block, the signal meter, and the mobile chips are all hidden.
- The three desktop chips are present.
- The `corpus.meta` HUD aside is visible (existing desktop behavior).

- [ ] **Step 5: Stop the dev server** and finish.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-05-31-mobile-hero-instrument-design.md`):
- ≤720px mobile-only gating → Task 5 media query. ✓
- Kicker + brand headline kept → untouched in Console.tsx. ✓
- Seeded chat demo replaces sub-paragraph, types on load, collapses on first query → Tasks 2 + 5. ✓
- Demo above the input → inserted between `</h1>` and `.sub`, before the `.console` form (Task 2). ✓
- Corpus signal equalizer, idle vs thinking amplitude → Tasks 3 + 5. ✓
- Two one-word mobile chips (Experience, Skills), label/query split, capped to two; desktop unchanged → Tasks 1 + 4 + 5. ✓
- Removed on mobile: sub-paragraph (Task 5), HUD (already hidden ≤940), stat strip (never added). ✓
- Accessibility: demo answer clean `.srOnly` copy + `aria-hidden` typed copy; signal meter `aria-hidden`; reduced-motion freeze → Tasks 2, 3, 5. ✓
- Data in `profile.ts`; no backend/hook changes → Task 1; Tasks 2-5 touch only Console + CSS. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code. ✓

**Type consistency:** `hero.demo` = `{ q, a, ms }` used identically in Tasks 1-2. `hero.mobileSuggestions` = `{ label, q }[]` defined in Task 1, consumed in Task 4 with matching `c.label`/`c.q`. CSS class names (`demo`, `demoQ`, `demoA`, `demoMeta`, `signal`, `signalLabel`, `signalLive`, `eq`, `chipsDesktop`, `chipsMobile`) match between Console.tsx (Tasks 2-4) and Console.module.css (Task 5). ✓
