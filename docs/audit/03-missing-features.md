# 03 — Missing features

Recommendations are limited to a jewellery and bullion retailer that already has a catalogue, gold-linked pricing, COD checkout, accounts, reviews, and a merchant studio. Marketplace, subscriptions, and unrelated verticals are omitted.

Priority meanings:

- **Critical:** security or a broken core path.
- **High:** required before taking real customer orders.
- **Medium:** expected in a professional shop within the first operating months.
- **Low:** useful later.

## 1. Essential product gaps

| Gap | Priority | Why it matters |
|---|---|---|
| Online payment with server-side verification | High if the merchant will not collect only COD | `PAYMENT_MODE` cannot be a gateway today. COD can launch without it |
| Order confirmation email and merchant alert | High | Customers and staff only see the on-site confirmation. Nodemailer is already a dependency |
| Order status: confirmed, packed, shipped, delivered, cancelled | High | Status is frozen at `confirmed` (`server/orders.js`). There is no shipment record |
| Stock return on cancel | High | Stock is decremented immediately. A cancelled COD order would leave stock wrong |
| Coin reviews stored against coins | Critical | Current ids collide with jewellery. See security S2 |
| Unique product slug and product code | High | Duplicate URLs hide a SKU |
| Working password recovery in production | High | Routes exist; SMTP and OTP default off |
| Developer runtime that can boot | High | Node 24 cannot load SQLite here, so local QA is blocked |

## 2. Admin capabilities

| Gap | Priority |
|---|---|
| Change order status, record a courier and tracking id, cancel with reason | High |
| Customer search, order history, and disable account | High |
| Staff invite, role change, and revoke | High |
| Invoice or packing slip PDF with GST fields the merchant actually uses | High for Indian retail |
| Promo code entry that checks `offers.code`, dates, and usage limits | Medium |
| Offer start and end timestamps | Medium |
| Low-stock list and “rate older than N hours” alert beyond the dashboard flag | Medium |
| Full audit log with filters, not only the last 20 rows | Medium |
| Bulk price or stock edit with the same validation as CSV import | Medium |
| Media library pagination and deletion of files that are no longer referenced | Low |

## 3. Customer features

| Gap | Priority |
|---|---|
| Order email with the human order id and COD amount | High |
| Shipment tracking on `/order/:id` and in the account | High |
| Cancel request before dispatch | High |
| Change password while signed in | Medium |
| Saved addresses and a default PIN code | Medium |
| Profile name and phone edit | Medium |
| Notify me when a draft or out-of-stock SKU returns | Medium |
| Review a purchased coin | Critical, because the path is misleadingly present |
| Shareable wishlist distinct from the private saved list | Low |
| Gift wrap or engraved message | Low |

## 4. Automation

| Gap | Priority |
|---|---|
| Host cron that is observed, not only `CRON_EXPRESSION` in `.env.example` | High |
| Email or studio alert when the gold rate is stale and checkout is paused | High |
| Email when a daily import fails | Medium |
| Abandoned bag reminder | Low |
| Review request after delivery | Low |

`isFresh` already blocks checkout when rates are old (`server/pricing.js`). Nobody is notified.

## 5. Integrations

| Gap | Priority |
|---|---|
| Payment gateway chosen by the merchant, with signed webhooks | High only if COD is not the launch method |
| SMTP for reset and order mail | High |
| SMS or WhatsApp OTP only if the merchant pays for Kaleyra or Pinpoint | Medium |
| GST e-invoice, if turnover requires it | Medium, legal decision for the merchant |
| Shipping partner (rate and tracking) | Medium |
| Analytics property | Medium |
| Object storage for uploads | Medium once more than one app instance runs |

Do not add a gold API that converts 24K to 22K automatically unless `GOLD_AUTO_CONVERSION_APPROVED` is a conscious merchant decision. The code already refuses that path.

## 6. Security controls still missing

See `04-security-audit.md`. The feature-shaped gaps are staff revocation, viewer restrictions on customer exports, checkout CSRF for signed-in customers, and SQLite foreign keys in preview.

## 7. Analytics and reporting

The dashboard is operational (rates, batches, recent orders). It is not a business report.

Missing:

- Revenue by day, category, and metal
- Units sold versus stock
- Conversion from product view to bag to order
- Failed checkout reasons
- Review volume awaiting moderation
- Export of those reports

No analytics script is installed, so marketing numbers cannot be reconstructed from the app.

## 8. Notifications

| Event | Today |
|---|---|
| Account created | silent |
| Order placed | on-screen only |
| Order shipped | impossible |
| Password reset | email or OTP only when configured |
| Review approved or rejected | silent |
| Import failed | visible in the studio if someone opens it |
| Rate stale | checkout error and a dashboard badge |

## 9. Operations

Missing written runbooks inside the product for: who confirms COD orders each morning, who updates the gold rate if the file is late, how a wrong shipment is corrected, and how a customer invoice is issued. `docs/import-guide.md` covers the file format. It does not cover the daily shop-floor loop.

## 10. Documentation gaps

Existing `docs/` are strong for engineers. Missing for a merchant:

- Studio manual with screenshots (not possible until the app boots)
- “What COD confirmation means” (stock is already reduced; money is not collected)
- Which environment variables the merchant must fill before `MERCHANT_READY`
- A data-retention note for customer addresses and review photos

## 11. Scale

Missing when the catalogue or traffic grows: SQL pagination, a shared cache, a worker process, durable uploads, and more than a single Node instance. Not needed to launch a small COD catalogue. See `05-performance-audit.md`.

## 12. Conversion

Already present: offers and badges, saved pieces, search, related editorial home, trust copy on coins, guest checkout.

Missing for conversion, in order:

1. Real delivery and returns text, because generic policy copy does not answer the purchase question.
2. Delivery estimate by PIN code, or an honest single nationwide window.
3. Order email, which is also the receipt.
4. In-stock and “price locked at checkout” messaging next to gold-linked prices. The quote token already enforces the lock on the server.
5. Optional making-charge explanation in plain sentences for AEO and for hesitant buyers.

Hallmarking, BIS certification, and diamond grading must stay absent until the merchant supplies evidence. The AI copy skill already flags unsupported claims.
