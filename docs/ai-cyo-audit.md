# VEYORA JEWELS — AI Create Your Own (CYO) Jewellery Studio Audit

**Document Status:** Complete & Verified Pre-Implementation Audit  
**Author:** Antigravity Architect  
**Target:** Veyora Jewels E-Commerce Platform  
**Scope:** Architecture inspection, reusable component discovery, and implementation blueprint for bespoke AI Jewellery Studio

---

## 1. Executive Summary

This audit establishes the technical foundation for introducing the **AI-Only Create Your Own (CYO) Jewellery Studio** into the Veyora Jewels e-commerce platform.

The objective is to provide a bespoke, AI-native design atelier at `/create-your-own` where registered customers imagine, prompt, upload references, converse with an intelligent jewellery design consultant, generate photorealistic multi-angle concepts (front, side, detail, showcase), refine materials and finishes, and submit designs for administrative feasibility review and quotation before checkout.

Key structural guardrails identified during this audit:
1. **Compulsory Customer Authentication:** The CYO studio and all associated `/api/cyo/*` endpoints require an active authenticated customer session (`customerAuth`). Unauthenticated visitors must be guided to sign in or register with seamless return-redirection to the studio.
2. **Server-Side Generation Quota (Strict 3-Image Cap):** Every registered customer receives a default quota of 3 AI image generations. This quota is enforced atomically in the database (`customers.cyo_image_generations_count`), logged in `cyo_ai_usage`, and persisted across sessions, logins, and devices. Failed generations do not consume quota. Admins can inspect, reset, or grant additional quota with mandatory audit logging.
3. **Controlled Commercial Quotation Pipeline:** AI generates visual concepts and initial structural analysis; final manufacturing pricing is never fabricated by the model. Admins review feasibility, enter estimated metal weight, craftsmanship charges, and taxes, and issue formal quotations. Customers review and accept quotations, which then cleanly integrate into the standard bag and checkout pipeline as verified bespoke items.

---

## 2. Existing Frontend Architecture Audit

### 2.1 Framework & Core Tooling
- **React 18 & Vite 5:** Fast SPA architecture with hot module replacement, bundling via Rollup, and standard CSS module/vanilla stylesheets.
- **Routing:** `react-router-dom` v6 with declarative `<Routes>` and nested `/admin/*` routing in `src/main.jsx`.
- **Global State Management:** Context API in `src/store.jsx` (`useStore`) orchestrating:
  - `customer`: Customer profile (`id`, `name`, `email`, `session_version`).
  - `bag`: Line items with quantities, pricing, and stock status.
  - `saved`: Wishlisted piece identifiers.
  - `config`: Environment settings and feature flags.
  - `offers`: Active merchant discounts and promotions.
- **Storefront Navigation:**
  - `STORE_NAV_ITEMS` in `src/main.jsx` manages top navigation links.
  - Header displays brand logo, category links with dynamic gold underline active states, search modal, wishlist counter, and bag flyout.
  - A prominent "Create Your Own" studio navigation button will be integrated into the navigation bar and mobile drawer.

### 2.2 Reusable Frontend Components
- `ErrorBoundary.jsx`: Top-level and section-level luxury error fallback ("Something interrupted this view").
- `useScrollLock.js`: Robust modal and drawer overlay scroll-locking without layout shifts.
- `src/admin/CommonComponents.jsx`: Standardized administrative data tables, action bars, status badges (`CommonStatusBadge`), modals, and stat counters.
- `ProductAngleManager` (`src/main.jsx`): Multi-angle view concepts (`hero`, `front`, `right`, `left`, `back`, `detail`) applicable to generated jewellery views.

---

## 3. Existing Backend Architecture Audit

### 3.1 Node.js & Express API Server
- Express application mounted in `server/index.js` running on Node.js 20+.
- Database abstraction with **Knex.js** supporting SQLite (`private/store.sqlite` in development/staging) and MySQL 8 (`mysql2` in production).
- Security middleware:
  - `express-session` with memory/database stores, secure cookies, and HTTP-only flags.
  - `customerCsrf` and `staffCsrf`: Token-based CSRF defense on state-mutating HTTP methods (`POST`, `PUT`, `DELETE`).
  - `rateLimit`: Express rate limiters for IP-level and account-level endpoint protection.
- Global Error Handling: Structured errors via `validationError()` (`server/errors.js`), normalized 4xx/5xx responses with JSON diagnostics.

