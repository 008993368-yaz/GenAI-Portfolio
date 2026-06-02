# About / Context "Pipeline" Instrument Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the two prose paragraphs in `frontend-v2`'s About / Context section with a vertical signal-flow "pipeline" (`retrieves → reasons → responds`, each captioned with the real tech, ending on a glowing output node) that lights up as it scrolls into view — on both desktop and mobile — leaving the manifest table and metrics strip untouched.

**Architecture:** Three pieces. (1) Content moves into `profile.ts` as `about.pipeline` / `about.values` / `about.summary`, replacing `about.lead` / `about.body`. (2) `Context.tsx` renders the pipeline in place of the old `.prose` block. (3) A new isolated hook `usePipelineReveal` (mirroring the existing `useScrollReveal`) drives the scroll-in motion — the spine draws down, then nodes stagger in — with the same reduced-motion guard the codebase already uses. The section's outer `.grid` (left = narrative, right = manifest aside) and the metrics strip are unchanged, so only the left column changes at every width.

**Tech Stack:** React 18 + TypeScript, Vite, CSS Modules, GSAP + ScrollTrigger (already used by `useScrollReveal`). No new dependencies, no backend changes.

---

## Verification approach (read first)

This project has **no unit-test framework** (`frontend-v2/package.json` scripts are `dev`, `build`, `preview` only). Adding one is out of scope. Verification per task is therefore:

- **Type/compile:** `cd frontend-v2 && npm run build` (runs `tsc --noEmit && vite build`) must pass.
- **Visual:** in the final task, run `npm run dev` and use the Playwright browser tools at a **390px** (mobile) and **1280px** (desktop) viewport to confirm the pipeline renders, the prose is gone, and the manifest + metrics are intact.

Commit after each task that builds clean.

---

## File structure

- **Modify** `frontend-v2/src/data/profile.ts` — replace `about.lead` / `about.body` with `about.pipeline`, `about.values`, `about.summary`.
- **Create** `frontend-v2/src/hooks/usePipelineReveal.ts` — isolated scroll-in motion for the pipeline (spine draw + staggered nodes), reduced-motion safe.
- **Modify** `frontend-v2/src/components/Context.tsx` — render the pipeline (prompt line, flow of nodes, values footer, sr-only summary) in place of the `.prose` block; attach the new hook's ref.
- **Modify** `frontend-v2/src/components/Context.module.css` — remove `.lead` / `.body`; add pipeline styles (`.pipeline`, `.prompt`, `.flow`, `.spine`, `.node`, `.dot`, `.verb`, `.tech`, `.values`, `.srOnly`) plus reduced-motion base states. `.grid`, `.manifest`, `.metrics`, and the existing `@media (max-width: 860px)` block are untouched.

---

### Task 1: Move content into `profile.ts`

**Files:**
- Modify: `frontend-v2/src/data/profile.ts` (the `about` object, currently lines 77-80)

- [ ] **Step 1: Replace the `about` block**

In `frontend-v2/src/data/profile.ts`, the `about` object currently reads:

```ts
  about: {
    lead: "I work the full stack, from React interfaces to FastAPI and LangChain backends, with a focus on retrieval-augmented AI that stays grounded, fast, and genuinely useful.",
    body: "Three years at Accenture shipping production web apps and GenAI automation, now sharpening the fundamentals through a 4.0 Master's in Computer Science.",
  },
```

Replace it entirely with:

```ts
  about: {
    // Spoken prompt above the pipeline.
    prompt: "how i build →",
    // Signal-flow stages: brand verb + the real tech behind it. The last
    // stage renders as the pipeline's glowing output (decided by position).
    pipeline: [
      { verb: "retrieves", tech: "pinecone · semantic search" },
      { verb: "reasons", tech: "langchain · agents" },
      { verb: "responds", tech: "fastapi → react" },
    ],
    // Footer line under the pipeline.
    values: "grounded · fast · genuinely useful",
    // Visually-hidden narrative for screen readers + SEO (keeps the prose).
    summary:
      "Full-stack engineer building retrieval-augmented AI: retrieves with Pinecone and semantic search, reasons with LangChain and agents, responds through FastAPI and React — grounded, fast, and genuinely useful.",
  },
```

- [ ] **Step 2: Verify the build still passes**

