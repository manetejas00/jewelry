# 07 — SEO, AEO, and GEO audit

SEO output is largely implemented and then switched off until production and `MERCHANT_READY=true`. That gate is deliberate: `pageMetadata` sets `indexable` only when `NODE_ENV=production` and `MERCHANT_READY=true` (`server/seo.js`). `robots.txt` is `Disallow: /` in preview or when the merchant is not ready. Indexing a fictional catalogue would be worse than being invisible. The gaps below are what remains after that gate is opened.

## What exists

| Item | Status | Evidence |
|---|---|---|
| Title and meta description | Present, replaced per path in production HTML | `renderMetadata` in `server/seo.js`; default copy in `index.html` |
| Canonical | Present | `<link rel="canonical">` from `APP_URL` + path |
| Robots | Present | `GET /robots.txt` |
| XML sitemap | Present | `GET /sitemap.xml` lists home, four jewellery collections, coins, product slugs, coin SKUs |
| Open Graph | `og:title`, `og:description`, `og:url`, `og:image` when an image exists, `og:type` of `product` or `website` | `server/seo.js` |
| Twitter card | `summary_large_image` | same file |
| Product JSON-LD | Server HTML and a second client script | `server/seo.js` and `StructuredProduct` in `src/main.jsx` |
| Heading and alt text | Product images use name, size, purity, and metal. Home uses an `h1` in the hero and `h2` section titles | `src/main.jsx` |
| Internal links | Header, footer, breadcrumbs on product and coin pages | `src/main.jsx` |
| URL shape | Readable `/products/:slug`, `/collections/:category`, `/coins/product/:sku` | router |
| Private routes | Account, bag, checkout, order, and admin are `noindex` and omitted from the public robots allow-list | `server/seo.js` |
| 404 | Unknown paths return status 404 in production HTML and a storefront page | `pageMetadata` status 404; `NotFound` |
| Mobile viewport | `width=device-width, initial-scale=1` | `index.html` |
| Language | `en-IN` on the document and the manifest | `index.html`, `public/manifest.webmanifest` |
| PWA | Installable manifest, icons, offline shell. Not an SEO ranking system | `server/pwa.js` |

`MERCHANT_READY` also requires a real merchant email plus non-empty shipping and returns policy text (`server/runtime.js`). Until those exist, checkout and indexing stay off together.

## Findings

### SEO-1 — Sitemap is a URL list only

`sitemap.xml` emits `<loc>` and nothing else (`server/seo.js`). There is no `lastmod`, `changefreq`, or image sitemap. Information pages (`/information/shipping`, care, contact, about, privacy, terms) are indexable when the merchant is ready but are absent from the sitemap. `/collections/pearls` is in the metadata label map and is also absent from the sitemap.

### SEO-2 — Duplicate product structured data

Production HTML injects one Product schema. After React hydrates, `StructuredProduct` injects a second script. Offers include price and `InStock` / `OutOfStock` from `checkout_available`. Missing fields that merchants and rich results usually need: `brand` is only on the client script, not the server script; there is no `aggregateRating` even though reviews exist; there is no `gtin`, `material` on the server script, or merchant `seller`.

### SEO-3 — No sitewide schema

There is no `Organization`, `JewelryStore` / `LocalBusiness`, `WebSite` with `SearchAction`, `BreadcrumbList`, `FAQPage`, or `ItemList` for collections. Breadcrumbs are visual links only.

### SEO-4 — Titles and descriptions are generic off the product page

Collection titles are the label plus the brand (`Rings | Veyora Jewels`). The description stays the global sentence unless the path is a product (`server/seo.js`). Information pages share that same description. That is thin for queries about delivery, returns, or the brand.

### SEO-5 — Slugs are not unique

`products.slug` is indexed, not unique (`migrations/001_commerce.js`). `pageMetadata` uses `Array.find`, so two published rows with one slug expose a single URL and hide the other. `product_code` is also not unique.

