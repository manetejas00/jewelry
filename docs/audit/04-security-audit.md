# 04 — Security audit

No secrets, session cookies, SMTP passwords, or live credentials are recorded here. Preview login details that already appear in `README.md` are not repeated.

## Controls that are in place

| Control | Evidence |
|---|---|
| Production boot checks | `server/runtime.js` requires `PREVIEW_MODE=false`, MySQL, HTTPS `APP_URL`, `SESSION_SECRET` of at least 32 characters, and rejects placeholder secrets and `COOKIE_SECURE=false` |
| Preview data cannot boot as production | `server/index.js` throws if fictional suppliers or the preview staff email exist when preview mode is off |
| Password hashing | bcrypt cost 12 for customers and staff (`server/customers.js`, `scripts/create-admin.js`) |
| Unknown-email login | Dummy bcrypt compare so missing accounts take similar time (`server/customers.js`) |
| Password policy | Customers: 12–72 UTF-8 bytes. Admin CLI: at least 16 characters |
| Session cookies | `httpOnly`, `sameSite: 'strict'`, `secure` when production HTTPS or `COOKIE_SECURE=true`, 8-hour max age (`server/index.js`) |
| Session fixation | `req.session.regenerate` on customer and staff login and logout |
| Session revocation | `customers.session_version` checked on each `/api` request; password reset increments it (`migrations/011_password_resets.js`) |
| Admin CSRF | Mutations under `/api/admin` except login require `x-csrf-token` |
| Customer CSRF | Account mutations require `x-customer-csrf` |
| Origin check | State-changing `/api` requests reject a foreign `Origin` and `sec-fetch-site: cross-site` |
| Rate limits | Global `/api` 300/minute; admin login 10/15 min; customer login 20/15 min; checkout 20/minute; OTP 10/10 min; reviews and AI copy have their own limits |
| Headers | `x-powered-by` disabled. Production Helmet CSP is self-hosted scripts, Google fonts, and images |
| Upload validation | `saveUploadedImage` rejects non-raster bytes via sharp metadata and rejects SVG filenames (`server/thumbnails.js`). Review uploads are capped at 5 MB; admin uploads at 8 MB |
| Upload serving | `/uploads` is sent with `Content-Security-Policy: default-src 'none'; sandbox` |
| Path traversal | Thumbnail names are allow-listed and realpath-checked |
| Checkout integrity | Idempotency key, retry fingerprint, row locks, stock decrement only when stock is sufficient (`server/orders.js`) |
| Order reads | `mayReadOrder` allows the owning customer, the guest session that created the order, or any staff session |
| Password reset enumeration | Missing emails return the same success path and send no mail (`server/password-reset.js`) |
| Reset tokens | 32 random bytes, only SHA-256 stored, 30-minute expiry, row lock on consume |
| Supplier URLs | Feed settings require HTTPS without embedded credentials (`server/index.js` feed-settings) |
| Error bodies | Unexposed errors become a generic 500 (`server/errors.js`). Server logs method and status, not the body |
| SQL | Queries use Knex bindings. The review verified-purchase fallback uses a bound `LIKE` parameter (`server/reviews.js`) |

Roles are `owner`, `manager`, and `viewer`. Viewers can read the studio. Mutations that change catalogue, offers, reviews, imports, and pricing require owner or manager. Pricing rules and feed URL settings require owner.

## Findings

### S1 — Critical: no online payment verification exists

`payment_events` is written only as `cod-${idempotencyKey}` inside checkout (`server/orders.js`). There is no webhook route, signature check, amount match, or refund path. `PAYMENT_SECRET` and `PAYMENT_WEBHOOK_SECRET` in `.env.example` are unused. Enabling a gateway later without those checks would let a client mark an order paid. Today production refuses any mode other than `disabled` or `cod`, which contains the risk until a gateway is added.

### S2 — High: coin reviews share jewellery product IDs

`reviews.product_id` references `products.id` (`migrations/012_reviews.js`). `resolveProduct` returns `coins.id` when the identifier is a coin (`server/reviews.js`). Those integer spaces overlap.

- On MySQL, the foreign key rejects the insert unless a jewellery row happens to have the same id, in which case the review is stored against the wrong product and is deleted if that jewellery row is deleted (`ON DELETE CASCADE`).
- On SQLite, Knex is created with `afterCreate: undefined` (`server/db.js`), so foreign keys are not enabled and the colliding id is stored.

`tests/reviews.test.js` has no coin case. This was not executed against a database in this audit because the SQLite binding would not load.

### S3 — High: viewer staff receive full order PII and can export it

