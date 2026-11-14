# Veyora Jewels – Catalogue Architecture & Transformation Audit

**Date:** November 14, 2026  
**Document:** `docs/catalogue-audit.md`  

---

## 1. Existing Catalogue State

### 1.1 Summary of Current Assets in Database
A database inspection conducted on November 14, 2026 revealed the following inventory:
- **Jewellery Products:** 107 total rows (100 preview collection products in `seeders/data/products-100.json` + 7 initial demo pieces).
  - All 100 preview products are **exclusively pearl-focused** ("Aurelia Sunburst Pearl Ring", "Solenne Twist Pearl Ring", "Lune Pearl Drops", etc.).
  - Category distribution is restricted to only 4 categories:
    - Rings: 25 pieces
    - Earrings: 30 pieces
    - Necklaces: 25 pieces
    - Bracelets: 20 pieces
  - Missing essential Indian categories: **Mangalsutras, Bangles & Kada, Maang Tikka & Nath, Anklets & Payal, Complete Jewellery Sets**.
  - Missing Indian craftsmanship diversity: Kundan, Polki, Meenakari, Temple craft, Filigree, Jadau, Nakshi are currently represented only as occasional adjectives in description text rather than actual products and database entities.
- **Bullion & Numismatic Coins:** 6 total coin products (`COIN-AU-1G`, `COIN-AU-5G`, `COIN-AU-10G`, `COIN-AG-10G`, `COIN-AG-50G`, `COIN-AG-100G`).
- **Chicken Curry Kurtas:** 20 styles with 3 colour variants each across 7 sizes (420 SKU rows).

---

## 2. Target Catalogue Architecture

### 2.1 100 Unique Indian Fine Jewellery Pieces
The transformed catalogue replaces the narrow pearl-only line with 100 distinct, culturally rich Indian jewellery masterpieces across 9 major categories:

| Category | Target Count | Key Styles & Traditions |
|---|---:|---|
| **Necklaces** | 20 | Traditional Gold Necklaces, Kundan Chokers, Polki Collars, Temple Jewellery Necklaces, Meenakari Haar, Antique Finish Rani Haar, Layered Pearl & Gold Harams, Minimalist Gemstone Pendants, Contemporary Statement Necklaces. |
| **Mangalsutra** | 12 | Traditional Black-Bead Double Chain, Maharashtrian Vati Mangalsutra, Short Daily Wear Diamond/Gold, Long Bridal Mangalsutra, Minimal Geometric Solitaire, Contemporary Floral Pendant, Gold & Black Bead Combo. |
| **Earrings** | 18 | Traditional Jhumkas, Chandbalis, Kundan Drops, Polki Studs, Temple Ear Hangings, Antique Gold Hoops, Oxidised Silver Danglers, Meenakari Floral Ear Studs, Pearl Drops, Contemporary Daily-Wear Hoops. |
| **Rings** | 12 | Traditional Gold Bands, Kundan Cocktail Rings, Adjustable Meenakari Rings, Gemstone Navratna Rings, Polki Floral Rings, Minimal Solitaire Bands, Statement Antique Rings. |
| **Bracelets** | 10 | Sculptural Gold Cuffs, Kundan Station Bracelets, Contemporary Diamond Tennis Style, Antique Floral Linked Bracelets, Oxidised Silver Tribal Cuffs. |
| **Bangles and Kada** | 10 | Traditional Solid Gold Bangles, Temple Nakshi Kada, Kundan Openable Bangles, Filigree Royal Bangles, Antique Matte Finish Kada Pairs. |
| **Maang Tikka and Nath** | 6 | Kundan Maang Tikka, Pearl Matha Patti, Traditional Maharashtrian Nath, Polki Bridal Tikka, Rajasthani Borla, Delicate Clip-on Nose Rings. |
| **Anklets and Payal** | 5 | 925 Sterling Silver Payal, Antique Oxidised Silver Anklets, Traditional Ghungroo Payal, Delicate Minimalist Gold-Toned Anklets, Bridal Multi-Strand Payal. |
| **Jewellery Sets** | 7 | Complete Kundan Bridal Necklace & Earring Set, Temple Heritage Choker & Jhumka Set, Royal Polki Celebration Set, Antique Gold Necklace Set with Bangles, Pastel Meenakari Festive Set. |
| **Total Jewellery** | **100** | **Comprehensive Indian Heritage & Modern Luxury** |

---

