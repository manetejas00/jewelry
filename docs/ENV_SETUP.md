# Environment setup

> Live verification correction (10 November 2026): active storage is MySQL; the SQLite file is inactive legacy storage. The newer LIVE_AUDIT_REPORT.md and LIVE_DEPLOYMENT_VERIFICATION.md supersede earlier SQLite assumptions and describe the owner-triggered deployment incident/recovery.

Use `.env.example` for local preview only. The current local `.env` is preview configuration; it must not be uploaded. Set production values in the host's private environment store. Never paste secrets into chat, commit them, or put them in shell command arguments/logs.

## Required production configuration

| Variable | Requirement |
|---|---|
| NODE_ENV | `production` |
| PREVIEW_MODE | Explicit `false`; public preview credentials/catalogue rejected |
| APP_URL | Actual HTTPS origin, e.g. `https://test3.avinyacarefoundation.org`; no path/query/credentials |
| PORT | Port required by the verified host Node runtime; local default 3000 |
| SESSION_SECRET | Independent cryptographic random secret, >=32 characters; rotate during removal of exposed preview access |
| DB_CLIENT | `mysql2` for production; local tests use SQLite |
| DB_HOST, DB_PORT | Verified database endpoint/port; default port 3306 |
| DB_NAME, DB_USER, DB_PASSWORD | Dedicated least-privilege database identity; no placeholder values |
| TRUST_PROXY | Verified proxy hops, 0–5; direct Node defaults 0. Do not guess. Restrict backend ingress to the intended proxy. |
| UPLOADS_DIR | Persistent absolute uploads directory, independent of release directory. Use the existing live upload location after verifying it. Default local `public/uploads`. |
| BRAND_NAME | Merchant brand; default Veyora Jewels |
| PAYMENT_MODE | `disabled` until ready; `cod` only with actual delivery/collection arrangements. `live` and unknown modes rejected. |
| MERCHANT_READY | `true` only after catalogue, stock, policies and business operations approved |
| MERCHANT_EMAIL | Real monitored email; `.local`, `.invalid`, `.example` rejected for readiness |
| SHIPPING_POLICY, RETURNS_POLICY | Actual approved policy text, required to enable production COD |
| SHIPPING_INR, FREE_SHIPPING_INR | Nonnegative INR amounts; defaults 250 and 25000. Review rather than accepting defaults blindly. |
| COOKIE_SECURE | Optional `true`; production cannot set false |

Private data does not become real by changing flags. Startup rejects the known fictional suppliers and default preview account even with production flags. First reconcile the database and merchant accounts through a reviewed migration plan.

## One-time passwords

