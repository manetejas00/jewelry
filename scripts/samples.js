import fs from 'node:fs';
import { stringify } from 'csv-stringify/sync';
import { coinArtwork } from '../server/coin-artwork.js';
import { schemas } from '../server/importer.js';

export const stamp = new Date().toISOString();

export const gold = [
  ['Fictional Preview', '24K', 'INR', '10g', '100000', stamp.slice(0, 10), stamp],
  ['Fictional Preview', '22K', 'INR', 'g', '9200', stamp.slice(0, 10), stamp],
  ['Fictional Preview', '18K', 'INR', 'g', '7500', stamp.slice(0, 10), stamp]
];

const piece = (code, sku, name, cat, metal, purity, weight, size, image, mode, price, stock, making = '0') => [
  'Fictional Preview', code, sku, name, cat,
  `A fictional ${name.toLowerCase()} for the Veyora Jewels preview. Product materials and specifications are illustrative.`,
  metal, purity, weight, size, 'Gold', `/assets/products/${code}/hero.webp`, mode, price, making, '0', '0', '0', stock, 'published', stamp
];

export const products = [
  piece('eclipse-ring', 'VEY-ER-12', 'Eclipse Pearl Ring', 'Rings', 'Gold', '18K', '2.500', '12', 'Eclipse Ring', 'GOLD_LINKED', '', 8, '2000'),
  piece('eclipse-ring', 'VEY-ER-14', 'Eclipse Pearl Ring', 'Rings', 'Gold', '18K', '2.700', '14', 'Eclipse Ring', 'GOLD_LINKED', '', 5, '2000'),
  piece('lune-pearl-drops', 'VEY-LP-01', 'Lune Pearl Drops', 'Earrings', 'Gold', '18K', '3.200', 'One size', 'Lune Pearl Drop', 'FIXED', '24500', 12),
  piece('atelier-pearl-collar', 'VEY-AC-01', 'Atelier Pearl Collar', 'Necklaces', 'Gold', '22K', '5.000', '42 cm', 'Atelier Ribbon Collar', 'GOLD_LINKED', '', 4, '2000'),
  piece('noir-halo-studs', 'VEY-NH-01', 'Noir Halo Studs', 'Earrings', 'Gold', '18K', '2.800', 'One size', 'Noir Halo Stud', 'FIXED', '18900', 7),
  piece('nocturne-cuff', 'VEY-NC-01', 'Nocturne Pearl Cuff', 'Bracelets', 'Gold', '18K', '4.200', 'Medium', 'Nocturne Cuff', 'FIXED', '32750', 0),
  piece('velours-earrings', 'VEY-VE-01', 'Velours Pearl Earrings', 'Earrings', 'Gold', '18K', '3.500', 'One size', 'Velours Earring', 'FIXED', '28900', 6)
];

export const goldJewellery = products.filter(p => p[6] === 'Gold');
export const silverJewellery = [
  ['Veyora Heritage Atelier', 'tarkasi-filigree-choker', 'SIL-NK-01', 'Tarkasi Silver Filigree Choker', 'Necklaces', 'Delicate 925 sterling silver filigree choker handcrafted by Cuttack artisans.', 'Silver', '925', '28.500', 'Standard', 'Silver Finish', '/assets/products/tarkasi-silver-filigree-choker/hero.webp', 'FIXED', '18500', '0', '0', '0', '0', 10, 'published', stamp],
  ['Veyora Heritage Atelier', 'chandrika-tribal-hasli', 'SIL-NK-02', 'Chandrika Tribal Silver Hasli', 'Necklaces', 'Rigid tribal silver collar necklace with antique oxidised finish and ghungroo droplets.', 'Silver', '925', '45.000', 'Standard', 'Oxidised Finish', '/assets/products/chandrika-tribal-oxidised-silver-hasli/hero.webp', 'FIXED', '24500', '0', '0', '0', '0', 8, 'published', stamp]
];

