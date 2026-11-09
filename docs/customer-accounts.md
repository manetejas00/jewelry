# Customer accounts

Customers can open `/account` using the person icon in the storefront header, or the My account footer link. The screen offers Sign in and Create account. Registration needs a name, email and password of at least 12 characters (maximum 72 UTF-8 bytes). Passwords are bcrypt-hashed. Customer access does not grant merchant permissions.

The account has an overview, paginated order history, shopping bag and saved pieces. Signed-in bag/favourite changes are stored server-side and restored on other devices after login. Signing out removes account items from the current screen and guest browser storage; it keeps them in the account. A guest bag and favourites are merged into the account on login/registration. Matching SKU quantities use the higher quantity, preventing repeated login from doubling a bag. Unknown product references are ignored. Unavailable pieces remain identifiable in a saved bag and are rechecked before checkout.

The account bag uses versioned writes. If another tab has changed the account, stale changes are rejected and the UI offers Reload latest account rather than silently overwriting newer data. Offline/failed saves are visibly flagged; the user must resolve them before checkout or sign-out. Bag prices are estimates refreshed from the published catalogue; checkout remains the price/availability authority.

New signed-in orders store the server session's customer ID. A successful order removes purchased quantities from the stored account bag in the same transaction and retains saved favourites. Order history reads only the authenticated customer's orders. Individual order pages enforce account ownership, with separate staff permissions.

Existing guest orders are never associated merely by entering an email address. Association requires both the original guest-session order capability and an exact normalised email match. Older guest orders from other sessions therefore do not automatically appear. Existing orders and their historical prices are preserved by migration 002.

Customer and merchant sessions share the application session cookie but retain independent identities and CSRF tokens. Signing in rotates the session ID; signing out of either identity preserves the other authorised identity. Customer passwords and private bags/orders are never in public catalogue responses.

## Deployment

Back up the live database before applying `002_customers.js`, then run `npm run migrate` with the production environment. Local preview applies this additive migration at startup. Do not deploy the preview SQLite database. The MySQL migration remains to be checked against the actual Hostinger database. HTTPS and a stable strong SESSION_SECRET are required in production.

Email verification and password-reset email delivery are not configured. They require an authorised transactional email provider and verified sending domain before adding those flows. Customer purchase checkout remains the existing clearly labelled test checkout until the live gateway is integrated.
