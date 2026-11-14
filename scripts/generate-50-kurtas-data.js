import fs from 'node:fs';
import path from 'node:path';

// 50 Unique Indian Models (Adult Indian female identities, consistent per design)
export const MODELS_50 = [
  { name: 'Ananya Sharma', city: 'New Delhi', age: 26, height: "5'8\"", tone: 'Warm wheatish', styling: 'Regal bridal elegance' },
  { name: 'Meera Rajput', city: 'Jaipur', age: 27, height: "5'7\"", tone: 'Golden olive', styling: 'Heritage Rajasthani poise' },
  { name: 'Priya Nair', city: 'Kochi', age: 25, height: "5'9\"", tone: 'Luminous dusky', styling: 'Classic South Indian grace' },
  { name: 'Riya Sen', city: 'Kolkata', age: 28, height: "5'6\"", tone: 'Fair radiant', styling: 'Poetic Bengali sophistication' },
  { name: 'Tanvi Kulkarni', city: 'Pune', age: 26, height: "5'8\"", tone: 'Warm honey', styling: 'Minimalist Peshwai charm' },
  { name: 'Kavya Patel', city: 'Ahmedabad', age: 27, height: "5'7\"", tone: 'Sunlit warm', styling: 'Festive Gujarati sparkle' },
  { name: 'Aarohi Deshmukh', city: 'Nagpur', age: 25, height: "5'8\"", tone: 'Golden wheatish', styling: 'Modern royal posture' },
  { name: 'Ishita Roy', city: 'Kolkata', age: 29, height: "5'7\"", tone: 'Porcelain fair', styling: 'Artistic vintage charm' },
  { name: 'Sneha Reddy', city: 'Hyderabad', age: 26, height: "5'9\"", tone: 'Warm olive', styling: 'Deccani aristocratic grandeur' },
  { name: 'Pooja Hegde', city: 'Bengaluru', age: 27, height: "5'8\"", tone: 'Caramel bronze', styling: 'Contemporary urban chic' },
  { name: 'Divya Menon', city: 'Chennai', age: 28, height: "5'7\"", tone: 'Warm bronze', styling: 'Traditional temple poise' },
  { name: 'Roshni Chawla', city: 'Amritsar', age: 24, height: "5'8\"", tone: 'Fair rosy', styling: 'Vibrant Punjabi radiance' },
  { name: 'Tara Alva', city: 'Mangaluru', age: 26, height: "5'7\"", tone: 'Luminous wheatish', styling: 'Coastal serenity' },
  { name: 'Shreya Bhat', city: 'Udaipur', age: 27, height: "5'8\"", tone: 'Warm golden', styling: 'Mewari palace grace' },
  { name: 'Ananya Joshi', city: 'Indore', age: 25, height: "5'6\"", tone: 'Warm peach', styling: 'Central Indian subtlety' },
  { name: 'Kriti Singhania', city: 'Bhopal', age: 28, height: "5'8\"", tone: 'Golden honey', styling: 'Nawabi regal poise' },
  { name: 'Simran Kaur', city: 'Chandigarh', age: 26, height: "5'9\"", tone: 'Fair radiant', styling: 'Statuesque modern elegance' },
  { name: 'Radhika Varma', city: 'Lucknow', age: 27, height: "5'7\"", tone: 'Warm wheatish', styling: 'True Awadhi tehzeeb' },
  { name: 'Alisha Merchant', city: 'Mumbai', age: 29, height: "5'8\"", tone: 'Olive sun-kissed', styling: 'High-fashion editorial' },
  { name: 'Pallavi Rao', city: 'Mysuru', age: 26, height: "5'7\"", tone: 'Warm bronze', styling: 'Wodeyar courtly grace' },
  { name: 'Neha Sengupta', city: 'Siliguri', age: 25, height: "5'6\"", tone: 'Golden fair', styling: 'Himalayan foothills fresh' },
  { name: 'Aakanksha Saxena', city: 'Lucknow', age: 28, height: "5'8\"", tone: 'Warm wheatish', styling: 'Chikankari connoisseur' },
  { name: 'Bhavna Solanki', city: 'Vadodara', age: 27, height: "5'7\"", tone: 'Honey bronze', styling: 'Gaekwad heritage posture' },
  { name: 'Gauri Dixit', city: 'Varanasi', age: 26, height: "5'6\"", tone: 'Warm golden', styling: 'Ganga ghat spiritual serene' },
  { name: 'Trisha Banerjee', city: 'Howrah', age: 27, height: "5'8\"", tone: 'Radiant wheatish', styling: 'Cultural revivalist chic' },
  { name: 'Aishwarya Pillai', city: 'Trivandrum', age: 28, height: "5'9\"", tone: 'Luminous dusky', styling: 'Travancore royalty poise' },
  { name: 'Manju Somani', city: 'Jodhpur', age: 26, height: "5'7\"", tone: 'Golden olive', styling: 'Marwar fortress majesty' },
  { name: 'Shweta Khemka', city: 'Patna', age: 27, height: "5'8\"", tone: 'Warm peach', styling: 'Pataliputra classical' },
  { name: 'Payal Mittal', city: 'Surat', age: 25, height: "5'7\"", tone: 'Warm honey', styling: 'Textile artisan heiress' },
  { name: 'Nandita Sundaram', city: 'Madurai', age: 29, height: "5'7\"", tone: 'Warm bronze', styling: 'Meenakshi Amman devotion' },
  { name: 'Swati Agnihotri', city: 'Kanpur', age: 26, height: "5'8\"", tone: 'Golden wheatish', styling: 'Ganges heartland dignity' },
  { name: 'Richa Kapoor', city: 'Ludhiana', age: 27, height: "5'9\"", tone: 'Fair radiant', styling: 'Opulent festive flair' },
  { name: 'Mansi Mehta', city: 'Rajkot', age: 25, height: "5'7\"", tone: 'Sunlit olive', styling: 'Saurashtra traditional' },
  { name: 'Niharika Das', city: 'Bhubaneswar', age: 26, height: "5'7\"", tone: 'Warm bronze', styling: 'Odissi classical beauty' },
  { name: 'Rupali Shekhawat', city: 'Bikaner', age: 28, height: "5'8\"", tone: 'Golden wheatish', styling: 'Desert nobility stance' },
  { name: 'Aditi Mahajan', city: 'Jammu', age: 25, height: "5'8\"", tone: 'Porcelain rosy', styling: 'Dogra royal refinement' },
  { name: 'Megha Trivedi', city: 'Nashik', age: 27, height: "5'7\"", tone: 'Warm olive', styling: 'Godavari temple tranquility' },
  { name: 'Veda Nambiar', city: 'Thrissur', age: 26, height: "5'8\"", tone: 'Luminous dusky', styling: 'Kathakali expressive poise' },
  { name: 'Zoya Siddiqui', city: 'Lucknow', age: 28, height: "5'7\"", tone: 'Warm peach', styling: 'Kaiserbagh palace nostalgia' },
  { name: 'Sunita Gowda', city: 'Hubli', age: 27, height: "5'8\"", tone: 'Warm honey', styling: 'Deccan plateau earthy grace' },
  { name: 'Natasha D\'Souza', city: 'Panaji', age: 26, height: "5'8\"", tone: 'Golden sun-kissed', styling: 'Indo-Portuguese coastal breezy' },
  { name: 'Aparna Kaushik', city: 'Haridwar', age: 28, height: "5'7\"", tone: 'Fair radiant', styling: 'Devbhoomi serene majesty' },
  { name: 'Karishma Parekh', city: 'Valsad', age: 25, height: "5'6\"", tone: 'Warm wheatish', styling: 'South Gujarat floral delicacy' },
  { name: 'Shruti Rastogi', city: 'Prayagraj', age: 27, height: "5'8\"", tone: 'Warm golden', styling: 'Triveni confluence charm' },
  { name: 'Jyoti Rathore', city: 'Ajmer', age: 26, height: "5'8\"", tone: 'Golden olive', styling: 'Taragarh hilltop majesty' },
  { name: 'Sanya Grover', city: 'Gurugram', age: 28, height: "5'9\"", tone: 'Wheatish radiant', styling: 'Metropolitan corporate chic' },
  { name: 'Vidya Chandran', city: 'Coimbatore', age: 26, height: "5'7\"", tone: 'Warm bronze', styling: 'Kongu country textile quietude' },
  { name: 'Malini Ghosh', city: 'Asansol', age: 27, height: "5'6\"", tone: 'Warm honey', styling: 'Terracotta heartland poise' },
  { name: 'Leela Raman', city: 'Salem', age: 29, height: "5'8\"", tone: 'Luminous bronze', styling: 'Tamil heritage grandeur' },
  { name: 'Hansika Mathur', city: 'Noida', age: 25, height: "5'8\"", tone: 'Fair peach', styling: 'New-age ethnic avant-garde' }
];

