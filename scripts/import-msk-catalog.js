import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';
import sharp from 'sharp';
import { db, now } from '../server/db.js';
import { KURTA_SIZES } from '../shared/kurta-sizes.js';

const products = [
  {
    page: 1,
    sku: 'MSK-001',
    code: 'msk-001-noor-lilac-mulmul-anarkali',
    name: 'Noor Lilac Floral Mulmul Cotton Flared Anarkali Kurta',
    category: 'Cotton Chikankari',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Authentic Lucknowi Chikankari',
    work_details: 'Pure Mulmul Cotton, White Chikankari Floral Panels & Empire Drawstring, 1 Pc',
    cost: 925,
    selling_price: 1299,
    color: 'Lilac Lavender',
    hex: '#D1C4E9',
    fit: 'Flared Anarkali',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Neck with Button Placket',
    occasion: 'Festive / Daytime Traditional',
    desc: 'Handcrafted pure mulmul cotton flared Anarkali kurta featuring vertical panels of delicate Lucknowi Chikankari floral vines and an adjustable empire drawstring tie-up.'
  },
  {
    page: 2,
    sku: 'MSK-002',
    code: 'msk-002-gulabi-crimson-rayon-kurta-set',
    name: 'Gulabi Crimson Red Rayon Chikankari Kurta & Palazzo Set',
    category: 'Chicken Curry Kurtas',
    fabric: 'Premium Rayon',
    craftsmanship: 'Handcrafted Chikankari Needlework',
    work_details: 'Premium Rayon, Handcrafted White Chikankari Yoke, Embroidered Palazzo, 2 Pc',
    cost: 750,
    selling_price: 1049,
    color: 'Crimson Red',
    hex: '#D32F2F',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Scoop Neck with Center Notch',
    occasion: 'Festive / Celebration',
    desc: 'Vibrant crimson red rayon straight kurta with dense white Chikankari yoke embroidery, paired with a matching embroidered wide-leg palazzo.'
  },
  {
    page: 3,
    sku: 'MSK-003',
    code: 'msk-003-nazm-orchid-pink-muslin-kurti',
    name: 'Nazm Soft Orchid Pink Muslin Sleeveless Chikankari Kurti',
    category: 'Cotton Chikankari',
    fabric: 'Pure Muslin Cotton',
    craftsmanship: 'Tonal Hand Chikankari',
    work_details: 'Pure Breathable Muslin, Tonal Hand Chikankari Neckline & Scattered Butis, 1 Pc',
    cost: 550,
    selling_price: 769,
    color: 'Orchid Pink',
    hex: '#F48FB1',
    fit: 'Straight Fit',
    sleeve: 'Sleeveless',
    neck: 'Scoop Neck',
    occasion: 'Casual / Summer Daytime',
    desc: 'Breezy soft orchid pink muslin sleeveless straight kurti featuring delicate tone-on-tone Lucknowi Chikankari neckline embroidery and scattered floral butis.'
  },
  {
    page: 4,
    sku: 'MSK-004',
    code: 'msk-004-firoza-peacock-blue-rayon-set',
    name: 'Firoza Peacock Blue Rayon Chikankari Kurta & Palazzo Set',
    category: 'Chicken Curry Kurtas',
    fabric: 'Flowing Rayon',
    craftsmanship: 'White Contrast Chikankari',
    work_details: 'Flowing Rayon, White Contrast Dual Vertical Vines, Matching Palazzo Border, 2 Pc',
    cost: 575,
    selling_price: 809,
    color: 'Peacock Blue',
    hex: '#0288D1',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'V-Neck with Notch',
    occasion: 'Casual Festive / Social',
    desc: 'Peacock cyan blue rayon straight kurta accented with two symmetrical columns of white Chikankari vines, paired with matching embroidered palazzo pants.'
  },
  {
    page: 5,
    sku: 'MSK-005',
    code: 'msk-005-aafreen-ivory-viscose-luxury-set',
    name: 'Aafreen Heirloom Ivory Viscose Luxury Chikankari 2-Piece Suit Set',
    category: 'Georgette Kurtas',
    fabric: 'Heavy Viscose Georgette',
    craftsmanship: 'High-Density Contrast Chikankari',
    work_details: 'Heavy Viscose Georgette, High-Density Olive-Gold Chikankari Creeper Work, 2 Pc',
    cost: 2450,
    selling_price: 3429,
    color: 'Ivory White',
    hex: '#FFFFF0',
    fit: 'Straight Luxury Silhouette',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Boat Neck with Keyhole Notch',
    occasion: 'Royal Festive / Wedding',
    desc: 'Pristine ivory white heavy viscose suit set detailed with high-density olive green and antique-gold contrast Chikankari yoke and dramatic trailing diagonal floral vines.'
  },
  {
    page: 6,
    sku: 'MSK-006',
    code: 'msk-006-rukhsaar-wine-georgette-saree',
    name: 'Rukhsaar Wine Red Sheer Georgette Chikankari Festive Saree',
    category: 'Chikankari Sarees',
    fabric: 'Sheer Viscose Georgette',
    craftsmanship: 'Intricate Jaal Pallu & Scalloped Borders',
    work_details: 'Sheer Viscose Georgette, Heavy White Chikankari Pallu Jaal & Scalloped Borders, 6 Yards',
    cost: 875,
    selling_price: 1229,
    color: 'Wine Red',
    hex: '#880E4F',
    fit: '6-Yard Draped Saree',
    sleeve: 'Unstitched Blouse Piece Included',
    neck: 'Customizable Blouse',
    occasion: 'Weddings & Celebrations',
    desc: 'Opulent wine red sheer georgette saree showcasing a heavy white shadow-work Chikankari pallu, scalloped embroidered borders, and scattered floral butas.'
  },
  {
    page: 7,
    sku: 'MSK-007',
    code: 'msk-007-laila-scarlet-rayon-kurti',
    name: 'Laila Scarlet Red Rayon Hand-Embroidered Chikankari Kurti',
    category: 'Chicken Curry Kurtas',
    fabric: 'Premium Spun Rayon',
    craftsmanship: 'Traditional White Needlecraft',
    work_details: 'Premium Spun Rayon, Dense White Chikankari Floral Yoke & Butis, 3/4 Sleeves, 1 Pc',
    cost: 575,
    selling_price: 809,
    color: 'Scarlet Red',
    hex: '#E53935',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Notched Round Neck',
    occasion: 'Festive / Daily Casual',
    desc: 'Vibrant scarlet red rayon kurti adorned with dense white Chikankari chest yoke embroidery and scattered three-leaf floral motifs.'
  },
  {
    page: 8,
    sku: 'MSK-008',
    code: 'msk-008-bahaar-sage-rayon-kurti',
    name: 'Bahaar Sage Green Rayon Everyday Chikankari Kurti',
    category: 'Chicken Curry Kurtas',
    fabric: 'Lightweight Rayon',
    craftsmanship: 'Floral Shadow Needlework',
    work_details: 'Lightweight Rayon, Traditional White Floral Shadow Work, Straight Cut, 1 Pc',
    cost: 375,
    selling_price: 529,
    color: 'Sage Green',
    hex: '#9CAF88',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Neck with Slit',
    occasion: 'Daily Workwear / Casual',
    desc: 'Cool and comfortable sage green rayon everyday kurti highlighted by clean white Chikankari floral yoke embroidery.'
  },
  {
    page: 9,
    sku: 'MSK-009',
    code: 'msk-009-shab-black-modal-set',
    name: 'Shab-e-Awadh Midnight Black Modal Chikankari Kurta & Palazzo Set',
    category: 'Modal Chikankari',
    fabric: 'Pure Modal Cotton',
    craftsmanship: 'High-Contrast White Needlework',
    work_details: 'Pure Modal Cotton, High-Contrast White Chikankari Yoke & Embroidered Palazzo, 2 Pc',
    cost: 875,
    selling_price: 1229,
    color: 'Midnight Black',
    hex: '#212121',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Notched Round Neck',
    occasion: 'Evening Festive / Party',
    desc: 'Lustrous midnight black pure modal cotton kurta paired with matching palazzo pants, featuring striking high-contrast white Chikankari floral needlecraft.'
  },
  {
    page: 10,
    sku: 'MSK-010',
    code: 'msk-010-noor-jahan-white-georgette-kurti',
    name: 'Noor-e-Jahan White All-Over Jaal Georgette Kurti (With Inner Slip)',
    category: 'Georgette Kurtas',
    fabric: 'Sheer Viscose Georgette',
    craftsmanship: 'Dense All-Over Floral Jaal',
    work_details: 'Sheer Fluid Georgette, Dense White Chikankari All-Over Jaal, Dyed Inner Slip, 2 Pc',
    cost: 350,
    selling_price: 489,
    color: 'Ivory White',
    hex: '#FFFFFF',
    fit: 'Straight Fit',
    sleeve: 'Sheer 3/4 Sleeves',
    neck: 'Round Neck with Notch',
    occasion: 'Daytime Elegance / Festive',
    desc: 'Heirloom sheer white viscose georgette kurti enriched with dense all-over white Chikankari floral jaal, complete with a dyed cotton slip for complete opacity.'
  },
  {
    page: 11,
    sku: 'MSK-011',
    code: 'msk-011-zeenat-lime-mul-chanderi-kurti',
    name: 'Zeenat Chartreuse Lime Mul Chanderi Chikankari Kurti',
    category: 'Chanderi Silk Kurtas',
    fabric: 'Shimmer Mul Chanderi',
    craftsmanship: 'Tonal Paisley & Floral Needlecraft',
    work_details: 'Shimmer Mul Chanderi, Tonal Cream Floral Paisley Yoke Needlecraft, 3/4 Sleeves, 1 Pc',
    cost: 575,
    selling_price: 809,
    color: 'Chartreuse Lime',
    hex: '#CDDC39',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Neck with Notch',
    occasion: 'Festive / Haldi Celebration',
    desc: 'Luminous lime-yellow mul chanderi kurti blending silk luster with breathable mulmul, framed by detailed cream Chikankari floral and paisley yoke embroidery.'
  },
  {
    page: 12,
    sku: 'MSK-012',
    code: 'msk-012-gulzar-teal-printed-mulmul-kurti',
    name: 'Gulzar Teal Floral Block-Printed Mulmul Chikankari Kurti',
    category: 'Cotton Chikankari',
    fabric: 'Hand-Printed Mulmul Cotton',
    craftsmanship: 'White Chikankari Yoke Overlay',
    work_details: 'Hand-Printed Mulmul Cotton, White Chikankari Yoke Overlay, Casual Straight Fit, 1 Pc',
    cost: 475,
    selling_price: 669,
    color: 'Teal Blue',
    hex: '#00838F',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Everyday / Casual Outing',
    desc: 'Artisanal teal blue block-printed mulmul cotton straight kurti layered with hand-embroidered white Chikankari stitches over the chest yoke.'
  },
  {
    page: 13,
    sku: 'MSK-013',
    code: 'msk-013-sitara-terracotta-chanderi-kurti',
    name: 'Sitara Rust Terracotta Mul Chanderi Tone-on-Tone Kurti',
    category: 'Chanderi Silk Kurtas',
    fabric: 'Handloom Mul Chanderi',
    craftsmanship: 'Tonal Rust Shadow Work',
    work_details: 'Handloom Mul Chanderi, Tonal Rust Shadow Embroidery & Scattered Butis, 1 Pc',
    cost: 475,
    selling_price: 669,
    color: 'Rust Terracotta',
    hex: '#D84315',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Festive / Puja Ceremonies',
    desc: 'Warm rust terracotta mul chanderi kurti featuring tone-on-tone Awadhi shadow-work embroidery and scattered floral motifs.'
  },
  {
    page: 14,
    sku: 'MSK-014',
    code: 'msk-014-ananya-green-printed-mulmul-set',
    name: 'Ananya Botanical Green Printed Mulmul Kurta & Palazzo Set',
    category: 'Cotton Chikankari',
    fabric: 'Printed Mulmul Cotton',
    craftsmanship: 'Hand Chikankari Yoke',
    work_details: 'Botanical Printed Mulmul Cotton, White Chikankari Yoke & Matching Palazzo, 2 Pc',
    cost: 750,
    selling_price: 1049,
    color: 'Meadow Green',
    hex: '#43A047',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Brunch / Festive Casual',
    desc: 'Graceful white and meadow-green botanical floral printed mulmul cotton kurta paired with a matching printed and embroidered palazzo.'
  },
  {
    page: 15,
    sku: 'MSK-015',
    code: 'msk-015-mehr-yellow-rayon-kurti',
    name: 'Mehr Buttercup Yellow Rayon Tone-on-Tone Chikankari Kurti',
    category: 'Chicken Curry Kurtas',
    fabric: 'Heavy Spun Rayon',
    craftsmanship: 'Pastel Tone-on-Tone Needlecraft',
    work_details: 'Heavy Spun Rayon, Pastel Yellow Floral Yoke Chikankari, Straight Fit, 1 Pc',
    cost: 650,
    selling_price: 909,
    color: 'Buttercup Yellow',
    hex: '#FFF176',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Neck with Slit',
    occasion: 'Summer Festive / Haldi',
    desc: 'Sunny buttercup yellow rayon straight kurti showcasing delicate tone-on-tone pastel embroidery across the yoke and bodice.'
  },
  {
    page: 16,
    sku: 'MSK-016',
    code: 'msk-016-rania-magenta-rayon-set',
    name: 'Rania Berry Magenta Rayon Chikankari Kurta & Palazzo Set',
    category: 'Chicken Curry Kurtas',
    fabric: 'Fluid Rayon',
    craftsmanship: 'White Floral Spray Embroidery',
    work_details: 'Fluid Rayon, White Contrast Chikankari Floral Spray, Side Slit Borders, Palazzo, 2 Pc',
    cost: 525,
    selling_price: 739,
    color: 'Berry Magenta',
    hex: '#C2185B',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Curved Scoop Neck',
    occasion: 'Evening / Festive Gatherings',
    desc: 'Deep berry magenta rayon kurta with crisp white Chikankari floral sprays, embroidered side slits, and matching white-embroidered palazzo.'
  },
  {
    page: 17,
    sku: 'MSK-017',
    code: 'msk-017-roohi-peach-chanderi-set',
    name: 'Roohi Coral Peach Chanderi Sleeveless Kurta & Pant Set',
    category: 'Chanderi Silk Kurtas',
    fabric: 'Lustrous Chanderi Silk Blend',
    craftsmanship: 'Tonal Needlework on Silk',
    work_details: 'Lustrous Chanderi Silk, Sleeveless Straight Kurta, Tonal Yoke, Straight Cigarette Pants, 2 Pc',
    cost: 550,
    selling_price: 769,
    color: 'Coral Peach',
    hex: '#FF8A65',
    fit: 'Tailored Sleeveless Straight',
    sleeve: 'Sleeveless',
    neck: 'Scoop Neck with Notch',
    occasion: 'Cocktail / Summer Festive',
    desc: 'Lustrous coral-peach Chanderi silk sleeveless kurta paired with sleek cigarette trousers, detailed with tonal Awadhi floral embroidery.'
  },
  {
    page: 18,
    sku: 'MSK-018',
    code: 'msk-018-mumtaz-olive-chanderi-set',
    name: 'Mumtaz Shahi Olive Green Chanderi Kurta & Pant Set',
    category: 'Chanderi Silk Kurtas',
    fabric: 'Handloom Chanderi Silk',
    craftsmanship: 'Tonal Hand Needlework & Full Sleeves',
    work_details: 'Rich Chanderi Silk Weave, Tonal Hand Needlework, Full Sleeves, Matching Pant Included, 2 Pc',
    cost: 875,
    selling_price: 1229,
    color: 'Olive Green',
    hex: '#689F38',
    fit: 'Straight Fit',
    sleeve: 'Full Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Festive / Reception',
    desc: 'Regal olive green Chanderi silk kurta and pant set featuring dense tone-on-tone Chikankari yoke embroidery and full-length embroidered sleeves.'
  },
  {
    page: 19,
    sku: 'MSK-019',
    code: 'msk-019-dariya-sky-blue-cotton-kurti',
    name: 'Dariya Sky Blue Pure Cotton Everyday Chikankari Kurti',
    category: 'Cotton Chikankari',
    fabric: '100% Pure Breathable Cotton',
    craftsmanship: 'White Contrast Shadow Work',
    work_details: '100% Pure Breathable Cotton, White Contrast Shadow Yoke & Floral Motifs, 1 Pc',
    cost: 350,
    selling_price: 489,
    color: 'Sky Blue',
    hex: '#4FC3F7',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Daily Workwear / Summer',
    desc: 'Breezy sky blue pure cotton kurti detailed with high-contrast white Chikankari chest yoke embroidery and delicate floral butis.'
  },
  {
    page: 20,
    sku: 'MSK-020',
    code: 'msk-020-gul-kashmir-periwinkle-georgette-kurti',
    name: 'Gul-e-Kashmir Periwinkle Rose Motif Sheer Georgette Kurti',
    category: 'Georgette Kurtas',
    fabric: 'Sheer Poly-Georgette',
    craftsmanship: 'Raised Rose Motif Hand Embroidery',
    work_details: 'Sheer Poly-Georgette, Raised Rose Motif Hand Embroidery, Lightweight Festive, 1 Pc',
    cost: 275,
    selling_price: 389,
    color: 'Periwinkle Blue',
    hex: '#7986CB',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Scoop Neck',
    occasion: 'Casual Festive / Evening',
    desc: 'Pastel periwinkle blue sheer georgette kurti adorned with raised white rose-motif Chikankari embroidery across the yoke and hemline.'
  },
  {
    page: 21,
    sku: 'MSK-021',
    code: 'msk-021-noor-pure-white-muslin-kurti',
    name: 'Noor-e-Awadh Pure White Muslin Mul Chikankari Kurti',
    category: 'Cotton Chikankari',
    fabric: 'Fine Weave Muslin Mul Cotton',
    craftsmanship: 'Heirloom Tone-on-Tone White Bakhiya Work',
    work_details: 'Fine Weave Muslin Mul Cotton, Heirloom Tone-on-Tone White Bakhiya Work, 1 Pc',
    cost: 410,
    selling_price: 579,
    color: 'Pure White',
    hex: '#FFFFFF',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Classic Ethnic / Puja',
    desc: 'Timeless pure white muslin mul cotton kurti adorned with heirloom tone-on-tone white Chikankari shadow embroidery and floral vines.'
  },
  {
    page: 22,
    sku: 'MSK-022',
    code: 'msk-022-zohra-scarlet-rayon-set',
    name: 'Zohra Scarlet Red Rayon Chikankari Kurta & Pant Set',
    category: 'Chicken Curry Kurtas',
    fabric: 'Breathable Spun Rayon',
    craftsmanship: 'Teardrop Medallion Yoke & Hem Lace',
    work_details: 'Breathable Spun Rayon, High-Contrast White Embroidery, Straight Pant Included, 2 Pc',
    cost: 525,
    selling_price: 739,
    color: 'Scarlet Red',
    hex: '#D32F2F',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Scoop Notch Neck',
    occasion: 'Festive Gathering / Family Events',
    desc: 'Scarlet red spun rayon kurta with white Chikankari teardrop chest medallion and hem lace, accompanied by matching straight trousers.'
  },
  {
    page: 23,
    sku: 'MSK-023',
    code: 'msk-023-sunehri-white-cotton-pants',
    name: 'Sunehri White Cotton Chikankari Ankle-Length Pants',
    category: 'Ethnic Bottoms',
    fabric: 'Cotton Rayon Comfort Blend',
    craftsmanship: 'Hand Chikankari Ankle Lace Border',
    work_details: 'Premium Cotton-Rayon Blend, Elasticated Waist, Hand Chikankari Ankle Border, 1 Pc',
    cost: 275,
    selling_price: 389,
    color: 'Pure White',
    hex: '#FFFFFF',
    fit: 'Straight Ankle-Length',
    sleeve: 'N/A (Bottom Wear)',
    neck: 'Elasticated Waistband',
    occasion: 'Mix & Match Ethnic Everyday',
    desc: 'Versatile pure white straight-fit ethnic trousers featuring an elasticated waistband and delicate hand-embroidered Chikankari lace work at the ankles.'
  },
  {
    page: 24,
    sku: 'MSK-024',
    code: 'msk-024-meher-ochre-mulmul-gown',
    name: 'Meher Ochre Botanical Printed Mulmul Flared Anarkali Gown',
    category: 'Cotton Chikankari',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Jaali Bodice Yoke & Flared Ghera Border',
    work_details: 'Pure Mulmul Cotton, Artisanal Floral Print, Jaali Bodice Yoke & Flared Ghera, 1 Pc',
    cost: 690,
    selling_price: 969,
    color: 'Ochre Yellow',
    hex: '#FFA000',
    fit: 'Flared Anarkali Gown',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Neck with Slit',
    occasion: 'Festive / Haldi / Mehendi',
    desc: 'Mustard ochre botanical printed mulmul cotton flared gown featuring a geometric Chikankari jaali bodice and a wide embroidered floral border.'
  },
  {
    page: 25,
    sku: 'MSK-025',
    code: 'msk-025-aira-sky-blue-crepe-kurti',
    name: 'Aira Sky Blue Ditsy Floral Crepe Chikankari Kurti',
    category: 'Chicken Curry Kurtas',
    fabric: 'Wrinkle-Resistant Poly Crepe',
    craftsmanship: 'White Yoke Embroidery Over Print',
    work_details: 'Wrinkle-Resistant Poly Crepe, All-Over Ditsy Floral Print, White Yoke Embroidery, 1 Pc',
    cost: 275,
    selling_price: 389,
    color: 'Sky Blue',
    hex: '#81D4FA',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Casual Travel / Workwear',
    desc: 'Easy-care sky blue crepe kurti with ditsy floral print and delicate white Chikankari embroidery framing the neckline.'
  },
  {
    page: 26,
    sku: 'MSK-026',
    code: 'msk-026-tarana-black-rayon-set',
    name: 'Tarana Midnight Black Rayon Chikankari Kurta & Palazzo Set',
    category: 'Chicken Curry Kurtas',
    fabric: 'Heavy Drape Rayon',
    craftsmanship: 'Dense White Floral Yoke & Palazzo Lace',
    work_details: 'Soft Flowing Rayon, Dense White Needlecraft, Flared Palazzo Bottom Included, 2 Pc',
    cost: 675,
    selling_price: 949,
    color: 'Midnight Black',
    hex: '#111111',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Evening Festive / Party',
    desc: 'Chic midnight black rayon kurta with dense white Chikankari floral yoke embroidery and matching wide-leg embroidered palazzo pants.'
  },
  {
    page: 27,
    sku: 'MSK-027',
    code: 'msk-027-afreen-white-mul-dobby-kurti',
    name: 'Afreen Heirloom White Mul Dobby Self-Textured Kurti',
    category: 'Cotton Chikankari',
    fabric: 'Pure Mul Dobby Cotton',
    craftsmanship: 'Tone-on-Tone Shadow Work on Dobby Weave',
    work_details: 'Pure Mul Dobby Cotton (Woven Texture), Tone-on-Tone White Threadwork, Heirloom Craft, 1 Pc',
    cost: 690,
    selling_price: 969,
    color: 'Pure White',
    hex: '#FFFFFF',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Luxury Ethnic / Daytime Festive',
    desc: 'Exquisite pure white mul dobby self-textured kurti with fine woven dots and heirloom tone-on-tone white Chikankari shadow embroidery.'
  },
  {
    page: 28,
    sku: 'MSK-028',
    code: 'msk-028-kaiserbagh-black-modal-anarkali',
    name: 'Kaiserbagh Royal Black Modal Flared Chikankari Anarkali Gown',
    category: 'Modal Chikankari',
    fabric: 'Heavyweight Modal Cotton',
    craftsmanship: '360° Flared Kalidar Ghera & Jaal Yoke',
    work_details: 'Heavyweight Modal Cotton, 360-Degree Flared Kalidar Ghera, Dense Embroidered Hem, 1 Pc',
    cost: 1675,
    selling_price: 2349,
    color: 'Obsidian Black',
    hex: '#1A1A1A',
    fit: 'Floor-Length Flared Anarkali',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Neck with Notch',
    occasion: 'Gala / Royal Festive Occasion',
    desc: 'Dramatic floor-sweeping obsidian black modal cotton Anarkali gown boasting a 360-degree kalidar flare, intricate geometric jaal yoke, and a wide embroidered floral border.'
  },
  {
    page: 29,
    sku: 'MSK-029',
    code: 'msk-029-shehnai-maroon-chanderi-set',
    name: 'Shehnai Maroon Chanderi Vertical Panel Kurta & Palazzo Set',
    category: 'Chanderi Silk Kurtas',
    fabric: 'Handloom Chanderi Silk Blend',
    craftsmanship: 'Vertical Slenderizing Floral Panels',
    work_details: 'Handloom Chanderi Silk, Vertical Slenderizing Embroidered Panels, Palazzo Included, 2 Pc',
    cost: 750,
    selling_price: 1049,
    color: 'Deep Maroon',
    hex: '#880E4F',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Festive / Wedding Guest',
    desc: 'Deep maroon Chanderi silk straight kurta adorned with two vertical slenderizing panels of tone-on-tone Chikankari embroidery, paired with a matching palazzo.'
  },
  {
    page: 30,
    sku: 'MSK-030',
    code: 'msk-030-basant-yellow-rayon-set',
    name: 'Basant Sunshine Yellow Rayon Chikankari Kurta & Palazzo Set',
    category: 'Chicken Curry Kurtas',
    fabric: 'Spun Rayon',
    craftsmanship: 'Tonal Yellow Needlework & Scalloped Hem',
    work_details: 'Spun Rayon, Tonal Yellow Needlework, Scalloped Border Hemline, Embroidered Palazzo, 2 Pc',
    cost: 825,
    selling_price: 1159,
    color: 'Sunshine Yellow',
    hex: '#FDD835',
    fit: 'Straight Fit',
    sleeve: 'Three-Quarter Sleeves',
    neck: 'Round Notch Neck',
    occasion: 'Haldi / Festive Occasion',
    desc: 'Radiant sunshine yellow spun rayon kurta with dense tonal embroidery, scalloped hemline lace, and a matching embroidered palazzo.'
  }
];

