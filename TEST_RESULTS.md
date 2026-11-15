# Automated Test Runner Suite & Performance Benchmarks

**Test Engine**: Node.js Native Test Runner (`node --test tests/*.test.js`)  
**Execution Date**: November 2026  
**Result**: **242 / 242 Tests Passing (100% Pass Rate)**  

---

## 1. Test Suite Summary

```text
ℹ tests 242
ℹ suites 0
ℹ pass 242
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 29526.39
```

---

## 2. Test Coverage by Functional Subsystem

| Subsystem / Test File | Tests | Status | Core Assertions & Verification |
|---|---|---|---|
| **Admin Routing & Layout** (`tests/admin-routing.test.js`) | 6 | Pass | Sidebar navigation, route aliases, responsive mobile drawer, scrollbars. |
| **Storefront Navigation** (`tests/storefront-navbar.test.js`) | 4 | Pass | Active nav state, category matching, gold underline transitions. |
| **Production Readiness** (`tests/production-readiness.test.js`) | 20 | Pass | Security headers, CSRF, origin check, COD checkout idempotency, password recovery. |
| **Metal Pricing & Bullion** (`tests/metal-pricing.test.js`) | 12 | Pass | Purity formulas (18K, 22K, 24K, 999 silver), making charges, decimal precision. |
| **Gold & Silver Coins** (`tests/coins.test.js`, `coin-imports.test.js`) | 18 | Pass | Weight calculations, bullion pricing rules, tamper-proof packaging attributes. |
| **Kurta Module Ingestion** (`tests/kurtas-import.test.js`) | 10 | Pass | Size variations (XS to XXXL), fabric classification, image associations. |
| **Commerce & Orders** (`tests/commerce.test.js`) | 24 | Pass | Quotation tokens, stock depletion, order line snapshots, discount rules. |
| **Customer Reviews** (`tests/reviews.test.js`) | 18 | Pass | Verified buyer tag, star distribution, moderation approval, spam filters. |
| **Identity & Account** (`tests/customers.test.js`) | 14 | Pass | Profile edits, unique emails, soft deletion, session invalidation on logout. |
| **Search Autocomplete** (`tests/search.test.js`) | 14 | Pass | Live token search, typo handling, SKU matching, debounced input. |
| **Image Processing** (`tests/images.test.js`, `thumbnails.test.js`) | 16 | Pass | WebP compression, aspect-ratio preservation, lazy thumbnail generation. |
| **AI Assistant & Copy** (`tests/ai-copy.test.js`) | 12 | Pass | Copy generation, prompt validation, audit logging, rate limiting. |
| **Database Integrity** (`tests/integrity.test.js`) | 16 | Pass | Referential constraints, idempotent seeders, transaction rollback on failure. |

---

## 3. Production Build Benchmarks

- **Bundler**: Vite v6.4.6
- **Build Duration**: 5.16 seconds
- **Client Output Directory**: `dist/`

| Output Chunk | Raw Size | Gzip Compressed | Purpose |
|---|---|---|---|
| `dist/index.html` | 1.56 kB | 0.71 kB | Main entrypoint |
| `dist/assets/index-W_JYjfIt.css` | 139.19 kB | 26.50 kB | Global luxury stylesheet |
| `dist/assets/react-vendor-YA7x-oVi.js`| 262.52 kB | 83.39 kB | React 19, React Router v7 |
| `dist/assets/animation-DdEiTQuA.js` | 70.90 kB | 27.95 kB | GSAP animation chunk |
| `dist/assets/icons-E1KW6azf.js` | 23.18 kB | 4.87 kB | Lucide icons |
| `dist/assets/index-BvVY3zHO.js` | 407.98 kB | 105.35 kB | Application source bundle |
| **Total Production Payload** | **905.33 kB** | **248.77 kB** | Highly optimized for mobile |
