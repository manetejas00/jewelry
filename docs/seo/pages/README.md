# Page task list

Checked 13 November 2026 against Google Search Central and the HTML of CaratLane, Bhima, WHP, and Melorra. Rules and fetches: [00-sources.md](00-sources.md).

No ranking target. Nothing in these files is a change to the site yet.

| Page | File | URL change |
|---|---|---|
| Home | [home.md](home.md) | Keep `/`. 301 only when the real domain replaces test3. |
| All jewellery | [collection-all.md](collection-all.md) | Keep `/collections/all`. Canonicalise filter and sort queries. |
| Pearls | [collection-pearls.md](collection-pearls.md) | Keep `/collections/pearls`. |
| Rings | [collection-rings.md](collection-rings.md) | Keep `/collections/rings`. |
| Earrings | [collection-earrings.md](collection-earrings.md) | Keep `/collections/earrings`. |
| Necklaces | [collection-necklaces.md](collection-necklaces.md) | Keep `/collections/necklaces`. |
| Bracelets | [collection-bracelets.md](collection-bracelets.md) | Keep `/collections/bracelets`. |
| Saved | [collection-saved.md](collection-saved.md) | Keep. `noindex`. |
| All coins | [coins.md](coins.md) | Keep `/coins`. |
| Gold coins | [coins-gold.md](coins-gold.md) | Keep `/coins/gold`. |
| Silver coins | [coins-silver.md](coins-silver.md) | Keep `/coins/silver`. |
| Jewellery product | [product.md](product.md) | Keep word slugs. 301 only if a slug stops being unique or is an ID. |
| Coin product | [coin-product.md](coin-product.md) | Replace `/coins/product/COIN-AU-1G` style IDs with a lowercase hyphenated name. Server-side 301. |
| Delivery | [information-shipping.md](information-shipping.md) | Keep. |
| Returns | [information-returns.md](information-returns.md) | 301 to the delivery page, or give it its own heading. It currently renders the contact heading. |
| Care | [information-care.md](information-care.md) | Keep. |
| Contact | [information-contact.md](information-contact.md) | Keep. |
| About | [information-about.md](information-about.md) | Keep only after a real about article exists. |
| Privacy | [information-privacy.md](information-privacy.md) | Keep off the sitemap until a policy exists. |
| Terms | [information-terms.md](information-terms.md) | Keep off the sitemap until terms exist. |
| Unknown URL | [not-found.md](not-found.md) | None. |
| Account, bag, checkout, order, admin | [private.md](private.md) | None. `noindex`. |

## URL work that is supported

Google’s URL document asks for readable words, hyphens, and one case. It tells sites to block sort and combined-filter URLs. It does not ask for a keyword stuffed path.

The only catalogue paths that fail that document are the coin SKUs (`/coins/product/COIN-AU-1G`) and the indexable filter queries (`?q=`, `?purity=`, `?price=`, `?sort=`, `?stock=`). Collection paths such as `/collections/rings` and `/coins/gold` already use words.

Bhima’s coin URL puts karat, weight, and name in the path. That is the pattern for the coin 301, and only with words taken from the coin row.

## URL work that is not supported

- Renaming `/collections/rings` to `/collections/22k-gold-rings-online-india`. The grid is not documented as all 22K, and the extra words are the stuffing pattern in Google’s title guide.
- A `/gold-rate` or per-state rate URL copied from CaratLane. Their page lists Indian states. This shop does not store a rate per state.
- FAQPage markup copied from Bhima. Google withdrew FAQ rich results on 7 May 2026.

## Implementation order, after these files

1. Make `noindex` agree on the homepage, product pages, and `robots.txt` while preview is on. The live product page says `index,follow`.
2. Put each page’s real H1, description, and links in the first HTML.
3. Fix the pages whose title and H1 disagree: gold coins, silver coins, about, privacy, terms, returns.
4. Then the coin 301s, and canonicals for filter URLs.
5. Merchant-listing price and availability only when checkout can sell the piece.
