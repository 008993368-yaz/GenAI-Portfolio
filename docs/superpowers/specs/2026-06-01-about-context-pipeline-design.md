# About / Context — "Pipeline" Instrument (frontend-v2)

**Date:** 2026-06-01
**Status:** Approved design, ready for implementation plan
**Scope:** `frontend-v2` About / Context section (`Context.tsx`). Second section in the broader
"make every section an instrument" pass; follows the Hero redesign
(`2026-05-31-mobile-hero-instrument-design.md`).

---

## Problem

The About / Context section opens with **two stacked prose paragraphs** (`profile.about.lead`
and `profile.about.body`) above a `system.context` manifest table and a metrics strip. The
roadmap singles the prose out as "the wordiest narrative section" — the part that still reads
like a resume — while the manifest and metrics "already carry their weight" as instruments.

Two compounding issues:

- **It reads like a document, not an instrument.** On mobile the grid collapses to one column,
  so the two paragraphs dominate the top of the section as flat prose before any of the
  instrument-like content appears.
- **The prose is largely redundant.** The body paragraph restates the manifest (`now:` m.s.,
  `prev:` accenture 3 yrs) and the metrics (4.0 cgpa, 3yr tenure) in sentence form. The only
  thing the prose carries *uniquely* is the positioning: a full-stack engineer who builds
  retrieval-augmented AI that is grounded, fast, and useful.

---

## Goal

Replace the two prose paragraphs with a compact **signal-flow "pipeline"** that shows *how she
builds* — the same retrieval pipeline the whole site is themed around — turning the section's
narrative into a small instrument while keeping the existing dark "retrieval engine" theme, IBM
Plex Mono type, and lime (`--signal`) accent.

The pipeline carries the unique positioning the prose held; it deliberately does **not** repeat
the manifest fields or metrics, which sit beside/below it unchanged.

**Non-goals:** No change to the manifest table or metrics strip. No backend changes. No change
to any other section. No new dependencies (motion uses the GSAP/ScrollTrigger already in the
project).

---

## Decisions taken (from brainstorm)

These were chosen interactively against mockups, recorded here so the plan doesn't relitigate
them:

1. **Scope = surgical.** Replace *only* the two paragraphs (`profile.about.lead` / `body`). The
   manifest `<dl>` and the metrics strip are untouched.
2. **Direction = pipeline** (over a typewriter "thesis stream" and an editorial big-type line).
   It gives About its own visual identity, distinct from the Hero's chat console, and is literal
   to "I work the full stack."
3. **Stage framing = verb-first hybrid** (over tech-first). Nodes are the brand verbs
   `retrieves · reasons · responds` (echoing the Hero headline "retrieves, reasons, responds"),
   each captioned with the real tech. The verbs carry the story; the captions carry the proof.
4. **Placement = both desktop and mobile** (not mobile-only). The prose↔data redundancy exists
   at every width, and replacing everywhere avoids maintaining two versions. This intentionally
   diverges from the Hero (which was mobile-only); the desktop two-column layout is preserved,
   only its left column changes.

---

## Design

The section keeps its current outer structure: header (`retrieve: context`), a two-column
`.grid` (left = narrative, right = manifest aside), then the full-width metrics strip. **Only
the left column changes**: the `.prose` block (two `<p>`) becomes a `.pipeline` block.

### The pipeline module (left column)

Top → bottom:

1. **Prompt line** — `how i build →` (mono, `--text-dim`), echoing the console-prompt voice used
   elsewhere (`retrieve:`, `› ask anything…`).
2. **Three nodes**, connected by a vertical "spine" line (`--signal-deep`). Each node is a dot +
   a verb (display type) + a tech caption (mono, dim):

   | dot | verb (display) | tech caption (mono, dim) |
   |-----|----------------|--------------------------|
   | ● | `retrieves` | `pinecone · semantic search` |
   | ● | `reasons` | `langchain · agents` |
   | ● *(glowing output)* | `responds` | `fastapi → react` |

   The third node is the **output**: its verb renders in `--signal` (lime) and its dot carries a
   lime glow (`box-shadow: 0 0 10px var(--signal-glow)`), signalling the end of the pipeline.
3. **Values footer** — `↳ grounded · fast · genuinely useful` (mono, `--text-dim`).

