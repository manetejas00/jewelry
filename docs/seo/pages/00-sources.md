# Sources and rules for the page tasks

Checked 13 November 2026. These files are the task list. They are not an implementation, and they do not claim a Google ranking.

A task is allowed only when it is tied to one of these:

1. A Google Search Central document, quoted by URL and date on that page.
2. HTML fetched from a live jewellery or coin seller that sells the same kind of thing: gold or silver jewellery, or gold or silver coins, in India, in INR.
3. A response or source file from this shop, fetched or read on 13 November 2026.

Competitors checked, and what was in the first HTML (not after clicking around):

| Seller | URL fetched | What was in the HTML |
|---|---|---|
| CaratLane | `https://www.caratlane.com/gold-coins.html` | Canonical to itself. Title: “Gold Coins: Buy 22K & 24kt Gold Coins Online In India \| CaratLane”. Meta description names 22K, 24K, 1 Gm, 2 Gm, 5 Gm, 10 Gm, and Lakshmi. Visible H1: “Gold Coins”. About 11,000 characters of text. “Frequently Asked” text is in the HTML. JSON-LD types found: Organization, ContactPoint. |
| CaratLane | `https://www.caratlane.com/gold-rate` | Canonical to itself. H1: “Gold Rate Today!”. About 23,000 characters, including a list of Indian states. JSON-LD types found: Organization, ContactPoint. |
| Bhima | `https://www.bhimajewellery.com/products/22kt-1g-goddess-lakshmi-gold-coin` | Canonical to itself. Title and H1 both “22kt 1g Goddess Lakshmi Gold Coin”, title also ends with “Bhima Jewellery”. About 7,200 characters, including purity, weight, and a price breakup. JSON-LD types found: Product, Offer, Brand, FAQPage, Question, Answer. |
| WHP | `https://whpjewellers.com/collections/22k-gold-jewellery` | Canonical to itself. Title: “22K Gold Jewellery Online \| BIS Hallmarked Jewellery – WHP Jewellers”. H1: “22K Gold Jewellery”. About 16,800 characters. |
| Melorra | `https://www.melorra.com/jewellery/` | Canonical to itself. Title: “Explore Latest Gold & Diamond Jewellery Designs Online \| Melorra”. H1: “Light-weight Gold & Diamond Jewellery”. About 40,000 characters. JSON-LD types found: BreadcrumbList, ItemList, ListItem, Product, Offer, Brand. |

This shop, same day:

- `https://test3.avinyacarefoundation.org/` is a 1,508-byte static file. Title: “Veyora Jewels — Objects of quiet beauty”. Description: “An intimate collection of pearl and gold jewellery. Discover the Veyora Jewels preview.” No canonical. Body is `<div id="root"></div>`.
- `https://test3.avinyacarefoundation.org/robots.txt` is `User-agent: *` / `Disallow: /`.
- `https://test3.avinyacarefoundation.org/api/config` returned `preview: true`, `merchantReady: false`, `checkoutEnabled: false`, `contact: contact@veyora.local`.
- `https://test3.avinyacarefoundation.org/products/eclipse-ring` is 2,872 bytes. Title and H1 are not in the body. Head title: “Eclipse Pearl Ring \| Veyora Jewels”. Description says the ring is fictional and illustrative. Canonical is the test3 URL. `meta robots` is `index,follow`. Product JSON-LD has price 24500 INR and `InStock`. Body is still only `<div id="root"></div>`.

## Google documents used

- Title links, updated 2025-12-10: https://developers.google.com/search/docs/appearance/title-link
- Snippets, updated 2026-04-20: https://developers.google.com/search/docs/appearance/snippet
- URL structure, updated 2026-10-21: https://developers.google.com/search/docs/crawling-indexing/url-structure
- Redirects, updated 2026-04-14: https://developers.google.com/search/docs/crawling-indexing/301-redirects
- JavaScript SEO, updated 2026-03-04: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- robots.txt, updated 2025-12-10: https://developers.google.com/search/docs/crawling-indexing/robots/intro
- Product structured data intro, updated 2025-12-10: https://developers.google.com/search/docs/appearance/structured-data/product
- Merchant listing Product and Offer fields, fetched 2026-11-13: https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- Breadcrumbs, updated 2026-09-08: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- FAQ rich result removed from Google Search, changelog: FAQ rich results stopped on 7 May 2026; the FAQ documentation was removed from Search Central on 12 June 2026. https://developers.google.com/search/updates

## Rules that follow from those documents

- Every indexable page needs its own `<title>`. Do not repeat one boilerplate title. Do not repeat the same words to pack in keywords. Brand goes at the start or end, once.
- The visible H1 should be the main title. Google also reads the H1 when it builds the title link.
- Google builds snippets from page text. A meta description is used when it describes that page better than the page text. Keyword lists are a documented bad pattern. Unique descriptions may be generated from page-specific data.
- Google can render JavaScript, but a shell with an empty body makes Google wait for rendering, and “not all bots can run JavaScript.” Canonical and robots tags belong in the first HTML. `robots.txt` `Disallow` stops the fetch, so Google never renders the page. `Disallow` does not reliably keep a URL out of search if another site links to it. `noindex` is the documented way to keep a URL out.
- Merchant listing markup is for pages where the customer can buy. Required Product fields are `name`, `image`, and `offers`. Required Offer fields are a price greater than zero and `priceCurrency`. `availability` is recommended, not required. `shippingDetails` and `hasMerchantReturnPolicy` are recommended, and Google says to put the shop-wide policy on `Organization` when it is the same for the shop. JavaScript-only price and availability markup is documented as less reliable for Shopping crawls.
- Do not add `FAQPage` markup to chase a Google FAQ rich result. Google removed that feature for non-government, non-health sites, then removed the documentation.
- URLs should use readable words, the audience’s language, and hyphens. Google treats `/APPLE` and `/apple` as different URLs. Do not invent a pile of filter URLs. Google’s own examples say to block sorting URLs and combined filter URLs in `robots.txt`.
- A changed URL that should replace the old one in search needs a permanent server-side redirect (`301` or `308`). A JavaScript redirect is the last option in Google’s list.

## What these tasks will not do

- They will not copy “BIS hallmarked” from WHP. This catalogue has no stored hallmark or assay field, and the live eclipse-ring description says the specifications are illustrative.
- They will not copy CaratLane’s state-by-state gold board. This shop stores a purity rate in INR per gram, not a rate per state.
- They will not copy Melorra’s diamond wording. There is no diamond shape, carat, colour, or clarity field.
- They will not add city pages, “best jewellery in India” pages, or `/vs/` pages. None of those exist here, and no fetched Google document requires them.
- They will not turn on indexing while `preview` is true, the contact is `contact@veyora.local`, or a product description says the product is fictional.
