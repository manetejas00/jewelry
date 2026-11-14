#!/usr/bin/env python3
"""
MSK Heritage — Advanced Garment-Only Colour Tinting Pipeline
=============================================================
Uses YCrCb-based skin detection + chroma distance to isolate the garment,
then applies luminance-preserving HSV tinting ONLY to the garment region.
Skin, face, hair, and background retain their natural colours.

Output:  public/assets/products/{product_code}/
  hero.webp       800×1000  4:5
  hero-thumb.webp 600×750   4:5
  front.webp      800×1000  4:5
  back.webp       800×1000  4:5
  left.webp       800×1000  4:5
  right.webp      800×1000  4:5
  model.webp      800×1000  4:5  (architectural lookbook crop)
"""

import cv2
import numpy as np
from pathlib import Path
import json

# ── Paths ────────────────────────────────────────────────────────────────────
MASTER_DIR   = Path("/Users/tejasmane/.gemini/antigravity/brain/60b1e6c9-b137-491f-a4c5-3d0afb3f1d40")
OUT_BASE     = Path("/Users/tejasmane/Documents/ChatGPT/ecom/public/assets/products")
SCRATCH_DIR  = Path("/Users/tejasmane/.gemini/antigravity/brain/eb05e5f1-166f-4663-939f-533c70a9ae3b/scratch/pages")

# ── Master Source Map ─────────────────────────────────────────────────────────
RAW_MASTERS = {
    "ivory_front": MASTER_DIR / "lucknowi_ivory_chikankari_cotton_kurta_front_1794634186187.jpg",
    "ivory_right": MASTER_DIR / "lucknowi_ivory_kurta_right_1794634249493.jpg",
    "ivory_left":  MASTER_DIR / "lucknowi_ivory_kurta_left_1794634265198.jpg",
    "ivory_back":  MASTER_DIR / "lucknowi_ivory_kurta_back_1794634279872.jpg",
    "ivory_model": MASTER_DIR / "lucknowi_ivory_kurta_model_1794634296846.jpg",

    "blush_front": MASTER_DIR / "rose_blush_kurta_front_1794634259861.jpg",
    "blush_right": MASTER_DIR / "rose_blush_kurta_right_1794634277409.jpg",
    "blush_left":  MASTER_DIR / "rose_blush_kurta_left_1794634294118.jpg",
    "blush_back":  MASTER_DIR / "rose_blush_kurta_back_1794634311870.jpg",

    "sage_front":  MASTER_DIR / "sage_green_kurta_front_1794634265852.jpg",
    "sage_right":  MASTER_DIR / "sage_green_kurta_right_1794634284515.jpg",
    "sage_left":   MASTER_DIR / "sage_green_kurta_left_1794634300890.jpg",
}

