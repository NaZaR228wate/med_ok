# SEO and GEO Checklist

Use this checklist for every redesigned public route. GEO means making truthful, well-structured information easy for search engines and generative answer systems to understand and cite; it does not mean keyword stuffing or crawler-only copy.

## Crawl and Technical Integrity

- [ ] Return a successful status, render useful HTML without requiring JavaScript, and use one indexable canonical URL.
- [ ] Preserve valuable URLs or implement intentional permanent redirects; eliminate orphan, duplicate, and broken pages.
- [ ] Keep `robots.txt`, `sitemap.xml`, canonicals, `llms.txt`, and navigation aligned with the final route set.
- [ ] Use Ukrainian language signals (`lang="uk"`), UTF-8, correct status behavior, HTTPS, and shareable URLs.
- [ ] Check mobile usability, Core Web Vitals, image dimensions, lazy loading, and crawlable internal links.

## Page-Level Relevance

- [ ] Give each page a unique, intent-matched title, meta description, H1, and concise opening answer.
- [ ] Use a logical heading hierarchy and descriptive anchor text; avoid duplicate boilerplate and doorway-page copy.
- [ ] Explain products with real variety, origin, flavor, texture/crystallization, volume, price, availability, delivery, and care information.
- [ ] Connect home, variety, about, FAQ, reviews, local, and order pages through contextual internal links.
- [ ] Add descriptive image filenames and useful alt text; use empty alt for decorative images.

## Entity and Generative Discoverability

- [ ] State consistently who Medok is, what it sells, where the apiary operates, areas served, and how customers order.
- [ ] Write answer-first passages for genuine customer questions, followed by specific supporting detail.
- [ ] Use concrete, attributable facts and clear dates where freshness matters. Never invent citations, awards, certifications, reviews, or health benefits.
- [ ] Keep business name, phone, location, delivery, payment, and return information consistent across visible pages and metadata.
- [ ] Make important facts available in visible HTML, not only images, animation, or structured data.

## Structured Data

- [ ] Use the most specific applicable Schema.org types: `Organization`/`LocalBusiness`, `WebSite`, `Product`, `Offer`, `BreadcrumbList`, and eligible visible `FAQPage` content.
- [ ] Ensure every schema claim matches visible content and current data from the catalog.
- [ ] Include stable IDs, canonical URLs, UAH prices, availability, images, seller identity, and genuine aggregate ratings only when evidence exists.
- [ ] Validate JSON-LD and remove obsolete, duplicate, or misleading markup.

## Commercial and Local Search

- [ ] Keep product availability and price synchronized between UI, cart, metadata, and schema.
- [ ] Provide clear delivery coverage, Nova Poshta process, payment expectations, contact options, and problem-resolution policy.
- [ ] Use Kyiv/Boryspil and Ukrainian context naturally only where relevant to the page intent.
- [ ] Preserve share metadata with high-quality Open Graph imagery and accurate copy.

## Release Verification

- [ ] Crawl all internal URLs and check status, canonical, title, H1, description, indexability, links, and image references.
- [ ] Validate structured data, sitemap XML, robots directives, and social previews.
- [ ] Search the rendered page for placeholder, contradictory, mojibake, or unsupported content.
- [ ] Record baseline and post-change Lighthouse/Search Console results when those tools are available.
