# Portfolio Website — Design Spec

**Date:** 2026-05-30
**Subject:** Yazhini Elanchezhian — personal portfolio
**Approach:** leonxlnx/taste-skill, Soft / Premium variant

## Goal
A high-end single-page portfolio presenting Yazhini as a senior-minded full-stack & GenAI
engineer. Premium, calm, design-aware. Not generic AI "slop".

## Decisions (approved)
- **Aesthetic:** Soft / Premium
- **Stack:** React + Vite + TypeScript, GSAP for motion
- **Scope:** Full single-page (Nav, Hero, About, Skills, Experience, Projects, Education, Contact/Footer)
- **Motion:** Tasteful (MOTION_INTENSITY ~5) — scroll reveals, hero parallax, spring hovers, smooth scroll; all gated behind `prefers-reduced-motion`
- **Accent:** Clay / terracotta `#B65C3F`
- **External links:** styled placeholders (no real GitHub/LinkedIn/PDF yet)

## Design tokens
- Background ivory `#F6F3EE` (subtle warm grain)
- Ink `#1A1714`, muted `#6B635A`
- Accent clay `#B65C3F`
- Surface `#FBFAF7`, soft low-spread shadows, 1px hairline rules
- Fonts: **Fraunces** (display serif), **Inter** (body/UI), **JetBrains Mono** (labels/tags)
- Spacious density (~4/10), large type scale, no hard em-dashes

## Sections
1. Nav — minimal "YE" mark, section links, Resume button, condenses on scroll
2. Hero — name, role, location, CTAs (View work / Resume), parallax gradient orb + grain, scroll cue
3. About — short intro + 3–4 stat highlights (4.0 GPA, 3 yrs Accenture, 90% coverage, RAG systems)
4. Skills — 5 labeled groups (Languages / Frameworks / Cloud & DB / Tools / Testing) as chips
5. Experience — Accenture role + achievement bullets in timeline treatment
6. Projects — Gen-AI Portfolio, ScholarBot feature cards with tech tags + hover lift
7. Education — CSUSB MS CS (4.0), SASTRA BTech
8. Contact / Footer — email, phone, location, mailto + placeholder social/resume links

## Architecture
- `src/data/profile.ts` — single typed source of truth for all resume content
- `src/components/` — Nav, Hero, About, Skills, Experience, Projects, Education, Contact, Footer (each isolated)
- `src/hooks/` — useScrollReveal, useParallax (thin GSAP wrappers)
- Design tokens as CSS custom properties in `index.css`; per-component CSS modules
- GSAP (+ optional Lenis smooth scroll)

## Out of scope (future)
AI chatbot widget (needs RAG backend) — leave a tasteful placeholder only.

## Accessibility
Semantic HTML, sufficient contrast, full `prefers-reduced-motion` fallback, keyboard-navigable.
