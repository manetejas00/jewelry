# Common PLP & PDP Implementation Specification

## Overview
This document defines the unified, reusable architecture for Product Listing Pages (PLP) and Product Detail Pages (PDP) across all categories in the Veyora storefront, including Jewellery Collections (`/collections/:category`), Coins (`/coins`), and Chicken Curry Kurtas (`/kurtas`).

## Architecture Principles
1. **DRY & Unified Experience**: All category listings and product details share a single design language, layout structure, interaction model, and responsive breakpoints.
2. **Category Agnostic Components**:
   - `CommonPLP.jsx`: Renders collection headers, active category tabs, price bracket filter pills, responsive filter drawers/toolbars, clean product grids, infinite scrolling/load more, and graceful empty/error states.
   - `CommonPDP.jsx`: Renders breadcrumbs, `ProductMagicZoom` multi-angle galleries, ratings, price with discount breakdown, live gold/metal linked badges, interactive colour swatches, dynamic size selectors, stock status, add to bag, wishlist, and specifications accordions.
3. **Pluggable Domain Logic**:
   - Kurta modules pass XS–XXXL sizes and multi-colour swatches.
   - Coins modules pass weight-based variant selectors and bullion trust banners.
   - Jewellery collections pass ring sizing or standard dimensions.

## Component Specifications

### 1. CommonPLP (`src/components/CommonPLP.jsx`)
- **Props**:
  - `title`, `eyebrow`, `description`: Header branding text.
  - `tabs`: Array of `{ label, href, active }` navigation tabs.
  - `priceBrackets`: Array of `{ label, value }` price filter pills.
  - `activePrice`, `onPriceChange`: Current price filter state.
  - `items`: Filtered product list.
  - `loading`, `error`, `onRetry`: State indicators.
  - `facets`: Category-specific filter options (e.g. fabric, purity, metal).
  - `ProductCardComponent`: High-performance card renderer with image switching.

### 2. CommonPDP (`src/components/CommonPDP.jsx`)
- **Props**:
  - `product`: Active selected SKU entity.
  - `variants`: Size variants within the active colour/style.
  - `allVariants`: Full list of variants across all colours.
  - `colors`: Array of `{ name, code, hex, image }` colour swatches.
  - `selectedColor`, `onColorSelect`: Colour swatch state.
  - `selectedSku`, `onSkuSelect`: Size variant selection state.
  - `images`: Array of multi-angle photos for `ProductMagicZoom`.
  - `sizeType`: `'kurta'` | `'coin'` | `'ring'` | `'standard'`.
  - `priceDetailsNode`: Custom accordion for gold/metal breakdown or fixed pricing.
