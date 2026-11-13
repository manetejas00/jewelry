# Contact `/information/contact`

Sources: [00-sources.md](00-sources.md).

## What this page is now

Server title: “Contact | Veyora Jewels”.

H1: “Get in touch”.

The page shows the contact email only when it does not end in `.local` or `.invalid`. Live config email is `contact@veyora.local`, so the visible sentence is that the merchant’s contact details will appear later and the store is a preview.

CaratLane’s fetched JSON-LD includes ContactPoint. Bhima’s fetched page shows a street address, phones, and an email. Those are their facts.

## Tasks

1. Do not publish ContactPoint, a phone, or an address until the merchant supplies them. Google’s structured-data rules require the markup to match the visible page. The visible page currently says the details are not supplied.
2. Title and H1 should match. “Contact” and “Get in touch” are close but not the same string. Pick one and use it in both.
3. When a real email exists, put it in the first HTML as a `mailto:` link, and add it to the Organization object already planned for the home page. That is the field `server/seo.js` already supports (`MERCHANT_EMAIL`).
4. `noindex` while the email is `.local` and preview is on. Indexing a page that says “preview” is the inaccurate-page case.

## URL

Keep `/information/contact`.
