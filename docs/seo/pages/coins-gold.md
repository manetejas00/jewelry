# Gold coins `/coins/gold`

Sources: [00-sources.md](00-sources.md).

## What this page is now

Same component as `/coins`. The filter keeps coins whose metal or coin type contains “gold”.

Server title: “Gold coins | Veyora Jewels”.

After JavaScript, the title is overwritten to “Gold & Silver Coins | Veyora Jewels”. The H1 is also “Gold & Silver Coins”.

So the server title and the rendered heading disagree. Google’s title guide says it can replace a title that does not match the prominent heading, and that boilerplate titles shared by several pages are a problem.

## Competitor page fetched

CaratLane `/gold-coins.html`, 13 November 2026. Title names gold coins, 22K, 24kt, online, and India. H1 is “Gold Coins”. Description lists gram weights. The HTML contains the buying copy. Canonical is that URL.

## Tasks

1. Stop the shared `document.title` write. This URL’s title and H1 are “Gold coins”, brand once in the title. That removes the duplicate-title case Google documents.
2. Description and intro from the gold rows only: each purity and each weight in grams that is published. If the rows are not all 22K, do not put “22K” in the title. CaratLane can, because their title matches their catalogue. An inaccurate karat is the “inaccurate title” case in Google’s title guide.
3. First HTML includes the H1, the weight list, and `href`s to each gold coin. JavaScript SEO guide.
4. Canonical is `/coins/gold` with no `price` or `sort`. Google URL guide.
5. Breadcrumb: Home / Coins / Gold coins. Then BreadcrumbList. Google breadcrumb guide. The trail should match the path a buyer walks, not a keyword variant.
6. No state-wise rate table. CaratLane’s separate `/gold-rate` page has states. This page does not have per-state rates in the database. Do not invent them.
7. No FAQPage schema. Same Google changelog as the other coin files. A visible “what changes the price” answer is in scope only if it restates the shop’s own price lines: metal rate, making, GST. Those lines exist in the pricing engine. They are not on this page today.

## URL

Keep `/coins/gold`. It is already lowercase words separated by a slash. Google’s URL guide prefers words over IDs and hyphens between words. This path has no jammed words and no ID. Renaming to `/gold-coins-online-india` is keyword stuffing, which the title guide warns against, and would need a 301. Not in scope.
