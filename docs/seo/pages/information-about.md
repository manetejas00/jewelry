# About `/information/about`

Sources: [00-sources.md](00-sources.md).

## What this page is now

Server title: “About Veyora | Veyora Jewels”. The URL is in the sitemap.

`Information` has no `about` branch. The H1 is “Get in touch” and the body is the contact fallback. There is no about article in the first HTML or in the component.

## Tasks

1. Do not index this URL until it has its own visible article. A title that says “About” and a heading that says “Get in touch” is the inaccurate-title case in Google’s title guide.
2. The article may only state facts already true in the project: the shop name is Veyora Jewels, it sells jewellery and gold and silver coins, prices are INR, and orders are for India. Do not add a founding year, a city, a workshop, or a BIS licence. None of those are in the live config or the product fields.
3. H1 “About Veyora Jewels”, matching the title, brand not repeated twice in the H1.
4. First HTML contains that article.
5. Until the article exists, remove the URL from the sitemap and `noindex` it, or `301` it to `/` if there is nothing to say. Google’s redirect guide allows a 301 when a page is removed. An empty about URL should not be submitted.

## URL

Keep `/information/about` only after the article exists. Do not create `/about-best-jewellery-india`.
