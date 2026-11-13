# Home `/`

Sources and the competitor table are in [00-sources.md](00-sources.md).

## What this page is now

Live HTML, 13 November 2026: static file, title “Veyora Jewels — Objects of quiet beauty”, description calls the shop a preview, no canonical, no JSON-LD, body is an empty root.

In the React app the first H1 is the rotating banner, not one stable sentence. The three banner H1s are “Quiet beauty. Lasting impressions.”, “Little details. Extraordinary days.”, and “A little light. A lasting connection.” (`src/HeroBanner.jsx`). The next heading is an H2, “Find your kind of beautiful.”

`server/seo.js` can emit a title, canonical, and a `JewelryStore` object for `/`, but the live homepage response did not contain those tags. LiteSpeed served the static file (no Express request id, 1,508 bytes). Inner URLs did go through Express.

`/api/config` on that host: preview, merchant not ready, checkout off, contact `contact@veyora.local`.

## What close competitors put on this kind of page

No competitor homepage was fetched in this pass. The closest fetched pages are category and rate pages, and they all put a stable H1 plus a long block of buying text in the first HTML. CaratLane’s gold-rate page H1 is “Gold Rate Today!” and the HTML includes the rate content and an Organization object. This shop’s home has neither a stable H1 nor rate text in the first HTML.

## Tasks

1. Serve `/` from the same renderer as the product URLs, so the first HTML contains the title, description, canonical, and robots tag. Google’s JavaScript guide says the canonical in the original HTML is the best place for it, and that an app shell forces a render before the content exists.
2. Keep `noindex` until preview is off and the contact email is a real merchant address. Google’s robots.txt guide says `Disallow` does not reliably drop a URL, and the JavaScript guide says `noindex` must be in the original HTML if rendering might be skipped. The live product URL already says `index,follow` while `robots.txt` says `Disallow: /`. The home file has no robots tag at all. Both must match the preview gate.
3. One stable H1 that states what the shop sells, in the same language as the page (English). Google’s title guide says the first prominent H1 is a title-link source, and a page with several equal headings has no clear main title. A rotating H1 gives Google a different main title on each render. Keep the three campaign lines as text that is not the H1.
4. Title pattern from Google’s title guide: a concise description of this page, brand once at the end. The current title is a tagline. It does not say jewellery, pearls, gold, silver, or coins. Do not pack “buy gold jewellery online India” in a repeated string. Google calls that stuffing.
5. Meta description from Google’s snippet guide: one shop-level summary on the home page only. Say jewellery and gold and silver coins, India, INR, only if those are still what the shop sells. Do not reuse this sentence on collection or product pages. Google’s bad example is the same description on every page.
6. `JewelryStore` or `Organization` only with facts the shop can show: name, URL, `areaServed` India, currency INR, and email once the email is not `.local`. Google’s product intro says return policy belongs on Organization when it is shop-wide. Do not invent a street address, phone, or `sameAs`. CaratLane’s fetched pages include Organization and ContactPoint; we do not have a ContactPoint to publish.
7. Links in the first HTML to `/collections/rings`, `/collections/earrings`, `/collections/necklaces`, `/collections/bracelets`, `/collections/pearls`, `/coins/gold`, and `/coins/silver`. Googlebot discovers URLs from `href` in the response, then again after render. The live home response has no `href`.

## URL

Leave the path as `/`. Google’s URL guide is about words versus opaque IDs. `/` is already the canonical home. Do not add a keyword path for the homepage. When the real domain exists, 301 this host’s `/` to that origin’s `/` (Google’s redirect guide: permanent server-side redirect when the site moves).
