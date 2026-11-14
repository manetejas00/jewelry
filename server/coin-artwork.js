export const coinArtwork = [
  // 10 Gold Coins (24K, 999 purity)
  ['COIN-AU-1G', '24K Lakshmi 999 Pure Gold Coin (1 Gram)', 'Gold', '24K', 1, '12 mm Round', 'lakshmi-gold-1g-v1.png', 'Certified 24K 999 pure gold bullion coin embossed with Goddess Lakshmi seated on a lotus, presented in a tamper-proof assay blister card.'],
  ['COIN-AU-2G', '24K Lakshmi 999 Pure Gold Coin (2 Grams)', 'Gold', '24K', 2, '15 mm Round', 'lakshmi-gold-2g-v1.png', 'Investment-grade 2 gram 24K pure gold coin with high-relief Goddess Lakshmi engraving and certified purity.'],
  ['COIN-AU-4G', '24K Lord Ganesha 999 Pure Gold Coin (4 Grams)', 'Gold', '24K', 4, '18 mm Round', 'ganesha-gold-4g-v1.png', 'Auspicious Lord Ganesha seated in blessing posture with modak, chiseled in pure 24K yellow gold.'],
  ['COIN-AU-5G', '24K Lakshmi Ganesh 999 Pure Gold Coin (5 Grams)', 'Gold', '24K', 5, '22 mm Round', 'lakshmi-ganesh-gold-5g-v1.png', 'Divine Diwali and Akshaya Tritiya duo coin portraying Goddess Lakshmi and Lord Ganesha side by side.'],
  ['COIN-AU-8G', '24K Banyan Tree of Life Gold Coin (8 Grams)', 'Gold', '24K', 8, '25 mm Round', 'banyan-tree-gold-8g-v1.png', 'Sacred Kalpavriksha wish-fulfilling tree of life motif rendered in mirror-finish 24K gold relief.'],
  ['COIN-AU-10G', '24K Royal Emblem 999 Pure Gold Coin (10 Grams)', 'Gold', '24K', 10, '28 mm Round', 'royal-emblem-gold-10g-v1.png', 'Regal Veyora Maison royal sunburst and floral medallion coin struck in 10 grams of 24K fine bullion.'],
  ['COIN-AU-20G', '24K Royal Emblem 999 Pure Gold Coin (20 Grams)', 'Gold', '24K', 20, '32 mm Round', 'royal-emblem-gold-20g-v1.png', 'Heavy investment bullion piece featuring precision micro-engraved serial numbering and royal insignia.'],
  ['COIN-AU-50G', '24K Imperial Coronation Pure Gold Coin (50 Grams)', 'Gold', '24K', 50, '40 mm Round', 'imperial-coronation-gold-50g-v1.png', 'Prestigious 50g institutional investment bullion coin with mirror fields and frosted sculptural relief.'],
  ['COIN-AU-OM-5G', '24K Sacred Vedic Om 999 Pure Gold Coin (5 Grams)', 'Gold', '24K', 5, '22 mm Round', 'om-vedic-gold-5g-v1.png', 'Auspicious Devanagari Om emblem encircled by sacred Vedic sunrays on certified 24K gold.'],
  ['COIN-AU-KL-10G', '24K Festive Kalash Shagun Gold Coin (10 Grams)', 'Gold', '24K', 10, '28 mm Round', 'kalash-gold-10g-v1.png', 'Sacred Purna Kalash pot overflowing with coconut and mango leaves, symbolizing eternal abundance.'],

  // 10 Silver Coins (999 Fine Silver)
  ['COIN-AG-5G', '999 Fine Silver Shagun Coin (5 Grams)', 'Silver', '999', 5, '20 mm Round', 'shagun-silver-5g-v1.png', 'Delicate pure silver gifting coin with traditional floral border and Lakshmi footprints.'],
  ['COIN-AG-10G', '999 Fine Silver Floral Coin (10 Grams)', 'Silver', '999', 10, '26 mm Round', 'floral-silver-10g-v1.png', 'Classic Indian floral mandala motif struck in luminous 999 fine investment silver.'],
  ['COIN-AG-20G', '999 Fine Silver Floral Medallion Coin (20 Grams)', 'Silver', '999', 20, '32 mm Round', 'floral-silver-20g-v1.png', 'Substantial 20g fine silver coin with high-relief lotus petal engraving and satin frosted finish.'],
  ['COIN-AG-50G', '999 Fine Silver Lakshmi Ganesh Coin (50 Grams)', 'Silver', '999', 50, '42 mm Round', 'lakshmi-ganesh-silver-50g-v1.png', 'Festive gifting silver piece featuring divine blessings of Lakshmi and Ganesha for housewarming and Diwali.'],
  ['COIN-AG-100G', '999 Fine Silver Cast Bullion Bar / Coin (100 Grams)', 'Silver', '999', 100, '55 x 30 mm Rectangular', 'cast-bar-silver-100g-v1.png', 'Solid cast silver ingot with assay hallmarks, refinery stamp, and individual certificate card.'],
  ['COIN-AG-250G', '999 Fine Silver Investment Cast Bar (250 Grams)', 'Silver', '999', 250, '70 x 38 mm Rectangular', 'cast-bar-silver-250g-v1.png', 'Heavyweight investment silver bar cast with polished edges and tamper-evident certified packaging.'],
  ['COIN-AG-SW-20G', '999 Fine Silver Saraswati Wisdom Coin (20 Grams)', 'Silver', '999', 20, '32 mm Round', 'saraswati-silver-20g-v1.png', 'Auspicious depiction of Goddess Saraswati seated with veena and sacred scriptures for students and artists.'],
  ['COIN-AG-KL-50G', '999 Fine Silver Traditional Kalash Coin (50 Grams)', 'Silver', '999', 50, '42 mm Round', 'kalash-silver-50g-v1.png', 'Exquisite ceremonial silver coin chiseled with auspicious coconut, mango leaves, and swastika symbol.'],
  ['COIN-AG-PK-50G', '999 Fine Silver Royal Peacock Medallion (50 Grams)', 'Silver', '999', 50, '42 mm Round', 'peacock-silver-50g-v1.png', 'Artistic Indian national bird motif spreading its majestic plumage in frosted 999 fine silver relief.'],
  ['COIN-AG-OM-25G', '999 Fine Silver Vedic Om Blessing Coin (25 Grams)', 'Silver', '999', 25, '36 mm Round', 'om-silver-25g-v1.png', 'Divine Om medallion carrying sacred Gayatri Mantra micro-inscriptions along the coin perimeter.']
].map(([sku, name, metal, purity, weight_g, dimension, file, description]) => ({
  sku,
  name,
  metal,
  purity,
  weight_g,
  dimension,
  description,
  image: '/assets/coin-art/' + file
}));
