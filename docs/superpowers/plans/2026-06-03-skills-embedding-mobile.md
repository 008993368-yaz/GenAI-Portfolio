# Skills / Embedding "Domain Tuner" Accordion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static mobile / reduced-motion chip-list fallback in `frontend-v2`'s Skills section with a tappable five-row "domain tuner" accordion, leaving the desktop 2D embedding scatter unchanged.

**Architecture:** All changes stay inside the existing `EmbeddingSpace` component (one component per section, matching `Console`/`Context`). The `.fallback` chip list in `EmbeddingSpace.tsx` is replaced by an accordion driven by the existing `profile.skills` data and a single `useState` for the open row. Scroll-in uses the existing global `.reveal` class + `useScrollReveal` hook (its trigger is the always-visible section, so it's robust even though the accordion is `display:none` on desktop). Expand/collapse is pure CSS (`grid-template-rows: 0fr → 1fr`). The existing `@media (max-width: 720px)` and `@media (prefers-reduced-motion)` rules that swap scatter↔fallback are updated to swap scatter↔accordion. No data changes, no new files, no new dependencies, no backend changes.

**Tech Stack:** React 18 + TypeScript, Vite, CSS Modules, GSAP + ScrollTrigger (already in the project via `useScrollReveal`).

---

## Verification approach (read first)

This project has **no unit-test framework** (`frontend-v2/package.json` scripts are `dev`, `build`, `preview` only). Adding one is out of scope — matching the Hero and About/Context plans. Verification per task is therefore:

- **Type/compile:** `cd frontend-v2 && npm run build` (runs `tsc --noEmit && vite build`) must pass.
- **Visual:** in the final task, run `npm run dev` and use the Playwright browser tools at **390px** (mobile), **1280px** (desktop), and with `prefers-reduced-motion` emulated, to confirm the accordion behaves and the desktop scatter is untouched.

Note on CSS-module typing: `styles.*` is typed as `Readonly<Record<string, string>>` (Vite's `*.module.css` shim), so referencing a class name in `.tsx` **before** it exists in the `.module.css` compiles cleanly (it just yields no class at runtime). That's why Task 2 (markup) builds green even though the styles land in Task 3.

Commit after each task that builds clean.

---

## File structure

- **Modify** `frontend-v2/src/components/EmbeddingSpace.tsx` — replace the `.fallback` block with the accordion (markup + `open` state + `useScrollReveal` ref); trim one word of shared header copy. Desktop scatter logic (`CENTROIDS`, `COLORS`, `nodes` memo, the `field` GSAP effect, the `.field` JSX) is untouched.
- **Modify** `frontend-v2/src/components/EmbeddingSpace.module.css` — remove the `.fallback` / `.fGroup` / `.fLabel` / `.fChips` rules; add accordion styles; point the two existing media-query swaps at `.accordion` instead of `.fallback`. The `.field`, `.lines`, `.node`, `.centroid`, `.dot`, header rules are untouched.

No other files change.

---

### Task 1: Commit the pending correctness fixes (clean slate)

The four reviewed correctness fixes (centroid/color bounds guard, `type="button"`, removal of the unused `root` ref and dead `data-active`) are already applied in the working tree but uncommitted. Commit them on their own so the accordion work lands in clean, separate commits.

**Files:**
- Modify (already changed, just committing): `frontend-v2/src/components/EmbeddingSpace.tsx`

- [ ] **Step 1: Confirm the working tree has exactly the EmbeddingSpace fix**

Run: `git status --short frontend-v2/src/components/EmbeddingSpace.tsx`
Expected: ` M frontend-v2/src/components/EmbeddingSpace.tsx`

- [ ] **Step 2: Verify the build passes**

Run: `cd frontend-v2 && npm run build`
Expected: PASS (no `tsc` errors, `vite build` completes).

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/components/EmbeddingSpace.tsx
git commit -m "fix(skills): bounds-guard centroid/color lookups, add button type, drop dead code"
```

---

### Task 2: Replace the fallback with the accordion markup (`EmbeddingSpace.tsx`)

**Files:**
- Modify: `frontend-v2/src/components/EmbeddingSpace.tsx`

- [ ] **Step 1: Import the scroll-reveal hook**

At the top of the file, the imports currently are:

```tsx
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { profile } from "../data/profile";
import styles from "./EmbeddingSpace.module.css";
```

Add one import line below the `profile` import:

```tsx
import { useScrollReveal } from "../hooks/useScrollReveal";
```

- [ ] **Step 2: Add the open-row state and the reveal ref**

The component body currently starts:

```tsx
export default function EmbeddingSpace() {
  const field = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
```

Replace those three lines with:

```tsx
export default function EmbeddingSpace() {
  const field = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<number | null>(null);
  // Mobile accordion: index of the open domain (first open on load).
  const [open, setOpen] = useState<number | null>(0);
  // Scroll-in reveal for the accordion rows; trigger is the (always-visible)
  // section, so it fires reliably even though the accordion is display:none
  // on desktop. Reduced-motion is handled inside the hook + the .reveal class.
  const revealRef = useScrollReveal<HTMLElement>();
```

- [ ] **Step 3: Attach the reveal ref to the section and trim the header copy**

The section opening + header note currently read (lines ~75-88):

```tsx
    <section className={styles.skills} id="skills">
      <div className={styles.shell}>
        <header className={styles.head}>
          <div>
            <p className="cmd">
              project: <b>skills</b> → 2d
            </p>
            <h2 className={styles.title}>Embedding space</h2>
          </div>
          <p className={styles.note}>
            {nodes.length} competencies, projected onto a plane and grouped by
            domain.
          </p>
        </header>
```

Replace that block with (adds `ref={revealRef}` to the section; the note drops "projected onto a plane", which described only the desktop scatter and read oddly above the accordion):

```tsx
    <section className={styles.skills} id="skills" ref={revealRef}>
      <div className={styles.shell}>
        <header className={styles.head}>
          <div>
            <p className="cmd">
              project: <b>skills</b> → 2d
            </p>
            <h2 className={styles.title}>Embedding space</h2>
          </div>
          <p className={styles.note}>
            {nodes.length} competencies, grouped by domain.
          </p>
        </header>
```

- [ ] **Step 4: Replace the fallback block with the accordion**

The current fallback block reads (lines ~151-166):

```tsx
        {/* Legible fallback (mobile / reduced motion) */}
        <div className={styles.fallback}>
          {profile.skills.map((group, c) => (
            <div className={styles.fGroup} key={group.label}>
              <h3 className={styles.fLabel}>
                <span className={styles.dot} style={{ background: COLORS[c] }} />
                {group.label}
              </h3>
              <ul className={styles.fChips}>
                {group.items.map((it) => (
                  <li key={it}>{it}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
```

Replace it entirely with:

```tsx
        {/* Mobile / reduced-motion: tappable "domain tuner" accordion */}
        <div className={styles.accordion}>
          {profile.skills.map((group, c) => {
            const isOpen = open === c;
            const color = COLORS[c % COLORS.length];
            return (
              <div
                className={`reveal ${styles.aRow}`}
                key={group.label}
                data-open={isOpen}
              >
                <h3 className={styles.aHeadWrap}>
                  <button
                    type="button"
                    className={styles.aHead}
                    aria-expanded={isOpen}
                    aria-controls={`skills-acc-${c}`}
                    id={`skills-tab-${c}`}
                    onClick={() => setOpen(isOpen ? null : c)}
                  >
                    <span
                      className={styles.aDot}
                      style={{ background: color }}
                      aria-hidden="true"
                    />
                    <span className={styles.aName}>
                      {group.label.toLowerCase()}
                    </span>
                    <span className={styles.aSpacer} />
                    {!isOpen && (
                      <span className={styles.miniDots} aria-hidden="true">
                        {group.items.map((_, k) => (
                          <span
                            key={k}
                            className={styles.miniDot}
                            style={{ background: color }}
                          />
                        ))}
                      </span>
                    )}
                    <span className={styles.aCount}>{group.items.length}</span>
                    <span className={styles.aToggle} aria-hidden="true">
                      {isOpen ? "−" : "+"}
                    </span>
                  </button>
                </h3>
                <div
                  id={`skills-acc-${c}`}
                  role="region"
                  aria-labelledby={`skills-tab-${c}`}
                  aria-hidden={!isOpen}
                  className={styles.aPanel}
                >
                  <div className={styles.aPanelInner}>
                    <ul className={styles.aChips}>
                      {group.items.map((it) => (
                        <li key={it}>{it}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
```

- [ ] **Step 5: Verify the build**

Run: `cd frontend-v2 && npm run build`
Expected: PASS. (The accordion is unstyled until Task 3, and both the scatter and the accordion will show stacked on desktop in this intermediate state — that's expected; Task 3 restores the swap. `tsc` and `vite build` succeed.)

- [ ] **Step 6: Commit**

```bash
git add frontend-v2/src/components/EmbeddingSpace.tsx
git commit -m "feat(skills): render mobile domain-tuner accordion (markup + state)"
```

---

### Task 3: Accordion styles + media-query swap (`EmbeddingSpace.module.css`)

**Files:**
- Modify: `frontend-v2/src/components/EmbeddingSpace.module.css`

- [ ] **Step 1: Remove the old fallback styles**

Delete this whole run of rules (currently lines ~138-177 — the `/* ---- fallback list ---- */` comment through the end of the `.fChips li` rule):

```css
/* ---- fallback list ---- */
.fallback {
  display: none;
  flex-direction: column;
  gap: 1.6rem;
}

.fGroup {
  border-top: 1px solid var(--line-soft);
  padding-top: 1.1rem;
}

.fLabel {
  display: flex;
  align-items: center;
  gap: 0.7ch;
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-mid);
  margin-bottom: 0.9rem;
  text-transform: lowercase;
  letter-spacing: 0.03em;
  font-weight: 500;
}

.fChips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.fChips li {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-mid);
  border: 1px solid var(--line);
  border-radius: 100px;
  padding: 0.35rem 0.8rem;
}
```

- [ ] **Step 2: Add the accordion styles in their place**

Insert this block where the fallback rules were (immediately before the two `@media` blocks):

```css
/* ---- mobile / reduced-motion: domain-tuner accordion ---- */
.accordion {
  display: none; /* shown via the media queries below */
  flex-direction: column;
  width: 100%;
  max-width: 36rem; /* keep it from sprawling under reduced-motion on desktop */
  margin-inline: auto;
}

.aRow {
  border-top: 1px solid var(--line-soft);
}
.aRow:last-child {
  border-bottom: 1px solid var(--line-soft);
}

/* the <h3> only wraps the button for heading semantics; strip its box */
.aHeadWrap {
  margin: 0;
}

.aHead {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.7ch;
  padding: 0.95rem 0.25rem;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.02em;
  color: var(--text-mid);
  transition: color 0.25s var(--ease);
}

.aDot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  transition: box-shadow 0.3s var(--ease);
}

.aName {
  font-weight: 500;
  text-transform: lowercase;
}

.aSpacer {
  flex: 1;
}

.miniDots {
  display: flex;
  align-items: center;
  gap: 3px;
}
.miniDot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  opacity: 0.55;
}

.aCount {
  min-width: 1.5ch;
  text-align: right;
  color: var(--text-dim);
}

.aToggle {
  width: 1.2ch;
  text-align: center;
  color: var(--text-dim);
  font-size: var(--step-0);
}

/* open-row emphasis */
.aRow[data-open="true"] .aHead,
.aRow[data-open="true"] .aToggle {
  color: var(--signal);
}
.aRow[data-open="true"] .aName {
  color: var(--signal);
  font-weight: 600;
}
.aRow[data-open="true"] .aDot {
  box-shadow: 0 0 8px var(--signal-glow);
}

/* panel height animates via grid-template-rows 0fr -> 1fr */
.aPanel {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.35s var(--ease);
}
.aRow[data-open="true"] .aPanel {
  grid-template-rows: 1fr;
}
.aPanelInner {
  overflow: hidden;
  opacity: 0;
  transition: opacity 0.3s var(--ease);
}
.aRow[data-open="true"] .aPanelInner {
  opacity: 1;
}

.aChips {
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0 0.25rem 1.1rem 1.5rem;
}
.aChips li {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-mid);
  border: 1px solid var(--line);
  border-radius: 100px;
  padding: 0.35rem 0.8rem;
}
```

- [ ] **Step 3: Point the existing media-query swaps at the accordion**

The two media blocks at the end of the file currently read:

```css
@media (max-width: 720px) {
  .field {
    display: none;
  }
  .fallback {
    display: flex;
  }
}

@media (prefers-reduced-motion: reduce) {
  .field {
    display: none;
  }
  .fallback {
    display: flex;
  }
}
```

Replace both blocks with (swap `.fallback` → `.accordion`, and add transition-kill so reduced-motion expand/collapse is instant while still functional):

```css
@media (max-width: 720px) {
  .field {
    display: none;
  }
  .accordion {
    display: flex;
  }
}

@media (prefers-reduced-motion: reduce) {
  .field {
    display: none;
  }
  .accordion {
    display: flex;
  }
  .aPanel,
  .aPanelInner,
  .aDot,
  .aHead {
    transition: none;
  }
}
```

- [ ] **Step 4: Verify the build**

Run: `cd frontend-v2 && npm run build`
Expected: PASS. This is the first fully-correct checkpoint (markup + styles + swap all consistent).

- [ ] **Step 5: Commit**

```bash
git add frontend-v2/src/components/EmbeddingSpace.module.css
git commit -m "feat(skills): domain-tuner accordion styles + reduced-motion fallback"
```

---

### Task 4: Visual verification (mobile + desktop + reduced-motion)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run (background): `cd frontend-v2 && npm run dev`
Expected: Vite prints a Local URL (typically `http://localhost:5173`). Note the port.

- [ ] **Step 2: Verify the MOBILE accordion at 390px**

Using the Playwright browser tools:
1. `browser_resize` to width **390**, height **844**.
2. `browser_navigate` to the dev URL.
3. `browser_evaluate`: `document.getElementById('skills').scrollIntoView()`, then `browser_snapshot`.

Expected on screen:
- The `project: skills → 2d` header and `Embedding space` title, with the note `28 competencies, grouped by domain.`
- Five domain rows: `languages` (6), `frameworks` (6), `cloud & data` (6), `tools` (6), `testing` (4).
- The **first row (`languages`) is open**, showing its chips (Python, JavaScript, TypeScript, C#, HTML5, CSS / SASS); the other four are collapsed and show a mini dot-cluster + count + `+`.
- The desktop scatter (`.field`) is **not** visible.

- [ ] **Step 3: Verify the accordion interaction (single-open)**

1. `browser_click` the `frameworks` row's header button.
2. `browser_snapshot`.

Expected: `frameworks` is now open (its chips React, Angular, .NET MVC, FastAPI, LangChain, Docker visible, its toggle shows `−`), and `languages` has **collapsed** (single-open behavior). Clicking `frameworks` again collapses it (toggle returns to `+`).

- [ ] **Step 4: Confirm all 28 skills are in the DOM even when collapsed (SEO/AT)**

`browser_evaluate`:
```js
const t = document.getElementById('skills').textContent;
['Power Automate', 'Cosmos DB', 'Jasmine'].every(s => t.includes(s))
```
Expected: `true` — collapsed panels remain in the DOM (height-collapsed, not removed), so deep items from `tools`, `cloud & data`, and `testing` are present.

- [ ] **Step 5: Verify the DESKTOP scatter is unchanged at 1280px**

1. `browser_resize` to width **1280**, height **800**.
2. `browser_navigate` to the dev URL (fresh load), `browser_evaluate`: `document.getElementById('skills').scrollIntoView()`, `browser_snapshot`.

Expected: the interactive 2D scatter (`.field` with centroids, nodes, spokes) is shown exactly as before; the accordion is **not** visible (`display:none`). Hovering a centroid still highlights its cluster.

- [ ] **Step 6: Verify reduced-motion shows the accordion (static) at desktop width**

`browser_run_code_unsafe`:
```js
await page.emulateMedia({ reducedMotion: 'reduce' });
await page.reload();
await page.evaluate(() => document.getElementById('skills').scrollIntoView());
const accVisible = await page.evaluate(() => {
  const a = document.querySelector('#skills [class*="accordion"]');
  return a ? getComputedStyle(a).display !== 'none' : false;
});
const fieldHidden = await page.evaluate(() => {
  const f = document.querySelector('#skills [class*="field"]');
  return f ? getComputedStyle(f).display === 'none' : false;
});
({ accVisible, fieldHidden });
```
Expected: `{ accVisible: true, fieldHidden: true }` — under reduced motion the accordion replaces the scatter even on desktop, and toggling still works (no animation). Reset afterward with `await page.emulateMedia({ reducedMotion: 'no-preference' });`.

- [ ] **Step 7: Stop the dev server** and finish. No commit (verification only).

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-06-03-skills-embedding-mobile-design.md`):
- Mobile-only scope; desktop scatter untouched → Tasks 2-3 only replace the `.fallback`; `.field` markup, `CENTROIDS`/`COLORS`/`nodes`/the field GSAP effect, and all `.field`/`.node`/`.centroid` CSS are left intact. ✓
- Direction = domain-tuner accordion → Task 2 markup + Task 3 styles. ✓
- First domain open on load → `useState<number | null>(0)` (Task 2 Step 2). ✓
- One open at a time → `onClick={() => setOpen(isOpen ? null : c)}` (Task 2 Step 4); verified in Task 4 Step 3. ✓
- Keep mini dot-clusters on collapsed rows → `{!isOpen && <span class=miniDots>…</span>}` (Task 2) + `.miniDots`/`.miniDot` (Task 3). ✓
- Retire chip list; accordion is the single non-desktop fallback (mobile animated, reduced-motion static) → `.fGroup`/`.fLabel`/`.fChips` removed (Task 3 Step 1); both media queries swap to `.accordion`, reduced-motion kills transitions (Task 3 Step 3); verified Task 4 Steps 5-6. ✓
- Open-row glow + color echo of the output-node motif → `.aRow[data-open="true"]` rules with `--signal` + `box-shadow … --signal-glow` (Task 3). ✓
- Scroll-in row reveal, reduced-motion safe → `.reveal` class on rows + `useScrollReveal` ref on the section (Task 2); hook + `.reveal` `!important` reduced-motion override both no-op it. ✓
- Expand via CSS grid-rows (not JS height) → `.aPanel { grid-template-rows: 0fr → 1fr }` + `.aPanelInner { overflow:hidden }` (Task 3). ✓
- Accessibility: `<h3><button aria-expanded aria-controls>`, panel `role="region" aria-labelledby aria-hidden`, decorative dot/minidots/toggle `aria-hidden`, all items in DOM → Task 2 markup; verified Task 4 Step 4. ✓
- No data changes; header copy trim (optional) taken → no `profile.ts` edit; note trimmed in Task 2 Step 3. ✓
- Already-done correctness fixes are independent → committed separately in Task 1. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete, final code; every command has an expected result. ✓

**Type/name consistency:** `open`/`setOpen` (`number | null`, default `0`) defined Task 2 Step 2, used Step 4. Class names referenced in Task 2 (`accordion`, `aRow`, `aHeadWrap`, `aHead`, `aDot`, `aName`, `aSpacer`, `miniDots`, `miniDot`, `aCount`, `aToggle`, `aPanel`, `aPanelInner`, `aChips`) all defined in Task 3 — cross-checked one-to-one. `id`/`aria-controls` (`skills-acc-${c}`) and `id`/`aria-labelledby` (`skills-tab-${c}`) pair up within Task 2. `data-open` attribute (Task 2) matches the `[data-open="true"]` selectors (Task 3). `COLORS[c % COLORS.length]` reuses the bounds-safe access from the Task 1 fixes. `useScrollReveal<HTMLElement>()` matches the hook's generic signature and the `<section>` element type. ✓