Run: `cd frontend-v2 && npm run build`
Expected: FAIL — `tsc` reports errors in `Context.tsx` ("Property 'lead' does not exist…") because the component still reads the old fields. That is expected; Task 3 updates the component. (If you want a clean checkpoint here, do Tasks 1–4 before the first build, or temporarily accept the failure. The first **passing** build is at the end of Task 4.)

> Note: `profile` is declared `as const` (`export const profile = {…} as const;`), so the new keys are inferred automatically — no interface to update.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/data/profile.ts
git commit -m "feat(about): move narrative into pipeline content in profile"
```

---

### Task 2: Add the `usePipelineReveal` hook

**Files:**
- Create: `frontend-v2/src/hooks/usePipelineReveal.ts`

This mirrors `useScrollReveal` (same imports, same `prefersReduced` guard, same `gsap.context` cleanup). It animates a `[data-spine]` element (draws downward) and `[data-node]` elements (stagger up) inside the returned ref's element, ending on the last node.

- [ ] **Step 1: Create the hook file**

Create `frontend-v2/src/hooks/usePipelineReveal.ts` with exactly:

```ts
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Reveals a signal-flow pipeline as it scrolls into view: the `[data-spine]`
 * line draws downward, then each `[data-node]` lights in sequence (ending on
 * the output node). No-op — everything shown immediately — under reduced
 * motion. Returns a ref to attach to the pipeline container.
 */
export function usePipelineReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const spine = root.querySelector("[data-spine]");
    const nodes = root.querySelectorAll("[data-node]");
    if (!nodes.length) return;

    if (prefersReduced()) {
      gsap.set(nodes, { opacity: 1, y: 0 });
      if (spine) gsap.set(spine, { opacity: 1, scaleY: 1 });
      return;
    }

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: { trigger: root, start: "top 78%" },
      });
      if (spine) {
        tl.fromTo(
          spine,
          { scaleY: 0, opacity: 1 },
          { scaleY: 1, duration: 0.5, ease: "power2.out" }
        );
      }
      tl.fromTo(
        nodes,
        { opacity: 0, y: 14 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.18, ease: "power3.out" },
        spine ? "-=0.25" : 0
      );
    }, root);

    return () => ctx.revert();
  }, []);

  return ref;
}
```

- [ ] **Step 2: Verify the build**

Run: `cd frontend-v2 && npm run build`
Expected: still FAIL on `Context.tsx`'s old `about.lead`/`about.body` references (Task 3 fixes that). The new hook file itself compiles — confirm no errors are reported *in `usePipelineReveal.ts`*.

- [ ] **Step 3: Commit**

```bash
git add frontend-v2/src/hooks/usePipelineReveal.ts
git commit -m "feat(about): add usePipelineReveal scroll-in motion hook"
```

---

### Task 3: Render the pipeline in `Context.tsx`

**Files:**
- Modify: `frontend-v2/src/components/Context.tsx`

Replace the `.prose` block (the two `<p>`) with the pipeline markup, and wire the new hook's ref. The header, manifest `<dl>`, and metrics map are unchanged.

- [ ] **Step 1: Import the hook**

At the top of `Context.tsx`, below the existing `useScrollReveal` import:

```tsx
import { useScrollReveal } from "../hooks/useScrollReveal";
```

add:

```tsx
import { usePipelineReveal } from "../hooks/usePipelineReveal";
```

- [ ] **Step 2: Create the pipeline ref**

Just below the existing ref line in the component body:

```tsx
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.08 });
```

add:

```tsx
  const pipelineRef = usePipelineReveal<HTMLDivElement>();
```

- [ ] **Step 3: Replace the `.prose` block with the pipeline**

Find this block (currently lines 17-21):

```tsx
        <div className={styles.grid}>
          <div className={styles.prose}>
            <p className={`reveal ${styles.lead}`}>{profile.about.lead}</p>
            <p className={`reveal ${styles.body}`}>{profile.about.body}</p>
          </div>
