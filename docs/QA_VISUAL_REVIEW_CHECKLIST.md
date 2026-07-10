# QA and Visual Review Checklist

Review the actual rendered site, not only source code. Capture before/after evidence for significant visual work and test with realistic Ukrainian content, catalog data, long labels, empty states, and failure states.

## Viewport Matrix

- [ ] 360×800 and 390×844: small mobile behavior, safe areas, sticky actions, keyboard, and one-handed reach.
- [ ] 768×1024: tablet portrait and responsive transitions.
- [ ] 1024×768: tablet landscape/small laptop.
- [ ] 1440×900: primary desktop composition.
- [ ] 1920×1080: max-width, image quality, and excessive whitespace.

Also test zoom at 200%, landscape mobile, content reflow at 320 CSS px, and at least Chrome plus one WebKit/Firefox-family browser when available.

## Visual Direction

- [ ] The first viewport clearly communicates premium Ukrainian honey and exposes a meaningful next action.
- [ ] Typography, spacing, color, radius, borders, and shadows follow shared tokens.
- [ ] Sections form a deliberate narrative; no repetitive filler grids or generic template patterns remain.
- [ ] Photography crops cleanly at every breakpoint, has no visible artifacts, and does not compromise text contrast.
- [ ] Product hierarchy keeps variety, size, price, availability, and CTA scannable.
- [ ] Header, footer, overlays, cart, forms, and supporting pages belong to the same visual system.
- [ ] No clipping, overlap, accidental horizontal scroll, orphan text, awkward wrapping, or layout shift is visible.

## Interaction and Motion

- [ ] Hover, focus-visible, active, disabled, loading, success, error, empty-cart, and out-of-stock states are intentionally designed.
- [ ] Keyboard order is logical; menus, dialogs, quantity controls, cart, and checkout are fully operable.
- [ ] Motion is smooth, purposeful, interruptible, and does not delay input or obscure content.
- [ ] `prefers-reduced-motion: reduce` removes nonessential movement and preserves all meaning.
- [ ] Touch targets are at least 44×44px and do not conflict with browser gestures.

## Commercial Flow

- [ ] Test every available product and volume from discovery through add-to-cart and checkout.
- [ ] Verify cart persistence, quantity updates, removal, totals, clear-cart, and repeated-add behavior.
- [ ] Verify phone validation, city/warehouse lookup, submission loading, duplicate-submit protection, proxy failure, recovery, and thank-you state.
- [ ] Confirm prices, inventory, delivery, payment, contact, and policy copy agree across routes.
- [ ] Primary CTAs remain visible and honest without hiding essential information or using dark patterns.

## Accessibility and Content

- [ ] Landmarks, headings, labels, errors, live feedback, alt text, and control names are meaningful.
- [ ] Text and UI contrast meet WCAG 2.2 AA; focus is never hidden; color is not the only signal.
- [ ] Ukrainian text renders correctly with no mojibake, placeholder copy, unsupported claims, or inconsistent terminology.
- [ ] Screen-reader reading order matches the visual order; modal focus is trapped and restored correctly.

## Performance and Release Gate

- [ ] No console errors, failed asset requests, broken internal links, or unexpected network calls.
- [ ] Images are responsive and dimensioned; below-fold media is deferred; fonts do not cause disruptive shifts.
- [ ] Target mobile CWV: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75.
- [ ] Service worker, manifest, metadata, schema, sitemap, and Vercel rewrites still behave as intended.
- [ ] Run available build/lint/test checks, `git diff --check`, and inspect the final diff.

Release is blocked by broken ordering, inaccessible primary controls, missing prices, misleading claims, console errors, horizontal overflow, unreadable content, or severe mobile/performance regressions.
