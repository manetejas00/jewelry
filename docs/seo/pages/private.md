# Account, bag, checkout, order, admin

Sources: [00-sources.md](00-sources.md).

## What these pages are now

`server/seo.js` marks `/account`, `/admin`, `/bag`, `/checkout`, and `/order/...` as not indexable.

`robots.txt`, when the merchant is ready, already disallows `/api/`, `/admin`, `/account`, `/checkout`, `/bag`, and `/order/`.

While preview is on, the live `robots.txt` disallows everything.

## Tasks

1. Keep `noindex` in the first HTML on every one of these templates. Google’s JavaScript guide: do not put `noindex` only in JavaScript if the original HTML might be skipped, and do not remove an original `noindex` with JavaScript.
2. Keep them out of the sitemap.
3. Do not add category keywords to these paths. They are not catalogue pages. Google’s URL guide is about pages you want understood and crawled. These are pages you do not want in search.
4. `Disallow` in robots.txt is extra crawl control. It is not a substitute for `noindex`. Google’s robots.txt introduction says a disallowed URL can still be indexed from outside links, without a snippet.

## URL

Do not change these paths.