```

Replace the inner `.prose` `<div>` (keep the `.grid` opening line) so it becomes:

```tsx
        <div className={styles.grid}>
          <div className={styles.pipeline} ref={pipelineRef}>
            <p className={`reveal ${styles.prompt}`}>{profile.about.prompt}</p>

            <div className={styles.flow}>
              <span className={styles.spine} data-spine aria-hidden="true" />
              {profile.about.pipeline.map((stage, i, arr) => (
                <div
                  key={stage.verb}
                  className={styles.node}
                  data-node
                  data-output={i === arr.length - 1 ? "true" : undefined}
                >
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.verb}>{stage.verb}</span>
                  <span className={styles.tech}>{stage.tech}</span>
                </div>
              ))}
            </div>

            <p className={`reveal ${styles.values}`} aria-hidden="true">
              ↳ {profile.about.values}
            </p>

            <p className={styles.srOnly}>{profile.about.summary}</p>
          </div>
```

Leave the rest of the file (the `<dl className={...manifest}>` block and the `.metrics` block) exactly as-is.

- [ ] **Step 4: Verify the build**

Run: `cd frontend-v2 && npm run build`
Expected: PASS — all old field references are gone. (The pipeline is unstyled until Task 4, so it renders as plain stacked text; that's fine.)

- [ ] **Step 5: Commit**

```bash
git add frontend-v2/src/components/Context.tsx
git commit -m "feat(about): render signal-flow pipeline in Context"
```

---

### Task 4: Pipeline styles in `Context.module.css`

**Files:**
- Modify: `frontend-v2/src/components/Context.module.css` (remove `.lead` / `.body` at lines 26-41; add pipeline styles)

- [ ] **Step 1: Remove the old prose styles**

Delete these two rules (currently lines 26-41):

```css
.lead {
  font-size: var(--step-2);
  line-height: 1.2;
  letter-spacing: -0.02em;
  color: var(--text);
  font-weight: 500;
  text-wrap: balance;
}

.body {
  margin-top: 1.4rem;
  font-size: var(--step-0);
  line-height: 1.65;
  color: var(--text-mid);
  max-width: 52ch;
}
```

- [ ] **Step 2: Add the pipeline styles in their place**

Insert this block where `.lead` / `.body` were (between the `.grid` rule and the `/* manifest table */` comment):

```css
/* ---- pipeline (replaces the old prose block) ---- */
.pipeline {
  align-self: start;
}

.prompt {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-dim);
  margin-bottom: clamp(1.2rem, 1rem + 1vw, 1.8rem);
}

.flow {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: clamp(1.1rem, 0.9rem + 1vw, 1.6rem);
  padding-left: 1.4rem;
}

/* vertical spine the dots sit on; drawn downward by usePipelineReveal */
.spine {
  position: absolute;
  left: 4px;
  top: 6px;
  bottom: 10px;
  width: 1px;
  background: var(--signal-deep);
  transform-origin: top;
  opacity: 0;
}

.node {
  position: relative;
  display: grid;
  grid-template-columns: auto auto;
  align-items: baseline;
  column-gap: 0.7rem;
  row-gap: 0.15rem;
  opacity: 0;
}

.dot {
  position: absolute;
  left: -1.4rem;
  top: 0.4em;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--signal);
}

.verb {
  font-family: var(--font-display);
  font-size: var(--step-1);
  font-weight: 500;
  letter-spacing: -0.01em;
  color: var(--text);
  line-height: 1.1;
}

.tech {
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-dim);
}

/* the final node is the pipeline's glowing output */
.node[data-output="true"] .verb {
  color: var(--signal);
  font-weight: 600;
}

.node[data-output="true"] .dot {
  width: 11px;
  height: 11px;
  left: calc(-1.4rem - 1px);
  box-shadow: 0 0 10px var(--signal-glow);
}

.values {
  margin-top: clamp(1.2rem, 1rem + 1vw, 1.8rem);
  font-family: var(--font-mono);
  font-size: var(--step--1);
  color: var(--text-dim);
}

