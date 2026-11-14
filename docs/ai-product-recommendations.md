# AI Product Recommendations Architecture

## 1. Overview & Business Objective
On the Product Detail Page (PDP), Veyora Jewels delivers contextual, hyper-relevant merchandising via an intelligent 3-shelf recommendation layout:
1. **Shelf 1: "Similar Pieces"**: Direct substitutes within the same category, metal, and aesthetic family for customers seeking design variations.
2. **Shelf 2: "You May Also Adore"**: Aspirational discoveries across adjacent price brackets and related collections (e.g. browsing a gold necklace suggests statement earrings or pearl rings).
3. **Shelf 3: "Complete the Look"**: Cross-category styling ensemble recommendations (e.g. pairing a Lucknowi Kurta with heritage silver earrings, or pairing a bridal choker with matching maang tikka and bangles).

---

## 2. Recommendation Engine Scoring Algorithm

The recommendation engine calculates a normalized multi-factor similarity score $S(A, B) \in [0, 1]$ between the currently viewed product $A$ and candidate product $B$:

$$S(A, B) = w_{\text{cat}} \cdot M_{\text{cat}} + w_{\text{mat}} \cdot M_{\text{mat}} + w_{\text{craft}} \cdot M_{\text{craft}} + w_{\text{col}} \cdot M_{\text{col}} + w_{\text{price}} \cdot P(A, B)$$

Where:
- $M_{\text{cat}}$: Category match indicator ($1.0$ if same category, $0.0$ if different).
- $M_{\text{mat}}$: Jaccard similarity of associated precious materials ($\frac{|M_A \cap M_B|}{|M_A \cup M_B|}$).
- $M_{\text{craft}}$: Jaccard similarity of shared craftsmanship techniques.
- $M_{\text{col}}$: Collection overlap score ($1.0$ if sharing primary collection).
- $P(A, B)$: Gaussian price proximity penalty $e^{-\frac{(P_A - P_B)^2}{2\sigma^2}}$.

### 2.1 Shelf-Specific Filtering Rules
- **Similar Pieces**: Restricted to same primary category or subcategory, sorted by $S(A, B)$ descending, excluding current product code.
- **You May Also Adore**: Prioritizes shared material and collection, allows different categories, price within 0.7x to 1.5x of current product.
- **Complete the Look**: Explicitly excludes current category and promotes complementary categories:
  - Necklaces $\rightarrow$ Earrings, Bangles, Maang Tikka.
  - Rings $\rightarrow$ Bracelets, Pendants.
  - Chicken Curry Kurtas $\rightarrow$ Oxidized Silver Earrings, Silver Anklets, Pearl Jewellery.

---

## 3. High-Performance In-Memory Cache (15-Minute TTL)
- **Endpoint**: `GET /api/products/:slug/recommendations`
- **Cache Strategy**: In-memory LRU map keyed by product slug.
- **TTL**: 15 minutes (900,000 ms).
- **Catalogue Invalidation**: In-memory cache is purged automatically on catalogue updates, imports, or gold rate recalculations.
- **Database Fallback**: If external AI completion or scoring service is unreachable or errors, the server gracefully falls back to SQL relational category/material queries, guaranteeing zero PDP UI breakage.

---

## 4. Admin Management (`RecommendationsAdmin`)
Located within `/admin/settings`:
- Live weight adjustment sliders for Category, Material, Craftsmanship, and Price.
- Live preview of recommendation outputs for any product SKU.
- One-click cache flush button.
