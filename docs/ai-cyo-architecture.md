# VEYORA JEWELS — AI Create Your Own (CYO) Architecture Specification

## 1. System Overview

The **AI Create Your Own (CYO)** architecture provides an end-to-end bespoke design atelier integrated directly into the Veyora Jewels luxury e-commerce platform.

It is structured into three primary tiers:
1. **Storefront Atelier (`/create-your-own`):** High-performance React 18 interface featuring conversational AI consultation, multi-angle photorealistic rendering, real-time artisanal specification selection, and dynamic quotation tracking.
2. **Backend Atelier Engine (`server/cyo.js`, `server/cyo-images.js`):** Node.js Express service enforcing compulsory customer authentication, atomic server-side generation quota management (strict 3-image cap), procedural multi-angle WebP image synthesis, and commercial quotation formulation.
3. **Admin Atelier Studio (`/admin/custom-designs`):** Dedicated back-office review dashboard for workshop artisans, valuation experts, and store managers to inspect prompt transcripts, reference uploads, and renders, evaluate structural integrity, and issue binding commercial quotations.

```
+-----------------------------------------------------------------------------------+
|                           CLIENT STOREFRONT ATELIER                               |
|   /create-your-own  (Compulsory Customer Login Gate: customerAuth)                |
|                                                                                   |
|  +--------------------+  +-------------------------+  +------------------------+  |
|  |  AI Design         |  |  Multi-Angle Viewport   |  |  Artisanal Specs &     |  |
|  |  Consultant & Chat |  |  - Front (Catalogue)   |  |  Quotation Status      |  |
|  |  - Prompts         |  |  - Side (45 Profile)    |  |  - Metal & Purity      |  |
|  |  - References      |  |  - Detail (2.2x Macro)  |  |  - Craft & Finish      |  |
|  |  - Complete-Set    |  |  - Showcase (Editorial) |  |  - Quoted Price (INR)  |  |
|  +--------------------+  +-------------------------+  +------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | HTTP API (Session / CSRF)
                                           v
+-----------------------------------------------------------------------------------+
|                             BACKEND ATELIER ENGINE                                |
|  server/cyo.js & server/cyo-images.js                                             |
|                                                                                   |
|  +--------------------+  +-------------------------+  +------------------------+  |
|  |  Quota Gatekeeper  |  |  Multi-Angle Synthesizer|  |  Commercial Engine     |  |
|  |  - Atomic DB check |  |  - Procedural Sharp WebP|  |  - Bullion costing     |  |
|  |  - Strict 3 Limit  |  |  - Metallic gradients   |  |  - 3% GST computation  |  |
|  |  - Zero-waste lock |  |  - Facet reflections    |  |  - Cart injection      |  |
|  +--------------------+  +-------------------------+  +------------------------+  |
+------------------------------------------+----------------------------------------+
                                           | Database Transactions (Knex.js)
                                           v
+-----------------------------------------------------------------------------------+
|                              PERSISTENCE LAYER                                    |
|  SQLite (Staging/Test) / MySQL 8 (Production)                                     |
|  - customers (cyo_image_generations_count, cyo_image_generations_limit)           |
|  - cyo_designs & cyo_design_versions                                              |
|  - cyo_design_images (view_type: front, side, detail, showcase)                   |
|  - cyo_conversations & cyo_messages                                               |
|  - cyo_quotations (quoted_amount, estimated_weight_g, specifications)             |
|  - cyo_ai_usage & cyo_audit_logs                                                  |
+-----------------------------------------------------------------------------------+
```

---

## 2. Component Architecture

### 2.1 Storefront Studio (`src/CYOStudio.jsx`)
- **Authentication Gate:** Blocks unauthenticated access; redirects to `/account?mode=login` while storing `sessionStorage.setItem('redirect_after_login', '/create-your-own')` for return-redirection.
- **Quota Monitor:** Communicates with `GET /api/cyo/quota` to display real-time generation balances (`{count, limit, remaining}`). Disables generation actions when `remaining === 0`.
- **Tri-Pane Layout:**
  1. *Left Panel:* Conversational natural language designer and reference sketch uploader.
  2. *Center Panel:* High-resolution multi-angle view canvas with full-screen inspection mode.
  3. *Right Panel:* Material, craftsmanship, and gemstone selectors, paired with real-time structural feasibility calculations and quotation acceptance controls.

### 2.2 Image Synthesis Engine (`server/cyo-images.js`)
- Renders 4 high-resolution (1024x1024) WebP images per generation request:
  - `front`: Studio catalogue view on neutral gradient backdrop.
  - `side`: 45-degree angle profile showcasing relief, clasp, and setting depth.
  - `detail`: 2.2x macro close-up highlighting prong security and gem facet luster.
  - `showcase`: Editorial perspective on velvet plinth with directional lighting.
- Outputs saved into `/uploads/` as `cyo_{designId}_v{versionId}_{angle}_{timestamp}.webp`.

### 2.3 Quotation & Cart Integration
- Admin issues binding formal quote (`cyo_quotations`).
- Client accepts quotation via `POST /api/cyo/quotations/:id/accept`.
- Once accepted, client adds bespoke line item directly into their cart (`bag`):
  - SKU: `CYO-QUOTE-{id}`
  - Name: `Bespoke: [Design Title]`
  - Unit Price: Approved quotation amount.
  - Thumbnail: Approved concept render.
  - Weight & Specs: Stored in order snapshot.
- Proceeds through standard checkout and generates authenticated order records in `orders` and `order_items`.
