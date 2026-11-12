# Live SEO / AEO / GEO verification

10 November 2026. Initial HTTP response content and browser-rendered content were examined separately.

| Check | Result |
|---|---|
| Initial page titles | FAIL: one generic title across 137 sampled HTML responses, including product/probe/error paths |
| Meta descriptions | FAIL: generic preview description in initial HTML |
| Canonical | Not present in inspected initial HTML |
| Open Graph/social tags | Not present in inspected initial HTML |
| Sitemap | FAIL: `/sitemap.xml` returns storefront HTML, not XML |
| Robots | FAIL: `/robots.txt` returns storefront HTML, not robots text |
| Missing page/product | FAIL: initial HTTP status 200 with SPA fallback; not a real 404 |
| Product structured data | PARTIAL: React contains a rendered product-schema component; no server-delivered product schema in inspected initial product HTML |
| Organization schema | Not found in inspected initial HTML |
| Client page title updates | Observed on collection/account/product navigation; does not fix initial crawler/social-preview HTML |
| Alt attributes | Descriptive names/roles observed on representative product/coin/gallery images; not a complete accessibility audit |
| Internal navigation | Representative category/product/contact/account links worked after recovery |
| HTTP/HTTPS | PASS: 301 from HTTP to HTTPS; trusted certificate |
| Preview indexability | Unsafe for launch: no verified noindex policy in current generic static entry |

The locally reviewed Express SEO renderer, real sitemap/robots and missing-page status logic are not deployed. Current static HTML delivery bypasses those changes. Do not add a misleading XML content type to storefront HTML; route the intended requests to the compatible renderer instead.

AEO/GEO readiness is not established by adding an AI-specific file. Accurate product descriptions, real merchant identity/contact, supported claims, crawlable HTML and consistent schema are prerequisites. The live coin page makes certification/assay claims without supplied evidence. Static claims were softened in the candidate; existing database descriptions were not rewritten. Merchant documentary approval or a separately authorized catalogue correction remains required.

Recheck raw HTML and response status independently after a Node deployment. Then validate rendered Product/Organization metadata, exact HTTPS canonicals and actual indexability with the merchant's intended staging/production policy. No indexing or AI-search ranking outcome is promised.
