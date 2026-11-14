import cv2
import numpy as np
from PIL import Image, ImageEnhance
import os
import sqlite3

scratch_dir = '/Users/tejasmane/.gemini/antigravity/brain/eb05e5f1-166f-4663-939f-533c70a9ae3b/scratch/pages'
public_dir = '/Users/tejasmane/Documents/ChatGPT/ecom/public/assets/products'
db_path = '/Users/tejasmane/Documents/ChatGPT/ecom/private/store.sqlite'

# Text bounding boxes: [page, x, y, w, h] (from Swift Vision OCR)
text_boxes = {
    1: [(209, 909, 349, 33)],
    2: [(479, 1059, 229, 38)],
    3: [(243, 930, 322, 35)],
    4: [(231, 929, 307, 50)],
    5: [(197, 969, 409, 65)],
    6: [(191, 1006, 562, 66)],
    7: [(179, 811, 434, 74)],
    8: [(206, 728, 385, 61)],
    9: [(195, 722, 408, 83)],
    10: [(169, 620, 429, 66), (165, 707, 411, 53)],
    11: [(219, 751, 351, 29)],
    12: [(202, 956, 361, 47)],
    13: [(183, 945, 399, 35)],
    14: [(237, 998, 300, 43)],
    15: [(241, 951, 277, 43)],
    16: [(237, 1060, 236, 40)],
    17: [(171, 973, 399, 32)],
    18: [(239, 1037, 251, 27)],
    19: [(269, 957, 237, 27)],
    20: [(287, 883, 211, 27)],
    21: [(211, 957, 307, 29)],
    22: [(273, 1008, 210, 36)],
    23: [(307, 944, 133, 28)],
    24: [(269, 907, 214, 36)],
    25: [(267, 923, 225, 31)],
    26: [(275, 968, 210, 34)],
    27: [(253, 919, 273, 35)],
    28: [(150, 70, 357, 52)],
    29: [(203, 963, 331, 35)],
    30: [(211, 877, 431, 68)]
}

# Product codes mapping
conn = sqlite3.connect(db_path)
c = conn.cursor()
c.execute("SELECT product_code FROM kurtas WHERE product_code LIKE 'msk-%' ORDER BY id ASC")
product_codes = [row[0] for row in c.fetchall()]
print(f"Loaded {len(product_codes)} MSK product codes from database.")

def inpaint_text(img, boxes):
    h_img, w_img = img.shape[:2]
    mask = np.zeros((h_img, w_img), dtype=np.uint8)
    for (x, y, w, h) in boxes:
        # pad box slightly
        px = max(0, x - 6)
        py = max(0, y - 6)
        pw = min(w_img - px, w + 12)
        ph = min(h_img - py, h + 12)
        
        roi = img[py:py+ph, px:px+pw]
        gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY)
        
        # Inpaint mask: find pixels differing from local median
        med = np.median(gray)
        diff = np.abs(gray.astype(np.float32) - med)
        submask = (diff > 18).astype(np.uint8) * 255
        
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        submask = cv2.dilate(submask, kernel, iterations=1)
        mask[py:py+ph, px:px+pw] = np.maximum(mask[py:py+ph, px:px+pw], submask)
        
    return cv2.inpaint(img, mask, inpaintRadius=5, flags=cv2.INPAINT_TELEA)

def crop_letterbox(img):
    arr = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    h, w = arr.shape[:2]
    top_color = arr[0, :, :].mean(axis=0)
    bot_color = arr[-1, :, :].mean(axis=0)
    
    diff_top = np.abs(arr.mean(axis=1) - top_color).sum(axis=1)
    diff_bot = np.abs(arr.mean(axis=1) - bot_color).sum(axis=1)
    
    photo_rows = np.where((diff_top > 12) & (diff_bot > 12))[0]
    if len(photo_rows) > 0:
        y1 = max(0, photo_rows[0] - 5)
        y2 = min(h, photo_rows[-1] + 5)
        if (y2 - y1) > 400: # ensure valid crop
            return img[y1:y2, :]
    return img