All node/caption copy lives in `profile.ts` (see Data changes) so it is editable as content.

### Layout

- **Desktop (> 860px):** unchanged `.grid` (`1.4fr 0.9fr`). Pipeline fills the left column;
  manifest aside on the right; metrics strip full-width below. The pipeline is a vertical flow
  in the left column (it is **not** rotated to horizontal — keeping one orientation avoids a
  second layout to maintain and reads cleanly next to the 4-row manifest).
- **Mobile (≤ 860px):** the existing single-column collapse applies unchanged. Order top→bottom:
  pipeline → manifest → metrics (2×2). The pipeline is full-width.

860px is the section's existing grid-collapse breakpoint (`Context.module.css`); we reuse it so
the pipeline never has to reason about a separate breakpoint.

### Motion

On scroll into view, the pipeline "runs": the spine draws downward and the three nodes light in
sequence (dot fills + verb/caption fade-up), finishing on the glowing `responds` node — a one-
shot animation, sub-second, that reads as a signal travelling through the pipeline.

- Implemented with the **GSAP + ScrollTrigger** already used by `useScrollReveal`. The generic
  `.reveal` stagger is not expressive enough for the sequential "signal travels" read, so the
  pipeline gets its own small timeline (spine scaleY 0→1, then nodes staggered). It reuses the
  same `ScrollTrigger` trigger/`start` conventions and the same reduced-motion guard.
- The surrounding header, manifest, and metrics keep using the existing `.reveal` mechanism.

### Accessibility & reduced motion

- **Narrative preserved for AT/SEO.** The pipeline is visual; a single visually-hidden sentence
  (the `.srOnly` pattern already in the codebase) conveys the same content to screen readers and
  search crawlers, e.g. *"Full-stack engineer building retrieval-augmented AI: retrieves with
  Pinecone and semantic search, reasons with LangChain and agents, responds through FastAPI and
  React — grounded, fast, and genuinely useful."* This text lives in `profile.ts`.
- The visible pipeline's decorative dots/spine are `aria-hidden`; the verbs and captions remain
  real text.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, the spine and all three nodes
  render fully lit immediately with no traveling animation (mirroring `useScrollReveal`'s
  existing `gsap.set(..., {opacity:1, y:0})` no-op branch).

---

## Data changes (`src/data/profile.ts`)

- **Add `about.pipeline`** — the ordered stages:
  ```ts
  pipeline: [
    { verb: "retrieves", tech: "pinecone · semantic search" },
    { verb: "reasons",   tech: "langchain · agents" },
    { verb: "responds",  tech: "fastapi → react", output: true },
  ],
  ```
- **Add `about.values`** — the footer string: `"grounded · fast · genuinely useful"`.
- **Add `about.summary`** — the visually-hidden narrative sentence (a11y/SEO), as quoted above.
- **Remove `about.lead` and `about.body`** — no longer rendered anywhere after this change.
  Verified during brainstorm: the only references are `Context.tsx:19-20`; their `.lead`/`.body`
  CSS classes are local to `Context.module.css`.

## Implementation touch-points

- **`src/components/Context.tsx`** — replace the `.prose` block (the two `<p>`) with the pipeline
  render: prompt line, the `about.pipeline.map(...)` of nodes + spine, the values footer, and the
  `.srOnly` summary sentence. Manifest `<dl>` and metrics map are unchanged. Wire the pipeline's
  scroll-in timeline (either extend `useScrollReveal` with an opt-in variant or add a small local
  effect that follows the same reduced-motion guard).
- **`src/components/Context.module.css`** — remove `.lead` / `.body`; add `.pipeline`, `.node`,
  `.dot` (+ output/glow modifier), `.spine`, `.prompt`, `.values` styles. No change to `.grid`,
  `.manifest`, or `.metrics` rules (including the existing `@media (max-width: 860px)` block).
- **`src/data/profile.ts`** — the data additions/removals above.
- No changes to the manifest, metrics, backend, or any other component.

---

## Out of scope (separate roadmap items)

- **Skills / Embedding space** — mobile-native take on the 2D scatter plot.
- **Experience** — breaking up the five dense bullets.

## Open questions

None — design approved against mockups. Recommended choices taken: pipeline direction,
verb-first hybrid stages, desktop + mobile placement, vertical orientation at all widths.