OTP generation and verification belong to [knadh/otpgateway](https://github.com/knadh/otpgateway) (MIT). Express calls it with `OTP_GATEWAY_URL`, `OTP_GATEWAY_NAMESPACE` and `OTP_GATEWAY_SECRET`. The storefront never receives that URL, the secret, or the code.

Start the internal gateway with `docker compose -f docker-compose.otp.yml up --build`. It listens on `127.0.0.1:9000` and is not a public route. Redis is private to the Compose network. At least one provider has to be fully configured or the gateway refuses to start.

`OTP_EMAIL_ENABLED=true` also needs `SMTP_HOST` and `SMTP_FROM`. `OTP_SMS_ENABLED=true` needs `OTP_SMS_PROVIDER=kaleyra_sms` or `pinpoint_sms` plus that provider's credentials. `OTP_WHATSAPP_ENABLED=true` needs the Kaleyra WhatsApp Business fields, including a template approved in the WhatsApp Business account. A flag without credentials leaves the channel off. Kaleyra, Pinpoint and SMTP delivery are paid or account-gated services.

`OTP_REQUIRE_REGISTER`, `OTP_REQUIRE_LOGIN`, `OTP_REQUIRE_CHECKOUT` and `OTP_PASSWORD_RESET` default to false, so existing password sign-in, guest checkout and link-based recovery stay as they are until a channel is actually available. Codes are six digits, expire after five minutes, allow five checks, and can be requested again after 60 seconds. The gateway stores the live code in Redis until it expires; this application stores only a hash of the destination.

## Password recovery SMTP

`SMTP_HOST`, `SMTP_PORT` (default 465), `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`. Port 465 uses implicit TLS; other SMTP ports require STARTTLS. Use a provider-approved sender with SPF/DKIM/DMARC configured by its owner. No plaintext SMTP or disabled TLS verification is offered. Password recovery stays unadvertised until configuration exists, and returns 503 when unavailable. Verify actual inbox delivery; configured variables are not evidence of delivery. No order-confirmation email workflow is claimed.

## Supplier feeds and pricing

- `GOLD_FEED_URL`, `GOLD_FEED_TOKEN`: authorized HTTPS purity-specific CSV rates, token sent as Bearer header. Query-string/embedded credentials must not be used.
- `PRODUCT_FEED_URL` / `PRODUCT_FEED_FILE`, `PRODUCT_FEED_TOKEN`: stock/catalogue source. Local private files must be readable by app/cron only.
- `COIN_FEED_URL` / `COIN_FEED_FILE`, `COIN_FEED_TOKEN`, `COIN_FEED_ENABLED`, `COIN_INVENTORY_MODE`.
- `GOLD_MAX_AGE_HOURS`: default 48; admin permits 1–168. Applies to explicit silver rate age too.
- `SUPPLIER_NAME`, `INVENTORY_MODE` (`incremental` or `full`), `SUPPLIER_OVERWRITE_FIELDS`: full snapshots can zero omitted supplier stock; verify contract before enabling.
- `FEED_STATUS`, `GOLD_FEED_ENABLED`, `PRODUCT_FEED_ENABLED`: also persisted by merchant settings. Database settings override environment on load.
- `GOLD_AUTO_CONVERSION_APPROVED=false`: default. Auto adapter requires merchant approval, explicit INR/troy_ounce and fresh provider timestamp. The existing public provider's actual payload has not been validated against this contract; prefer CSV. No currency/purity assumption is allowed to stand in for a supplier contract.
- Silver price is stored in `settings`: `SILVER_RATE_PER_GRAM` plus `SILVER_RATE_UPDATED_AT`. The admin silver-rate endpoint sets both atomically. Reapprove existing legacy rates through that endpoint after migration.
- `CRON_EXPRESSION`: documentation only. A real host scheduler must independently be configured and observed.

## Bootstrap

`ADMIN_EMAIL`, `ADMIN_PASSWORD` (unique 16+ characters), optional `STAFF_ROLE` (`owner`, `manager`, `viewer`) are consumed by `scripts/create-admin.js`. Run once on the intended database; remove bootstrap password from configuration afterwards. Do not copy preview staff. Do not delete customer/order records to satisfy startup checks.

`PAYMENT_PROVIDER`, `PAYMENT_SECRET`, `PAYMENT_WEBHOOK_SECRET` are legacy placeholders only; no provider integration consumes them. Setting them does not enable online payments. Analytics, WhatsApp, maps and social APIs are not configured features in this repository.

## Storefront chatbot

`AI_API_KEY` stays on the server and is shared with catalogue copy. `AI_API_URL` is the chatbot completions endpoint (default `https://api.openai.com/v1`). `AI_ENABLED`, `AI_MODEL`, `AI_MAX_DAILY_MESSAGES` (default 10), `AI_DAILY_RESET_TIMEZONE` (default `Asia/Kolkata`), `AI_MAX_INPUT_LENGTH`, and `AI_MAX_RESPONSE_TOKENS` configure the signed-in assistant. The browser never receives the key. See `AI_CHATBOT_SETUP.md`. Catalogue copy continues to use `AI_BASE_URL`.