// Color palettes for 5 variants per style (Signature, Pastel, Jewel, Earthy, Contrast)
export const COLOR_PALETTES = [
  [
    { name: 'Ivory White', code: 'ivory', hex: '#FFFFF0', modulate: { hue: 0, saturation: 1.0, brightness: 1.02 } },
    { name: 'Rose Blush', code: 'blush', hex: '#F7CAC9', modulate: { hue: 345, saturation: 1.15, brightness: 1.02 } },
    { name: 'Sage Green', code: 'sage', hex: '#9CAF88', modulate: { hue: 100, saturation: 0.95, brightness: 1.0 } },
    { name: 'Sky Blue', code: 'sky', hex: '#87CEEB', modulate: { hue: 205, saturation: 1.2, brightness: 1.02 } },
    { name: 'Mustard Ochre', code: 'mustard', hex: '#E1AD01', modulate: { hue: 45, saturation: 1.35, brightness: 1.0 } }
  ],
  [
    { name: 'Rose Blush', code: 'blush', hex: '#F7CAC9', modulate: { hue: 345, saturation: 1.15, brightness: 1.02 } },
    { name: 'Powder Blue', code: 'powder-blue', hex: '#B0E0E6', modulate: { hue: 200, saturation: 1.15, brightness: 1.05 } },
    { name: 'Royal Navy', code: 'royal-navy', hex: '#1B2F4E', modulate: { hue: 215, saturation: 1.35, brightness: 0.78 } },
    { name: 'Terracotta Rust', code: 'terracotta', hex: '#CC4E33', modulate: { hue: 15, saturation: 1.25, brightness: 0.9 } },
    { name: 'Pearl Ivory', code: 'ivory', hex: '#FFFFF0', modulate: { hue: 0, saturation: 1.0, brightness: 1.02 } }
  ],
  [
    { name: 'Sage Green', code: 'sage', hex: '#9CAF88', modulate: { hue: 100, saturation: 0.95, brightness: 1.0 } },
    { name: 'Ivory Gold', code: 'ivory-gold', hex: '#FAF0E6', modulate: { hue: 40, saturation: 0.8, brightness: 1.08 } },
    { name: 'Emerald Olive', code: 'emerald-olive', hex: '#556B2F', modulate: { hue: 90, saturation: 1.15, brightness: 0.86 } },
    { name: 'Wine Burgundy', code: 'wine', hex: '#722F37', modulate: { hue: 330, saturation: 1.25, brightness: 0.82 } },
    { name: 'Lilac Lavender', code: 'lilac', hex: '#E6E6FA', modulate: { hue: 265, saturation: 1.1, brightness: 1.05 } }
  ],
  [
    { name: 'Sky Blue', code: 'sky', hex: '#87CEEB', modulate: { hue: 205, saturation: 1.2, brightness: 1.02 } },
    { name: 'Peach Whisper', code: 'peach', hex: '#FFE5B4', modulate: { hue: 22, saturation: 1.2, brightness: 1.04 } },
    { name: 'Teal Peacock', code: 'teal', hex: '#005F73', modulate: { hue: 175, saturation: 1.25, brightness: 0.85 } },
    { name: 'Oatmeal Beige', code: 'oatmeal', hex: '#E6D7C3', modulate: { hue: 30, saturation: 0.85, brightness: 1.02 } },
    { name: 'Midnight Onyx', code: 'black', hex: '#1A1A1A', modulate: { hue: 0, saturation: 0.1, brightness: 0.58 } }
  ]
];

