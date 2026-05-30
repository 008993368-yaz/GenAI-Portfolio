# Cinematic Parallax Hero — Design Spec

**Date:** 2026-05-30
**Branch:** `feature/parallax-hero`
**Status:** Approved (design); pending implementation plan

## Goal

Upgrade the portfolio hero into a premium, cinematic "3D illusion" using a
scroll-driven, multi-layer parallax effect — no WebGL/Three.js. Inspired by
high-end sites like Draftly. The depth comes from independently-moving
foreground / midground / background layers plus a subtle desktop pointer tilt,
with a cinematic text entrance that fades and recedes as the user scrolls.

## Decisions (locked)

1. **Fresh standalone component** — a new self-contained `<ParallaxHero/>` that
   replaces the existing hero markup in `App.jsx`. It re-creates the existing
   branding (YE logo, stroked name, gradient tagline, subline, magnetic CTA,
   scroll cue) inside its own structure.
2. **Custom `requestAnimationFrame` engine** — a `useParallax` hook with a
   single shared rAF loop + lerp smoothing. Chosen over GSAP `ScrollTrigger`
   and framer-motion `useScroll` (both already installed) specifically so the
   scroll→transform ratio math is explicit and inline-commented.
3. **Hybrid layers** — labeled swappable `<img>` placeholder slots per layer
   PLUS CSS/SVG-generated neon depth (blurred orbs, perspective grid,
   particles) so it ships looking finished and on-brand before any real art is
   added.
4. **Cinematic + subtle desktop mouse tilt** — restrained, premium scroll
   parallax plus a gentle pointer-driven tilt on desktop. Both fully disabled
   on touch and under `prefers-reduced-motion`.

## Stack context (existing)

- React 18 + Vite + Tailwind 3.
- GSAP 3.14 (+ScrollTrigger) and framer-motion 11 already installed;
  `locomotive-scroll` present but `SmoothScroll.jsx` is a no-op pass-through.
- Dark charcoal + neon cyan/magenta/blue theme via CSS custom properties in
  `styles/globals.css`.
- `useReducedMotion` (framer-motion) and a `useMediaQuery` hook already exist
  and are respected throughout.
- `.hero-section` already has `position: relative; overflow: hidden` — ideal
  for absolutely-positioned parallax layers.

## Files

| File | Role |
|------|------|
| `frontend/src/components/hero/ParallaxHero.jsx` | New self-contained hero. Renders `<section id="home" className="phero">` → `.phero-stage` with the layer stack + hero content. Replaces the hero `<section>` block in `App.jsx`. |
| `frontend/src/hooks/useParallax.js` | New rAF engine. One shared `requestAnimationFrame` loop with lerp smoothing; writes `--scroll`, `--mx`, `--my` CSS vars onto the stage element. Returns `stageRef` + `enabled`. Self-stops when idle. |
| `frontend/src/utils/parallaxMath.js` | New pure functions (`clampProgress`, `layerTranslateY`, `pointerShift`, `textFade`, `textScale`) so the depth ratios are unit-testable. |
| `frontend/src/styles/parallax-hero.css` | New `.phero-*` namespaced styles, imported from `App.css` (matching the existing `@import` pattern). Reuses theme tokens. |
| `frontend/public/parallax/*.svg` | A few lightweight generated SVG placeholder assets (gradient blob, grid, starfield) populating the image slots. Trivially swappable. |
| `frontend/src/components/hero/ParallaxHero.test.jsx` | RTL render + interaction + reduced-motion tests. |
| `frontend/src/utils/parallaxMath.test.js` | Unit tests for the ratio math. |

`App.jsx`: swap the existing hero `<section>` for
`<ParallaxHero name={portfolioData.personalInfo.name} onPrimaryClick={() => handleNavClick('projects')} onScrollCue={() => handleNavClick('skills')} />`.
`ChatWidget` stays mounted as before. The old `HeroText.jsx`,
`ScrollIndicator.jsx`, and `.hero-*` CSS are left untouched (unused) to avoid
regressions; flagged as removable in a later cleanup.

## Layer stack (back → front)

All layers are `position: absolute; inset: 0` inside `.phero-stage`
(`overflow: hidden`). Each carries a `--speed` and `--depth` custom property.