### 3.2 Authentication & Session Architecture
- `server/customers.js`:
  - `registerCustomer()`, `loginCustomer()`, `customerState()`, `saveCustomerState()`.
  - Passwords hashed using `bcryptjs` with cost factor 12.
  - Session verification via `customerAuth` middleware (`server/index.js` line 180):
    ```javascript
    const customerAuth = (req, res, next) => req.session.customer ? next() : res.status(401).json({error: 'Please sign in to your customer account.'});
    ```

---

## 4. Existing AI & Chatbot Integrations

### 4.1 Assistant Pipeline (`server/chat/`)
- `server/chat/ai-provider.js`:
  - OpenAI-compatible chat completion client with timeout handling (`AbortSignal.timeout(25000)`), retry resilience, and cost estimation.
  - Configurable endpoints via `AI_API_URL` / `AI_BASE_URL` and API key `AI_API_KEY`.
  - Secret redaction via `redactSecrets()` ensuring internal keys and sensitive tokens are never echoed to clients.
- `server/chat/config.js`:
  - Database-backed configuration loaded from the `settings` table (`CHATBOT_MODEL`, `CHATBOT_DAILY_LIMIT`, `CHATBOT_MAX_INPUT`, `CHATBOT_MAX_TOKENS`, `CHATBOT_SYSTEM_PROMPT`).
  - Dynamic runtime updates without requiring server restarts.

### 4.2 Image Processing Pipeline
- `server/thumbnails.js`:
  - Powered by **Sharp** for high-performance image manipulation, resizing, and modern WebP transcoding.
  - Preserves aspect ratios, prevents artificial upscaling, and caches optimized derivatives.
  - File upload destination: `/uploads/` directory with filename sanitization and MIME-type validation.

---

## 5. Master Data & Domain Relationships

The platform features structured master tables (introduced in Migration 022) with authentic Indian jewellery classifications:

1. **Materials Master (`materials`):**
   - Gold (24K, 22K, 18K, 14K), Silver (925 Sterling, 999 Fine), Oxidised Silver, Cultured Pearls, Gemstones (Emerald, Ruby, Sapphire), Diamonds (Polki, Brilliant Cut), Brass, Alloy.
2. **Craftsmanship Master (`craftsmanship`):**
   - Kundan, Polki, Meenakari, Temple Craft, Jadau, Nakshi, Filigree, Handcrafted, Traditional Engraving, Antique Craft.
3. **Finishes Master (`finishes`):**
   - Polished Gold, Antique Gold Finish, Rose Gold Finish, Rhodium Finish, Oxidised Finish, Matte Finish, High Polish, Gold Plated.
4. **Collections Master (`collections`):**
   - Royal Kundan Bridal, Temple Heirlooms, Minimal Everyday, Nocturne Pearl Edit.

These master categories form the exact attribute taxonomy for the AI CYO prompt parser, ensuring generated designs conform to Veyora’s artisanal craft standards.

---

## 6. Commercial Quotation & Checkout Integration

### 6.1 Quotation Workflow
- **Quotation Creation:** Admins inspect customer prompt, references, and AI-generated multi-angle renders in `/admin/custom-designs`.
- **Cost Formulation:**
  - Estimated Gross & Net Weight (grams).
  - Material Cost (based on active internal metal rates from `rates` table).
  - Gemstone & Pearl Cost.
  - Making Charges / Artisanal Labour.
  - Applicable GST (3% on precious metals/jewellery in India).
  - Total Quoted Amount (INR).
  - Validity Window (e.g. 7 days due to precious metal rate fluctuations).
- **Customer Acceptance:** Customer reviews formal quote in their account or studio; upon clicking "Accept Quotation", status transitions to `quotation_accepted`.
- **Cart Injection:** An accepted quotation can be added to the customer's bag as a bespoke order line:
  - SKU: `CYO-QUOTE-<id>`
  - Name: `Bespoke: [Design Title]`
  - Price: Quoted amount.
  - Image: Approved concept render.
  - Metadata: Metal, purity, craftsmanship, finish, quotation ID.
  - Seamlessly flows through existing COD / Online checkout and generates standard orders in `orders` and `order_items`.

---

## 7. AI Quota & Rate Limit Architecture (3-Image Rule)

### 7.1 Server-Side Enforcement Strategy
- **Customer Account Tracking:**
  - `customers.cyo_image_generations_count`: Number of successful AI image generations used (default: 0).
  - `customers.cyo_image_generations_limit`: Authorized maximum generations (default: 3).
- **Atomic Concurrency Protection:**
  ```sql
  UPDATE customers
  SET cyo_image_generations_count = cyo_image_generations_count + 1
  WHERE id = :customerId AND cyo_image_generations_count < cyo_image_generations_limit;
  ```
  If zero rows are updated, the request is rejected with HTTP 429 (`Generation quota exhausted`). This prevents race conditions from concurrent browser tabs or parallel API calls.
