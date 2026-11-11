# Product Reviews & Ratings System

Veyora Jewels features a complete, production-ready Product Reviews & Ratings System supporting public ratings, verified purchaser validation, multi-tier moderation, customer photo uploads, cross-catalogue rating badges, and staff review moderation in the admin dashboard.

---

## 1. Architecture & Overview

The reviews system is architected around honest, verified customer feedback, secure input handling, and non-destructive data modeling:

- **Canonical Product Grouping**: Product variants sharing the same `product_code` (e.g., ring sizes 12 and 14 of `eclipse-ring`) share reviews and rating aggregates. Foreign keys reference the primary canonical product variant ID (`products.id`) with `ON DELETE CASCADE`.
- **Honest Ratings Policy**: Products without reviews display a clean empty-rating state (`No reviews yet`) instead of defaulted 5-star or fake ratings.
- **Customer Privacy**: Customer names are formatted for privacy in public displays (e.g., `Aarav Mehta` is displayed as `Aarav M.`).
- **Verified Purchase Detection**: Automatically cross-references customer order histories. When a customer completed an order containing any SKU of that product, the review is permanently badged as a `Verified Purchase`.
- **Moderation Workflow**: Newly submitted reviews are placed in `pending` status. Only `approved` reviews are visible to the public or contribute to rating statistics. If an approved review is edited by a customer, its status is automatically reset to `pending` for re-moderation.
- **Role-Based Access Control**: Staff members with `viewer` role can inspect reviews and dashboard stats in read-only mode; status changes, edits, bulk moderation, and deletions require `manager` or `owner` roles.

---

## 2. Database Schema & Migrations

Database migration `migrations/012_reviews.js` defines two tables with foreign keys and composite indexes:

### `reviews` Table

| Column | Type | Constraints / Details |
|---|---|---|
| `id` | unsigned integer | Primary Key (auto-increment) |
| `product_id` | unsigned integer | Foreign Key references `products.id` ON DELETE CASCADE (indexed) |
| `user_id` | unsigned integer | Foreign Key references `customers.id` ON DELETE CASCADE (indexed) |
| `rating` | integer | 1 to 5 stars (indexed) |
| `title` | varchar(255) | Clean review headline (3–150 chars) |
| `comment` | text | Detailed customer narrative (10–3000 chars) |
| `status` | varchar(20) | `'pending'`, `'approved'`, `'rejected'` (default: `'pending'`, indexed) |
| `is_verified_purchase` | boolean | Verified purchaser indicator (default: `false`) |
| `created_at` | varchar | ISO-8601 creation timestamp |
| `updated_at` | varchar | ISO-8601 update timestamp |
| `deleted_at` | varchar | Soft-delete timestamp (nullable, indexed) |

**Constraints & Indexes:**
- Unique constraint: `['product_id', 'user_id']` prevents duplicate customer reviews per piece.
- Composite index: `['product_id', 'status']` optimizes public review retrieval.
- Composite index: `['status', 'rating']` optimizes admin filtered queries and aggregate calculations.

### `review_images` Table

| Column | Type | Constraints / Details |
|---|---|---|
| `id` | unsigned integer | Primary Key (auto-increment) |
| `review_id` | unsigned integer | Foreign Key references `reviews.id` ON DELETE CASCADE (indexed) |
| `image_url` | text | Relative path to validated raster image in `/uploads/reviews/` |
| `created_at` | varchar | ISO-8601 timestamp |

---

## 3. Review Submission & Moderation Workflow

```
Customer signs in
       │
       ▼
Opens Review Form on PDP
(Interactive 1–5 stars, headline, comment, up to 5 photos)
       │
       ▼
POST /api/products/:productId/reviews
       │
       ├─► Input Validation (1–5 integer, 3–150 char title, 10–3000 char comment)
       ├─► XSS Sanitization (HTML tags & control characters stripped)
       ├─► Spam Detection (Repetitive patterns, prohibited URLs/crypto/casino terms)
       ├─► Duplicate Check (409 Conflict if already reviewed; offers edit instead)
       ├─► Verified Purchase Check (Cross-references customer's delivered/paid orders)
       │
       ▼
Saved with status: 'pending'
       │
       ├─► Customer can view own pending review with status pill on PDP
       ├─► Public review list & catalogue ratings ignore pending reviews
       │
       ▼
Admin Moderation (Admin Panel -> Reviews Tab)
       │
       ├─► Single / Bulk Approve  ──► status: 'approved' (Visible publicly, rating aggregates update)
       ├─► Single / Bulk Reject   ──► status: 'rejected' (Hidden publicly, excluded from rating stats)
       ├─► Edit Review            ──► Administrator modifies rating, headline, or body
       └─► Delete Review          ──► Soft-deletes or purges review & cascades image cleanup
```

---

## 4. Public Product Detail Page (PDP) Experience

Located on every product detail page under `#reviews`:

