# Collection `/collections/pearls`

Sources: [00-sources.md](00-sources.md).

## What this page is now

Same `Collection` component as the other categories.

Server title: “The Pearl Edit | Veyora Jewels”. Client title matches that when there is no `?q=`.

Visible H1: “The Pearl Edit”. The intro line is the same poetic sentence used on every category. It does not say these are pearl jewellery. The H1 is a campaign name. It does not say “jewellery”.

## What close competitors do

WHP’s fetched collection URL is `/collections/22k-gold-jewellery`. The H1 repeats the thing the URL names: “22K Gold Jewellery”. CaratLane’s fetched coin URL’s H1 is “Gold Coins”, and the title adds the qualifiers that are true of that grid (22K, 24kt, online, India).

None of the fetched competitors use a campaign name as the only H1.

## Tasks

1. Unique title and description in the first HTML. Description must describe this grid: pearl jewellery in the categories actually published, and only metals and purities present on those products. Google’s snippet guide allows a generated description when it is built from page-specific data and is not a keyword string.
2. H1 must include “pearl” and the product type, because that is what the collection is. “The Pearl Edit” can stay as an eyebrow. Google uses the prominent H1 as a title source. A campaign name that omits the product type is the same class of problem as Google’s “inaccurate title” example: the title does not say what the page is.
3. Do not add “BIS”, “certified”, or a pearl grade. Those strings are not on the product records. WHP’s title includes “BIS Hallmarked” because that is their claim. Copying it would make our title inaccurate, which Google says it may rewrite.
4. Same filter rule as `/collections/all`: `?q=`, `?purity=`, `?price=`, `?stock=`, `?sort=` are not separate indexable pages. Google’s URL guide.
5. First-HTML links to the pearl products and to `/collections/rings`, `/collections/earrings`, `/collections/necklaces`, and `/collections/bracelets` only where those collections contain pearl pieces, or as ordinary navigation. Do not invent a pearl-type facet (freshwater, South Sea) that is not a stored field.

## URL

Keep `/collections/pearls`. “pearls” is a readable word, which is what Google’s URL guide asks for. Do not expand it to `/collections/pearl-jewellery-online-india`. That would repeat keywords the title guide says not to stuff, and a path change requires a 301 for no gain the URL guide describes.

If a later collection is only one purity, that can be its own path, as WHP did for 22K, only after the product rows are all that purity. This collection is not that page.
