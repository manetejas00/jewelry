# Delivery `/information/shipping`

Sources: [00-sources.md](00-sources.md).

## What this page is now

Server title: “Shipping information | Veyora Jewels”. Description is the global sentence.

Visible H1: “Delivery & returns”. The body prints `config.shippingPolicy` and `config.returnsPolicy`.

Live config on 13 November 2026: shipping “Insured shipping across India within 3-5 business days.” Returns “7-day hassle-free returns on unworn pieces with security tag intact.” Contact is still `contact@veyora.local`, preview is on, checkout is off.

`/information/returns` is a different route with a different server title, but this component has no `returns` branch. Any unknown information id, including `returns`, uses the H1 “Get in touch”.

## Competitor pattern

Bhima’s fetched product HTML includes a delivery block (dispatch timing, payment before ship) and a returns answer. CaratLane’s fetched pages did not include a separate policy URL in the sample. The useful, supported piece is: the policy text is in the HTML, and it matches what the seller will do.

Google’s product intro says a shop-wide return policy should be marked up on Organization, not copied onto every offer, when the policy is the same for the shop. The return-policy field list was not fetched, so the task is to put the true policy in HTML first and add Organization return markup only from that document at implementation time.

## Tasks

1. Title and H1 both “Delivery and returns”. The server title says “Shipping information” and the H1 says “Delivery & returns”. Google’s title guide: mismatched title and heading.
2. Meta description is this policy, not the jewellery tagline. Google’s snippet guide: the description has to summarize the page.
3. First HTML contains the two policy sentences. They already exist in config. Do not add COD, pin codes, or city delivery times that are not in that config. Bhima states dispatch days because that is their policy.
4. `noindex` while preview is on. A policy page that can be indexed before the shop can sell is the same preview problem as the product pages.
5. When the merchant confirms the sentences, add shop-wide shipping and return markup on Organization using Google’s organization return and shipping documents. Those two documents were not the ones fetched for this file. Do not invent the property names in code before reading them.
6. Link to `/information/returns` only after that URL has its own H1 and body. Today it does not.

## URL

Keep `/information/shipping`. Readable words. A clearer path would be `/information/delivery-and-returns` only with a 301 from this path. That rename is optional. Google does not require it. The heading fix is the supported change.
