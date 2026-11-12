# Live functional testing

10 November 2026. “Pass” applies only to the action described. No local test result is used as proof of a live mutation.

| Journey | Live result | Scope |
|---|---|---|
| Homepage | PASS | Rendered; final fresh browser had no captured console errors |
| Jewellery listing | PASS | Catalogue loaded; Load more expanded 24 product links to 48 |
| Categories/direct pages | HTTP PASS | All 106 product-style and six coin-detail URLs responded; not every interaction on each page was exercised |
| Price filter | PASS | Under ₹20,000 selected/pressed and corresponding products displayed |
| Sorting | PASS | Ascending sorting displayed increasing representative prices |
| Search/autocomplete | PASS | “Aurelia” returned the matching product; selection opened its detail page |
| Product price/SKU | PASS | Aurelia price ₹22,700 and SKU VEY-RG-101 matched the selected result/detail/bag |
| Variants | PARTIAL | Single available ring-size option rendered; multi-variant checkout not completed |
| Gallery | PASS | Six views exposed; zoom 100% → 150%; next image 1/6 → 2/6; Escape closed viewer |
| Size guide | PASS | Dialog/table rendered and closed |
| Guest cart | PASS | Added one selected SKU; quantity 2 subtotal ₹45,400; audit items removed afterwards |
| Quote/checkout display | PASS | Server subtotal/total ₹45,400, complimentary delivery at quantity 2; quote restored after refresh |
| Client price manipulation | PASS | Supplied fake unit/total prices did not affect server quote |
| Empty/duplicate/excess bag | PASS | All rejected with HTTP 400 |
| Null bag entry | FAIL | HTTP 400 leaks a JavaScript property-access error rather than an appropriate message |
| Out-of-stock UI | PASS | Nocturne and the checked sold-out coin controls were disabled |
| Place order / stock decrement | NOT RUN | No live order created; requires explicit approved test workflow |
| Duplicate order / confirmation | NOT RUN | Quote duplicate-SKU rejection is not proof of idempotent order submission |
| Online payment/cancel/refund | UNAVAILABLE | No installed gateway; COD display does not establish payment collection |
| Customer registration | FORM ONLY | Full name/email/password form rendered; no submission/account mutation |
| Customer login/profile/history | NOT AUTHENTICATED | No dedicated customer credentials authorized; anonymous history denied |
| Staff login/logout | VERIFIED | Bounded previously approved checks; no staff/commerce records changed |
| Password recovery | FAIL / UNAVAILABLE | No live recovery link and no configured SMTP; no email requested |
| Contact | FAIL FOR LAUNCH | Page states merchant contact is awaiting details; no contact form/inbox verified |
| Mobile navigation | PASS | Menu opened with category/account links; Escape closed it |
| Responsive layout | PASS, LIMITED | Collection/product/coins/account at 390/768/1440 px; no horizontal overflow or broken loaded images in 12 checks |
| Admin CRUD/upload/import | NOT RUN | Would mutate live records; no such permission was inferred |

All 786 referenced local image/build URLs passed post-recovery HEAD checks. These checks validate response status/type, not every physical gesture, image meaning or accessibility behavior. Physical pinch/pan, screen readers, broad keyboard paths and all browser/device combinations remain unverified.

Three phases are distinct: pre-deployment audit; owner-triggered incorrect Git deployment/outage; restored legacy application. Post-recovery evidence is saved separately. No test-only orders/accounts or irreversible external effects were created to manufacture passing results.
