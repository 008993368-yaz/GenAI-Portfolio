# Skills / Embedding space — "Domain tuner" Accordion (frontend-v2)

**Date:** 2026-06-03
**Status:** Approved design, ready for implementation plan
**Scope:** `frontend-v2` Skills section (`EmbeddingSpace.tsx`), mobile / reduced-motion presentation only.
Third section in the broader "make every section an instrument" pass; follows the Hero
(`2026-05-31-mobile-hero-instrument-design.md`) and About/Context
(`2026-06-01-about-context-pipeline-design.md`) redesigns.

---

## Problem

The Skills section is the site's signature instrument: on desktop it's an interactive 2D
"embedding space" — domain centroids with skill nodes scattered around them and spokes linking
each node to its cluster, with hover-to-highlight. Below 720px (and under
`prefers-reduced-motion` at any width) that entire instrument is swapped out for a **flat,
static grouped chip list** (`.fallback`): a heading per domain and an unstyled wrap of chips,
with no interaction. It's the section the roadmap calls out as degrading to a list that "reads
like a resume."

The desktop scatter doesn't shrink to a phone cleanly: 28 labelled nodes plus five centroids in
a ~360px-wide field collide and overlap. So the mobile experience needs its own native
treatment rather than a scaled-down scatter.

---

## Goal

Replace the static mobile/reduced-motion chip list with a **compact, tappable "domain tuner"** —
a five-row accordion of skill domains that keeps the section's interactive, instrument-like
character while staying highly scannable for a recruiter on a phone. Keep the existing dark
"retrieval engine" theme, IBM Plex Mono type, and the lime→cyan domain palette already used by
the desktop scatter.

**Non-goals:**

- **No change to the desktop 2D scatter** (`> 720px`, no reduced-motion). It stays exactly as is;
  it is the good version of this instrument.
- No backend changes. No new dependencies (motion uses the GSAP/ScrollTrigger and the CSS
  patterns already in the project).
- No change to any other section.

---

## Decisions taken (from brainstorm)

Chosen interactively against mockups, recorded so the plan doesn't relitigate them:

