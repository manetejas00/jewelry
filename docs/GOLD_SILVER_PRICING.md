# Veyora Jewels – Gold & Silver Metal Pricing Architecture

## 1. Overview & Elimination of Live Pricing APIs

In compliance with the project update requirements, **all external live pricing APIs, third-party spot rate feeds (e.g., `api.gold-api.com`), background sync cron jobs, automated price conversion scrapers, and external rate network requests have been permanently removed** from Veyora Jewels.

Metal prices across the entire application are managed **exclusively through internal admin controls** via the dedicated **Gold & Silver Rates** section in the Merchant Studio (`/admin/gold-rates`).

### Key Principles:
1. **Zero External Dependencies:** No external network requests are ever triggered to fetch gold or silver prices. All calculations derive from approved internal records stored in the database.
2. **Deterministic & Auditable:** Every price revision records the metal, purity, entered unit, rate, effective date, ISO UTC timestamp, staff ID, staff email/name, source type, and optional business notes.
3. **Dual Update Channels:**
   - **Method A:** Manual entry via the admin UI with live rate-per-gram calculation and confirmation modal.
   - **Method B:** Bulk import supporting both standard CSV (`.csv`) and native Microsoft Excel (`.xlsx` / `.xls`) files with full pre-publish validation and change diff previews.
4. **Immediate Catalog Synchronization:** Product listings (PLP), detail pages (PDP), cart subtotals, quotes, and checkout calculations instantly recompute prices using the latest active approved rates.
5. **Historical Order Immutability:** Placed orders retain their snapshot breakdown and unit prices, guaranteeing that past sales records never change when rates are revised.

---

## 2. Supported Metals & Purity Tiers

| Metal | Purity | Common Industry Description | Supported Input Units | Normalization to `inr_per_gram` |
|---|---|---|---|---|
| **Gold** | **24K** | 99.9% Pure Investment Bullion | `10g` (Standard), `g` | `rate / 10` (if 10g) or `rate` (if g) |
| **Gold** | **22K** | 91.6% Hallmark Jewellery Gold | `g` (Standard), `10g` | `rate` (if g) or `rate / 10` (if 10g) |
| **Gold** | **20K** | 83.3% Heritage Craft Gold | `g` (Standard), `10g` | `rate` (if g) or `rate / 10` (if 10g) |
| **Gold** | **18K** | 75.0% Fine Diamond & Pearl Gold | `g` (Standard), `10g` | `rate` (if g) or `rate / 10` (if 10g) |
| **Gold** | **14K** | 58.5% Contemporary Everyday Gold | `g` (Standard), `10g` | `rate` (if g) or `rate / 10` (if 10g) |
| **Silver** | **999** | 99.9% Fine Bullion Silver | `kg` (Standard), `g` | `rate / 1000` (if kg) or `rate` (if g) |
| **Silver** | **925** | 92.5% Sterling Jewellery Silver | `g` (Standard), `kg` | `rate` (if g) or `rate / 1000` (if kg) |

---

## 3. Database Schema & Migration

### Migration `023_manual_metal_pricing.js`
The `rates` table in SQLite / MySQL stores all benchmark rates and price histories:

```sql
CREATE TABLE rates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  metal VARCHAR(50) DEFAULT 'Gold',
  supplier VARCHAR(255) NOT NULL,
  purity VARCHAR(50) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  original_unit VARCHAR(20) NOT NULL,
  original_rate DECIMAL(14, 4) NOT NULL,
  inr_per_gram DECIMAL(14, 4) NOT NULL,
  effective_date VARCHAR(20) NOT NULL,
  source_timestamp VARCHAR(50) NOT NULL,
  published_at VARCHAR(50) NOT NULL,
  batch_id INTEGER NULL,
  staff_id INTEGER NULL,
  staff_name VARCHAR(100) NULL,
  source_type VARCHAR(50) DEFAULT 'manual',
  notes TEXT NULL
);

CREATE INDEX idx_rates_metal ON rates(metal);
CREATE INDEX idx_rates_purity ON rates(purity);
CREATE INDEX idx_rates_effective_date ON rates(effective_date);
CREATE INDEX idx_rates_source_timestamp ON rates(source_timestamp);
```

### Active Rates Resolution Logic
Rates are queried using `activeRates(db)`:
- Only rows where `effective_date <= todayIndia()` (using Asia/Kolkata timezone) are eligible.
- Rows are ordered by `source_timestamp DESC, id DESC`.
- The first eligible rate for each purity becomes the active benchmark.
- Freshness is verified via `isFresh(rate)` against `GOLD_MAX_AGE_HOURS` (default 48 hours).

---

## 4. Manual Pricing Workflow (`/admin/gold-rates`)

