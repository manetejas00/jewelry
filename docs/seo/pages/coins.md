# Coins `/coins`

Sources: [00-sources.md](00-sources.md).

## What this page is now

`CoinsPage` with no category (`src/main.jsx`).

Server title: “Gold & silver coins | Veyora Jewels”. Server description is the global sentence.

Client effect: `document.title` is set to “Gold & Silver Coins | Veyora Jewels” for this component on every category, including gold-only and silver-only.

Visible H1 is always “Gold & Silver Coins”, including on the gold and silver paths.

Intro: “Explore the gold and silver coin catalogue. Confirm the manufacturer, listed purity, packaging and supporting documentation with the merchant before ordering.”

Price and sort use `?price=` and `?sort=`.

## Competitor page fetched

CaratLane `https://www.caratlane.com/gold-coins.html` (13 November 2026):

- Title: “Gold Coins: Buy 22K & 24kt Gold Coins Online In India | CaratLane”.
- Description names 22K, 24K, 1 Gm, 2 Gm, 5 Gm, 10 Gm, Lakshmi.
- H1: “Gold Coins”.
- Buying text and an FAQ heading are in the HTML.
- Canonical is the page itself.

That page is a gold-coin page, not a mixed gold-and-silver page. The mixed page on this shop should not copy the 22K/24K title unless both purities are in this grid.

## Tasks

1. Title and H1 stay aligned and specific to the mixed catalogue: gold and silver coins. Brand once. Do not use CaratLane’s “22K & 24kt” title on this URL. Those karats are a claim about their grid. Our H1 may name 22K or 24K only for purities present on the published coins.
2. Replace the global meta description with one sentence built from the published coins: metals, purities, and weights that exist. Google’s snippet guide.
3. Put that sentence, the coin names, weights, and links in the first HTML. The live shell is an empty root. Google’s JavaScript guide.
4. Canonical without `price` or `sort`. Disallow those parameters in `robots.txt` when crawling is allowed. Google’s URL guide lists shopping sort URLs as a crawl problem.
5. The intro already tells the buyer to confirm manufacturer and documentation. Keep that. Do not replace it with “certified” or “hallmarked”. Those words are not in the coin records.
6. Visible links to `/coins/gold` and `/coins/silver`, already in the React tabs, must also be in the first HTML.
7. No FAQPage JSON-LD. CaratLane has FAQ text. Bhima has FAQPage markup. Google removed FAQ rich results on 7 May 2026 and removed the docs on 12 June 2026. Visible questions are allowed. The schema is not a supported Google feature for this shop.

## URL

Keep `/coins`. Readable word. Do not move it to `/gold-coins.html` just to resemble CaratLane. That path would be wrong for a page that also lists silver. A gold-only path already exists.
