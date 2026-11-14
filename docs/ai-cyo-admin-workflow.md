# VEYORA JEWELS — AI Create Your Own (CYO) Admin Workflow

## 1. Back-Office Overview

The **AI Custom Designs** module is located in the Merchant Studio at:
`/admin/custom-designs` (Aliased to `/admin/cyo`).

It provides jewellery merchandisers, workshop heads, and pricing managers with complete administrative supervision over bespoke customer concepts.

---

## 2. Admin Workspace Capabilities

### 2.1 Multi-Criteria Search & Filtering
- **Status Filter:**
  - `Draft`: Customer has initialized concept but not requested review.
  - `AI Generated`: Customer has generated visual concept previews.
  - `Submitted for Review`: Customer has formally requested artisan quotation.
  - `Under Technical Review`: Workshop is assessing metal weight and stone settings.
  - `Quotation Sent`: Formal quotation has been issued to client.
  - `Quotation Accepted`: Client approved quotation and can proceed to checkout.
  - `In Production`: Master artisan is crafting piece in atelier.
  - `Completed`: Delivered to client.
  - `Rejected`: Feasibility denied or cancelled.
- **Category Filter:** Filter by Necklace, Earrings, Ring, Bracelet, Bangle, Mangalsutra, Pendant.
- **Client Search:** Instant search by client full name, email address, or design title.

---

## 3. The 4-Step Feasibility & Quotation Process

### Step 1: Design Inspection
Clicking **Inspect & Quote** opens the dedicated inspection drawer displaying:
1. Multi-angle concept gallery (`front`, `side`, `detail`, `showcase`).
2. Customer prompt and parsed structured specifications.
3. Client details and current AI generation quota usage.
4. Uploaded reference sketches or photographs.

### Step 2: Technical Feasibility Assessment
The artisan checks:
- Sizing and gauge feasibility (ensuring structural durability for everyday wear).
- Prong setting count for secure gemstone retention.
- Clasp and hinge mechanics.
- Update status to `Under Technical Review` or `Approved`.

### Step 3: Workshop Quotation Formulation
The built-in quotation calculator computes line items in real time:
- **Estimated Net Weight:** e.g., `24.50` grams.
- **Material / Bullion Cost:** Calculated against active gold/silver rates in the `rates` table (e.g. `₹98,000`).
- **Gemstone / Pearl Inlays:** e.g. `₹32,000`.
- **Artisanal Making Charges:** e.g. `₹18,500`.
- **GST Tax (3%):** Automatically computed (e.g. `₹4,455`).
- **Total Quoted Amount:** Summed automatically (e.g. `₹152,955`).
- **Validity Window:** Defaults to 7 days from today (due to precious metal market volatility).
- **Artisan Notes:** Transparent notes detailing hallmarked purity, stone origins, and estimated dispatch date.

Clicking **Issue Formal Quotation to Customer** atomically creates the quote and transitions the design status to `Quotation Sent`.

### Step 4: Quota Supervision & Manual Overrides
- Admins can inspect the customer's lifetime AI generation activity.
- Authorized staff (`owner`, `manager`) can reset the customer's generation counter to `0` or grant an elevated quota limit.
- **Mandatory Audit Logging:** Every quota adjustment requires a mandatory text reason, which is permanently logged in `cyo_audit_logs` alongside the staff member's ID and timestamp.
