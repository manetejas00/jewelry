# Unknown URL

Sources: [00-sources.md](00-sources.md).

## What this page is now

`server/seo.js` sets status 404, title “Page not found | Veyora Jewels”, and `indexable` false for unknown paths.

A live request to `/this-page-does-not-exist` on 13 November 2026 returned HTTP 404 and a canonical tag. The body is still the empty root, so the visible “This page is yet to be discovered.” heading appears only after JavaScript.

Google’s JavaScript guide: a non-200 response may skip rendering. The 404 status is the signal that matters. The guide also says a client-rendered “not found” that still returns 200 is a soft 404. This host returned 404 for the probe, which matches the guide.

## Tasks

1. Keep HTTP 404 and `noindex` in the first HTML.
2. Do not add a canonical that points the missing URL at itself as if it were a real page. The live 404 response included a canonical to the missing URL. Google’s canonical is for the preferred URL of a real page. A 404 does not need to declare itself canonical. Confirm against the canonical consolidation document before changing it; that document was not fetched in this pass, so the task is to check it and then stop emitting a self-canonical on 404s if that document agrees.
3. The visible heading can stay. It does not need a keyword title.

## URL

No new path.
