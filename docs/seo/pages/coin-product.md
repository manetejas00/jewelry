# Coin product `/coins/product/:sku`

Sources: [00-sources.md](00-sources.md).

## What this page is now

Sitemap on the live host lists paths such as `/coins/product/COIN-AU-1G`. The path is an uppercase SKU.

`server/seo.js` treats the coin like a product: title is the coin name, description is the stored text cut to 160 characters, Product JSON-LD uses the SKU.

`CoinProduct` H1 is the coin name. The page tells the reader to confirm manufacturer, purity, packaging, and documentation.

Google’s URL guide: prefer readable words over long IDs; use hyphens between words; `/APPLE` and `/apple` are different URLs. `COIN-AU-1G` is an ID, and it is uppercase.

## Competitor URL fetched

Bhima: `/products/22kt-1g-goddess-lakshmi-gold-coin`.

The words in that path are the karat, the weight, the name, and the product type. The title and H1 repeat that name. The HTML includes purity, weight, and the price breakup. Schema includes Product and Offer. It also includes FAQPage, which we will not copy.

## Tasks

1. Same purchase gate as jewellery products. No `InStock` offer and no `index,follow` while checkout is off or the coin text is still a preview claim. Google product intro and robots.txt guide.
2. When the coin can be sold, merchant-listing fields from the coin row: name, image, price greater than zero, INR, sku, material (gold or silver), description. `availability` only from real stock.
3. Visible HTML, before JavaScript: H1 = coin name; purity; weight in grams; metal; the price lines the shop actually calculates. Same Bhima pattern, limited to fields we store.
4. New path, lowercase, hyphens, words from the stored name plus the stored purity and weight. Example shape, not a live slug: `/coins/22k-1g-lakshmi-gold-coin` only if the row’s name, purity, and weight are those values. Do not add words the row does not contain.
5. Server-side `301` from `/coins/product/COIN-AU-1G` to the new path. Google’s redirect guide. One hop. Canonical is the new path. Sitemap lists the new path only.
6. Keep the SKU in the page text and in `sku`. Google recommends ASCII SKUs with no spaces. The SKU does not have to be the URL.
7. Breadcrumb: Home / Gold coins or Silver coins / coin name. The middle URL is `/coins/gold` or `/coins/silver`, which already exist. BreadcrumbList after the visible trail exists.
8. No FAQPage. No hallmark sentence unless the coin record contains that sentence.

## URL

This is the one template whose current URL fails Google’s “words, not IDs” example and fails the case rule. Jewellery slugs do not fail that test. Collection paths do not fail it.
