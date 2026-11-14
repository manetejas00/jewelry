# Product Combos & Curated Sets Implementation

## Overview
This document specifies the design, database architecture, pricing algorithms, inventory tracking, storefront display, and admin workflows for the **Product Combos & Curated Sets** system.

---

## 1. Architectural Strategy
Rather than hardcoding bundle items or duplicating product entities in the catalogue, Veyora's combo engine implements a relational, dynamic composite architecture:
- Dedicated `combos` table storing bundle identity, pricing, imagery, and marketing copy.
- Relational `combo_items` join table mapping component product SKUs and quantities.
- Dynamic pricing engine calculating live original price sums, bundle discounts, and savings.
- Inventory safety engine ensuring bundle availability reflects real-time component stock.

---

## 2. Seeded Curated Combos
Four flagship sets pairing authentic Chicken Curry Kurtas with matching Veyora fine cultured pearl and gold jewellery:

### 1. Awadh Splendour Set (`CMB-AWADH-01`)
- **Slug**: `/combos/awadh-splendour-ivory-kurta-lune-pearl-drops`
- **Kurta**: Noor-e-Awadh Ivory Mulmul Chikankari Kurta (`CCK-IVORY-M`) — ₹3,990
- **Jewellery**: 18K Gold Lune Pearl Drop Earrings (`VEY-LP-01`) — ₹23,500
- **Combined Original Price**: ₹27,490
- **Bundle Price**: ₹23,360
- **Bundle Savings**: ₹4,130 (15.02% Off)
- **Concept**: Quintessential royal Awadhi white-on-white needlework paired with radiant cultured freshwater pearls.

### 2. Gulzar Romance Set (`CMB-GULZAR-02`)
- **Slug**: `/combos/gulzar-romance-blush-pink-kurta-atelier-collar`
- **Kurta**: Gulzar Rose Blush Georgette Chikankari Kurta (`CCK-BLUSH-M`) — ₹5,490
- **Jewellery**: 22K Gold Atelier Ribbon Pearl Collar (`VEY-AC-01`) — ₹36,500
- **Combined Original Price**: ₹41,990
- **Bundle Price**: ₹35,690
- **Bundle Savings**: ₹6,300 (15.00% Off)
- **Concept**: Ethereal rose blush georgette paired with an architectural statement pearl ribbon collar.

### 3. Nazakat Grace Set (`CMB-NAZAKAT-03`)
- **Slug**: `/combos/nazakat-grace-sage-green-kurta-nocturne-cuff`
- **Kurta**: Nazakat Sage Green Chanderi Chikankari Kurta (`CCK-SAGE-M`) — ₹6,990
- **Jewellery**: 18K Gold Nocturne Pearl Open Cuff (`VEY-NC-01`) — ₹29,800
- **Combined Original Price**: ₹36,790
- **Bundle Price**: ₹31,270
- **Bundle Savings**: ₹5,520 (15.00% Off)
- **Concept**: Shimmering sage green Chanderi silk paired with a sculptural modern pearl cuff.

### 4. Jannat Regal Set (`CMB-JANNAT-04`)
- **Slug**: `/combos/jannat-regal-sky-blue-kurta-eclipse-ring`
- **Kurta**: Jannat Sky Blue Mulmul Chikankari Kurta (`CCK-SKY-M`) — ₹4,290
- **Jewellery**: 18K Gold Eclipse Pearl Ring (`VEY-ER-01`) — ₹14,900
- **Combined Original Price**: ₹19,190
- **Bundle Price**: ₹16,310
- **Bundle Savings**: ₹2,880 (15.01% Off)
- **Concept**: Breezy pastel sky blue cotton paired with an iconic everyday signature pearl ring.

---

## 3. Dynamic Pricing & Inventory Engine
Implemented in `server/combos.js`, `server/pricing.js`, and `server/orders.js`:

### Dynamic Component Pricing
```javascript
// Calculate live component sum
let calculatedOriginal = 0;
let minComponentStock = Infinity;

for (const c of comboComponents) {
  if (c.product) {
    calculatedOriginal += Number(c.product.price || 0) * (c.quantity || 1);
    minComponentStock = Math.min(
      minComponentStock,
      Math.floor((c.product.stock || 0) / (c.quantity || 1))
    );
  }
}

const originalPrice = calculatedOriginal > 0 ? calculatedOriginal : Number(combo.original_price);
const comboPrice = Number(combo.combo_price);
const savings = Math.max(0, originalPrice - comboPrice);
const discountPercent = originalPrice > 0 ? Number(((savings / originalPrice) * 100).toFixed(1)) : 0;
const effectiveStock = Math.max(0, Math.min(Number(combo.stock || 0), minComponentStock));
```

### Bag & Checkout Integration
1. **Bag Quoting (`quote` in `server/pricing.js`)**:
   - `comboCatalogue` is indexed alongside products and bullion coins.
   - Combos are priced using their approved `combo_price`.
   - Savings are calculated and tracked in bag line items.
2. **Order Placement (`checkout` in `server/orders.js`)**:
   - When an order contains a combo, the system validates component stock in real time.
   - Upon order confirmation, both the combo stock and the underlying component stocks (kurta variant and jewellery SKU) are atomically decremented in a Knex transaction.
   - If an order is cancelled, inventory is automatically restored.

---

## 4. Storefront Display
- **Dedicated Hub (`/combos`)**:
  - Grid of curated combo cards with savings pills (`SAVE ₹4,130 · 15% OFF`).
  - Bullet list of included pieces with individual retail valuations.
  - 1-click "Add Set to Bag" button with optimistic feedback.
- **Dedicated Combo PDP (`/combos/:slug`)**:
  - Multi-item photography with interactive zoom.
  - Included items showcase with thumbnail previews, titles, and links to component PDPs.
  - Gift box packaging and styling notes.
- **Cross-Merchandising on Product PDPs**:
  - When viewing an individual Kurta, a "Complete the Look" pairing card highlights the matching combo.
  - When viewing matching jewellery, the customer is invited to pair with the handcrafted Chikankari kurta with bundled savings.
