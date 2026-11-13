# Catalogue copy skills

This is the audit and the implementation for the Nexscope eCommerce-Skills collection in Veyora Jewels. The collection was inspected from https://github.com/nexscope-ai/eCommerce-Skills at `main` on 12 November 2026. It contains 162 `SKILL.md` files. Those files are agent instructions. They are not backend APIs, and the repository does not include Nexscope API credentials.

## What was implemented

Three instruction skills are vendored for Cursor and for the Merchant Studio:

| Skill | Status in the Nexscope README | What this store does with it |
| --- | --- | --- |
| `product-description-generator` | Available | Drafts a product description from stored catalogue fields |
| `product-title-optimization` | Beta | Drafts a product name |
| `product-page-seo` | Beta | Drafts description copy whose opening can serve as the search snippet |

`veyora-catalogue-copy` is local guidance. It tells the model that this is a custom INR storefront, that prices must not be written into copy, and that diamond and certification facts may be used only when they are already in the stored text.

Approved text is written with the existing product update limits: name up to 200 characters, description up to 5000 characters. The slug, price, stock, metal, purity, weight, size, finish, supplier, and images stay as they are. The live meta description remains the first 160 characters of the published description, which is how `server/seo.js` already builds it.

## How to enable it

1. Apply the new migration yourself: `npm run migrate`. This adds `ai_drafts`. It does not change product rows. Preview mode also applies pending migrations when `npm run dev` starts.
2. Set server environment variables. Do not put the key in frontend code.

```
AI_API_KEY=
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

`AI_BASE_URL` may point at any OpenAI-compatible chat completions endpoint. Leave `AI_API_KEY` empty to keep the action unavailable. The studio then reports that catalogue copy is not configured, and no product text changes.

3. Sign in to Merchant Studio as an owner or manager, open **Catalogue copy**, choose a skill, a jewellery product, and a tone, then create a draft.
4. Compare the draft with the live name and description. Approve the name, the description, or both. If the draft introduces a hallmark, certificate, carat, clarity, cut grade, or lab-grown claim that is not already in the product text, confirmation is required before publish. Reject leaves the product unchanged.

A viewer can open the tab and read history. A viewer cannot create, approve, or reject a draft.

Cursor can also read the same files from `.cursor/skills/` during an assisted editing session. That session still must not publish catalogue text on its own. Publishing belongs to the studio approval action.

## Architecture

The skills stay as markdown instructions. The server loads the selected `SKILL.md`, prepends the Veyora guardrail, and sends the stored product fields to the configured model. The response is stored in `ai_drafts` with status `pending`. A failed or rate-limited model call is stored as `failed` and does not update `products`. A second pending draft for the same SKU and skill is refused until the existing draft is approved or rejected.

Staff actions are written to the existing `audit` table as `ai_draft_created`, `ai_draft_approved`, `ai_draft_rejected`, and `ai_draft_failed`. The server log records the skill, SKU, staff id, and duration. It does not record the API key or the full prompt.

The studio calls are limited to 8 create requests a minute. Only `owner` and `manager` roles can create or decide a draft, and those routes use the existing admin session and CSRF check.

## API

All routes are under the existing admin session.

| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/admin/ai/skills` | Any staff role |
| GET | `/api/admin/ai/drafts` | Any staff role |
| POST | `/api/admin/ai/drafts` | Owner or manager. Body: `sku`, `skill`, `tone` |
| POST | `/api/admin/ai/drafts/:id/approve` | Owner or manager. Body: `apply_name`, `apply_description`, `acknowledge_warnings` |
| POST | `/api/admin/ai/drafts/:id/reject` | Owner or manager |

There is no public copy endpoint.

## Project modules the audit found

Veyora is a React 19 and Vite storefront with an Express server. Knex talks to SQLite in preview and MySQL in deployment. There was no existing LLM, OpenAI, or Nexscope client.

Jewellery products live in `products`: SKU, product code, slug, name, category, description, metal, purity, net weight, size, finish, images, fixed or gold-linked pricing, making and stone charges, stock, status, and a supplier name. `supplier_skus` maps a supplier code to a SKU. There is no vendor master and no structured diamond shape, carat, colour, clarity, cut, polish, symmetry, certificate, or natural-versus-lab-grown columns. Certification and hallmark claims are intentionally omitted unless a merchant has already written them.

Coins live in `coins` with metal, purity, weight, minting charge, and description. This slice does not draft coin copy.

Prices are calculated in `server/pricing.js` from an approved purity rate, making charges, margin rules, tax, rounding, and offers. Offers can discount making, a percent of the total, or a flat amount. Gold rates come from a supplier CSV or a configured feed and are purity-specific. Stale rates pause gold-linked checkout. Orders store a price snapshot and decrement stock. Customers, saved bags, reviews, password reset email, and a disabled payment gateway are separate from this slice.