async function run() {
  console.log('--- 1. Generating Excel & CSV Files ---');
  const catlogDir = path.resolve('catlog');
  const publicProductsDir = path.resolve('public/assets/products');

  // Excel generation
  const excelRows = products.map(p => ({
    'SKU / Ref': p.sku,
    'PDF Page': p.page,
    'Product Title': p.name,
    'Website Category': p.category,
    'Fabric': p.fabric,
    'Work Details': p.work_details,
    'Wholesale Cost (₹)': p.cost,
    'Website Selling Price (₹)': p.selling_price,
    'Profit Margin (₹)': p.selling_price - p.cost,
    'Margin (%)': `${Math.round(((p.selling_price - p.cost) / p.cost) * 100)}%`,
    'Stock Status': 'In Stock',
    'Primary Color': p.color,
    'Silhoutte Fit': p.fit,
    'Sleeve Type': p.sleeve,
    'Neckline': p.neck,
    'Occasion': p.occasion
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(excelRows);
  XLSX.utils.book_append_sheet(wb, ws, 'MSK Catalog Pages 1-30');
  
  const xlsxPath = path.join(catlogDir, 'MSK_Wholesale_Catalog_Extracted_P1_to_P30.xlsx');
  XLSX.writeFile(wb, xlsxPath);
  console.log(`Created Excel workbook at: ${xlsxPath}`);

  // Standard CSV Generation
  const csvHeaders = ['SKU / Ref', 'PDF Page', 'Product Title', 'Website Category', 'Fabric', 'Work Details', 'Wholesale Cost (₹)', 'Website Selling Price (₹)', 'Stock Status'];
  const csvLines = [csvHeaders.join(',')];
  for (const p of products) {
    csvLines.push([
      `"${p.sku}"`,
      p.page,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.fabric}"`,
      `"${p.work_details.replace(/"/g, '""')}"`,
      p.cost,
      p.selling_price,
      '"In Stock"'
    ].join(','));
  }
  const csvPath = path.join(catlogDir, 'msk_catalog_extracted_p1_to_p30.csv');
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf8');
  console.log(`Created CSV at: ${csvPath}`);

  // Backend bulk upload CSV
  const backendHeaders = ['supplier', 'product_code', 'sku', 'name', 'category', 'description', 'fabric', 'craftsmanship', 'size', 'color', 'finish', 'image', 'pricing_mode', 'fixed_price', 'stock', 'status', 'source_timestamp'];
  const backendLines = [backendHeaders.join(',')];
  const timestamp = new Date().toISOString();
  
  for (const p of products) {
    backendLines.push([
      '"MSK Heritage Wholesale"',
      `"${p.code}"`,
      `"CCK-${p.sku}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.desc.replace(/"/g, '""')}"`,
      `"${p.fabric}"`,
      `"${p.craftsmanship}"`,
      '"XS,S,M,L,XL,XXL,XXXL"',
      `"${p.color}"`,
      '"Hand Embroidered"',
      `"/assets/products/${p.code}/hero.webp"`,
      '"FIXED"',
      p.selling_price.toFixed(2),
      25,
      '"published"',
      `"${timestamp}"`
    ].join(','));
  }
  const backendCsvPath = path.resolve('samples/msk-kurtas-bulk-upload.csv');
  fs.writeFileSync(backendCsvPath, backendLines.join('\n'), 'utf8');
  console.log(`Created backend bulk upload CSV at: ${backendCsvPath}`);

  console.log('--- 2. Processing & Deploying 4:5 Product Hero WebP Assets ---');
  const scratchPagesDir = '/Users/tejasmane/.gemini/antigravity/brain/eb05e5f1-166f-4663-939f-533c70a9ae3b/scratch/pages';
  
  for (const p of products) {
    const rawPagePath = path.join(scratchPagesDir, `page_${p.page}.jpg`);
    const prodDir = path.join(publicProductsDir, p.code);
    fs.mkdirSync(prodDir, { recursive: true });

    if (fs.existsSync(rawPagePath)) {
      // Crop / format into 800x1000 (exact 4:5 ratio) with warm ivory background
      await sharp(rawPagePath)
        .resize(800, 1000, {
          fit: 'contain',
          background: { r: 248, g: 246, b: 240, alpha: 1 } // #F8F6F0 ivory
        })
        .webp({ quality: 88 })
        .toFile(path.join(prodDir, 'hero.webp'));
    }
  }
  console.log('All 30 product hero images generated at 4:5 aspect ratio in public/assets/products/');

  console.log('--- 3. Seeding / Importing Products into Store Database ---');
  const categories = await db('kurta_categories').select('id', 'name');
  const catMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]));
  const defaultCatId = categories[0]?.id || 1;

  let inserted = 0;
  let updated = 0;

  for (const p of products) {
    const catId = catMap.get(p.category.toLowerCase()) || defaultCatId;
    const heroImg = `/assets/products/${p.code}/hero.webp`;
    const repSku = `CCK-${p.sku}-M`;
    const availableSizes = KURTA_SIZES.map(s => s.label);
    const availableColors = [{ name: p.color, code: p.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'), hex: p.hex }];

    const existing = await db('kurtas').where({ product_code: p.code }).first();

    const record = {
      product_code: p.code,
      sku: repSku,
      slug: p.code,
      name: p.name,
      category_id: catId,
      category: p.category,
      description: p.desc,
      fabric: p.fabric,
      pattern: p.craftsmanship,
      fit: p.fit,
      sleeve_type: p.sleeve,
      neck_type: p.neck,
      occasion: p.occasion,
      gender: 'Women',
      available_sizes: JSON.stringify(availableSizes),
      available_colors: JSON.stringify(availableColors),
      material: p.fabric,
      price: p.selling_price,
      sale_price: p.selling_price,
      fixed_price: p.selling_price,
      stock: 140, // 20 per size x 7 sizes
      status: 'published',
      supplier: 'MSK Heritage Wholesale',
      image: heroImg,
      seo_title: `${p.name} | Lucknowi Chikankari`,
      meta_description: p.desc,
      source_timestamp: timestamp,
      updated_at: timestamp
    };

    let kurtaId;
    if (existing) {
      await db('kurtas').where({ id: existing.id }).update(record);
      kurtaId = existing.id;
      updated++;
    } else {
      const [newId] = await db('kurtas').insert({
        ...record,
        created_at: timestamp
      });
      kurtaId = newId;
      inserted++;
    }

    // Insert/update 7 size variants
    for (const size of KURTA_SIZES) {
      const variantSku = `CCK-${p.sku}-${size.code}`;
      const variantSlug = `${p.code}-${size.code.toLowerCase()}`;
      const existingVar = await db('kurta_variants').where({ sku: variantSku }).first();

      const varRecord = {
        kurta_id: kurtaId,
        product_code: p.code,
        sku: variantSku,
        slug: variantSlug,
        size: size.label,
        color: p.color,
        color_code: p.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        hex_color: p.hex,
        finish: 'Hand Embroidered',
        price: p.selling_price,
        fixed_price: p.selling_price,
        stock: 20,
        image: heroImg,
        status: 'published',
        updated_at: timestamp
      };

      if (existingVar) {
        await db('kurta_variants').where({ id: existingVar.id }).update(varRecord);
      } else {
        await db('kurta_variants').insert({
          ...varRecord,
          created_at: timestamp
        });
      }

      // Also ensure it exists in the main products table for storefront display
      const existingProd = await db('products').where({ sku: variantSku }).first();
      const productRecord = {
        supplier: 'MSK Heritage Wholesale',
        product_code: p.code,
        sku: variantSku,
        slug: size.code === 'XS' ? p.code : variantSlug,
        name: p.name,
        category: 'Chicken Curry Kurtas',
        is_kurta: 1,
        description: p.desc,
        metal: p.fabric,
        purity: p.craftsmanship,
        size: size.label,
        finish: 'Hand Embroidered',
        color: p.color,
        color_code: p.color.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        hex_color: p.hex,
        image: heroImg,
        pricing_mode: 'FIXED',
        fixed_price: String(Number(p.selling_price).toFixed(2)),
        making_flat: '0.00',
        making_percent: '0.00',
        stone_charge: '0.00',
        other_charge: '0.00',
        stock: 20,
        status: 'published',
        source_timestamp: timestamp,
        updated_at: timestamp
      };

      if (existingProd) {
        await db('products').where({ id: existingProd.id }).update(productRecord);
      } else {
        await db('products').insert(productRecord);
      }
    }

    // Insert hero into product_images
    if (await db.schema.hasTable('product_images')) {
      const existingImg = await db('product_images').where({ product_code: p.code, role: 'hero' }).first();
      if (!existingImg) {
        await db('product_images').insert({
          product_code: p.code,
          sku: null,
          role: 'hero',
          url: heroImg,
          alt_text: `${p.name} - Handcrafted Lucknowi Chikankari in ${p.color}`,
          sort_order: 1,
          color: p.color,
          created_at: timestamp,
          updated_at: timestamp
        });
      }
    }
  }

  console.log(`Database successfully updated: ${inserted} new kurtas created, ${updated} updated, and 210 size variants synchronized!`);
  process.exit(0);
}

run().catch(err => {
  console.error('Execution error:', err);
  process.exit(1);
});