1. **Scope = mobile-only.** Replace only the `.fallback` block. The desktop `.field` scatter is
   untouched. (Diverges from the About/Context decision to redesign both widths, because here the
   desktop version is not redundant — it's the signature.)
2. **Direction = "domain tuner" accordion** (option B), chosen over a shrunken tappable scatter
   (A) and an orbital re-projection selector (C). Rationale: simplest and most robust to build (no
   orbit math, label-anchoring, or re-projection animation), the most scannable, and it maps
   cleanly onto a standard, accessible disclosure pattern. The trade-off accepted: it reads less
   like a literal 2D embedding and more like a polished interactive list.
3. **On load = first domain open.** The `languages` row starts expanded so the section never
   opens visually empty and the expand affordance is immediately obvious.
4. **One open at a time.** Opening a row collapses any other open row (keeps the section compact
   on a phone). Tapping the currently-open row collapses it (so a fully-collapsed state is
   reachable).
5. **Keep mini dot-clusters** on collapsed rows — a small row of dots sized to the domain's item
   count. Cheap, and the visual thread back to the "embedding space" theme.
6. **Retire the old chip list entirely.** The accordion becomes the single non-desktop fallback,
   serving both `≤720px` and `prefers-reduced-motion` (animated on mobile; static, with working
   toggles, under reduced motion). One implementation instead of two.

---

## Design

The section keeps its current outer structure unchanged: the `.skills` section, the `.shell`
wrapper, and the shared `.head` (the `project: skills → 2d` command line, the `Embedding space`
title, and the count note). Below the header sit the two presentations: the existing desktop
`.field` (unchanged) and — in place of today's `.fallback` chip list — the new accordion.

### The accordion (replaces `.fallback`)

A vertical stack of one row per `profile.skills` group (five today), in data order. Each row:

- **Header (a real disclosure button):** a domain-colored dot, the domain label (lowercased, mono,
  matching the current `.fLabel` voice), a flexible spacer, then — only while collapsed — the mini
  dot-cluster, the item count, and a `+ / −` affordance.
- **Panel:** the domain's skills as chips (reusing the existing `.fChips` chip styling), revealed
  when the row is open.

The open row's dot carries a subtle lime/colored glow (`box-shadow`), echoing the "output node"
glow used in the Hero and Context pipelines, and its label brightens to the domain color.

**Mini dot-clusters.** On a collapsed row, render `group.items.length` small dots in the domain
color. They encode the count visually and keep a faint "constellation" read. Hidden once the row
opens (the chips take over). Purely decorative — `aria-hidden`.

### Layout

- **Mobile (`≤720px`):** the accordion is full-width within `.shell`; rows are generous tap targets.
- **Desktop under `prefers-reduced-motion`:** the same accordion renders, but width-capped
  (`max-width: ~36rem`) and centered so it doesn't sprawl across a wide viewport. Toggles still
  work; only the animation is suppressed (see Motion).
- **Desktop, no reduced-motion (`>720px`):** unchanged — the desktop `.field` scatter shows and the
  accordion is `display:none`. The existing `@media` rules in `EmbeddingSpace.module.css` keep
  owning this swap; they now toggle `.field` against the accordion wrapper instead of `.fallback`.

### Motion

- **Scroll-in:** rows reveal with a short staggered fade/rise as the section enters the viewport,
  using the same GSAP + ScrollTrigger conventions and `start` value already used for the desktop
  `.field` nodes (and consistent with `useScrollReveal`). The default-open panel's chips reveal
  with the row.
- **Expand / collapse:** the panel animates its height open/closed via the CSS
  `grid-template-rows: 0fr → 1fr` technique (with an `overflow:hidden` inner) — pure CSS, no
  height measuring. The chips fade/slide up as the panel opens (a light "signal-lock" feel; a
  per-chip `transition-delay` stagger is an optional polish, default is a single group fade). The
  `+ / −` (or chevron) affordance transitions on open.
- **Reduced motion:** under `prefers-reduced-motion: reduce`, the grid-rows and chip transitions
  are set to `none` so expand/collapse is instant, and the scroll-in reveal no-ops (mirroring the
  existing reduced-motion guards). Crucially, **toggling still works** — the interaction is
  preserved, only the animation is removed.

### Accessibility

This direction is natively accessible — its main advantage over the scatter and the orbital
options, and the reason no `.srOnly` duplicate is needed (unlike the Context pipeline):

- Each domain header is an `<h3>` wrapping a `<button type="button">` with `aria-expanded` and
  `aria-controls` pointing at its panel; the panel is a `role="region"` labelled by the button
  (`aria-labelledby`), with `aria-hidden` reflecting the open state. This is the standard WAI-ARIA
  accordion pattern and preserves the heading structure the current `.fLabel` `<h3>`s provide.
- All five domains and all 28 skills are present in the DOM (crawlable for SEO) and reachable by
  keyboard/AT via the disclosure buttons. The skill chips are non-interactive list items, so there
  is no focus-management concern when a panel is collapsed.
- Decorative elements — the domain dot, the mini dot-cluster, and the `+/−` affordance — are
  `aria-hidden`.

### Interactivity depth

The disclosure buttons are the only controls. The skill chips themselves are display-only (there
is no deeper level to drill into), which keeps the interaction honest and simple.

---

## Data changes (`src/data/profile.ts`)

**None.** The accordion is driven entirely by the existing `profile.skills` array
(`{ label, short, items }[]`). This is intentionally lighter than the Hero and Context redesigns,
which each added content to `profile.ts`.

Minor copy note (optional): the shared header note currently reads
"{n} competencies, projected onto a plane and grouped by domain." "projected onto a plane"
describes the desktop scatter; since the header is shared with the accordion, consider trimming to
"{n} competencies, grouped by domain" so it reads correctly under both presentations.

---

## Implementation touch-points

Kept in `EmbeddingSpace.tsx` (one component per section, consistent with `Console`/`Context`);
not extracted into a sub-component.

- **`src/components/EmbeddingSpace.tsx`**
  - Remove the `.fallback` chip-list block.
  - Add `const [open, setOpen] = useState<number | null>(0)` (default 0 = first domain).
  - Render the accordion wrapper (the class the `@media` rules toggle) with one row per
    `profile.skills` group: the `<h3><button aria-expanded aria-controls …>` header (dot, label,
    spacer, collapsed-only mini dot-cluster + count + affordance) and the `role="region"` panel
    with the chips. `onClick={() => setOpen(open === c ? null : c)}`.
  - Reuse the existing local `COLORS` palette for domain colors (`COLORS[c % COLORS.length]`,
    matching the bounds-safe access just added).
  - Add the rows' scroll-in reveal using the existing GSAP/ScrollTrigger conventions (or the
    `useScrollReveal` mechanism), behind the same reduced-motion guard already in the file.
- **`src/components/EmbeddingSpace.module.css`**
  - Remove `.fallback`, `.fGroup`, `.fLabel`, `.fChips` rules (superseded). Keep `.dot` (shared).
  - Add accordion styles: row, header button, open-state dot glow + label color, mini dot-cluster,
    the `grid-template-rows` panel animation (+ `overflow:hidden` inner), chip styles (can reuse
    the retired `.fChips li` look), and the `+/−` affordance.
  - Update the two existing gates — `@media (max-width: 720px)` and
    `@media (prefers-reduced-motion: reduce)` — to hide `.field` and show the accordion wrapper
    (replacing the `.fallback` references). Add the `max-width`/centering for the wrapper so the
    reduced-motion desktop case doesn't sprawl.
- **`src/data/profile.ts`** — no structural change; optional header-note copy trim only.
- No changes to the desktop scatter logic, other components, or the backend.

---

## Out of scope (separate roadmap items)

- **Desktop embedding scatter** — unchanged by this work.
- **Experience** — breaking up the five dense bullets.
- The already-completed correctness fixes to `EmbeddingSpace.tsx` (centroid/color bounds guard,
  `type="button"`, dead-code removal) are independent of this redesign.

## Open questions

None — design approved against mockups. Recommended choices taken: mobile-only scope, accordion
direction, first domain open on load, single-open behavior, keep mini dot-clusters, retire the
chip list so the accordion is the single non-desktop fallback.
