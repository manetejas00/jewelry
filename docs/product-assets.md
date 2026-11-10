# Product image assets

Each catalogue identity uses four separate WebP images: `front.webp`, `left.webp`, `right.webp`, and `model.webp`. Jewellery model images show an adult wearing the piece; coin model images show the bullion held in a hand. These are generated catalogue illustrations based on the existing product artwork.

Jewellery lives under `public/assets/products/<product_code>/`; coins live under `public/assets/coins/<lowercase-sku>/`. `hero.webp` supplies the primary catalogue view and `modal.webp` retains the macro detail image. The model and macro images have separate gallery records: `model` and `detail`. The legacy `modal` gallery role is no longer created, and a missing model photo is never filled with a detail photo.

Run `npm run assets:recreate` after replacing image files to rebuild outdated or missing previews and refresh gallery records. This command registers existing artwork; it does not call an image generation service. Run `npm run assets:check` to verify the four required views, valid image files, thumbnail presence, gallery links, and duplicate detection.

The full-resolution originals remain in Codex's generated image directory. Local generation manifests are in `artifacts/product-assets/`. Product and coin image directories are excluded by the existing Git ignore rules; include the generated public assets when packaging or deploying the storefront.

## Live test3 publication — 10 November 2026

The destination is https://test3.avinyacarefoundation.org. Images were published using its existing authenticated image-upload and gallery-assignment APIs. All 106 jewellery styles and six coins have front, left, right, and model views; coins use hand-held scale views. Separate main-photo uploads keep all five admin slots visible. Commercial fields were checked against the pre-publication snapshot and were unchanged.

Local private publication snapshots, uploaded URLs, and verification reports are under `private/test3-image-publish/`. The live uploaded URLs differ from the local asset paths. `assets:recreate` replaces gallery assignments using local folders; it is not the live upload workflow.

The test3 detail-thumbnail repair replaces legacy `modal` links with uploaded `detail` images and generated thumbnails. Model images are ordered before details, and both original files and thumbnails are verified independently. The repair reports are in `private/test3-image-publish/detail-fix-verification.json`.