The product CSV import previews a batch and publishes only after confirmation. Catalogue copy follows that same idea: generate, review, then publish.

## Skills selected and excluded

Selected for this slice: the three copy skills above. They match the stored name and description fields and can be reviewed before publish.

Relevant later, and not installed:

| Module | Skill | Why it waits |
| --- | --- | --- |
| Pricing rules and offers | `competitive-pricing-strategy`, `price-optimization-tool`, `dynamic-pricing-ecommerce` | Advisory only. Live prices must keep using the gold-rate, margin, tax, and offer calculation. |
| Margin display | `profit-margin-calculator-shopify` | Its calculator assumes Shopify payments, ad spend, and 3PL costs, and it ships a Python script. |
| Stock | `warehouse-optimization`, `restock-alert`, `inventory-tracking-software` | The store already keeps an absolute stock snapshot. These skills design a monitoring framework and need sales velocity that this schema does not store. |
| Supplier feeds | `ecommerce-feed-management` | Useful as a checklist for the existing CSV feeds. It does not call this app's importer. |
| Reviews | `product-review-analysis` | Can read approved reviews later. It must not publish review text. |
| Checkout and marketing | `ecommerce-checkout-optimization`, `ecommerce-marketing-strategy-builder`, `ecommerce-growth-strategy` | Strategy instructions for a person. They do not map to a current studio action. |
| Search snippet quality | `ecommerce-keyword-research` | Beta, and it expects marketplace keyword tools this project does not have. |

Excluded because they target a platform or job this store does not run: Amazon, eBay, Etsy, Walmart, TikTok Shop, Shopify apps and themes, WooCommerce, dropshipping, subscriptions, affiliate programs, PPC and Google Shopping campaign setup, brand-protection scrapers, and the monitoring scripts for other websites. Several of those include Python scrapers or calculators. They were not added as dependencies. Nexscope MCP and the Nexscope data API are separate products and were not connected.

The repository's own README says the skills use public frameworks and do not include live marketplace data. `product-page-seo` and `product-title-optimization` are short beta instruction files. `product-description-generator` is the detailed workflow and is marked available. None of the three vendored skills declare an API key. Competitor URL research described inside the description skill is not performed by the studio. The studio sends only the stored product fields.

## Example requests

Description, from the studio or from Cursor with the vendored skill:

```text
Use product-description-generator for SKU AI-RING.
Platform: Veyora Jewels storefront. Tone: Luxury.
Use only the stored metal, purity, weight, size, finish, category, and current description.
Do not add a price, a supplier, or a certificate.
```

Title:

```text
Use product-title-optimization for the same SKU.
Keep the name under 200 characters and do not change the description unless I approve it separately.
```

Product page SEO:

```text
Use product-page-seo for the same SKU.
Write the description so its first 160 characters can stand as the search snippet.
Leave the existing Product schema in server/seo.js unchanged.
```

## Available skills

The `main` tree has one `SKILL.md` for each of these names. README status is not repeated on every beta file. Skills with Python under `scripts/` are calculators, review checkers, or page scrapers, and they were not installed.

