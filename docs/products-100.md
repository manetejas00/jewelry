# 100-product collection

The collection adds exactly 100 new product styles: 25 Rings, 25 Earrings, 25 Necklaces and 25 Bracelets. Existing jewellery, coins, customer accounts, orders, pricing rules and merchant uploads are preserved. The existing six jewellery styles therefore remain alongside the 100 additions (106 styles / 107 variant rows on the current test3 database).

## Files and commands

- `seeders/ProductSeeder.js`: dedicated transactional, repeat-safe seeder.
- `seeders/DatabaseSeeder.js`: explicit main catalogue registration; no change to web-server startup.
- `seeders/data/products-100.json`: all 100 records, specifications, searchable style tags and individual image briefs.
- `public/assets/products-100/`: full-quality WebP images and smaller card thumbnails.

Run against the database configured in the existing environment:

```sh
npm run migrate
npm run seed:products
# Or run the registered catalogue seeder:
npm run seed:catalogue
```

These commands do not wipe or recreate tables. A fresh run inserts 100 records; the next run reports 0 inserted / 100 existing. Subsequent runs preserve merchant edits and purchased stock. Identity collisions, missing images and invalid data abort the transaction. Existing product, supplier_skus and product_images relationships are reused. Style tags are retained in the JSON source and searchable description because this project has no separate tag table.

## Image provenance

Each product has a separate AI-generated catalogue illustration based on its own `image_subject`. Images are illustrative product designs, not manufacturer photography or a verified saleable inventory. Materials, weights, specifications, stock and prices are preview data awaiting merchant confirmation. Descriptions state this explicitly.

Built-in image generation was used, with one request per product. Common prompt: portrait 4:5 photorealistic jewellery catalogue illustration; the exact product subject and material from the data file; complete item centred with all edges in frame and 15% breathing room; ivory limestone, a subtle midnight-blue velvet fold at the distant edge and restrained champagne highlights; soft diffused macro studio lighting; no people, hands, packaging, text, logos, watermark or extra jewellery. Earrings show a matching pair. Optimized WebP delivery files retain the image proportions; originals remain in Codex generated_images.

## Zoom and listing

The existing cards are retained. Image buttons open the reused lightbox; product-name links still open details. Desktop hover is 1.08 with smooth easing and clipped overflow. Full-screen images use contain sizing and preserve aspect ratio, with 100–500% controls, wheel, pinch and drag handling, previous/next gallery navigation, Escape, focus return and background scroll locking. Reduced-motion preferences are respected. Listings show 24 cards initially and use the existing button styling for Load more.

## Verification scope

Local automated checks cover 100 unique identities, positive prices, all image files and hashes, all supplier/image relationships, a second idempotent run, preservation of sold stock/merchant edits, collision rollback and invalid-data rejection. Zoom mathematics is tested for anchored wheel scaling, pinch scaling/translation, aspect-ratio bounds and pan limits. Browser checks cover hover scale, click, controls, gallery navigation, Escape, focus return, scroll lock, search, filters, sorting and Load more. Physical touch-device pinch and native pointer/wheel gestures require a real device test; automated gesture calculations are not a substitute for that test.