1. **Ratings Summary Card**:
   - Prominent average star rating (e.g., `4.8`) and total verified reviews count.
   - Interactive 5-star to 1-star distribution bars with percentage fills. Clicking any star bar filters the review list to that rating.
   - Verified buyer badge indicating count of reviews from verified purchasers.
2. **Review Sorting & Filters**:
   - Active filter pills with clear button.
   - Sort dropdown: *Most recent*, *Highest rated*, *Lowest rated*.
3. **Customer Review Cards**:
   - Customer avatar and privacy-masked name (`Firstname L.`).
   - Verified Purchase badge.
   - Star rating and formatted review date.
   - Review title and body text.
   - Attached customer photograph thumbnails with click-to-zoom Lightbox modal.
4. **Customer Review Action & Status**:
   - Authenticated customers who have not reviewed the piece see a *Write a Review* button.
   - Customers with an existing review see their status pill (`Pending moderation`, `Approved`, or `Needs revision`) with an *Edit review* button.
   - Unauthenticated visitors see a *Sign in to write a review* link redirecting to `/account`.
5. **Pagination**:
   - Bounded previous/next controls with current page indicator.

---

## 5. Storefront & Cross-Component Rating Badges

The `<RatingBadge>` component is integrated across the entire storefront:
- **Product Detail Pages (PDP)**: Prominently displayed near the product title with anchor link smooth-scrolling directly to the reviews section.
- **Product Cards (`CardInfo`)**: Shows star rating and review count on Home page showcases, Collection grids, Category pages, and Account saved pieces.
- **Search Autocomplete (`SearchAutocomplete.jsx`)**: Displays star ratings alongside product prices and thumbnails in real-time search suggestions.
- **Curated Complements**: Displayed under related product recommendations on PDP.

---

## 6. Admin Panel Review Management

The Admin dashboard includes a dedicated **Reviews** navigation tab (`<ReviewsAdmin>`):

### Dashboard Statistics
Five real-time metric cards:
1. **Total Reviews**: All reviews submitted across the catalogue.
2. **Pending Reviews**: Moderation queue needing attention (highlighted in orange).
3. **Approved Reviews**: Live public reviews (highlighted in green).
4. **Rejected Reviews**: Declined submissions (highlighted in red).
5. **Catalogue Average**: Aggregate rating score across all approved customer reviews.

### Filters & Search
- **Status Filter**: `All Statuses`, `Pending Moderation`, `Approved`, `Rejected`.
- **Rating Filter**: `All Ratings`, `5 Stars`, `4 Stars`, `3 Stars`, `2 Stars`, `1 Star`.
- **Date Range**: Filter by start date (`From`) and end date (`To`).
- **Live Search**: Debounced full-text search matching customer name, customer email, product name, or review body text.

### Actions & Moderation
- **Multi-select & Bulk Bar**: Select individual or all reviews on the page, with one-click **Bulk Approve** and **Bulk Reject**.
- **Inspect Detail Modal**: View full review content, customer contact info, purchase verification status, and enlarged photo attachments.
- **Direct Approval / Rejection**: Quick approve and reject icon buttons per row.
- **Edit Modal**: Staff can edit review headlines, descriptions, ratings, or moderation status.
- **Delete Modal**: Safe deletion with confirmation modal.
- **Role Boundary**: `viewer` role is restricted to read-only mode; mutation buttons are disabled or hidden with explanatory tooltips.

---

## 7. REST API Endpoints

### Public Endpoints

#### `GET /api/products/:productId/reviews`
Fetch approved reviews and rating breakdown for a product.
- **Query Params**: `page` (default 1), `limit` (default 10), `sort` (`recent`, `highest`, `lowest`), `rating` (1–5).
- **Customer Context**: If customer session cookie is present, attaches `myReview` object containing the authenticated customer's own review regardless of status.
- **Response**:
```json
{
  "summary": {
    "averageRating": 4.8,
    "totalReviews": 14,
    "distribution": { "1": 0, "2": 0, "3": 1, "4": 2, "5": 11 },
    "percentages": { "1": 0, "2": 0, "3": 7, "4": 14, "5": 79 },
    "verifiedPurchasesCount": 11
  },
  "reviews": [
    {
      "id": 1,
      "productId": 1,
      "rating": 5,
      "title": "Magnificent craftsmanship",
      "comment": "Substantial weight and mirror finish.",
      "isVerifiedPurchase": true,
      "createdAt": "2026-11-10T12:00:00.000Z",
      "customerName": "Aarav M.",
      "images": ["/uploads/reviews/rev-001.webp"]
    }
  ],
  "myReview": null,
  "pagination": { "page": 1, "limit": 10, "total": 14, "totalPages": 2 }
}
```

#### `GET /api/products/:productId/ratings`
Lightweight rating summary for badges and cards.
- **Response**:
```json
{
  "averageRating": 4.8,
  "totalReviews": 14,
  "distribution": { "1": 0, "2": 0, "3": 1, "4": 2, "5": 11 },
  "percentages": { "1": 0, "2": 0, "3": 7, "4": 14, "5": 79 },
  "verifiedPurchasesCount": 11
}
```

