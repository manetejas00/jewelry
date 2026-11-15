# Dynamic categories

The homepage category grid is supplied by `GET /api/categories`. It contains active top-level records, ordered by `sort_order`; every record has its active nested children in `children`.

Migration `030_dynamic_category_hierarchy` safely extends the existing `categories` table with `parent_id` and `route_path`. It does not alter IDs, existing product rows, names, or status. Existing Kurta and Coins records preserve `/kurtas` and `/coins`; all other existing categories receive `/collections/:slug`.

Administrators manage the hierarchy, status, display order, images, copy, SEO, and relative storefront URL in Categories. A category cannot be deleted while products or child categories are attached.