- **Zero-Waste Guarantee:** The quota counter increments *only after* an image generation successfully produces and saves valid assets to disk. Network drops, provider timeouts, or AI content policy rejections do not consume the customer's quota.
- **Admin Control & Audit Log:**
  - Authorized administrators (`owner`, `manager`) can inspect usage history in `cyo_ai_usage`.
  - Admins can reset or grant additional quota with an audit trail entry in `cyo_audit_logs`.

---

## 8. Database Architecture Blueprint (Migration 024)

1. **Alter `customers` Table:**
   - `cyo_image_generations_count` (integer, default 0, indexed)
   - `cyo_image_generations_limit` (integer, default 3)
2. **`cyo_designs`:** Core design entity belonging to a customer (`id`, `customer_id`, `title`, `category`, `initial_prompt`, `current_version_id`, `status`, `created_at`, `updated_at`).
3. **`cyo_design_versions`:** Versioned iterations (`id`, `design_id`, `version_number`, `prompt`, `attributes` [JSON], `status`, `created_at`).
4. **`cyo_design_images`:** Multi-angle concept assets (`id`, `design_id`, `version_id`, `view_type` [front/side/detail/showcase], `image_url`, `prompt`, `created_at`).
5. **`cyo_conversations` & `cyo_messages`:** Multi-turn conversational design logs between customer and AI assistant (`id`, `conversation_id`, `role`, `content`, `attachments`, `design_version_id`, `created_at`).
6. **`cyo_quotations`:** Formal manufacturing quotes issued by admins (`id`, `design_id`, `customer_id`, `quoted_amount`, `estimated_weight_g`, `material_cost`, `making_cost`, `tax_cost`, `specifications` [JSON], `admin_notes`, `status`, `valid_until`, `created_at`, `updated_at`).
7. **`cyo_ai_usage`:** Granular AI request logs for cost and quota auditing (`id`, `customer_id`, `design_id`, `version_id`, `operation`, `model`, `tokens_in`, `tokens_out`, `cost_inr`, `status`, `created_at`).
8. **`cyo_audit_logs`:** Staff actions including quota overrides, status revisions, and quotation issuances (`id`, `staff_id`, `action`, `target_id`, `details` [JSON], `created_at`).

---

## 9. Non-Duplication & Reuse Matrix

| Requirement | Existing Architecture Feature | CYO Integration Approach |
|---|---|---|
| User Authentication | `server/customers.js` & `customerAuth` | Reused directly; guest redirects to `/account` with studio return URL |
| CSRF & Session Security | `customerCsrf` & `staffCsrf` | Reused on all mutation endpoints (`POST /api/cyo/*`) |
| Image Processing & Storage | Sharp WebP pipeline in `server/thumbnails.js` | Saved under `/uploads/cyo/` with high-resolution derivatives |
| Material & Craft Master | Tables `materials`, `craftsmanship`, `finishes` | Reused for attribute dropdowns, validation, and AI prompt context |
| Metal Pricing Reference | `rates` table & `daily()` pricing | Used by admins in quotation generator for accurate bullion costing |
| Shopping Bag & Checkout | `server/customers.js` state & `server/index.js` orders | Bespoke quotation SKU added to cart without modifying core order pipeline |
| Admin Navigation | `adminRoutes` in `src/main.jsx` | Dedicated `/admin/custom-designs` route utilizing shared Admin shell |
| Visual Styling & Design System | Veyora Maison aesthetic (`#102124`, `#c5a059`, `#fcfbf9`) | Studio UI styled to match existing brand luxury standards |

---

## 10. Audit Conclusion & Next Steps

The existing system provides robust primitives for authentication, media storage, master data, and order fulfillment. By building upon these validated foundations rather than introducing disparate subsystems, the CYO studio will deliver a seamless, secure, and production-ready bespoke jewellery creation experience.

**Execution Order:**
1. Database migration: `migrations/024_cyo_jewellery_studio.js`
2. Backend core services: `server/cyo.js` and `server/cyo-images.js`
3. API endpoints mounting in `server/index.js`
4. Frontend Studio UI: `src/CYOStudio.jsx` and `/create-your-own` route
5. Admin Management UI: `src/admin/CYOAdmin.jsx` and `/admin/custom-designs` route
6. Automated test suite: `tests/cyo.test.js`
7. Comprehensive technical documentation suite (`docs/ai-cyo-*.md`)