### Customer Endpoints (Require Customer Auth & CSRF)

#### `POST /api/products/:productId/reviews`
Submit a new review.
- **Headers**: `X-CSRF-Token: <customer-csrf>`, `Content-Type: application/json`
- **Body**:
```json
{
  "rating": 5,
  "title": "Sublime South Sea Pearls",
  "comment": "The luster on these earrings is absolutely radiant in natural light.",
  "images": ["/uploads/reviews/customer-photo.webp"]
}
```
- **Response** (201 Created): Review object with `status: "pending"`.
- **Errors**: `401 Unauthorized` if not signed in, `409 Conflict` if product already reviewed by this customer.

#### `PUT /api/reviews/:id`
Update customer's existing review. Automatically resets `status` to `'pending'`.
- **Headers**: `X-CSRF-Token: <customer-csrf>`, `Content-Type: application/json`
- **Body**: Same as submit review.
- **Errors**: `403 Forbidden` if review belongs to another customer.

#### `POST /api/reviews/upload-image`
Upload customer review photograph.
- **Headers**: `X-CSRF-Token: <customer-csrf>`, `Content-Type: application/json`
- **Body**: `{ "dataUrl": "data:image/jpeg;base64,...", "filename": "photo.jpg" }`
- **Validation**: Enforces raster verification via `sharp` (JPEG, PNG, WebP only; rejects SVGs, scripts, and corrupted payloads; max 5MB).
- **Response**: `{ "url": "/uploads/reviews/rev-1731300000000-abc12345.webp" }`

### Admin Endpoints (Require Staff Auth `auth()`)

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| `GET` | `/api/admin/reviews` | `viewer`, `manager`, `owner` | List reviews with stats, filters, search, and pagination |
| `GET` | `/api/admin/reviews/:id` | `viewer`, `manager`, `owner` | Get single review with full customer & product metadata |
| `PATCH` | `/api/admin/reviews/:id/status` | `manager`, `owner` | Approve, reject, or reset review status (`{ "status": "approved" }`) |
| `POST` | `/api/admin/reviews/bulk-status` | `manager`, `owner` | Bulk update status (`{ "ids": [1, 2], "status": "approved" }`) |
| `PUT` | `/api/admin/reviews/:id` | `manager`, `owner` | Edit review headline, comment, rating, or status |
| `DELETE` | `/api/admin/reviews/:id` | `manager`, `owner` | Delete review and cascade delete attached images |

---

## 8. Database Seeders

Realistic test data is available for development and staging environments.

### Seeder Details
- **Seeder File**: `seeders/ReviewSeeder.js`
- **Customers**: 10 realistic customer accounts with Indian names (e.g. *Ananya Iyer*, *Devendra Rathore*, *Kavita Nambiar*, *Siddharth Verma*).
- **Delivered Orders**: Creates realistic delivered orders to satisfy `is_verified_purchase` verification.
- **Reviews**: Seeds 21 natural, piece-specific reviews across 6 products (*Eclipse Diamond Ring*, *Lune Pearl Drops*, *Atelier Pearl Collar*, *Nocturne Cuff*, *Noir Halo Studs*, *Velours Earrings*).
  - 14 Approved reviews (ratings 4–5).
  - 4 Pending reviews for moderation testing.
  - 2 Rejected reviews with realistic rejection reasons.
  - Customer review photos for visual testing.
- **Test Identification**: All seeded titles are explicitly tagged with `[Preview Test]` to clearly identify synthetic data.
- **Idempotency**: Safely checks existing review counts and aborts without duplicating records (`skipped: true`).

### Execution Commands
```bash
# Run review seeder directly
npm run seed:reviews

# Or run the complete database seeder
node seeders/DatabaseSeeder.js
```

---

## 9. Automated Testing & Verification

Comprehensive test suites cover business logic, API validation, access controls, and regression safety:

```bash
# Run review test suite
node --test tests/reviews.test.js

# Run complete application test suite
npm test

# Build production bundle
npm run build
```

**Test Coverage Highlights**:
- Input boundary testing (invalid ratings 0, 6, -1, 3.5, string; empty titles; comments < 10 or > 3000 chars; image counts > 5).
- XSS prevention (stripping `<script>`, `onerror`, `<b>` tags and control characters).
- Spam pattern detection (repetitive character bursts, telegram/crypto links).
- Duplicate prevention (409 Conflict) and re-moderation on edit.
- Purchase verification logic matching customer completed orders.
- Public visibility rules (pending/rejected hidden from public; author sees `myReview`).
- Accurate mathematical aggregation of rating averages and 5-to-1 distribution percentages.
- Admin filtering, searching, bulk status updates, edits, and cascading deletions.
- Role boundary verification (`viewer` read-only enforcement).