### SEO-6 — Client routing is invisible to crawlers that do not execute JavaScript

Production sends titled HTML for each path, which is the important part. The body is still `<div id="root"></div>` (`index.html`). Product copy, reviews, and internal links are not in the initial HTML. Google can render JavaScript; many answer engines and link previewers will only see the head tags. There is no prerendered body.

### SEO-7 — Analytics and Search Console are absent

No `gtag`, Google Analytics, Tag Manager, or Search Console verification meta tag exists under `src/`, `server/`, or `index.html`. There is no consent banner because there is no tracker. A production launch needs a measurement plan and a property the merchant controls. This repository cannot prove indexing, queries, or conversions.

### SEO-8 — Canonical host depends entirely on `APP_URL`

Canonical, Open Graph, sitemap, and robots all use `APP_URL` (`server/seo.js`). A wrong host, a trailing path, or http instead of https fails the production boot check, which is good. There is still no redirect table from a www host, an old domain, or the documented staging host `test3.avinyacarefoundation.org` inside this app. Those redirects belong at the proxy. They are not implemented here.

### SEO-9 — Image SEO is partial

Uploaded originals keep their generated filenames. Alt text is set on the product page and can be stored on `product_images.alt_text`. Listing cards and order thumbnails were not fully enumerated for empty alts in a browser. Hero photography is a CSS background or `<img>` depending on the component; the hero path should be checked visually when the server can run.

### SEO-10 — Core Web Vitals and mobile SEO were not measured

Responsive CSS exists from 380px upward (`src/style.css`). That is not a field measurement. Google font CSS is render-blocking. Full catalogue JSON competes with the first paint (`05-performance-audit.md`).

## AEO (answer engines)

Answer engines look for a direct answer, a clear entity, and evidence. The current pages do not provide that structure.

Missing:

- A factual “About” body that states who sells, what is sold, and where orders ship. `/information/about` exists as a route; its copy is static in `Information()` and is not a crawlable article in the first HTML.
- FAQ blocks for delivery time, COD, returns, gold-rate changes, hallmarking, and coin purity. The business correctly refuses hallmark claims until the merchant supplies evidence (`README.md`). Do not invent certification copy.
- `FAQPage` schema only after the answers are true.
- Visible gold purity, weight, and making-charge definitions next to the price. The price breakdown exists in the pricing engine; it is not packaged as a short answer block.
- Stable, unique product URLs (see SEO-5).

## GEO (generative engines)

Generative systems cite pages that state facts in sentences and name the brand consistently.

Present: brand string `Veyora Jewels`, `en-IN`, INR prices in Product schema when indexable, product name and a 160-character description.

Missing:

- Organization entity with a logo URL, contact email, and area served (India).
- Author or merchant attribution on policies.
- Review snippets tied to `aggregateRating` after moderation. Pending reviews must stay out of schema. `getProductReviews` already limits public summaries to `approved`.
- Consistent naming between jewellery slugs and coin URLs (`/coins/product/:sku` is an identifier URL, which is fine if the name is in the title).
- A plain-language shipping and returns page that matches `SHIPPING_POLICY` and `RETURNS_POLICY`. Those strings are API config, not necessarily the indexed article.

## Indexing checklist before `MERCHANT_READY=true`

1. Confirm `APP_URL` is the final https origin.
2. Put real policy and contact text in the environment and on `/information/*`.
3. Confirm every published slug is unique.
4. Add information pages and the pearl collection to the sitemap, plus `lastmod` from `updated_at`.
5. Add Organization and BreadcrumbList schema. Add aggregateRating only from approved reviews.
6. Remove the duplicate client Product script or make it identical to the server script.
7. Verify `robots.txt` and `sitemap.xml` on the live origin after deploy.
8. Add Search Console and an analytics property the merchant owns.
9. Do not index preview mode or the staging host.
