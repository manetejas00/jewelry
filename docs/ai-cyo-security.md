# VEYORA JEWELS — AI Create Your Own (CYO) Security & Privacy Architecture

## 1. Threat Model & Safeguards

The bespoke AI design studio processes customer design inspirations, uploaded images, and sensitive pricing quotations. Robust defense-in-depth controls are enforced across the stack.

---

## 2. Authentication & Authorization Controls

### 2.1 Compulsory Customer Authentication
- Every CYO API endpoint (`/api/cyo/*`) is guarded by `customerAuth` middleware (`server/index.js` line 180):
  ```javascript
  const customerAuth = (req, res, next) =>
    req.session.customer ? next() : res.status(401).json({ error: 'Please sign in to your customer account.' });
  ```
- Anonymous / guest visitors are strictly rejected with HTTP 401. No guest can generate images, converse with the assistant, or upload sketches.
- Storefront UI redirects unauthenticated visitors to `/account?mode=login` and preserves the intended return destination in session storage.

### 2.2 IDOR (Insecure Direct Object Reference) Protection
- All design lookup, mutation, and deletion endpoints strictly enforce ownership against the authenticated customer's session ID:
  ```javascript
  const design = await k('cyo_designs')
    .where({ id: designId, customer_id: req.session.customer.id })
    .first();
  if (!design) throw validationError('Design not found or unauthorized.');
  ```
- Client A cannot access, view, revise, or delete Client B's designs, messages, or reference images under any circumstances.

### 2.3 Role-Based Access Control (RBAC) in Merchant Studio
- Read-only endpoints (`GET /api/admin/cyo/*`) require authenticated staff (`auth()`).
- State-mutating endpoints (status updates, quotation issuances, quota overrides) require elevated roles (`auth(['owner', 'manager'])`).
- Read-only viewer accounts cannot issue quotations or modify customer quotas.

---

## 3. Quota Enforcement & Anti-Abuse (Strict 3-Image Cap)

### 3.1 Atomic Database Counter
- To prevent race conditions from concurrent browser tabs or parallel API scripts, quota reservation is performed via a conditional atomic SQL statement:
  ```sql
  UPDATE customers
  SET cyo_image_generations_count = cyo_image_generations_count + 1
  WHERE id = ? AND cyo_image_generations_count < cyo_image_generations_limit;
  ```
- If 0 rows are affected, the operation immediately halts and throws HTTP 429 (`QUOTA_EXHAUSTED`).
- Client-side storage manipulation cannot bypass this limit because quota balances are resolved and decremented exclusively on the server.

### 3.2 Zero-Waste Rollback Guarantee
- If image synthesis fails due to internal errors or corrupt files, `refundImageQuota()` atomically decrements the counter, ensuring clients are never penalized for technical hiccups.

---

## 4. File Upload & Media Security

### 4.1 Strict File Type & Magic Number Validation
- Uploaded reference images must match standard MIME types: `image/png`, `image/jpeg`, `image/webp`.
- Non-image files, executable scripts, and active SVGs containing `<script>` or event handlers are rejected.

### 4.2 Payload Size Limits
- Reference uploads are capped at 8 MB.
- Buffer size validation rejects oversized uploads before image transcoding.

### 4.3 Image Sanitization & WebP Transcoding
- Uploaded images are transcoded and resized through Sharp (`max 1200x1200`), stripping dangerous EXIF metadata, GPS coordinates, and embedded payload scripts.
- Filenames are strictly sanitized:
  `cyo_ref_${customerId}_${Date.now()}_${cleanName}.webp`
- Saved into the public uploads directory with no directory traversal (`../`) possible.

---

## 5. Secret Protection & Prompt Injection Defense

- **Backend-Only Credentials:** `AI_API_KEY`, `IMAGE_GEN_API_KEY`, and internal database credentials exist solely in server environment variables.
- **Secret Redaction:** `redactSecrets()` intercepts all outgoing text responses and strips any token strings matching configured keys.
- **Prompt Injection Defense:** Customer prompt inputs and extracted reference image metadata are sanitized and strictly encapsulated within delimited user role parameters, preventing system prompt overrides.