export const coins = coinArtwork.map((a, i) => [
  'Fictional Preview', 'DEMO-' + a.sku, a.name, a.metal, a.metal === 'Gold' ? 'Gold Coin' : 'Silver Coin',
  a.purity, a.weight_g, i === 5 ? '55 x 30 mm Rectangular' : 'Round', '350',
  i === 1 ? 'FIXED' : 'METAL_LINKED', i === 1 ? '48000' : '', i === 2 ? 0 : 5,
  'Illustrative preview coin', a.image, 'draft', 'illustration', stamp
]);

const kurtaPiece = (code, sku, name, desc, fabric, craft, size, color, finish, price, stock) => [
  'Fictional Preview', code, sku, name, 'Chicken Curry Kurtas', desc, fabric, craft, size, color, finish,
  `/assets/products/${code}/hero.webp`, 'FIXED', price, stock, 'published', stamp
];

export const kurtas = [
  kurtaPiece('lucknowi-ivory-chikankari-cotton-kurta', 'CCK-IVORY-XS', 'Noor-e-Awadh Royal Mulmul Kurta', 'Handcrafted pure mulmul cotton kurta with heirloom Bakhiya shadow-work.', 'Pure Mulmul Cotton', 'Authentic Lucknowi Chikankari', 'XS (34)', 'Ivory White', 'Hand Embroidered', '3299.00', '10'),
  kurtaPiece('lucknowi-ivory-chikankari-cotton-kurta', 'CCK-IVORY-S', 'Noor-e-Awadh Royal Mulmul Kurta', 'Handcrafted pure mulmul cotton kurta with heirloom Bakhiya shadow-work.', 'Pure Mulmul Cotton', 'Authentic Lucknowi Chikankari', 'S (36)', 'Ivory White', 'Hand Embroidered', '3299.00', '12'),
  kurtaPiece('lucknowi-ivory-chikankari-cotton-kurta', 'CCK-IVORY-M', 'Noor-e-Awadh Royal Mulmul Kurta', 'Handcrafted pure mulmul cotton kurta with heirloom Bakhiya shadow-work.', 'Pure Mulmul Cotton', 'Authentic Lucknowi Chikankari', 'M (38)', 'Ivory White', 'Hand Embroidered', '3299.00', '15'),
  kurtaPiece('rose-blush-georgette-chikankari-kurta', 'CCK-BLUSH-M', 'Gulzar Flowing Georgette Chikankari Kurta', 'Flowing viscose georgette kurta featuring intricate pearl-like Phanda knotting.', 'Viscose Georgette', 'Floral Jaal & Raised Phanda Knots', 'M (38)', 'Rose Blush', 'Hand Embroidered', '3499.00', '12'),
  kurtaPiece('sage-green-chanderi-chikankari-kurta', 'CCK-SAGE-M', 'Nazm Shahi Chanderi Silk Chikankari Kurta', 'Shimmering handloom Chanderi silk with fine rice-grain Murri needlecraft.', 'Handloom Chanderi Silk', 'Murri & Keel Kangan Needlework', 'M (38)', 'Sage Green', 'Hand Embroidered', '3699.00', '14')
];

export const materialsSchema = ['slug', 'name', 'description', 'thumbnail', 'status', 'sort_order'];
export const materialsExample = [
  ['gold', 'Gold', 'Precious gold of standard 22K and 18K hallmarks', '/assets/materials/gold.webp', 'active', 1],
  ['silver', 'Silver', 'Fine 999 bullion silver and 925 hallmarked sterling jewellery silver', '/assets/materials/silver.webp', 'active', 2],
  ['pearl', 'Pearl', 'Luminous cultured freshwater and South Sea baroque pearls', '/assets/materials/pearl.webp', 'active', 4]
];

export const craftsmanshipSchema = ['slug', 'name', 'description', 'thumbnail', 'status', 'sort_order'];
export const craftsmanshipExample = [
  ['kundan', 'Kundan', 'Royal gemstone setting using purified 24K gold foils', '/assets/craftsmanship/kundan.webp', 'active', 1],
  ['meenakari', 'Meenakari', 'Heirloom enamel art in jewel tones fired over engraved precious metal', '/assets/craftsmanship/meenakari.webp', 'active', 3],
  ['temple-craft', 'Temple Craft', 'Sacred South Indian repousse depicting traditional deities and floral motifs', '/assets/craftsmanship/temple-craft.webp', 'active', 4]
];

