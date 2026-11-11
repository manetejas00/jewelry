# Security, Performance & Dependency Risk Audit

**Project:** Veyora Jewels (E-Commerce Platform)  
**Audit Date:** 2026-11-11  
**Auditor:** Automated Engineering Pair (Antigravity)  
**Scope:** Application Security, OWASP Top 10, Performance Benchmarks, Database Efficiency, and Supply Chain Dependencies

---

## 1. Executive Summary

A comprehensive, non-destructive security and performance evaluation was performed on both the local codebase and the live deployment (`https://test3.avinyacarefoundation.org`).

The overall security posture is high, demonstrating strong adherence to defense-in-depth principles:
- Double-token CSRF architecture protecting both staff and customer sessions.
- Session regeneration on login/logout preventing session fixation.
- Strict Content Security Policy (CSP), frame protection, and HSTS headers.
- Safe SQL query generation through Knex query builder parameters.
- File upload sanitization rejecting active SVG/HTML vectors and converting uploaded images to WebP.

Several actionable improvements regarding error disclosure, request timeouts, and database indexing were identified.

---

## 2. Security Findings (OWASP Top 10 Evaluation)

### 2.1 A01: Broken Access Control
- **Audit Findings:**
  - **Role-Based Access Control (RBAC):** Admin endpoints strictly verify `req.session.staff` role using middleware `auth(['owner', 'manager'])`. Viewers (`viewer` role) are barred from POST/PATCH/DELETE mutations.
  - **Customer Order Isolation:** `mayReadOrder(req.session, order)` prevents users from accessing other customers' orders. Session orders require matching ownership.
  - **Customer Review Isolation:** In `server/reviews.js`, editing or deleting a review checks `review.user_id === customerId`. A 403 Forbidden is thrown if a customer attempts to modify another user's review.
- **Risk Level:** ✅ Very Low (Well enforced).

### 2.2 A02: Cryptographic Failures
- **Audit Findings:**
  - **Password Storage:** Customer and staff passwords are encrypted using `bcryptjs` with salt rounds. Raw passwords are never stored or returned in JSON responses.
  - **Session Security:** `express-session` cookies use `httpOnly: true`, `sameSite: 'lax'`, and in production `secure: true`.
  - **Password Reset Tokens:** In `server/password-reset.js`, reset tokens use `crypto.randomBytes(32).toString('hex')` and are stored as SHA-256 hashes with 60-minute expiration.
  - **Production Guard:** `server/index.js` explicitly fails to start if `SESSION_SECRET` is less than 32 characters long when `NODE_ENV === 'production'`.
- **Risk Level:** ✅ Very Low.

### 2.3 A03: Injection (SQL, XSS, Command Injection)
- **SQL Injection:** All queries use Knex parameter bindings (`.where({ ... })`, `.whereIn(...)`). No raw user string interpolations exist in query construction.
- **Cross-Site Scripting (XSS):**
  - Customer review input (`server/reviews.js`) undergoes string sanitization via regex and tag stripping (`sanitizeHtml`) before database insertion.
  - React auto-escapes all JSX bindings.
  - `pageMetadata` in `server/seo.js` safely escapes script and JSON-LD data.
- **Active SVG Vector Protection:** In `server/index.js`, image uploads inspect byte headers and reject files containing `<svg`, `<script`, or SVG namespaces before writing to disk.
- **Risk Level:** ✅ Very Low.

### 2.4 A04: Insecure Design & Rate Limiting
- **Rate Limiting:**
  - Global API rate limiter: 300 requests per minute (`express-rate-limit`).
  - Checkout rate limiter: 20 requests per minute.
  - Customer login / registration limiter: 10 attempts per 15 minutes.
  - Staff login limiter: 10 attempts per 15 minutes.
  - Review submission limiter: 5 submissions per 10 minutes.
- **Risk Level:** ✅ Very Low.

### 2.5 A05: Security Misconfiguration & Error Disclosure
- **Finding:** While production client responses return generic error messages (`"The request could not be completed. Please try again."`), server error logging drops the stack trace, making operational observability difficult without developer intervention.
- **Recommendation:** Implement structured server logging with sanitized parameters.
- **Risk Level:** ⚠️ Low.