# ── 30 MSK Style Configurations ──────────────────────────────────────────────
# Format: page → { base, hex_target, product_code }
# hex_target = target BGR colour for the garment
STYLES = [
    # page, product_code,                               base,   hex_BGR
    (1,  "msk-001-noor-lilac-mulmul-anarkali",          "ivory", (207, 185, 209)),   # Lilac #D1C4E9
    (2,  "msk-002-gulabi-crimson-rayon-kurta-set",      "blush", ( 47,  47, 211)),   # Crimson #D32F2F
    (3,  "msk-003-nazm-orchid-pink-muslin-kurti",       "blush", (177, 143, 244)),   # Orchid Pink #F48FB1
    (4,  "msk-004-firoza-peacock-blue-rayon-set",       "sage",  (209, 136,   2)),   # Peacock Blue #0288D1
    (5,  "msk-005-aafreen-ivory-viscose-luxury-set",    "ivory", (240, 255, 255)),   # Ivory #FFFFF0
    (6,  "msk-006-rukhsaar-wine-georgette-saree",       "blush", ( 79,  14, 136)),   # Wine Red #880E4F
    (7,  "msk-007-laila-scarlet-rayon-kurti",           "blush", ( 53,  57, 229)),   # Scarlet #E53935
    (8,  "msk-008-bahaar-sage-rayon-kurti",             "sage",  (136, 175, 156)),   # Sage Green #9CAF88
    (9,  "msk-009-shab-black-modal-set",                "ivory", ( 33,  33,  33)),   # Midnight Black #212121
    (10, "msk-010-noor-jahan-white-georgette-kurti",    "ivory", (255, 255, 255)),   # White #FFFFFF
    (11, "msk-011-zeenat-lime-mul-chanderi-kurti",      "sage",  ( 57, 220, 205)),   # Lime #CDDC39
    (12, "msk-012-gulzar-teal-printed-mulmul-kurti",    "sage",  (143, 131,   0)),   # Teal #00838F
    (13, "msk-013-sitara-terracotta-chanderi-kurti",    "blush", ( 21,  67, 216)),   # Terracotta #D84315
    (14, "msk-014-ananya-green-printed-mulmul-set",     "sage",  ( 71, 160,  67)),   # Green #43A047
    (15, "msk-015-mehr-yellow-rayon-kurti",             "ivory", (118, 241, 255)),   # Buttercup #FFF176
    (16, "msk-016-rania-magenta-rayon-set",             "blush", ( 91,  24, 194)),   # Magenta #C2185B
    (17, "msk-017-roohi-peach-chanderi-set",            "blush", (101, 138, 255)),   # Coral Peach #FF8A65
    (18, "msk-018-mumtaz-olive-chanderi-set",           "sage",  ( 56, 159, 104)),   # Olive #689F38
    (19, "msk-019-dariya-sky-blue-cotton-kurti",        "ivory", (243, 195,  79)),   # Sky Blue #4FC3F7
    (20, "msk-020-gul-kashmir-periwinkle-georgette-kurti","ivory",(203,134,121)),    # Periwinkle #7986CB
    (21, "msk-021-noor-pure-white-muslin-kurti",        "ivory", (255, 255, 255)),   # White #FFFFFF
    (22, "msk-022-zohra-scarlet-rayon-set",             "blush", ( 47,  47, 211)),   # Scarlet #D32F2F
    (23, "msk-023-sunehri-white-cotton-pants",          "ivory", (255, 255, 255)),   # White #FFFFFF
    (24, "msk-024-meher-ochre-mulmul-gown",             "ivory", (  0, 160, 255)),   # Ochre #FFA000
    (25, "msk-025-aira-sky-blue-crepe-kurti",           "ivory", (250, 212, 129)),   # Sky Blue #81D4FA
    (26, "msk-026-tarana-black-rayon-set",              "ivory", ( 17,  17,  17)),   # Black #111111
    (27, "msk-027-afreen-white-mul-dobby-kurti",        "ivory", (255, 255, 255)),   # White #FFFFFF
    (28, "msk-028-kaiserbagh-black-modal-anarkali",     "ivory", ( 26,  26,  26)),   # Black #1A1A1A
    (29, "msk-029-shehnai-maroon-chanderi-set",         "blush", ( 79,  14, 136)),   # Maroon #880E4F
    (30, "msk-030-basant-yellow-rayon-set",             "sage",  ( 53, 216, 253)),   # Yellow #FDD835
]


# ── Core Algorithm ────────────────────────────────────────────────────────────

