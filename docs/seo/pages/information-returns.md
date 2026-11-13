# Returns `/information/returns`

Sources: [00-sources.md](00-sources.md).

## What this page is now

`server/seo.js` has a label, so the server title is “Returns information | Veyora Jewels” and the URL is treated as a real page.

`Information` in `src/main.jsx` does not have a `returns` branch. The H1 falls through to “Get in touch”. The visible copy is the contact paragraph, not the returns policy. The returns policy is rendered on `/information/shipping`.

The sitemap includes this URL.

## Tasks

1. Either give this URL its own H1 “Returns” and the returns policy sentence, or `301` it to `/information/shipping` and remove it from the sitemap. Google’s redirect guide covers a removed page: permanent server-side redirect to the page that has the content. Two URLs with the same policy and different titles are the boilerplate-title case.
2. Do not leave the current mismatch. The title says returns and the heading says contact. Google’s title guide lists inaccurate titles as a reason it rewrites the title link.
3. `noindex` while the shop is in preview, if the URL stays.

## URL

Preferred, because the policy is already on the shipping page: `301` `/information/returns` to `/information/shipping`. Do not invent `/returns-policy-india`.
