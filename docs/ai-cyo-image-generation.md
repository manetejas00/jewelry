# VEYORA JEWELS — AI Create Your Own (CYO) Image Generation Pipeline

## 1. Overview & Quality Objectives

The image generation engine (`server/cyo-images.js`) provides high-fidelity, photorealistic jewellery concept visualization tailored to authentic Indian fine jewellery aesthetics.

### Key Visual Standards:
- **True-to-Life Metals:** Accurate light reflectance, diffuse shading, specular highlights, and ambient occlusion for 22K/18K Gold, 925 Silver, Oxidised Silver, and Rose Gold.
- **Gemstone Refraction:** Deep color saturation, internal dispersion, facet beveling, and luster for Zambian Emeralds, Burmese Rubies, Blue Sapphires, Polki Uncut Diamonds, and Basra Cultured Pearls.
- **Traditional Craftsmanship Accents:** Enclosed Kundan/Jadau bezels, intricate Meenakari enameling, South-Indian temple relief carving, and Tarakasi wire filigree.
- **Consistent Multi-Angle Perspective:** Every generation produces a cohesive suite of 4 distinct viewpoints representing the exact same jewellery piece.

---

## 2. The 4 Mandatory View Angles

| View Type | Angle / Perspective | Purpose & Artisanal Focus |
|---|---|---|
| `front` | 0° Direct Frontal | Symmetrical studio catalogue view on neutral dark gradient. Shows total silhouette, collar curve, and centerpiece balance. |
| `side` | 45° Skew & Rotation | Dimensional profile showing relief depth, gallery elevation, clasp mechanics, shank thickness, and dome heights. |
| `detail` | 2.2x Macro Zoom | Close-up focus on the central gemstone, prong settings, micro-pave halos, and Kundan gold foil boundaries. |
| `showcase` | Editorial Offset Angle | Luxury editorial styling with directional spotlighting and ambient silk drape vignette. |

---

## 3. High-Definition Procedural Synthesis Pipeline

To guarantee deterministic, ultra-fast, and cost-effective operation across development, testing, and production environments, the engine incorporates an advanced vector-to-raster synthesizer powered by **Sharp**:

```
+-------------------------------------------------------------+
|                     DESIGN ATTRIBUTES                       |
|  Category, Material, Finish, Craftsmanship, Gemstones, Prompt|
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                 PROCEDURAL SVG GENERATOR                    |
|  - Radial background lighting with ambient vignettes        |
|  - 5-stop metallic linear gradients (gold, silver, rose)    |
|  - 3-stop gemstone radial gradients (emerald, ruby, polki)  |
|  - Category geometries: Necklaces, Jhumkas, Rings, Bangles  |
|  - Camera matrix transforms (scale, rotate, skew per angle) |
|  - Editorial brand typography watermark & technical badges  |
+------------------------------+------------------------------+
                               | Vector Buffer
                               v
+-------------------------------------------------------------+
|                 SHARP RASTER ENGINE (WebP)                  |
|  - High-resolution rendering (1024x1024 pixels)             |
|  - WebP lossy compression at Q=92 (Effort 4)                |
|  - Strict sanitization: No XML entity reference leaks       |
+------------------------------+------------------------------+
                               | Binary File Output
                               v
+-------------------------------------------------------------+
|                STORAGE DESTINATION: /uploads/               |
|  cyo_{designId}_v{versionId}_{angle}_{timestamp}.webp       |
+-------------------------------------------------------------+
```

---

## 4. Storage & Derivative Management

- **Storage Location:** `public/uploads/` (or `process.env.UPLOADS_DIR`).
- **File Naming Standard:** Flat sanitized filenames conforming to existing storefront media regex:
  `/uploads/cyo_{designId}_v{versionId}_{viewType}_{timestamp}.webp`
- **Instant Compatibility:** Compatible with `server/thumbnails.js` lazy WebP thumbnail generation at `/uploads/thumbs/{filename}.webp`.
- **Zero-Waste Guarantee:** Images are verified on disk before committing database records and decrementing the customer's quota.