### 2.2 50 Unique Kurta Designs × 5 Colour Variants (250 Variants)
The ethnic wear module will be expanded from 20 styles to **50 unique kurta designs**, with **5 colour variants per design** (250 distinct colour variants).
- **Design Diversity:** Every design features a unique silhouette, neckline, sleeve style, fabric, embroidery technique, and length:
  1. Royal Anarkali
  2. Classic Straight Cut
  3. Flared A-Line
  4. Royal Angrakha
  5. Lucknowi Chikankari
  6. Heavy Zari Festive
  7. Banarasi Katan Silk
  8. Traditional Bandhani
  9. Kalamkari Artisan
  10. Hand Block Print
  11. Chanderi Foil Print
  12. Sheer Mirror Work
  13. Gota Patti Festive
  14. Chanderi Cotton Daily
  15. Pure Cotton Daily Wear
  16. Tissue Silk Wedding
  17. Embroidered Festive Tunic
  18. Pakistani Silhouette Long Kurta
  19. Asymmetric Hem Kurta
  20. Indo-Western Cowl Kurta
  21. Embroidered Kaftan
  22. Overlay Jacket Kurta
  23. Kalidar Flared Kurta
  24. High-Low Festive Kurta
  25. Sharara Cut Kurta
  26. Palazzo Peplum Set
  27. Dhoti Silhouette Kurta
  28. Panelled A-Line Kurta
  29. Tiered Ruffled Kurta
  30. Handloom Khadi Cotton
  31. Ajrakh Indigo Kurta
  32. Dabu Mud-Resist Print
  33. Rajasthani Leheriya
  34. Patola Silk Inspired
  35. Kalamkari Yoke Kurta
  36. Intricate Embroidered Yoke
  37. Antique Zari Threadwork
  38. Subtle Sequin Evening Kurta
  39. Royal Velvet Winter Kurta
  40. Breathable Linen Everyday
  41. Jamdani Weave Kurta
  42. Kashmiri Tilla Inspired
  43. Floral Sanganeri Cotton
  44. Minimalist Collar Everyday
  45. Grand Festive Tussar Kurta
  46. Short Peplum Kurti
  47. Floor-Length Ethnic Gown
  48. Mandarin Collar Silk Kurta
  49. Deep V-Neck Embroidered Kurta
  50. Contemporary Designer Fusion Kurta
- **Model Identity Rule:** Exactly 50 unique Indian adult female models (varying skin tones, hair textures, facial features, body proportions).
- **Consistency Rule:** All 5 colours of a specific kurta design feature the exact same model identity, poses, and setting, with accurate garment hue rendering.

---

### 2.3 20 Unique Bullion & Numismatic Coins
The coins collection expands from 6 to **20 unique coins**:
1. 24K Pure Gold Lakshmi Coin (1g)
2. 24K Pure Gold Lakshmi Coin (2g)
3. 24K Pure Gold Lakshmi Ganesh Coin (5g)
4. 24K Pure Gold Lakshmi Ganesh Coin (10g)
5. 24K Pure Gold Royal Emblem Coin (10g)
6. 24K Pure Gold Royal Emblem Coin (20g)
7. 24K Pure Gold Om Vedic Coin (5g)
8. 24K Pure Gold Floral Kalash Coin (10g)
9. 24K Pure Gold Ganesha Blessings Coin (5g)
10. 24K Pure Gold Banyan Tree of Life Coin (10g)
11. 999 Fine Silver Floral Coin (10g)
12. 999 Fine Silver Floral Coin (20g)
13. 999 Fine Silver Lakshmi Ganesh Coin (50g)
14. 999 Fine Silver Lakshmi Ganesh Coin (100g)
15. 999 Fine Silver Cast Bullion Bar (100g)
16. 999 Fine Silver Cast Bullion Bar (250g)
17. 999 Fine Silver Saraswati Wisdom Coin (20g)
18. 999 Fine Silver Traditional Kalash Coin (50g)
19. 999 Fine Silver Wedding Shagun Coin (25g)
20. 999 Fine Silver Peacock Medallion (50g)

*Strict Photography Rule:* All coins are captured with macro isolated studio photography, relief close-ups, and assay packaging. **Never include a human model in coin imagery.**

---

## 3. Independent Material, Craftsmanship & Finish Master Data

To ensure structural integrity and prevent base-metal misrepresentation:
- **Materials:** Gold, Silver, Oxidised Silver, Pearl, Gemstones, Diamond, Brass, Alloy, Black Beads, Mixed Materials.
- **Craftsmanship:** Kundan, Polki, Meenakari, Temple Craft, Filigree, Jadau, Nakshi, Handcrafted, Stone Setting, Traditional Engraving, Antique Craft.
- **Finishes:** Polished Gold, Antique Gold Finish, Rose Gold Finish, Rhodium Finish, Oxidised Finish, Matte Finish, High Polish, Silver Finish, Gold Plated.
- **Collections:** Gold Collection, Silver Collection, Bridal Collection, Festive Edit, Everyday Elegance, Traditional Heritage.

Every product maps to its primary material, additional materials, craftsmanship techniques, and finishes via normalized join tables.
