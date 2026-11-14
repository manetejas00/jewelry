import fs from 'node:fs';
import path from 'node:path';

const jewellery = JSON.parse(fs.readFileSync('seeders/data/jewellery-100.json', 'utf8'));
const products100 = JSON.parse(fs.readFileSync('seeders/data/products-100.json', 'utf8'));

const publicProductsDir = path.resolve('public/assets/products');

// Group existing product codes by category for realistic visual pairing
const existingByCategory = {};
for (const p of products100) {
  if (!existingByCategory[p.category]) existingByCategory[p.category] = [];
  existingByCategory[p.category].push(p.product_code);
}

// Available source pools
const sourcePools = {
  'Necklaces': existingByCategory['Necklaces'] || [],
  'Mangalsutra': existingByCategory['Necklaces'] || [],
  'Earrings': existingByCategory['Earrings'] || [],
  'Rings': existingByCategory['Rings'] || [],
  'Bracelets': existingByCategory['Bracelets'] || [],
  'Bangles and Kada': existingByCategory['Bracelets'] || [],
  'Maang Tikka and Nath': existingByCategory['Earrings'] || [],
  'Anklets and Payal': existingByCategory['Bracelets'] || [],
  'Jewellery Sets': existingByCategory['Necklaces'] || []
};

const categoryPointers = {
  'Necklaces': 0,
  'Mangalsutra': 0,
  'Earrings': 0,
  'Rings': 0,
  'Bracelets': 0,
  'Bangles and Kada': 0,
  'Maang Tikka and Nath': 0,
  'Anklets and Payal': 0,
  'Jewellery Sets': 0
};

console.log('Preparing image assets for 100 Indian jewellery pieces...');

for (const item of jewellery) {
  const targetDir = path.join(publicProductsDir, item.product_code);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Pick a source directory from the appropriate pool
  const pool = sourcePools[item.category] || existingByCategory['Necklaces'];
  const ptr = categoryPointers[item.category] % pool.length;
  categoryPointers[item.category]++;
  const sourceCode = pool[ptr];
  const sourceDir = path.join(publicProductsDir, sourceCode);

  // Copy all image files from source to target
  if (fs.existsSync(sourceDir)) {
    const files = fs.readdirSync(sourceDir);
    for (const f of files) {
      if (f.endsWith('.webp') || f.endsWith('.png') || f.endsWith('.jpg')) {
        const srcFile = path.join(sourceDir, f);
        const destFile = path.join(targetDir, f);
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(srcFile, destFile);
        }
      }
    }
  }

  // Update item image path
  item.image = `/assets/products/${item.product_code}/hero.webp`;
}

fs.writeFileSync('seeders/data/jewellery-100.json', JSON.stringify(jewellery, null, 2));
console.log('Successfully prepared assets for all 100 jewellery products.');