`affiliate-marketing-strategy`, `api-monitoring`, `brand-monitoring`, `brand-protection-amazon`, `brand-protection-ebay`, `brand-protection-shopify`, `brand-protection-tiktok`, `brand-protection-walmart`, `competitive-pricing-strategy`, `competitor-price-analysis`, `competitor-price-tracker`, `conversion-rate-optimization`, `cross-border-ecommerce`, `customer-feedback-analysis`, `domain-monitoring`, `dropshipping-product-research`, `dynamic-pricing-ecommerce`, `ebay-advertising`, `ebay-product-research`, `ebay-seller-guide`, `ebay-seller-tools`, `ebay-seo`, `ecommerce-ab-testing`, `ecommerce-branding`, `ecommerce-business-plan`, `ecommerce-checkout-optimization`, `ecommerce-competitor-analysis`, `ecommerce-content-marketing`, `ecommerce-customer-retention`, `ecommerce-email-marketing-builder`, `ecommerce-feed-management`, `ecommerce-growth-strategy`, `ecommerce-keyword-research`, `ecommerce-landing-page`, `ecommerce-marketing-strategy-builder`, `ecommerce-personalization`, `ecommerce-ppc-strategy-planner`, `ecommerce-returns-management`, `ecommerce-shipping-rates`, `ecommerce-social-media-marketing`, `ecommerce-subscription-model`, `ecommerce-video-marketing`, `etsy-advertising`, `etsy-competitor-analysis`, `etsy-custom-orders`, `etsy-digital-products`, `etsy-keyword-research`, `etsy-listing-photography`, `etsy-multi-shop`, `etsy-offsite-ads`, `etsy-pricing-strategy`, `etsy-print-on-demand`, `etsy-product-description`, `etsy-review-strategy`, `etsy-seasonal-strategy`, `etsy-seller-guide`, `etsy-seo`, `etsy-seo-tags`, `etsy-shipping-strategy`, `etsy-shop-analytics`, `etsy-shop-branding`, `etsy-shop-setup`, `etsy-social-media-marketing`, `etsy-star-seller`, `file-integrity-monitoring`, `google-shopping-optimization`, `influencer-outreach`, `inventory-tracking-software`, `localization-testing`, `market-gap-analysis`, `minimum-advertised-price`, `multichannel-ecommerce`, `omnichannel-ecommerce`, `online-reputation-management`, `price-optimization-tool`, `product-description-generator`, `product-differentiation-amazon`, `product-differentiation-ebay`, `product-differentiation-shopify`, `product-differentiation-tiktok`, `product-launch-strategy`, `product-page-seo`, `product-review-analysis`, `product-title-optimization`, `profit-margin-calculator-amazon`, `profit-margin-calculator-shopify`, `profit-margin-calculator-tiktok`, `profit-margin-calculator-walmart`, `public-status-page`, `restock-alert`, `review-checker-amazon`, `review-checker-ebay`, `review-checker-walmart`, `review-monitoring`, `sales-tracking-tool`, `share-of-shelf`, `shopify-ab-testing`, `shopify-analytics-guide`, `shopify-app-recommendations`, `shopify-blog-strategy`, `shopify-cart-abandonment`, `shopify-checkout-customization`, `shopify-conversion-optimization`, `shopify-dropshipping`, `shopify-email-flows`, `shopify-facebook-instagram-shop`, `shopify-google-channel`, `shopify-international`, `shopify-inventory-management`, `shopify-landing-page-builder`, `shopify-loyalty-program`, `shopify-marketing`, `shopify-migration`, `shopify-page-speed`, `shopify-product-photography-guide`, `shopify-seo`, `shopify-speed-optimization`, `shopify-store-setup`, `shopify-subscription-setup`, `shopify-tax-compliance`, `shopify-theme-optimization`, `shopify-upsell-cross-sell`, `shopify-wholesale-channel`, `shoppable-video`, `social-media-monitor`, `supply-chain-optimization-amazon`, `supply-chain-optimization-shopify`, `supply-chain-optimization-tiktok`, `supply-chain-optimization-walmart`, `synthetic-monitoring`, `tiktok-creator-marketplace`, `tiktok-influencer-marketing`, `tiktok-live-selling`, `tiktok-shop-ads`, `tiktok-shop-affiliate-program`, `tiktok-shop-analytics`, `tiktok-shop-branding`, `tiktok-shop-compliance`, `tiktok-shop-content-strategy`, `tiktok-shop-conversion`, `tiktok-shop-creator-management`, `tiktok-shop-cross-border`, `tiktok-shop-customer-service`, `tiktok-shop-fulfillment`, `tiktok-shop-inventory`, `tiktok-shop-listing-optimization`, `tiktok-shop-pricing`, `tiktok-shop-product-research`, `tiktok-shop-promotions`, `tiktok-shop-returns`, `tiktok-shop-reviews`, `tiktok-shop-seller-guide`, `tiktok-shop-shipping`, `tiktok-shop-trending-products`, `visual-regression-testing`, `walmart-advertising-strategy`, `walmart-listing-optimization`, `walmart-price-tracker`, `walmart-seller-guide`, `walmart-seller-tools`, `warehouse-optimization`, `woocommerce-seo`.

## Tests

`node --test tests/ai-copy.test.js` covers skill loading through the prompt files, missing `AI_API_KEY` before any network call, an unreadable model response, HTTP 429, a duplicate pending draft, approval of a description, refusal to publish a new certification claim until it is confirmed, and rejection without a name change. The suite uses an in-memory stand-in for the database calls because this machine's Node 24 has no `better-sqlite3` binary and Visual Studio has no C++ toolset to build one. The Knex migration itself was not executed against the preview or production database.

The studio screen was not clicked in a browser. Starting the app here would also fail on the missing SQLite binding, and preview startup would apply the new migration automatically.

`server/db.js` now resolves its working directory and migrations folder with `fileURLToPath`. The previous URL pathname, `/C:/Ecom/jewelry/`, cannot be used as a Windows directory.
