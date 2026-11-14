import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../server/db.js';
import { CategorySeeder } from './CategorySeeder.js';
import { MaterialSeeder } from './MaterialSeeder.js';
import { CraftsmanshipSeeder } from './CraftsmanshipSeeder.js';
import { FinishSeeder } from './FinishSeeder.js';
import { CollectionSeeder } from './CollectionSeeder.js';
import { ProductSeeder } from './ProductSeeder.js';
import { JewelleryProductSeeder } from './JewelleryProductSeeder.js';
import { CoinProductSeeder } from './CoinProductSeeder.js';
import { KurtaSeeder } from './KurtaSeeder.js';
import { ReviewSeeder } from './ReviewSeeder.js';

export async function DatabaseSeeder(k = db) {
  return {
    categories: await CategorySeeder(k),
    materials: await MaterialSeeder(k),
    craftsmanship: await CraftsmanshipSeeder(k),
    finishes: await FinishSeeder(k),
    collections: await CollectionSeeder(k),
    products: await ProductSeeder(k),
    jewellery: await JewelleryProductSeeder(k),
    coins: await CoinProductSeeder(k),
    kurtas: await KurtaSeeder(k),
    reviews: await ReviewSeeder(k)
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await DatabaseSeeder(), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}
