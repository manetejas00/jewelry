# Live security verification

10 November 2026. **Critical findings remain open.** This was a bounded audit, not a penetration-test certification.

| Priority | Finding | Evidence and state |
|---|---|---|
| CRITICAL | Documented preview administrator is still active | Existing explicit login authorization was used previously; read-only hash verification confirmed it still matches. The later media-count check required and received separate approval. No credentials were rotated or published. |
| HIGH | Public store runs preview behavior | Runtime NODE_ENV is production but PREVIEW_MODE is true. Public config hardcodes merchant readiness/COD although the payment environment says test. Candidate startup/readiness controls are absent live. |
| HIGH | Raw Git publication removed runtime files and exposed repository paths | Recovered Node routing and denied source/config paths. Automatic PHP/static publication paused. These infrastructure fixes do not deploy the security candidate. |
| HIGH | Password recovery unavailable live | No recovery link in account UI; SMTP configuration absent; current backend lacks candidate reset migrations/implementation. No email was sent. |
| HIGH | Pricing lacks candidate purity/silver/feed safeguards | Live backend hashes match the older source. Purity fallback, silver fallback/freshness and automatic-feed currency/unit assumptions remain release risks. No supplier feed was triggered. |
| MEDIUM | Unexpected validation errors expose internals | A null quote item returns a JavaScript property-access message with HTTP 400. Candidate generic/typed errors and bag validation fix this locally. |
| MEDIUM | Static document headers differ from API headers | Static root HTML bypasses Express policy; robust script CSP not established. Do not infer static protection from secure API cookies. |
| MEDIUM | Public coin copy makes unsupported certification assertions | Rendered page states certified purity/assay packaging without supplied documentary evidence. Candidate static copy was corrected; database descriptions were left untouched. |

## Verified protections

- HTTPS certificate verification succeeded; observed TLS negotiation used TLS 1.2. This does not prove TLS 1.3 is unsupported. Observed certificate expiry: 7 February 2027, 15:54:14 UTC.
- Plain HTTP redirected with 301 to HTTPS.
- A newly observed session cookie was Secure, HttpOnly, SameSite Strict, path `/`. Cookie values/tokens were neither recorded nor committed.
- An untrusted Origin on the quote request returned 403.
- Unauthenticated customer order history returned 401. Staff session/catalogue returned 403. A nonexistent order returned 404.
- `.env`, `app/.env` and `.git/config` probes were denied. Following recovery, `/private/store.sqlite`, `/server/index.js` and `/package.json` were denied. `/app/private/store.sqlite` returned bounded fallback HTML, not database bytes. No secrets or database file were downloaded.
- Fake client-supplied prices were ignored by the quote service; the server calculated the published price.

## Limits and approval boundaries

No credential changes, account creation/deletion, live checkout, payment, refund, customer email, supplier import or destructive migration was performed. Staff login/logout changes transient sessions only. Customer authenticated ownership/IDOR paths need an approved dedicated test account. Rate limiting was not stress-tested or declared effective from source alone. SQL injection/XSS coverage was not exhaustive.

Automatic approval review initially rejected expanding the login-only authorization to the admin media endpoint. The owner then explicitly authorized that bounded read-only check. The specifically approved check returned login 200, media-list 200 (678 entries), and logout 200. No credential or media contents were saved in this report.

The actual database is MySQL, not the inactive SQLite file. No database-password/token values were copied into evidence or Git. A private consistent MySQL export exists; its restore has not been rehearsed. Fixing the known default owner requires explicit owner approval and a private replacement access plan.
