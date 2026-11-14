# Kurta Colour Variant Implementation Specification

## Database Schema & Migrations
Migration `migrations/021_kurta_colors_and_styles.js` added:
- `products.color`: Descriptive colour name (e.g., 'Ivory White', 'Blush Pink').
- `products.color_code`: Normalized URL/file slug (e.g., 'ivory', 'blush').
- `products.hex_color`: Hex code for UI swatches (e.g., '#FDFBF7', '#F4C2C2').
- `product_images.color`: Associative colour code linking multi-angle images to their respective colour variants.

## Storefront Interactions

### 1. Product Cards (PLP & Collections)
- Product cards check for `p.colors` (array of colour variants).
- Renders circular colour swatches (`.product-card-swatches`) below the product title.
- Hovering or clicking a swatch updates the card's active thumbnail to that colour's front/hero shot without navigating away.
- Clicking the card navigates directly to the selected colour variant.

### 2. Product Detail Page (PDP)
- Renders `.pdp-color-selector` with swatch pills and active shade label.
- Switching a colour dynamically updates:
  - Magic Zoom image gallery (switches to the selected colour's 12 photography angles).
  - Available size buttons (reflecting real-time inventory for that specific colour).
  - Selected SKU and URL query parameter (`?color=...`).
