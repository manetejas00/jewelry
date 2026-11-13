# Collection `/collections/all`

Sources: [00-sources.md](00-sources.md).

## What this page is now

Route: `Collection` with `category=all` (`src/main.jsx`).

Server title, from `server/seo.js`: “All jewellery | Veyora Jewels”. Server description is the global sentence, not a description of this collection.

Client title, set in JavaScript: “All jewellery | Veyora Jewels”, or “Search: …” when `?q=` is present.

Visible H1: “The jewellery collection”. Intro sentence: “Considered pieces. Quiet statements. Endlessly you.”

Filters and sort are query parameters: `q`, `purity`, `stock`, `price`, `sort`. Each combination is a different URL of the same collection.

The first HTML of inner pages on the live host is still an empty root. Head tags exist only when Express renders the document. The live homepage file does not.

## What close competitors put on a catalogue page

Fetched 13 November 2026:

- CaratLane `/gold-coins.html`: title names the product, the karats, “online”, and “India”. H1 is the short name “Gold Coins”. The description lists weights. Thousands of characters of buying text are in the HTML, including an FAQ heading. Schema types found: Organization, ContactPoint.
- WHP `/collections/22k-gold-jewellery`: title and H1 both say 22K gold jewellery. The title adds “Online” and “BIS Hallmarked”. That hallmark phrase is true of their collection page, not of ours.
- Melorra `/jewellery/`: title and H1 are different sentences, both about gold and diamond jewellery. Schema types found include BreadcrumbList, ItemList, Product, and Offer. The HTML text is about 40,000 characters.

## Tasks

1. First HTML for this URL: its own title, its own meta description, canonical without query parameters, and `noindex` while the shop is in preview. Google’s snippet guide says aggregation pages get a site-level or section-level description, and each page’s description should describe that page. The current server description is the same sentence used off the product page (`server/seo.js`).
2. Make the H1 and the `<title>` agree. Today the H1 is “The jewellery collection” and the title is “All jewellery”. Google’s title guide says it may replace a title that does not match the prominent heading. Use one plain name, for example the words already in the title, “All jewellery”, and put the brand once at the end of the title. Do not add “online India best price” repeatedly.
3. Put a short paragraph in the first HTML that states what the grid contains, using only stored fields: jewellery categories that exist (rings, earrings, necklaces, bracelets, pearls) and that coins live under `/coins`. The poetic sentence does not name a category. Competitors’ fetched catalogue pages name the metal, karat, or product type in the HTML.
4. Canonical of `/collections/all?q=`, `?purity=`, `?price=`, `?stock=`, and `?sort=` must be `/collections/all`, or those URLs must be disallowed. Google’s URL guide lists shopping sort parameters and combined filters as crawl problems, and says to block those URLs in `robots.txt`. Do not create a separate indexable URL per purity until a page exists whose products are all that purity.
5. Visible breadcrumb: Home, then this collection. BreadcrumbList markup only after the visible trail exists. Google’s breadcrumb guide says the trail should be a typical user path, markup is eligible only when the page can be crawled, and Google does not promise the rich result.
6. Do not add ItemList markup only because Melorra has it. That type was observed. The carousel requirements were not fetched, so it is not a task yet.
7. Internal links in the first HTML to each product URL in the collection. Google discovers `href`s from the response. An empty root has none.

## URL

Keep `/collections/all`. It is already lowercase words. Do not rename it to a keyword string. Google’s URL guide asks for readable words, which this path has. A 301 is required only if the path changes (redirect guide).