export const RAW_KURTA_SPECS = [
  // 1-10
  {
    code: 'lucknowi-ivory-chikankari-cotton-kurta',
    name: 'Noor-e-Awadh Royal Mulmul Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Authentic Lucknowi Chikankari · Tepchi & Bakhiya Stitches',
    desc: 'Handcrafted in pre-washed, ultra-soft pure mulmul cotton with heirloom Bakhiya shadow-work and delicate floral butis along the daman.',
    price: 3299,
    base: 'ivory'
  },
  {
    code: 'rose-blush-georgette-chikankari-kurta',
    name: 'Gulzar Flowing Georgette Chikankari Kurta',
    fabric: 'Viscose Georgette (with Cotton Inner)',
    craftsmanship: 'All-Over Floral Jaal & Raised Phanda Knots',
    desc: 'Flowing viscose georgette kurta featuring intricate pearl-like Phanda knotting and all-over floral jaal embroidery. Includes matching slip.',
    price: 3499,
    base: 'blush'
  },
  {
    code: 'sage-green-chanderi-chikankari-kurta',
    name: 'Nazm Shahi Chanderi Silk Chikankari Kurta',
    fabric: 'Handloom Chanderi Silk',
    craftsmanship: 'Murri & Keel Kangan Needlework with Zari Accents',
    desc: 'Shimmering handloom Chanderi silk with fine rice-grain Murri needlecraft and delicate gold zari tipping along the collar and cuffs.',
    price: 3699,
    base: 'sage'
  },
  {
    code: 'sky-blue-mulmul-chikankari-kurta',
    name: 'Mehtab Breathable Mulmul Chikankari Kurta',
    fabric: 'Fine Count Breathable Mulmul Cotton',
    craftsmanship: 'Delicate Keel Kangan Vines & Ghaspatti Stitch',
    desc: 'Breezy daytime mulmul silhouette adorned with flowing leafy vines and traditional Awadhi ghaspatti embroidery.',
    price: 3199,
    base: 'ivory'
  },
  {
    code: 'nazaakat-angrakha-chikankari-kurta',
    name: 'Nazaakat Royal Flared Angrakha Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Asymmetric Tie-Up with Cutwork Jaali',
    desc: 'Regal Mughal-inspired overlapping front with hand-tied tassels, detailed with fine needle-pulled jaali cutwork and shadow embroidery.',
    price: 3899,
    base: 'ivory'
  },
  {
    code: 'anarkali-darbar-chikankari-kurta',
    name: 'Darbar Kalidar Anarkali Chikankari Kurta',
    fabric: 'Fluid Viscose Georgette',
    craftsmanship: '24-Kali Flared Ghera with Pearl Phanda Knots',
    desc: 'Sweeping 24-kali flared Anarkali silhouette designed with dense pearl Phanda knots and scalloped embroidered border.',
    price: 4299,
    base: 'blush'
  },
  {
    code: 'zeenat-straight-chanderi-kurta',
    name: 'Zeenat Classic Straight Chanderi Kurta',
    fabric: 'Chanderi Silk Cotton',
    craftsmanship: 'Intricate Neck Yoke & Embroidered Cuffs',
    desc: 'Tailored straight silhouette with a dramatic high-coverage neckline yoke and symmetrical geometric Chikankari motifs.',
    price: 3599,
    base: 'sage'
  },
  {
    code: 'ruhaani-modal-chikankari-kurta',
    name: 'Ruhaani Modal Cotton Comfort Kurta',
    fabric: 'Pure Modal Cotton',
    craftsmanship: 'Ultra-Soft Drape with Dense Bakhiya Work',
    desc: 'Silky soft modal cotton fabric that drapes effortlessly, accented with signature Awadhi floral medallions and side slit embroidery.',
    price: 3399,
    base: 'ivory'
  },
  {
    code: 'mumtaz-kota-doria-chikankari-kurta',
    name: 'Mumtaz Kota Doria Checked Chikankari Kurta',
    fabric: 'Authentic Kota Doria Cotton',
    craftsmanship: 'Fine Khat Weave with Shadow Work Motifs',
    desc: 'Featherlight geometric square-check weave with artisan shadow embroidery that glows translucently against natural light.',
    price: 3249,
    base: 'ivory'
  },
  {
    code: 'shabnam-viscose-georgette-kurta',
    name: 'Shabnam Evening Viscose Georgette Kurta',
    fabric: 'Heavy Viscose Georgette',
    craftsmanship: 'Dense Front Panel & Scalloped Sleeves',
    desc: 'Lustrous twilight tunic with heavy chest panel embroidery, scalloped cuffs, and matching dyed mulmul slip.',
    price: 3799,
    base: 'blush'
  },

  // 11-20
  {
    code: 'afreen-organza-chikankari-kurta',
    name: 'Afreen Sheer Organza Festive Kurta',
    fabric: 'Silk Organza (with Cotton Slip)',
    craftsmanship: 'Crisp Sheer Weave with Pastel Floral Butas',
    desc: 'Contemporary sheer organza structure featuring delicate hand-embroidered rosebuds and satin-finished hems.',
    price: 3999,
    base: 'sage'
  },
  {
    code: 'parizaad-tussar-silk-kurta',
    name: 'Parizaad Textured Tussar Silk Kurta',
    fabric: 'Handspun Tussar Silk',
    craftsmanship: 'Traditional Awadhi Bels & Raw Texture',
    desc: 'Richly textured wild silk crafted with earth-toned threadwork, showcasing century-old Lucknow floral creepers.',
    price: 4199,
    base: 'sage'
  },
  {
    code: 'jahanara-layered-chikankari-kurta',
    name: 'Jahanara Dual-Layer Festive Kurta',
    fabric: 'Mulmul & Sheer Georgette',
    craftsmanship: 'Tone-on-Tone Shadow & Ghaspatti Stitch',
    desc: 'Two-tiered layered silhouette featuring an embroidered mulmul base and floating sheer overlay with pearl-tipped hem.',
    price: 3849,
    base: 'ivory'
  },
  {
    code: 'dilkash-short-tunic-kurta',
    name: 'Dilkash Contemporary Short Tunic Kurta',
    fabric: 'Premium Cotton Slub',
    craftsmanship: 'Mandarin Collar with Minimalist Tepchi Stitches',
    desc: 'Modern hip-length short kurta designed for effortless pairing with denims or trousers, finished with subtle sleeve embroidery.',
    price: 2799,
    base: 'ivory'
  },
  {
    code: 'shahzadi-heavy-jaal-kurta',
    name: 'Shahzadi Bridal Heavy Jaal Kurta',
    fabric: 'Opulent Viscose Georgette',
    craftsmanship: 'Master Artisan All-Over Heirloom Jaal Work',
    desc: 'Exquisite museum-grade embroidery covering every inch of the fabric with intricate paisleys, jaalis, and raised phandas.',
    price: 4599,
    base: 'blush'
  },
  {
    code: 'sitara-mirror-chikankari-kurta',
    name: 'Sitara Subtle Mirror-Work Chikankari Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Delicate Abhla Mirrors Hand-Set in Phanda Knots',
    desc: 'Sparkling artisan mirrors embedded seamlessly into hand-embroidered floral motifs for understated festive shimmer.',
    price: 3549,
    base: 'ivory'
  },
  {
    code: 'subah-cotton-linen-kurta',
    name: 'Subah Linen-Cotton Breathable Kurta',
    fabric: 'Linen Cotton Blend',
    craftsmanship: 'Geometric Tepchi Stitches & Side Slit Bels',
    desc: 'Crisp and breathable everyday summer linen-cotton blend decorated with geometric linear threadwork and side slit accents.',
    price: 3149,
    base: 'sage'
  },
  {
    code: 'firdaus-slit-a-line-kurta',
    name: 'Firdaus Front-Slit A-Line Kurta',
    fabric: 'Pure Chanderi Silk',
    craftsmanship: 'Centred Slit with Elaborate Damask Needling',
    desc: 'Regal A-line silhouette with a centre-front slit and symmetrical Mughal damask motifs down both panels.',
    price: 3749,
    base: 'sage'
  },
  {
    code: 'noorjahan-embroidered-yoke-kurta',
    name: 'Noorjahan Scalloped Daman Kurta',
    fabric: 'Fine Viscose Georgette',
    craftsmanship: 'Cutwork Scallop Hem & High Neck Yoke',
    desc: 'Dramatic scalloped hemline created with needle-cut jaali and heavy floral sprays across the front yoke and sleeves.',
    price: 3899,
    base: 'blush'
  },
  {
    code: 'rahat-relaxed-mulmul-kurta',
    name: 'Rahat Relaxed Oversized Mulmul Kurta',
    fabric: 'Featherlight Mulmul Cotton',
    craftsmanship: 'Scattered Floral Butis with Bakhiya Shadow Stitch',
    desc: 'Relaxed easy-fit everyday kurta featuring breezy dolman sleeves and delicate scattered star and blossom embroidery.',
    price: 2999,
    base: 'ivory'
  },

  // 21-30
  {
    code: 'roohani-tissue-zari-chikankari-kurta',
    name: 'Roohani Tissue Silk Zari Chikankari Kurta',
    fabric: 'Metallic Tissue Silk',
    craftsmanship: 'Fine Gold Zari Wire & Delicate Keel Kangan',
    desc: 'Luminous metallic tissue silk kurta woven with gossamer gold yarns, detailed with traditional fine keel kangan leaf embroidery.',
    price: 4499,
    base: 'ivory'
  },
  {
    code: 'malwa-maheshwari-silk-cotton-kurta',
    name: 'Malwa Heritage Maheshwari Chikankari Kurta',
    fabric: 'Maheshwari Silk Cotton',
    craftsmanship: 'Reversible Striped Border with Tepchi Floral Bel',
    desc: 'Traditional Maheshwari weave characterized by lustrous reversible gold borders, accented with intricate tone-on-tone Chikankari sprays.',
    price: 3649,
    base: 'sage'
  },
  {
    code: 'koh-i-noor-tilla-chikankari-kurta',
    name: 'Koh-i-Noor Tilla Needlework Chikankari Kurta',
    fabric: 'Fine Count Viscose Georgette',
    craftsmanship: 'Kashmiri Tilla Metallic Cording with Awadhi Shadow Stitch',
    desc: 'Harmonious confluence of Lucknow shadow needlecraft and fine Kashmiri metallic tilla outlines around majestic chinar leaves.',
    price: 4399,
    base: 'blush'
  },
  {
    code: 'gulmohar-flared-kalidar-kurta',
    name: 'Gulmohar 32-Kali Festive Kalidar Kurta',
    fabric: 'Featherlight Pure Mulmul',
    craftsmanship: '32 Flared Fluted Kalis with Scalloped Ghera',
    desc: 'Dramatic 32-panel kalidar gown with micro-gathers at the waist and full circumference hand-embroidered floral creepers.',
    price: 4799,
    base: 'ivory'
  },
  {
    code: 'dharani-raw-silk-formal-kurta',
    name: 'Dharani Handspun Raw Silk Formal Kurta',
    fabric: 'Handspun Raw Silk',
    craftsmanship: 'Structured Tailoring with Dense Yoke Needlecraft',
    desc: 'Sculptured raw silk straight-cut tunic designed for winter soirées, featuring dense Awadhi raised-stitch work across chest and cuffs.',
    price: 4249,
    base: 'sage'
  },
  {
    code: 'sitara-badla-wirework-kurta',
    name: 'Sitara Badla Mukaish Wirework Kurta',
    fabric: 'Viscose Georgette with Pure Cotton Inner',
    craftsmanship: 'Hammered Silver Badla Metallic Wire Accents',
    desc: 'Shimmering vintage Mukaish dots individually flattened into gossamer georgette alongside raised floral Phanda knots.',
    price: 3999,
    base: 'blush'
  },
  {
    code: 'chandrika-crescent-neckline-kurta',
    name: 'Chandrika Crescent Scalloped Kurta',
    fabric: 'Pre-Washed Mulmul Cotton',
    craftsmanship: 'Curved Crescent Collar with Needle-Drawn Jaali',
    desc: 'Feminine curved neckline shaped with openwork jaali lace and trailing jasmine vines along both side slits.',
    price: 3349,
    base: 'ivory'
  },
  {
    code: 'mehfil-tiered-peplum-kurta',
    name: 'Mehfil Flared Tiered Peplum Kurta',
    fabric: 'Silk Chanderi',
    craftsmanship: 'Two-Tier Flared Peplum with Floral Bootas',
    desc: 'Contemporary short peplum silhouette pairing effortlessly with shararas or palazzos, adorned with heritage Awadhi butis.',
    price: 3599,
    base: 'sage'
  },
  {
    code: 'shahi-farshi-high-slit-kurta',
    name: 'Shahi Farshi Floor-Length Slit Kurta',
    fabric: 'Luxe Viscose Georgette',
    craftsmanship: 'Floor-Length Ankle Grazing Cut with Twin Thigh Slits',
    desc: 'Elongated regal evening tunic with dramatic side slits and continuous scalloped needlework borders from hip to hem.',
    price: 4449,
    base: 'blush'
  },
  {
    code: 'jamdani-weave-floral-kurta',
    name: 'Jamdani Weave Floral Chikankari Kurta',
    fabric: 'Fine Cotton Jamdani',
    craftsmanship: 'Supplementary Weft Jamdani with Tonal Hand Needling',
    desc: 'Rare pairing of Bengal floral jamdani loom motifs and Lucknow hand-embroidered floral vines for the true textile collector.',
    price: 3899,
    base: 'ivory'
  },

  // 31-40
  {
    code: 'nazakat-boat-neck-mulmul-kurta',
    name: 'Nazakat Boat-Neck Daily Mulmul Kurta',
    fabric: 'Breathable Mulmul Cotton',
    craftsmanship: 'Wide Sabrina Neckline with Delicate Leaf Stitch',
    desc: 'Understated graceful boat neckline that highlights jewellery, decorated with gossamer ghaspatti leaves and pearl-stitch hems.',
    price: 3099,
    base: 'ivory'
  },
  {
    code: 'alizeh-sheer-draped-cape-kurta',
    name: 'Alizeh Sheer Draped Cape Chikankari Kurta',
    fabric: 'Fluid Georgette & Organza Cape',
    craftsmanship: 'Attached Flowing Shoulder Cape with Scallop Edging',
    desc: 'Showstopping silhouette featuring a sheer detachable shoulder cape embellished with hand-embroidered floral garlands.',
    price: 4899,
    base: 'blush'
  },
  {
    code: 'chashm-e-noor-pastel-whisper-kurta',
    name: 'Chashm-e-Noor Pastel Whisper Kurta',
    fabric: 'Pure Modal Chanderi',
    craftsmanship: 'Subtle Tone-on-Tone Tepchi & Murri Needling',
    desc: 'Poetic pastel daytime ensemble engineered for effortless comfort in tropical climates with discreet artisan embroidery.',
    price: 3449,
    base: 'sage'
  },
  {
    code: 'tarana-accordion-pleated-kurta',
    name: 'Tarana Accordion Pleated A-Line Kurta',
    fabric: 'Fine Viscose Georgette',
    craftsmanship: 'Permanent Micro-Pleats with Floral Border',
    desc: 'Sculpted accordion pleats expanding from chest to hem, weighted by a heavy hand-embroidered floral daman.',
    price: 3949,
    base: 'blush'
  },
  {
    code: 'sukoon-handwoven-khadi-kurta',
    name: 'Sukoon Handwoven Khadi Chikankari Kurta',
    fabric: '100% Handspun Khadi Cotton',
    craftsmanship: 'Textured Slub Surface with Organic Floral Sprays',
    desc: 'Honouring authentic Indian craft heritage with breathable handspun khadi yarns and unhurried heirloom Awadhi needlecraft.',
    price: 3299,
    base: 'ivory'
  },
  {
    code: 'begum-roshni-zardozi-fusion-kurta',
    name: 'Begum Roshni Zardozi Fusion Kurta',
    fabric: 'Opulent Chanderi Silk',
    craftsmanship: 'Chikankari Threadwork Framed in French Bullion Zardozi',
    desc: 'A royal bridal tunic combining matte white Chikankari shadow stitching with raised antique gold zardozi bullion framing.',
    price: 4999,
    base: 'sage'
  },
  {
    code: 'hina-slender-sleeve-border-kurta',
    name: 'Hina Slender Sleeve Border Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Elongated Fitted Sleeves with 6-Inch Embroidered Cuff',
    desc: 'Classic straight cut featuring vintage churidar-length slim sleeves crowned with dense floral cuff embroidery.',
    price: 3199,
    base: 'ivory'
  },
  {
    code: 'mehar-contemporary-asymmetric-kurta',
    name: 'Mehar Contemporary Asymmetric Kurta',
    fabric: 'Viscose Georgette',
    craftsmanship: 'Diagonal Angular Hemline with Cutwork Jaali',
    desc: 'Architectural high-fashion silhouette with a sweeping diagonal hemline that reveals ankle jewellery with every stride.',
    price: 3699,
    base: 'blush'
  },
  {
    code: 'suraiya-raised-phanda-jaal-kurta',
    name: 'Suraiya Masterwork Raised Phanda Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Dense Millet-Grain Phanda Knots Covering Entire Yoke',
    desc: 'Masterwork demonstrating the pin-sized raised millet knot technique executed with microscopic precision by master women artisans.',
    price: 3799,
    base: 'ivory'
  },
  {
    code: 'zahra-mandarin-placket-kurta',
    name: 'Zahra Tailored Mandarin Button Placket Kurta',
    fabric: 'Fine Cotton Linen',
    craftsmanship: 'Structured Bandhgala Collar with Fabric Potli Buttons',
    desc: 'Sharp bespoke-tailored tunic with a regal high collar and fabric potli buttons flanked by delicate linear embroidery.',
    price: 3399,
    base: 'sage'
  },

  // 41-50
  {
    code: 'rehana-fluted-organza-sleeve-kurta',
    name: 'Rehana Fluted Organza Sleeve Kurta',
    fabric: 'Mulmul Cotton with Organza Bell Sleeves',
    craftsmanship: 'Translucent Fluted Sleeves with Floral Butas',
    desc: 'Striking contrast of opaque cotton mulmul bodice with ethereal translucent bell sleeves bearing scattered blossom stitches.',
    price: 3599,
    base: 'ivory'
  },
  {
    code: 'tasveer-heirloom-kairi-paisley-kurta',
    name: 'Tasveer Heirloom Kairi Paisley Kurta',
    fabric: 'Fine Viscose Georgette',
    craftsmanship: 'Centred Mughal Kairi Paisleys with Shadow Infill',
    desc: 'Timeless paisley motifs derived from 18th-century Awadhi palace architectural frescoes, outlined with delicate running stitches.',
    price: 3649,
    base: 'blush'
  },
  {
    code: 'nargis-bloom-hand-embroidered-kurta',
    name: 'Nargis Bloom Hand-Embroidered Kurta',
    fabric: 'Pure Chanderi Silk',
    craftsmanship: 'Spring Narcissus Blossom Motifs & Zari Tipping',
    desc: 'Celebration of spring gardens rendered in shimmering Chanderi silk with open-petal floral motifs and metallic edges.',
    price: 3849,
    base: 'sage'
  },
  {
    code: 'dilruba-regal-gathered-empire-kurta',
    name: 'Dilruba Regal Gathered Empire Kurta',
    fabric: 'Luxe Viscose Georgette',
    craftsmanship: 'Empire Waist gathers with Dense Bodice Needling',
    desc: 'High-waisted royal empire silhouette creating an elongated flowing line, rich with tonal chest and sleeve needlework.',
    price: 4149,
    base: 'blush'
  },
  {
    code: 'zephyr-featherweight-cotton-voile-kurta',
    name: 'Zephyr Featherweight Cotton Voile Kurta',
    fabric: 'Superfine Cotton Voile',
    craftsmanship: 'Whisper-Thin Weave with Leafy Ghaspatti Creepers',
    desc: 'The ultimate tropical summer tunic in airy voile, so light it floats with breeze while displaying exquisite stitch precision.',
    price: 2999,
    base: 'ivory'
  },
  {
    code: 'zuleikha-needle-pulled-jaali-kurta',
    name: 'Zuleikha Needle-Pulled Jaali Kurta',
    fabric: 'Pure Mulmul Cotton',
    craftsmanship: 'Microscopic Lattice Jaali Without Cutting Threads',
    desc: 'Museum-grade showcase of the miraculous Awadhi jaali technique where cloth yarns are pushed aside with needles to create lace.',
    price: 4299,
    base: 'ivory'
  },
  {
    code: 'inayat-elegant-high-low-hem-kurta',
    name: 'Inayat Elegant High-Low Hem Kurta',
    fabric: 'Handloom Chanderi Cotton',
    craftsmanship: 'Graduated Hemline with Scallop Border',
    desc: 'Contemporary graduated silhouette shorter in front to showcase flared bottoms, edged with continuous hand-embroidered scallops.',
    price: 3499,
    base: 'sage'
  },
  {
    code: 'genda-phool-festive-gota-kurta',
    name: 'Genda Phool Gota-Patti Chikankari Kurta',
    fabric: 'Viscose Georgette with Pure Cotton Inner',
    craftsmanship: 'Ribbon Gota Patti Appliqué Embedded in Phanda Knots',
    desc: 'Festive Diwali and Sangeet showpiece uniting golden gota ribbons with intricate thread knotting on fluid georgette.',
    price: 4099,
    base: 'blush'
  },
  {
    code: 'fiza-modern-draped-cowl-kurta',
    name: 'Fiza Modern Draped Cowl Neck Kurta',
    fabric: 'Pure Modal Silk',
    craftsmanship: 'Draped Cowl Neckline with Asymmetric Floral Spray',
    desc: 'Daring fusion of Western cowl drapery and classical Lucknow needlecraft, creating ripples of shimmering embroidered fabric.',
    price: 3799,
    base: 'ivory'
  },
  {
    code: 'malhar-monsoon-pure-slub-linen-kurta',
    name: 'Malhar Monsoon Pure Slub Linen Kurta',
    fabric: '100% Slub Linen',
    craftsmanship: 'Dense Geometric Linear Tepchi & Raised Phandas',
    desc: 'Textured pure European flax linen woven with raw slub character, accented with robust Awadhi linear threadwork for all-day comfort.',
    price: 3699,
    base: 'sage'
  }
];

// Generate KURTA_STYLES array of 50 objects
export const ALL_50_KURTA_STYLES = RAW_KURTA_SPECS.map((spec, idx) => {
  const model = MODELS_50[idx];
  const palette = COLOR_PALETTES[idx % COLOR_PALETTES.length];

  return {
    product_code: spec.code,
    name: spec.name,
    fabric: spec.fabric,
    craftsmanship: spec.craftsmanship,
    description: spec.desc,
    price: spec.price,
    baseMaster: spec.base,
    model: {
      name: model.name,
      city: model.city,
      age: model.age,
      height: model.height,
      complexion: model.tone,
      styleAesthetic: model.styling
    },
    colors: palette
  };
});

console.log(`Generated ${ALL_50_KURTA_STYLES.length} unique Kurta designs with 5 colours each (total ${ALL_50_KURTA_STYLES.length * 5} colour variants).`);
