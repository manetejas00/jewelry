# Jewellery product `/products/:slug`

Sources: [00-sources.md](00-sources.md). One file for the template. Each published slug gets its own title, description, canonical, and schema from that product’s row. Google’s title and snippet guides say the text has to be different per page.

## What a live product URL is now

Fetched `https://test3.avinyacarefoundation.org/products/eclipse-ring` on 13 November 2026.

- Title: “Eclipse Pearl Ring | Veyora Jewels”.
- Description: “A fictional eclipse pearl ring for the Veyora Jewels preview. Product materials and specifications are illustrative.”
- Canonical: the test3 URL.
- `meta robots`: `index,follow`.
- JSON-LD Product: name, that fictional description, sku `VEY-ER-12`, one image, brand, Offer price `24500`, currency INR, availability `InStock`.
- Body: `<div id="root"></div>` only.
- `robots.txt` for the host is `Disallow: /`.
- `/api/config`: `checkoutEnabled: false`, `preview: true`.

So the head says “index this, it is in stock, it costs 24500” while the description says the product is fictional and the shop cannot take payment. Google’s product intro splits markup in two: product snippets when the buyer cannot purchase, merchant listings when they can.

In the app, the product H1 is the product name. The breadcrumb is visual links only: Jewellery / category / name. There is no BreadcrumbList. Alt text is `${name}, ${size}, ${purity} ${metal}`.

`server/seo.js` builds the description by cutting the stored description to 160 characters. Google’s snippet guide does not set a 160-character cap. It says the snippet is truncated to the device, and that a good description can gather the facts that are scattered on the page.

Client `StructuredProduct` returns null if any JSON-LD script is already in the document, so it does not add a second script when the server script exists.

## Competitor page fetched

Bhima `https://www.bhimajewellery.com/products/22kt-1g-goddess-lakshmi-gold-coin` on 13 November 2026.

- URL words: karat, weight, name, product type, hyphens.
- Title and H1 match, brand at the end of the title.
- HTML text includes purity, metal weight, and a price breakup (gold value, making, tax, total, today’s rate).
- JSON-LD types include Product, Offer, Brand, and FAQPage.

FAQPage is not a task. Google removed that rich result.

WHP’s collection title uses “BIS Hallmarked”. That is not a field on our products. Do not add it.

## Tasks

1. While preview is on, or the description still says the piece is fictional, the first HTML must be `noindex`. Google’s robots.txt guide: `Disallow` can still leave a URL in search with no snippet. The live `index,follow` tag fights the preview gate in `server/seo.js` (that gate requires `MERCHANT_READY=true`). The deployed page is not applying that gate.
2. When the product is real and checkout can sell it, use merchant-listing Product markup. Required: `name`, `image`, `offers`, price greater than zero, `priceCurrency` (`INR`). Recommended and only if true: `availability` from stock, `sku`, `brand.name`, `description`, `material` from the metal field, `size`, `category`. Google’s merchant-listing document. Do not mark `InStock` when checkout is off. That availability value means the item can be bought.
3. Put price and availability in the server HTML, not only in JavaScript. Google’s merchant-listing note says JavaScript-generated product markup makes Shopping crawls less reliable for price and availability.
4. Multiple images only for the aspect ratios Google asks for when those crops exist. Do not invent 16:9, 4:3, and 1:1 files. The requirement is “for best results”, and the image must be the product.
5. Visible page, in the first HTML, in this order, using stored fields only:
   - H1 = product name (already the React H1).
   - Metal, purity, net weight, size, when those fields are non-empty.
   - The approved description, not the “fictional” preview sentence.
   - Price lines the pricing engine already calculates, once checkout is on: metal, making, tax, total. Bhima shows this in the HTML. Google’s snippet guide says a description can gather scattered facts. Do not put the rupee price in the `<title>`. Google’s title guide gives that warning for flight prices because they change faster than the title. Gold-linked prices on this shop also change with the rate. Keep the moving price in the offer markup and on the page, where it can be updated, not in the title string.
6. Breadcrumb in HTML: Home / category / product name. BreadcrumbList with `position`, `name`, and `item`. Google’s breadcrumb guide. The category crumb URL must be the collection URL, which already exists.
7. `aggregateRating` only from approved reviews, and only with the review-snippet required fields. Those review fields were not re-fetched for this task, so ratings markup waits until that document is applied. Do not copy a rating into JSON-LD from an empty or pending queue.
8. Alt text already includes name, size, purity, and metal. Keep that. Do not add unverified claims to the alt.
9. `gtin` and `hasCertification` stay empty. Google’s certification `name` values in the merchant-listing doc are EU energy and vehicle CO2 labels, not BIS. There is no BIS value in that table. Do not invent a GTIN.

## URL

Current slugs such as `/products/eclipse-ring` already use lowercase words and hyphens. That matches Google’s URL guide. Do not append “-online-india” or a second copy of the category.

Change a slug only when it is an opaque id, not words, or when two products share a slug. `server/seo.js` uses the first row for a slug. Two rows with one slug are one URL. Give the second product its own slug and do not leave both indexable at the old path.

If a slug changes, add a server-side `301` from the old path to the new one. Google’s redirect guide: `301` or `308`, not a JavaScript redirect.

Canonical must be the final shop origin, not `test3.avinyacarefoundation.org`, once that origin is chosen. Until then the page stays `noindex`. A canonical pointing at a preview host is what the live eclipse page does today.