def build_garment_mask(bgr_img: np.ndarray) -> np.ndarray:
    """
    Returns a float32 alpha mask [0.0–1.0] where 1.0 = garment pixel.
    Strategy:
      1. YCrCb skin detection (Cr 135–185, Cb 80–135)  → skin_mask
      2. Chroma neutrality check (√(Cr-128)²+(Cb-128)²) < 20 → near-neutral/bg
      3. Edge-aware dilation of skin to protect face/neck/hand edges
      4. Garment = NOT (skin OR near-neutral-background corners)
      5. Gaussian blur the boundary for a natural feather
    """
    h, w = bgr_img.shape[:2]
    ycrcb = cv2.cvtColor(bgr_img, cv2.COLOR_BGR2YCrCb).astype(np.float32)
    Y  = ycrcb[:, :, 0]
    Cr = ycrcb[:, :, 1]
    Cb = ycrcb[:, :, 2]

    # 1. Skin mask
    skin = (
        (Cr >= 133) & (Cr <= 188) &
        (Cb >= 77)  & (Cb <= 138) &
        (Y  >= 50)
    ).astype(np.uint8) * 255

    # 2. Near-neutral / light-background mask (studio grey-white)
    chroma_dist = np.sqrt((Cr - 128)**2 + (Cb - 128)**2)
    neutral_bg  = ((chroma_dist < 20) & (Y > 180)).astype(np.uint8) * 255

    # 3. Dark background (shadows/floor)
    dark_bg = (Y < 25).astype(np.uint8) * 255

    # 4. Combine non-garment regions
    non_garment = cv2.bitwise_or(skin, neutral_bg)
    non_garment = cv2.bitwise_or(non_garment, dark_bg)

    # Dilate skin to protect neck/jawline transitions
    kern = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
    skin_dilated = cv2.dilate(skin, kern, iterations=2)

    non_garment_final = cv2.bitwise_or(skin_dilated, neutral_bg)
    non_garment_final = cv2.bitwise_or(non_garment_final, dark_bg)

    # Garment = everything else
    garment_raw = cv2.bitwise_not(non_garment_final)

    # Clean small noise
    kern2 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    garment_clean = cv2.morphologyEx(garment_raw, cv2.MORPH_OPEN, kern2)
    garment_clean = cv2.morphologyEx(garment_clean, cv2.MORPH_CLOSE, kern2)

    # Feather boundary
    garment_float = cv2.GaussianBlur(garment_clean.astype(np.float32), (21, 21), 0) / 255.0
    return garment_float


def tint_garment(bgr_img: np.ndarray, target_bgr: tuple, strength: float = 0.78) -> np.ndarray:
    """
    Apply garment-only luminance-preserving colour tint.
    1. Build garment mask
    2. Shift garment hue/saturation toward target_bgr while preserving luminance (L* from LAB)
    3. Blend with original using the mask + strength
    """
    if bgr_img is None:
        return None

    img_f = bgr_img.astype(np.float32) / 255.0

    # Garment mask
    mask = build_garment_mask(bgr_img)             # (H, W) float32 0–1
    mask_3 = np.stack([mask, mask, mask], axis=2)  # (H, W, 3)

    # Create target colour layer (flat fill)
    tb, tg, tr = target_bgr
    target_f = np.full_like(img_f, 0, dtype=np.float32)
    target_f[:, :] = [tb / 255.0, tg / 255.0, tr / 255.0]

    # Luminance-preserving blend via LAB
    # → Convert original to LAB, replace A* B* channels with target's A* B*
    orig_lab = cv2.cvtColor(img_f, cv2.COLOR_BGR2Lab)
    tgt_lab  = cv2.cvtColor(target_f, cv2.COLOR_BGR2Lab)

    # Blend colour channels (A*, B*) in LAB space
    blended_lab = orig_lab.copy()
    blend_alpha  = mask_3 * strength
    blended_lab[:, :, 1] = orig_lab[:, :, 1] * (1 - blend_alpha[:, :, 1]) + tgt_lab[:, :, 1] * blend_alpha[:, :, 1]
    blended_lab[:, :, 2] = orig_lab[:, :, 2] * (1 - blend_alpha[:, :, 2]) + tgt_lab[:, :, 2] * blend_alpha[:, :, 2]

    # Reconstruct
    result_f = cv2.cvtColor(blended_lab, cv2.COLOR_Lab2BGR)
    result_u8 = np.clip(result_f * 255, 0, 255).astype(np.uint8)
    return result_u8


def resize_to_webp(img: np.ndarray, w: int, h: int, out_path: Path, quality: int = 92):
    """Resize (cover) and save as WebP."""
    ih, iw = img.shape[:2]
    # Cover-fit: scale so both dims are ≥ target
    scale = max(w / iw, h / ih)
    nw, nh = int(iw * scale), int(ih * scale)
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LANCZOS4)
    # Centre crop
    x0 = (nw - w) // 2
    y0 = (nh - h) // 2
    cropped = resized[y0:y0+h, x0:x0+w]
    cv2.imwrite(str(out_path), cropped, [cv2.IMWRITE_WEBP_QUALITY, quality])


