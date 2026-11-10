# Automatic hero thumbnails

Hero/main-photo uploads now create an optimized WebP thumbnail on the server automatically. Single uploads, optional angle uploads and bulk uploads share the same processing. No separate thumbnail upload or form field is needed.

- Original: unchanged upload bytes, still used by the product detail/lightbox.
- Thumbnail: up to 600×800, fit inside without cropping or enlargement; EXIF orientation corrected; WebP quality 82, transparency retained. GIF thumbnails use the first frame.
- Storage: `/uploads/thumbs/<original-filename>.webp`; API upload responses include `thumbnail` alongside the original `url`.
- Existing local uploads: generated and cached when their thumbnail is first requested. Repeated requests reuse it. Listing cards use cached derivatives for the existing catalogue CDN and local assets. Same-origin upload URLs are recognized. Unsupported remote sources use the neutral image fallback; original URLs remain available for product details.
- Existing pre-generated catalogue and coin thumbnails retain their current paths. No database migration or catalogue changes are needed.

The server uses Sharp for actual image decoding/resizing. Invalid images are rejected before creating files. Processing is serialized to keep memory use bounded, and legacy thumbnail work is deduplicated. Generated cache files are excluded from Git.

Verification covers original-byte preservation, portrait/landscape proportions, no enlargement, transparency, phone orientation, legacy generation/reuse, unsafe file names and invalid-image rejection. Single and bulk upload HTTP checks returned thumbnails successfully; the sample hero was 174,726 bytes and its 600×750 thumbnail was 36,616 bytes. The real photo chooser displayed the generated thumbnail; the edit was cancelled to preserve catalogue data.


Listing cards share viewport-aware thumbnail loading with explicit dimensions and a neutral fallback. Thumbnail generation queues normal grid bursts instead of rejecting images after eight or sixteen concurrent requests. CDN generation runs at most four jobs at a time, deduplicates identical work, and refreshes a single cache file per source daily. Product detail and lightbox image handling is unchanged.

The thumbnail work is isolated from concurrent UI/performance edits in the shared workspace. The deployed update includes only upload processing, thumbnail delivery, image-path selection and their dependency/tests.