/* visually-hidden narrative for screen readers + SEO */
.srOnly {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* reduced motion: pipeline shown fully, no draw/stagger */
@media (prefers-reduced-motion: reduce) {
  .spine,
  .node {
    opacity: 1;
  }
  .spine {
    transform: none;
  }
}
```

- [ ] **Step 3: Verify the build**

Run: `cd frontend-v2 && npm run build`
Expected: PASS. This is the first fully clean checkpoint (component + styles + data all consistent).

- [ ] **Step 4: Commit**

```bash
git add frontend-v2/src/components/Context.module.css
git commit -m "feat(about): pipeline styles + reduced-motion fallback"
```

---

### Task 5: Visual verification (mobile + desktop)

**Files:** none (verification only)

- [ ] **Step 1: Start the dev server**

Run (background): `cd frontend-v2 && npm run dev`
Expected: Vite prints a Local URL (typically `http://localhost:5173`). Note the port.

- [ ] **Step 2: Verify the DESKTOP About section at 1280px**

Using the Playwright browser tools:
1. `browser_resize` to width **1280**, height **800**.
2. `browser_navigate` to the dev URL.
3. Scroll to the `#about` section (`browser_evaluate`: `document.getElementById('about').scrollIntoView()`), then `browser_snapshot`.

Expected on screen:
- The `retrieve: context` header is present.
- A `how i build →` prompt, then three stages: **retrieves** (`pinecone · semantic search`), **reasons** (`langchain · agents`), **responds** (`fastapi → react`), then `↳ grounded · fast · genuinely useful`.
- The old paragraphs ("I work the full stack…" / "Three years at Accenture…") are **not** present as visible prose.
- The manifest table (`system.context ● live`, focus/now/prev/status) is present on the right.
- The metrics strip (`4.0` cgpa · `3yr` tenure · `90%` coverage · `-30%` api-latency) is present below.

- [ ] **Step 3: Confirm the narrative is still in the DOM for AT/SEO**

`browser_evaluate`: `document.querySelector('#about').textContent.includes('retrieval-augmented AI')`
Expected: `true` (the visually-hidden `about.summary` sentence is present for screen readers / crawlers).

- [ ] **Step 4: Verify the MOBILE About section at 390px**

1. `browser_resize` to width **390**, height **844**.
2. `browser_navigate` to the dev URL (fresh load), scroll to `#about`, `browser_snapshot`.

Expected:
- Single column: pipeline first (prompt + three stages + values), then the manifest table, then the metrics strip as a 2×2 grid.
- Same three stages, with **responds** rendered in the lime accent (output node).

- [ ] **Step 5: Stop the dev server** and finish.

---

## Self-Review

**Spec coverage** (against `docs/superpowers/specs/2026-06-01-about-context-pipeline-design.md`):
- Replace only the prose; manifest + metrics untouched → Tasks 3 + 4 leave `.grid`/`.manifest`/`.metrics` and the 860px block intact. ✓
- Pipeline direction, vertical at all widths, both desktop + mobile → pipeline replaces `.prose` in the shared `.grid`; existing 860px collapse carries it to one column. ✓
- Verb-first hybrid stages (`retrieves`/`reasons`/`responds` + tech captions) → `about.pipeline` (Task 1), rendered in Task 3. ✓
- Glowing output node (last) → `data-output` by position (Task 3) + `.node[data-output="true"]` styles (Task 4). ✓
- Prompt line + values footer → `about.prompt` / `about.values` (Task 1), rendered Task 3, styled Task 4. ✓
- Motion: spine draws down, nodes light in sequence, on scroll-in → `usePipelineReveal` (Task 2). ✓
- Reduced motion: all shown instantly → hook `prefersReduced` branch (Task 2) + CSS `@media (prefers-reduced-motion)` base override (Task 4). ✓
- A11y: decorative dots/spine `aria-hidden`; verbs/captions real text; values `aria-hidden`; narrative preserved as `.srOnly` `about.summary` → Tasks 3 + 4, verified in Task 5 Step 3. ✓
- Data in `profile.ts`; `lead`/`body` removed; no backend changes → Task 1; only Context + its CSS + the new hook touched. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; CSS values are concrete (pixel alignment confirmed visually in Task 5). ✓

**Type consistency:** `about.pipeline` items are `{ verb, tech }` — defined in Task 1, consumed in Task 3 as `stage.verb` / `stage.tech` with output decided by `i === arr.length - 1` (no per-item `output` field, so no `as const` union pitfall). `about.prompt` / `about.values` / `about.summary` are strings, consumed as such in Task 3. CSS class names (`pipeline`, `prompt`, `flow`, `spine`, `node`, `dot`, `verb`, `tech`, `values`, `srOnly`) match between Context.tsx (Task 3) and Context.module.css (Task 4). The hook targets `[data-spine]` / `[data-node]` attributes, which Task 3's markup provides. ✓