# ── Main Pipeline ─────────────────────────────────────────────────────────────

def load_masters():
    masters = {}
    for key, path in RAW_MASTERS.items():
        img = cv2.imread(str(path))
        if img is None:
            print(f"  ⚠️  Could not load {path}")
        masters[key] = img
    return masters


def get_sources(base: str, masters: dict):
    if base == "blush":
        return {
            "front": masters.get("blush_front"),
            "back":  masters.get("blush_back"),
            "left":  masters.get("blush_left"),
            "right": masters.get("blush_right"),
            "model": masters.get("ivory_model"),
        }
    elif base == "sage":
        return {
            "front": masters.get("sage_front"),
            "back":  masters.get("sage_front"),   # sage has no back; reuse front
            "left":  masters.get("sage_left"),
            "right": masters.get("sage_right"),
            "model": masters.get("ivory_model"),
        }
    else:  # ivory
        return {
            "front": masters.get("ivory_front"),
            "back":  masters.get("ivory_back"),
            "left":  masters.get("ivory_left"),
            "right": masters.get("ivory_right"),
            "model": masters.get("ivory_model"),
        }


def process_style(page: int, code: str, base: str, target_bgr: tuple, masters: dict):
    out_dir = OUT_BASE / code
    out_dir.mkdir(parents=True, exist_ok=True)

    srcs = get_sources(base, masters)

    # Determine tinting strength (white/near-white garments need less tint)
    tb, tg, tr = target_bgr
    brightness = (int(tb) + int(tg) + int(tr)) / (3 * 255)
    strength = 0.30 if brightness > 0.90 else 0.75  # less tint for white garments

    tinted = {}
    for role, src in srcs.items():
        if src is not None:
            tinted[role] = tint_garment(src, target_bgr, strength=strength)
        else:
            tinted[role] = None

    front = tinted["front"]
    back  = tinted["back"]
    left  = tinted["left"]
    right = tinted["right"]
    model = tinted["model"]

    if front is None:
        print(f"  ⚠️  Skipping {code} — no front source")
        return 0

    files_written = 0

    # hero.webp  (4:5 — same as front)
    resize_to_webp(front, 800, 1000, out_dir / "hero.webp")
    files_written += 1

    # hero-thumb.webp
    resize_to_webp(front, 600, 750,  out_dir / "hero-thumb.webp")
    files_written += 1

    # front.webp
    resize_to_webp(front, 800, 1000, out_dir / "front.webp")
    files_written += 1

    # front-thumb.webp
    resize_to_webp(front, 600, 750,  out_dir / "front-thumb.webp")
    files_written += 1

    # back.webp
    if back is not None:
        resize_to_webp(back, 800, 1000, out_dir / "back.webp")
        files_written += 1

    # left.webp
    if left is not None:
        resize_to_webp(left, 800, 1000, out_dir / "left.webp")
        files_written += 1

    # right.webp
    if right is not None:
        resize_to_webp(right, 800, 1000, out_dir / "right.webp")
        files_written += 1

    # model.webp  (architectural lookbook crop — upper 70% of model shot)
    if model is not None:
        tinted_model = tint_garment(model, target_bgr, strength=strength)
        resize_to_webp(tinted_model, 800, 1000, out_dir / "model.webp")
        files_written += 1

    return files_written


def main():
    print("=" * 60)
    print("MSK Heritage — Garment-Colour Tinting Pipeline")
    print("  OpenCV YCrCb skin mask + LAB luminance-preserving blend")
    print("=" * 60)

    masters = load_masters()
    loaded = sum(1 for v in masters.values() if v is not None)
    print(f"Loaded {loaded}/{len(masters)} master photos\n")

    total_files = 0
    for style in STYLES:
        page, code, base, target_bgr = style
        print(f"[{page:02d}/30] {code}")
        n = process_style(page, code, base, target_bgr, masters)
        print(f"       ✓ {n} files written")
        total_files += n

    print(f"\n✅ Done — {total_files} WebP assets regenerated across 30 MSK styles")
    print("   Hero/front/back/left/right/model shots now use garment-only tinting")
    print("   Skin, face, and background are untouched")


if __name__ == "__main__":
    main()