### 2.6 A07: Identification and Authentication Failures
- **Brute Force Protection:** Enforced via `express-rate-limit` on login routes.
- **Session Regeneration:** Both customer and staff logins invoke `req.session.regenerate()` to issue fresh session IDs upon credential elevation.
- **Session Versioning:** The `customers` table tracks `session_version`. Changing password or completing a reset increments `session_version`, immediately invalidating all other active sessions across browsers.
- **Risk Level:** ✅ Very Low.

### 2.7 A08: Software and Data Integrity Failures
- **CSV Import Validation:** In `server/importer.js`, imports validate checksums, require schema matching, run within transactional locks (`import_locks`), and allow previewing errors before publication. Older snapshots are prevented from overwriting newer supplier catalogue data.
- **Price Calculation Integrity:** In `server/pricing.js`, rates require an active date check (`isFresh`) and explicit currency checks. A stale rate automatically pauses gold-linked checkouts while fixed-price items remain available.
- **Risk Level:** ✅ Very Low.

---

## 3. Performance & Efficiency Audit

### 3.1 Database Query Efficiency & N+1 Prevention
- **Observation:** In `catalogue(db)` (`server/pricing.js`), products are retrieved in a single query, followed by a batch lookup for active promotional offers and images. No N+1 queries occur on catalogue loads.
- **Composite Indexes:** Indexes are present on:
  - `products`: `sku`, `product_code`, `slug`, `category`, `status`, `supplier`, `source_timestamp`.
  - `coins`: `sku`, `category`, `metal`, `purity`, `status`.
  - `reviews`: `product_id`, `user_id`, `rating`, `status`, `[product_id, status]`, `[status, rating]`.
- **Review Search Optimization:** In `server/reviews.js`, search uses `.where(function() { ... })` with LIKE queries across `title`, `comment`, and `name`. For high review counts (>50,000), a full-text search index is recommended.

### 3.2 Catalogue Memoization & Cache Invalidation
- **Observation:** `src/api.js` deduplicates overlapping concurrent requests to `/products`, `/coins`, and `/offers` via `pendingCatalogue` Map. Once completed, the cache entry is cleared, guaranteeing that price changes reflect immediately on subsequent user interactions.
- **Cross-Tab Synchronization:** When catalogue data or prices are updated in the admin panel, a `BroadcastChannel('veyora-catalogue')` message is broadcasted, triggering instant re-renders in active storefront tabs without polling.

### 3.3 Asset & Image Optimization
- **Thumbnails & Sharp Processing:**
  - Image uploads are converted to WebP format using `sharp`.
  - High-resolution hero images generate smaller WebP thumbnails lazily or upon upload (`server/thumbnails.js`).
  - Mobile phone EXIF orientations are auto-rotated before saving thumbnails.
- **Frontend Lazy Loading:** Product listing images and review gallery images use `loading="lazy"` and decoding="async".

---

## 4. Dependency Risk Assessment

| Dependency | Current Version | Purpose | Vulnerability Check | Risk Assessment |
| :--- | :---: | :--- | :---: | :---: |
| `express` | `4.21.2` | HTTP Web Framework | Clean | Low (Stable) |
| `react` / `react-dom` | `19.0.0` | Frontend UI Library | Clean | Low (Latest) |
| `vite` | `6.1.0` | Bundler & Dev Server | Clean | Low (Modern) |
| `knex` | `3.1.0` | SQL Query Builder | Clean | Low |
| `mysql2` | `3.12.0` | MySQL Client Driver | Clean | Low |
| `better-sqlite3` | `11.8.1` | SQLite Native Driver | Clean | Low |
| `bcryptjs` | `3.0.2` | Password Hashing | Clean | Low |
| `sharp` | `0.35.5` | Image Processing Engine | Clean | Low |
| `helmet` | `8.0.0` | Security Headers Middleware | Clean | Low |
| `express-rate-limit` | `7.5.0` | Rate Limiter Middleware | Clean | Low |

All production dependencies are up to date with zero high-severity CVEs reported by `npm audit`.
