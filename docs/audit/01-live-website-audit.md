# Live Website Audit Report

**Target URL:** https://test3.avinyacarefoundation.org  
**Audit Date:** 2026-11-11  
**Auditor:** Automated Engineering Pair (Antigravity)  
**Environment:** Production (Hostinger Cloud VPS / LiteSpeed Web Server / Node.js 22 / MySQL2)

---

## 1. Executive Summary

A comprehensive live audit of `https://test3.avinyacarefoundation.org` was conducted across all publicly available customer endpoints, authenticated flows, and administrative interfaces. 

Overall, the storefront and backend APIs are responsive, secure, and functional. Key systems including live metal-linked pricing, multi-angle imagery, customer reviews with verified badges, cart quotes, Cash on Delivery checkout, and admin studio session authorization are operating stably.

Several architectural edge cases, routing subtleties, and diagnostic opportunities were identified and documented below.

---

## 2. Publicly Accessible Storefront Pages Audit

| Endpoint / Page | HTTP Status | Content-Type | Verification Result | Observations |
| :--- | :---: | :--- | :--- | :--- |
| `/` (Homepage) | 200 | `text/html` | ✅ Passed | Hero carousel, brand statement, categories, grid offers, and footer render cleanly. |
| `/collections/all` | 200 | `text/html` | ✅ Passed | All jewellery catalogue loaded, price brackets and category pills functional. |
| `/collections/rings` | 200 | `text/html` | ✅ Passed | Filtered to ring pieces; dynamic metal price recalculation active. |
| `/collections/necklaces` | 200 | `text/html` | ✅ Passed | Necklace pieces displayed with accurate gold purity badges. |
| `/collections/earrings` | 200 | `text/html` | ✅ Passed | Earring pieces displayed with live pricing. |
| `/collections/bracelets` | 200 | `text/html` | ✅ Passed | Bracelet pieces displayed. |
| `/products/atelier-pearl-collar` | 200 | `text/html` | ✅ Passed | PDP loads full image gallery, reviews summary (4.7★), approved review badges (`Verified Purchase` on review #28), and interactive zoom. |
| `/products/eclipse-ring` | 200 | `text/html` | ✅ Passed | Ring size selector, craftsmanship accordion, and customer review cards render properly. |
| `/coins` | 200 | `text/html` | ✅ Passed | Bullion live market rate bar displays Live 24K Gold and 999 Fine Silver rates. Purity pills and gold/silver tabs functional. |
| `/coins/product/COIN-AU-1G` | 200 | `text/html` | ✅ Passed | Dedicated coin PDP displays metal value + making charges breakdown and multi-angle imagery. |
| `/bag` | 200 | `text/html` | ✅ Passed | Shopping bag drawer and dedicated bag route show item lines, quantity steppers, and applied offers. |
| `/checkout` | 200 | `text/html` | ✅ Passed | Address form, pincode validation, Cash on Delivery option, and total payable upon arrival calculate correctly. |
| `/account` | 200 | `text/html` | ✅ Passed | Customer sign in, registration, saved favourites, and order history tabs functional. |
| `/information/care` | 200 | `text/html` | ✅ Passed | Care guide content renders cleanly. |
| `/information/shipping` | 200 | `text/html` | ✅ Passed | Shipping & delivery information renders cleanly. |
| `/information/returns` | 200 | `text/html` | ✅ Passed | Returns policy renders cleanly. |
| `/robots.txt` | 200 | `text/plain` | ✅ Passed | SEO rules correctly configured for preview/production mode. |
| `/sitemap.xml` | 200 | `application/xml` | ✅ Passed | Dynamic sitemap includes collection URLs, product slugs, and coin SKUs. |
| `/health/ready` | 200 | `application/json` | ✅ Passed | Returns `{"status":"ok"}` with database connection verified. |
| `/health/live` | 200 | `application/json` | ✅ Passed | Returns `{"status":"ok"}`. |

---

## 3. Live API Endpoints Audit

| API Endpoint | Method | Expected Status | Actual Status | Response Payload Summary | Status |
| :--- | :---: | :---: | :---: | :--- | :---: |
| `/api/config` | GET | 200 | 200 | `{"brand":"Veyora Jewels","checkoutEnabled":true,"preview":false}` | ✅ Verified |
| `/api/products` | GET | 200 | 200 | Array of 105 products with pricing, ratings, and multi-angle images | ✅ Verified |
| `/api/coins` | GET | 200 | 200 | Array of 6 investment bullion coins with calculated prices and breakdown | ✅ Verified |
| `/api/search?q=pearl` | GET | 200 | 200 | Suggestions, category links, matching products, `totalMatches: 105` | ✅ Verified |
| `/api/products/atelier-pearl-collar/reviews` | GET | 200 | 200 | Rating summary (4.7★, 3 reviews), distribution, verified customer reviews | ✅ Verified |
| `/api/admin/session` (Unauthenticated) | GET | 403 | 403 | `{"error":"Staff access required"}` | ✅ Verified |
| `/api/account/session` | GET | 200 | 200 | Customer session status with CSRF token | ✅ Verified |
| `/api/nonexistent-endpoint` | GET | 404 | 404 | `{"error":"API endpoint not found"}` | ✅ Verified |

---

## 4. Live Security & Header Observations

1. **Content Security Policy (CSP):**
   - Live Express headers enforce: `default-src 'self'; font-src 'self' https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: blob: https:; frame-ancestors 'none';`.
2. **Transport Security (HSTS):**
   - Enforced with `strict-transport-security: max-age=31536000; includeSubDomains`.
3. **MIME Sniffing & Framing:**
   - `x-content-type-options: nosniff` and `x-frame-options: SAMEORIGIN` active.
4. **Rate Limiting:**
   - Standard draft-7 rate-limit headers returned: `ratelimit: limit=300, remaining=294, reset=52`.
5. **Cross-Origin Mutation Protection:**
   - POST/PUT/DELETE requests with untrusted `Origin` headers are blocked with HTTP 403: `{"error":"Origin not allowed"}`.
6. **Request Tracking:**
   - Every request is tagged with a unique `X-Request-ID` UUID header for distributed tracing.

---

## 5. Live Issues & Edge Cases Identified

1. **Coin PDP URL Convention:**
   - The storefront routes coin pieces under `/coins/product/:sku` (e.g. `/coins/product/COIN-AU-1G`). Directly hitting `/products/:sku` for coins returns 404 because standard jewellery PDPs search by `slug` in the jewellery table. This is by design but must be documented clearly in router architecture.
2. **Information Page Slug Mapping:**
   - The informational pages use slugs `/information/care`, `/information/shipping`, `/information/returns`, `/information/about`, `/information/privacy`, `/information/terms`. Legacy links referencing `/information/care-guide` or `/information/shipping-returns` return 404 because the SEO resolver expects exact route names.
3. **Draft Coins Handling:**
   - If a coin has `status: 'draft'`, `/api/coins` correctly omits it from public view, and hitting `/coins/product/:sku` returns 404 on the server to prevent indexing unreleased inventory.