1. **Background** — `--speed: 0.35`, `--depth: 0.15`. Deep gradient wash + large
   blurred neon orbs (CSS). Image slot: distant nebula/gradient. Slow drift +
   gentle scale-up → "far away, camera pushing in."
2. **Midground** — `--speed: 0.6`, `--depth: 0.45`. Perspective grid / faint
   geometric lines (CSS/SVG). Image slot: mid structures.
3. **Foreground** — `--speed: 1.25`, `--depth: 1.0`. Sharp accent particles /
   floating shards (CSS). Image slot: near art. Outruns the page + fades →
   "rushing past the camera." Hidden under `max-width: 768px`.
4. **Content** — `--speed: 1.0` plus scroll fade+scale. Logo, name, tagline,
   subline, CTA, scroll cue. Entrance timeline on load; recedes on scroll.

## Scroll → transform math

```
// Normalized hero progress: 0 at top, 1 once the hero has scrolled one viewport.
progress = clamp(scrollY / heroHeight, 0, 1)

// Per-layer vertical parallax. Net on-screen speed of a layer == `speed`:
//   speed 1.0  → moves exactly with the page (no parallax)
//   speed 0.35 → moves ~1/3 as far → reads DISTANT  (background)
//   speed 1.25 → outruns the page  → reads CLOSE     (foreground)
// Derivation: the page already lifts an absolute layer by `scrollY`. To make
// its NET rise equal scrollY*speed, add translateY = scrollY*(1 - speed).
translateY = scrollY * (1 - speed)        // CSS: calc(var(--scroll) * (1 - var(--speed)))

// Pointer tilt (desktop only). mx,my in [-1,1] from cursor vs viewport centre.
// Deeper layers shift LESS, near layers shift MORE → head-movement parallax.
translateX += mx * depth * POINTER_RANGE  // depth 0.15 (back) … 1.0 (front)
translateY += my * depth * POINTER_RANGE

// Text reacts to scroll: cinematic fade + recede.
opacity = clamp(1 - progress * 1.1, 0, 1)
scale   = 1 - progress * 0.08
```

`POINTER_RANGE` ≈ 18px (desktop). All transforms via `translate3d` + selective
`will-change: transform` for GPU compositing.

## Smoothing / performance (anti-jank)

- Scroll + pointer listeners are **passive** and only store *target* values.
- Each rAF frame eases rendered values toward targets:
  `current += (target − current) * EASE` (EASE ≈ 0.12), then writes the three
  CSS vars **once** to the stage. No per-element JS writes.
- The loop **self-stops** when `|target − current|` drops below a small epsilon
  and **restarts** on the next event → zero idle CPU.
- Hero height is cached on mount and on `resize`; the scroll handler never reads
  layout (no thrash).
- Listeners/loop are only attached when the effect is `enabled`.

## Responsive & graceful degradation

- **`prefers-reduced-motion: reduce`** → hook never starts; layers static, text
  full opacity / no transform.
- **Touch / `(hover: none)`** → pointer tilt disabled; no `pointermove`
  listener attached.
- **`(max-width: 768px)`** → scroll parallax magnitude scaled to ~40% (tasteful
  drift); foreground layer `display: none`. Layout collapses to the existing
  single-column, clamp-based type scale used by the current hero.
- Reuses existing breakpoints/spacing conventions from `App.css`.

## Testing

- `parallaxMath.test.js` — unit tests: `clampProgress` bounds; `layerTranslateY`
  yields larger net rise for higher speed and distant<near ordering; `textFade`
  reaches 0 by progress≈0.91 and clamps; `textScale` monotonic.
- `ParallaxHero.test.jsx` — renders the name as the headline and the CTA;
  clicking the CTA fires `onPrimaryClick`; clicking the scroll cue fires
  `onScrollCue`; under mocked reduced-motion the component mounts static (no
  rAF / no transform vars set).

## Non-goals (YAGNI)

- No WebGL/Three.js, no new runtime dependencies.
- No rework of other sections, nav, or the smooth-scroll wrapper.
- Not deleting the old hero files in this change (left unused; later cleanup).
- No real photographic art sourcing — placeholder SVGs + CSS only.
