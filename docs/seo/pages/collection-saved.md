# Saved pieces `/collections/saved`

Sources: [00-sources.md](00-sources.md).

## What this page is now

`server/seo.js` sets `indexable` false for this path. Title: “Your saved pieces | Veyora Jewels”.

The collection H1 for `saved` is “Your saved pieces”. The grid is the signed-in visitor’s saved product codes. It is not a public catalogue.

## Tasks

1. Keep `noindex` in the first HTML. Google’s JavaScript guide: if the original HTML says `noindex`, do not try to remove it with JavaScript.
2. Leave it out of the sitemap. A `noindex` URL does not need to be submitted.
3. Do not give it a keyword URL. There is no public query this page answers.

## URL

Keep `/collections/saved`. No redirect.