`GET /api/admin/dashboard` returns the latest 100 orders with parsed customer name, email, phone, and address to every role, including `viewer` (`server/index.js`). `GET /api/admin/export/orders` is also `auth()` with no role filter. A read-only staff account is enough to download the customer file.

### S4 — High: password recovery and order mail depend on unset SMTP

`resetConfigured()` is false until `SMTP_HOST`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` are set. OTP password reset is separately gated by `OTP_PASSWORD_RESET` and a gateway. With both off, customers cannot recover an account. Checkout does not send a confirmation email at all. Nodemailer is not used for orders.

### S5 — Medium: checkout does not require the customer CSRF token

Account routes use `customerCsrf`. `POST /api/checkout` does not (`server/index.js`). `SameSite=strict` blocks a typical cross-site form post. A same-site script, or a future cookie policy change, could place an order using the victim’s session and bag. Guest checkout is unauthenticated by design, so the residual issue is mainly signed-in checkout.

### S6 — Medium: admin login has no CSRF token and no account lock

Login is excluded from the CSRF check, which is normal for the first request, and the cookie is `SameSite=strict`. There is no staff lockout table. The limiter is 10 attempts per 15 minutes per IP. A distributed attempt, or a shared NAT, is the remaining gap. Staff rows cannot be disabled; there is no `disabled_at` column.

### S7 — Medium: arbitrary image URLs can be stored by managers

`POST /api/admin/product-images` accepts any trimmed string as `url` (`server/index.js`). The storefront uses that string as an image source. A `javascript:` or unexpected scheme is a stored content issue for staff-trusted input. Uploaded files themselves are validated; pasted URLs are not.

### S8 — Medium: feed settings are copied into `process.env`

`loadFeedSettings` writes allow-listed keys into the process environment (`server/settings.js`). The allow-list does not include secrets, which is correct. The pattern is still process-global: one Node process, no isolation between requests, and unsafe if the app is ever run as multiple workers with different expectations. Owner-only writes limit who can change them.

### S9 — Medium: guest order capability is the session list

Guest order ids are `VEY-` plus 6 random bytes (about 48 bits) and are readable only when `session.orderIds` contains them, unless staff is signed in (`mayReadOrder`). That is reasonable. The session stores up to 100 ids. There is no signed, expiring order token separate from the session, so a stolen guest cookie reveals those orders until the 8-hour cookie expires.

### S10 — Low: admin login error and customer login error confirm the attempt shape

Both return a single incorrect-credentials message. Registration says “try signing in” when the email exists, which is a mild account-enumeration signal (`server/customers.js`).

### S11 — Low: review HTML stripping is regex-based

`sanitizeText` removes `<...>` (`server/reviews.js`). React text nodes do not interpret HTML, so stored markup is not executed in the React UI. The regex is not a complete HTML sanitizer if the same text is later injected into HTML email or `dangerouslySetInnerHTML`. Product JSON-LD uses `JSON.stringify` plus a `<` escape (`src/main.jsx`, `server/seo.js`), which is the right pattern.

### S12 — Low: local Node 24 cannot load the database

This is an environment defect with a security-testing consequence: the SQLite native module has no Node 24 prebuild, and this machine cannot compile it. CI on Node 22 is the only path that can currently execute the security-related integration tests. See `08-testing-report.md`.

## Authorization matrix (as implemented)

| Action | Guest | Customer | Viewer | Manager | Owner |
|---|---|---|---|---|---|
| Browse catalogue | yes | yes | yes | yes | yes |
| Place COD order | yes, if checkout enabled | yes | yes | yes | yes |
| Read own orders | session orders only | own `customer_id` | all, via staff | all | all |
| Edit catalogue, offers, reviews | no | no | no | yes | yes |
| Change pricing rules or feed URLs | no | no | no | no | yes |
| Create staff in the UI | no | no | no | no | no (CLI only) |
| Disable a customer | no | no | no | no | no |

There is no row-level database authorization. MySQL application users are not split into read and write roles in this repository.

## Recommended fixes (do not implement until approved)

1. Keep online payments disabled until a server-verified webhook exists. Do not trust client payment status.
2. Give coins their own review subject key, or a shared catalogue-item table, and add a test that a coin review cannot attach to a jewellery id.
3. Restrict order export and dashboard customer fields. Viewers should see operational counts, not addresses, unless a named role is granted.
4. Require customer CSRF on checkout for signed-in sessions.
5. Add staff disable, last-login, and a short lock after repeated failures stored in the database.
6. Allow only same-origin `/uploads/` and approved `https` image hosts on image URL writes.
7. Turn on SQLite `foreign_keys=ON` in `afterCreate` so preview matches MySQL constraints.
8. Configure SMTP only through the host secret store, then verify one reset email in staging.
