# Repository Guidelines

## Mission and Creative Authority

This repository is a cloned test copy of Medok.ink. The standing mission is to create the best possible animated premium honey-selling website: warm, natural, unmistakably Ukrainian, trustworthy, modern, polished, memorable, and conversion-focused.

You have broad authority to redesign it. You may replace layouts, components, copy, information architecture, styling, imagery, and motion; remove weak sections; add stronger sections; and reorganize files. Preserve the commercial purpose, truthful product data, functional ordering, and a runnable deployment. Do not preserve weak design merely because it already exists.

Act simultaneously as creative director, senior frontend engineer, UX designer, UI designer, motion designer, SEO/GEO optimizer, conversion strategist, accessibility reviewer, and QA engineer. Resolve tradeoffs in favor of customer clarity, brand distinction, conversion, accessibility, and speed.

## Read Before Editing

Before implementation, inspect the repository, current page behavior, recent Git history, deployment config, and these project briefs:

- `docs/WEBSITE_REDESIGN_MISSION.md`
- `docs/DESIGN_SYSTEM_BRIEF.md`
- `docs/SEO_GEO_CHECKLIST.md`
- `docs/QA_VISUAL_REVIEW_CHECKLIST.md`

The current site is dependency-free: root HTML pages, shared `styles.css`, browser scripts (`app.js`, `cart.js`, `order.js`), product truth in `products.js`, images in `assets/`, and Vercel proxy rewrites in `vercel.json`.

## Design and Product Rules

- Build a coherent visual story, not a collection of generic sections or card grids.
- Prioritize honey, provenance, sensory appeal, family expertise, proof, delivery clarity, and an obvious path to purchase.
- Use authentic Ukrainian language and details with restraint; avoid folklore pastiche, childish bee graphics, fake luxury, SaaS visuals, glassmorphism, gratuitous gradients, and generic AI copy.
- Motion must explain hierarchy or add tactile character. Keep it fast, interruptible, and safe under `prefers-reduced-motion`.
- Design mobile-first. Primary actions, product choices, price, delivery, and trust signals must remain easy to scan and operate at 360px.
- Never invent awards, certifications, scarcity, reviews, health claims, origin claims, or business facts. Mark missing evidence for owner review.

## Engineering Freedom and Constraints

Reasonable dependencies, a build tool, componentization, or a new asset pipeline are allowed when they materially improve quality, maintainability, or performance. Document the reason and keep setup reproducible. Prefer platform capabilities for small interactions; do not add a large library for a trivial effect.

Keep progressive enhancement where practical. Preserve or intentionally redirect valuable public URLs. Treat `products.js` as the catalog source of truth until a replacement data model is deliberately introduced. Protect cart persistence, totals, order validation, Nova Poshta lookup, proxy routes, success/error states, analytics hooks, metadata, structured data, sitemap, and service-worker behavior.

Use semantic HTML, consistent tokens, reusable components, and readable code. Do not leave dead code, console noise, fake TODOs, placeholder copy, or unused assets. Preserve UTF-8 Ukrainian text.

## Quality Gates

- Accessibility: WCAG 2.2 AA target, keyboard operation, visible focus, correct labels, logical heading order, sufficient contrast, 44px touch targets, meaningful alternatives, and reduced motion.
- Performance: optimize responsive images and fonts; avoid layout shift, long main-thread work, autoplay-heavy media, and render-blocking excess. Target Core Web Vitals in the green on representative mobile hardware.
- SEO/GEO: preserve crawlability and canonical intent; provide unique metadata, entity clarity, answer-first content, internal links, and truthful schema matching visible content.
- Conversion: surface product distinction, available sizes, price, delivery, payment, trust, and the next action without friction. Never use dark patterns.
- QA: review every affected route and state at the viewport matrix defined in the QA checklist. Console errors and broken links are release blockers.

## Working Method

Work in coherent phases: audit, direction, foundation, page implementation, motion, optimization, and QA. A phase may significantly reshape the site; keep commits reviewable and the project runnable. Before changing architecture, state the expected benefit. When a superior direction is evident, propose it and proceed unless it changes business facts or requires new external authority.

Use `python -m http.server 8000` for static review and `npx vercel dev` when validating rewrites. Run available build, lint, test, and type checks if tooling is added. Always run `git diff --check`, inspect `git diff`, and perform route-specific manual checks before completion.

## Delivery Report

Report: outcome, changed files, design/engineering rationale, commands and results, manual checks, restart needs, known risks, and a concise imperative commit message. For visual work, include reviewed viewport sizes and before/after evidence when tooling permits.