### Step-by-Step Manual Update:
1. Navigate to **Merchant Studio > Gold Rates** (`/admin/gold-rates`).
2. In the **Manual Rate Entry** card:
   - Select **Metal** (`Gold` or `Silver`).
   - Select **Purity** (e.g. `24K`, `22K`, `18K`, `999`, `925`).
   - Select **Rate Unit** (`10g` or `g` for Gold; `kg` or `g` for Silver).
   - Enter the **Numeric Price** in INR (e.g., `100000` for 10g of 24K).
   - Verify the **Effective Date** (defaults to today's date in India).
   - Optional: Add an **Admin Note** (e.g., *"Morning Mumbai bullion desk rate revision"*).
3. The interface displays a live calculated rate in **₹ / gram** and comparison with previous active rates.
4. Click **Preview & Save Rate**.
5. A confirmation dialog appears summarizing the metal, purity, entered price, normalized per-gram figure, and catalog impact.
6. Click **Confirm & Save Rate**. The price change is saved within a database transaction, logged to the audit table, and immediately reflected across the storefront.

---

## 5. Bulk Import Workflow (CSV & Excel)

Admins can upload rate revisions in bulk using standard CSV or native Excel files.

### Column Specification

| Column Header | Required | Data Type | Validation Rules | Description |
|---|---|---|---|---|
| `supplier` | Yes | String | Non-empty | Supplier or Maison entity (e.g. `Veyora Internal`) |
| `metal` | Yes | String | `Gold` or `Silver` | Metal category |
| `purity` | Yes | String | Gold: `24K`,`22K`,`20K`,`18K`,`14K`<br>Silver: `999`,`925` | Hallmarked metal purity |
| `currency` | Yes | String | `INR` | Currency identifier |
| `unit` | Yes | String | Gold: `10g`,`g`<br>Silver: `kg`,`g` | Rate measurement unit |
| `rate` | Yes | Decimal | Positive number, up to 2 decimal places | Price in INR for the specified unit |
| `effective_date` | Yes | Date | `YYYY-MM-DD`, `<= today (Asia/Kolkata)` | Effective calendar date |
| `source_timestamp` | Yes | ISO UTC | ISO 8601 string, `<= now() + 5 min` | Audit timestamp |

### Supported Downloadable Templates:
- `/api/admin/samples/metal-rates-template.csv`
- `/api/admin/samples/metal-rates-example.csv`
- `/api/admin/samples/metal-rates-template.xlsx`
- `/api/admin/samples/metal-rates-example.xlsx`
- `/api/admin/samples/gold-rates-template.xlsx`
- `/api/admin/samples/gold-rates-example.xlsx`

### Pre-Publish Validation & Preview:
1. When a file is uploaded, the backend performs comprehensive row-level validation.
2. If any validation errors exist:
   - The batch is marked as `failed`.
   - The admin is shown row-level error messages (Row number, Field name, Rejected value, Correction instructions).
   - No data is published to the catalog until the file is fixed.
3. If validation succeeds:
   - The batch is marked as `staged`.
   - An interactive diff preview table displays: Metal, Purity, Entered Rate, Calculated Rate / Gram, Previous Rate, and Price Difference (+/- ₹).
   - The admin clicks **Confirm & Publish Batch #ID** to apply the rates atomically.

---

## 6. Product & Coin Pricing Calculation Engine

All prices in Veyora Jewels are calculated using server-side business rules in `server/pricing.js`.

### Gold-Linked Jewellery Pricing Formula:
$$\text{Metal Cost} = \text{net\_weight\_g} \times \text{active\_rate(purity).inr\_per\_gram}$$
$$\text{Full Making Charge} = \text{making\_flat} + \left(\text{Metal Cost} \times \frac{\text{making\_percent}}{100}\right)$$
$$\text{Base Subtotal} = \text{Metal Cost} + \text{Effective Making Charge} + \text{stone\_charge} + \text{other\_charge}$$
$$\text{Subtotal with Margin} = \text{Base Subtotal} + \text{calculateMargin}(\text{Base Subtotal}, \text{rule})$$
$$\text{Tax (GST 3\%)} = \text{Subtotal} \times \frac{\text{tax\_percent}}{100}$$
$$\text{Total Price} = \text{round}(\text{Subtotal} + \text{Tax}, \text{rounding})$$

### Metal-Linked Coin Pricing Formula:
$$\text{Metal Cost} = \text{weight\_g} \times \text{active\_rate(metal, purity).inr\_per\_gram}$$
$$\text{Full Making Charge} = \text{making\_charge}$$
$$\text{Base Subtotal} = \text{Metal Cost} + \text{Effective Making Charge}$$
$$\text{Subtotal with Margin} = \text{Base Subtotal} + \text{calculateMargin}(\text{Base Subtotal}, \text{rule})$$
$$\text{Total Price} = \text{round}(\text{Subtotal with Margin} + \text{Tax}, \text{rounding})$$

---

## 7. History & Export Capabilities

The History panel in `/admin/gold-rates` maintains a permanent log of all rate revisions:
- **Search:** Search across staff name, supplier, purity, and notes.
- **Filters:** Filter by Metal (`Gold`, `Silver`, `All`), Purity (`24K`, `22K`, `18K`, `999`, etc.), and Effective Date Range (`From` / `To`).
- **Export CSV:** `/api/admin/rates/export?format=csv` downloads a timestamped CSV of the entire rate audit trail.
- **Export Excel:** `/api/admin/rates/export?format=xlsx` downloads a formatted `.xlsx` workbook of the entire rate audit trail.