def create_4x5_hero(img_clean):
    # Convert cv2 BGR to PIL
    rgb = cv2.cvtColor(img_clean, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    
    target_w, target_h = 800, 1000
    canvas = Image.new('RGB', (target_w, target_h), (248, 246, 240)) # #F8F6F0 ivory
    
    # Scale keeping aspect ratio
    src_w, src_h = pil_img.size
    ratio = min(target_w / src_w, target_h / src_h)
    new_w = int(src_w * ratio)
    new_h = int(src_h * ratio)
    
    resized = pil_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    # Center on canvas
    offset_x = (target_w - new_w) // 2
    offset_y = (target_h - new_h) // 2
    canvas.paste(resized, (offset_x, offset_y))
    
    # Slight luxury enhancement: +3% contrast, +2% sharpness
    canvas = ImageEnhance.Contrast(canvas).enhance(1.04)
    canvas = ImageEnhance.Sharpness(canvas).enhance(1.06)
    return canvas

def create_detail_crop(img_clean):
    # Crop central yoke embroidery (typically middle-upper area)
    h, w = img_clean.shape[:2]
    y1 = int(h * 0.15)
    y2 = int(h * 0.55)
    x1 = int(w * 0.18)
    x2 = int(w * 0.82)
    crop = img_clean[y1:y2, x1:x2]
    
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    detail = pil_img.resize((800, 800), Image.Resampling.LANCZOS)
    detail = ImageEnhance.Sharpness(detail).enhance(1.12)
    return detail

def create_neckline_crop(img_clean):
    # Focus on neckline / collar / placket
    h, w = img_clean.shape[:2]
    y1 = int(h * 0.08)
    y2 = int(h * 0.40)
    x1 = int(w * 0.22)
    x2 = int(w * 0.78)
    crop = img_clean[y1:y2, x1:x2]
    
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    neck = pil_img.resize((800, 800), Image.Resampling.LANCZOS)
    neck = ImageEnhance.Sharpness(neck).enhance(1.10)
    return neck

def create_hem_crop(img_clean):
    # Focus on bottom hem / palazzo / border
    h, w = img_clean.shape[:2]
    y1 = int(h * 0.60)
    y2 = int(h * 0.95)
    x1 = int(w * 0.15)
    x2 = int(w * 0.85)
    crop = img_clean[y1:y2, x1:x2]
    
    rgb = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
    pil_img = Image.fromarray(rgb)
    hem = pil_img.resize((800, 800), Image.Resampling.LANCZOS)
    hem = ImageEnhance.Sharpness(hem).enhance(1.08)
    return hem

# Clear old MSK images from product_images table to re-insert clean multi-angles
c.execute("DELETE FROM product_images WHERE product_code LIKE 'msk-%'")

for i, code in enumerate(product_codes):
    page_num = i + 1
    page_path = os.path.join(scratch_dir, f'page_{page_num}.jpg')
    if not os.path.exists(page_path):
        print(f"Skipping {code}: page_{page_num}.jpg not found.")
        continue
    
    out_dir = os.path.join(public_dir, code)
    os.makedirs(out_dir, exist_ok=True)
    
    raw_img = cv2.imread(page_path)
    
    # 1. Inpaint text
    boxes = text_boxes.get(page_num, [])
    clean_img = inpaint_text(raw_img, boxes)
    
    # 2. Crop letterbox bars
    cropped_img = crop_letterbox(clean_img)
    
    # 3. Generate Photoshoot Views
    hero = create_4x5_hero(cropped_img)
    detail = create_detail_crop(cropped_img)
    neckline = create_neckline_crop(cropped_img)
    hem = create_hem_crop(cropped_img)
    
    hero_path = os.path.join(out_dir, 'hero.webp')
    detail_path = os.path.join(out_dir, 'detail.webp')
    neck_path = os.path.join(out_dir, 'neckline.webp')
    hem_path = os.path.join(out_dir, 'hem.webp')
    
    hero.save(hero_path, 'WEBP', quality=90)
    detail.save(detail_path, 'WEBP', quality=88)
    neckline.save(neck_path, 'WEBP', quality=88)
    hem.save(hem_path, 'WEBP', quality=88)
    
    # Insert gallery records into product_images
    c.execute("""
        INSERT INTO product_images (product_code, sku, role, url, alt_text, sort_order, color, created_at, updated_at)
        VALUES (?, NULL, 'hero', ?, 'Full Length Editorial Catalog View', 1, 'Default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """, (code, f'/assets/products/{code}/hero.webp'))
    
    c.execute("""
        INSERT INTO product_images (product_code, sku, role, url, alt_text, sort_order, color, created_at, updated_at)
        VALUES (?, NULL, 'detail', ?, 'Handcrafted Chikankari Embroidery Macro Detail', 2, 'Default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """, (code, f'/assets/products/{code}/detail.webp'))
    
    c.execute("""
        INSERT INTO product_images (product_code, sku, role, url, alt_text, sort_order, color, created_at, updated_at)
        VALUES (?, NULL, 'neckline', ?, 'Artisan Neckline and Placket Workmanship', 3, 'Default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """, (code, f'/assets/products/{code}/neckline.webp'))
    
    c.execute("""
        INSERT INTO product_images (product_code, sku, role, url, alt_text, sort_order, color, created_at, updated_at)
        VALUES (?, NULL, 'hem', ?, 'Embroidered Border and Palazzo Lace Detail', 4, 'Default', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    """, (code, f'/assets/products/{code}/hem.webp'))
    
    print(f"[{page_num:02d}/30] Generated 4 photoshoot angles for {code}")

conn.commit()
conn.close()
print("All photoshoot images generated and catalog gallery synchronized successfully!")
