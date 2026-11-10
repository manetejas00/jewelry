# Testing report

> Live verification correction (10 November 2026): active storage is MySQL; the SQLite file is inactive legacy storage. The newer LIVE_AUDIT_REPORT.md and LIVE_DEPLOYMENT_VERIFICATION.md supersede earlier SQLite assumptions and describe the owner-triggered deployment incident/recovery.

10 November 2026. All counts refer to this audit's local run unless explicitly marked live.

## Results

| Check | Result |
|---|---|
| Baseline `npm test` | 98 passed, 0 failed |
| Final `npm test` | 116 passed, 0 failed, 0 skipped |
| `npm run build` | Passed; main approximately 180 kB, React approximately 262 kB, animation 71 kB, icons 17 kB; prior >500 kB chunk warning removed |
| `npm run assets:check` | Passed: 106 products, six coins, 448 checked assets, zero errors |
| `npm audit --json` | Zero reported vulnerabilities after parser and SMTP library updates |
| Local HTTP middleware/authentication | Passed against isolated temporary SQLite preview |
| Browser collection widths | 390/768/1440 px: document width matched viewport; no horizontal overflow in checked view |
| Browser loaded collection images | No broken loaded images at checked mobile view; lazy/offscreen images are not all covered |
| Browser home/collection/recovery render | Passed in isolated local preview; no captured console errors in checked views |
| Live HTTPS/config/catalogue | Passed read-only retrieval; 107 variants / 106 styles, six coins |
| Live documented preview admin login | Accepted (critical finding), followed by successful logout; explicitly authorized |
| Live robots | Failed: HTTP 200 returned storefront HTML, not robots text |
| JavaScript syntax / whitespace checks | Passed for server, scripts and migrations; git diff --check clean |
| Production preflight on local preview | Correctly rejected PREVIEW_MODE=true; expected safety failure |
| Target production MySQL | Not run; requires staging connection and reconciled data |
| Real SMTP inbox delivery / online payments / scheduled import | Not verified; service configuration and observation required |

The local host runs Node 20.17.0. package.json supports >=20.17.0; use a currently supported host runtime and re-run installation/build/native module checks there. Build emits React Router's upstream ignored `use client` directive warnings. These did not fail compilation. A JSON-module experimental warning is also emitted by the local toolchain. No claim that these warnings were eliminated.

## Added regression coverage

- Rejected insecure/preview/unsupported production configuration and checkout readiness.
- Generic internal errors and safe malformed/oversized request responses.
- Negative/nonfinite/excessive offer values and enum validation.
- Exact gold purity, no implicit silver rate, recent silver timestamp and future-rate rejection.
- Guest retry ownership, changed-customer replay, stable order/stock on duplicate and unsupported payment rejection.
- Decimal bag totals and malformed bag items.
- Canonical/social/structured metadata escaping, private noindex and missing product status.
- Active SVG rejection before writing public files.
- Real HTTP JSON 404, ready probe, cross-origin rejection, admin protection, login/CSRF/offer create-update-delete/logout.
- Customer HTTP registration/state revision/order access/logout; actual old-session rejection after reset; viewer-role mutation denial with valid CSRF.
- Password recovery hashes/expiry/one use/password replacement/session version, unknown email and failed email cleanup.
- Frontend malformed-response and timeout messages.

Earlier intermediate failures were corrected: the HTTP fixture initially attempted to bind in a restricted environment; its test run was repeated with local-server permission. A test fixture initialization-order issue and an assertion counting its temporary database as an upload were corrected. Raster validation retains the established invalid-image error wording. No failed tests are ignored in the final count.

## Scope and gaps

Existing tests cover imports, stock preservation, pricing/margins, customer state/ownership, offers, coin behavior, pagination, search and image processing. Several UI tests inspect markup/source rather than exercising a real browser. No measured line/branch coverage percentage is claimed. Browser smoke checks are not exhaustive E2E or an accessibility certification. Production CSP rendering is covered by source/module checks, not a live production MySQL browser session.

Pending: every admin/import/upload branch under actual MySQL, simultaneous multi-process orders/imports, role-specific browser journeys, physical gestures, screen readers, broad route/device matrix, actual email receipt, gateway failures if integrated, restoration drill, scheduled-run observation, live Core Web Vitals and sustained load. Do not infer these pass from unit tests.

## Reproduce

```sh
npm ci
npm test
npm run build
npm run assets:check
npm audit
```

The tests use in-memory/temporary fixture databases. Existing sample-generation tests refresh timestamps in `samples/*-example.csv`; review those generated diffs separately. Test processes must be permitted to bind a loopback HTTP port. No real provider calls or payment success mocks are enabled in production.