export const collectionsSchema = ['slug', 'name', 'description', 'banner', 'status', 'sort_order'];
export const collectionsExample = [
  ['gold', 'The Gold Collection', 'Pure 22K and 18K hallmarked gold jewels crafted for milestones and eternity.', '/assets/banners/gold-collection.webp', 'active', 1],
  ['silver', 'The Silver Collection', 'Modern 925 sterling silver and antique tribal heirlooms designed for everyday grace.', '/assets/banners/silver-collection.webp', 'active', 2],
  ['bridal', 'Bridal Heritage', 'Grand parures, kundan rani haars, and royal matha pattis for the Indian bride.', '/assets/banners/bridal-collection.webp', 'active', 3]
];

export function writeSamples() {
  fs.mkdirSync('samples', { recursive: true });

  // Standard kinds
  for (const kind of ['gold', 'products', 'coins', 'kurtas']) {
    const name = kind === 'gold' ? 'gold-rates' : kind;
    fs.writeFileSync(`samples/${name}-template.csv`, stringify([], { header: true, columns: schemas[kind] }));
    fs.writeFileSync(`samples/${name}-example.csv`, stringify(kind === 'gold' ? gold : kind === 'coins' ? coins : kind === 'kurtas' ? kurtas : products, { header: true, columns: schemas[kind] }));
  }

  // Specialized jewellery kinds
  fs.writeFileSync('samples/jewellery-template.csv', stringify([], { header: true, columns: schemas.products }));
  fs.writeFileSync('samples/jewellery-example.csv', stringify(products, { header: true, columns: schemas.products }));
  fs.writeFileSync('samples/gold-jewellery-template.csv', stringify([], { header: true, columns: schemas.products }));
  fs.writeFileSync('samples/gold-jewellery-example.csv', stringify(goldJewellery, { header: true, columns: schemas.products }));
  fs.writeFileSync('samples/silver-jewellery-template.csv', stringify([], { header: true, columns: schemas.products }));
  fs.writeFileSync('samples/silver-jewellery-example.csv', stringify(silverJewellery, { header: true, columns: schemas.products }));

  // Kurta specialized kinds
  fs.writeFileSync('samples/kurta-designs-template.csv', stringify([], { header: true, columns: schemas.kurtas }));
  fs.writeFileSync('samples/kurta-designs-example.csv', stringify(kurtas, { header: true, columns: schemas.kurtas }));
  fs.writeFileSync('samples/kurta-variants-template.csv', stringify([], { header: true, columns: schemas.kurtas }));
  fs.writeFileSync('samples/kurta-variants-example.csv', stringify(kurtas, { header: true, columns: schemas.kurtas }));

  // Relational entity schemas
  fs.writeFileSync('samples/materials-template.csv', stringify([], { header: true, columns: materialsSchema }));
  fs.writeFileSync('samples/materials-example.csv', stringify(materialsExample, { header: true, columns: materialsSchema }));
  fs.writeFileSync('samples/craftsmanship-template.csv', stringify([], { header: true, columns: craftsmanshipSchema }));
  fs.writeFileSync('samples/craftsmanship-example.csv', stringify(craftsmanshipExample, { header: true, columns: craftsmanshipSchema }));
  fs.writeFileSync('samples/collections-template.csv', stringify([], { header: true, columns: collectionsSchema }));
  fs.writeFileSync('samples/collections-example.csv', stringify(collectionsExample, { header: true, columns: collectionsSchema }));

  // Errors sample
  fs.writeFileSync('samples/import-errors-example.csv', stringify([
    { row: 2, field: 'unit', value: 'tola', correction: 'Convert to an explicitly supported g or 10g unit' },
    { row: 3, field: 'stock', value: '-2', correction: 'Supply a non-negative integer' },
    { row: 4, field: 'sku', value: 'VEY-ER-12', correction: 'Remove duplicate SKU row' }
  ], { header: true }));

  console.log('Successfully generated all import/export CSV sample templates in samples/.');
}

if (process.argv[1]?.endsWith('/samples.js') || process.argv[1]?.endsWith('samples.js')) {
  writeSamples();
}
