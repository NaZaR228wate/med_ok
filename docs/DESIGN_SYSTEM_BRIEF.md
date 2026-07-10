# Medok Design System Brief

## Creative Direction

The concept is **Ukrainian sunlight, bottled with care**. Medok should feel like a contemporary family apiary with editorial taste: tactile, grounded, generous, and precise. Premium comes from material honesty, photography, typography, rhythm, and restraint—not decorative excess.

Use Ukrainian identity through language, local landscape, craft, and subtle composition. Avoid costume-like folklore, cartoon bees, honey-drip clichés, fake seals, black-and-gold luxury tropes, generic eco branding, and SaaS-style UI.

## Visual Language

- Base palette: warm linen and beeswax surfaces, dark buckwheat text, forest-green trust accents, and restrained amber for purchase moments.
- Suggested tokens: `#F6F0E3` linen, `#E8B44F` honey, `#9A5D20` amber, `#23372B` forest, `#211A14` ink, `#FFFDF8` cream.
- Typography: an expressive editorial display face paired with a highly legible sans serif. Both must include complete Ukrainian glyphs, load efficiently, and remain readable at small sizes.
- Layout: strong asymmetry balanced by generous whitespace, editorial image crops, occasional full-bleed moments, and a deliberate vertical narrative. Avoid repetitive equal-card grids.
- Imagery: authentic apiary, people, jars, honey texture, blossoms, and Ukrainian landscape. Favor warm natural light, visible material detail, and believable color. Do not use obvious AI artifacts or decorative stock imagery.
- Shape: use soft, organic geometry sparingly. Radius, borders, and shadows must follow shared tokens; avoid pill-shaped everything.

## Component Principles

The product is always the visual hero. Product modules must show variety, size, price, availability, sensory character, and a clear action. Trust modules should use verifiable facts, process details, real people, delivery terms, and genuine reviews. Navigation, cart, forms, buttons, and feedback states must share one interaction language.

Every component needs defined default, hover, focus-visible, active, disabled, loading, success, error, empty, and out-of-stock states where applicable. Favor reusable primitives without forcing every section into the same composition.

## Animation Language

Motion should feel like sunlight moving across honey: smooth, viscous, and calm, never sluggish.

- Use short feedback transitions around 120–220ms and narrative entrances around 350–650ms.
- Prefer transform and opacity; avoid layout-thrashing animation and excessive scroll hijacking.
- Reveal content in small, meaningful groups. One strong hero sequence is better than animation on every element.
- Product and cart feedback must be immediate. Users must never wait for animation before acting.
- Pause off-screen work, avoid autoplay audio, and provide a quiet reduced-motion version with no essential information removed.

## Responsive and Accessibility Rules

Start at 360px. Preserve hierarchy rather than merely stacking desktop blocks. Keep body text at least 16px, comfortable line lengths, 44px targets, visible focus, semantic landmarks, and AA contrast. Never place critical copy over uncontrolled photography without a robust contrast treatment. Sticky mobile purchase actions may be used when they do not obscure content or browser controls.

## Performance Budget

Use responsive AVIF/WebP images with dimensions, lazy-load below the fold, subset/self-host fonts when allowed, and keep the initial experience lean. Target green Core Web Vitals: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at the 75th percentile. A visual effect that threatens these targets must be simplified or removed.
