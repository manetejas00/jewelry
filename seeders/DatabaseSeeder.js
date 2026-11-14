import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { db } from '../server/db.js';
import { JewelryCategorySeeder } from './JewelryCategorySeeder.js';
import { JewelrySeeder } from './JewelrySeeder.js';
import { CoinCategorySeeder } from './CoinCategorySeeder.js';
import { CoinSeeder } from './CoinSeeder.js';
import { KurtaCategorySeeder } from './KurtaCategorySeeder.js';
import { KurtaSeeder } from './KurtaSeeder.js';
import { MaterialSeeder } from './MaterialSeeder.js';
import { CraftsmanshipSeeder } from './CraftsmanshipSeeder.js';
import { FinishSeeder } from './FinishSeeder.js';
import { CollectionSeeder } from './CollectionSeeder.js';
import { ReviewSeeder } from './ReviewSeeder.js';

export async function DatabaseSeeder(k = db) {
  return {
    materials: await MaterialSeeder(k).catch(() => null),
    craftsmanship: await CraftsmanshipSeeder(k).catch(() => null),
    finishes: await FinishSeeder(k).catch(() => null),
    collections: await CollectionSeeder(k).catch(() => null),

    // 1. Jewelry Module
    jewelryCategories: await JewelryCategorySeeder(k),
    jewelry: await JewelrySeeder(k),

    // 2. Coin Module
    coinCategories: await CoinCategorySeeder(k),
    coins: await CoinSeeder(k),

    // 3. Kurta Module
    kurtaCategories: await KurtaCategorySeeder(k),
    kurtas: await KurtaSeeder(k),

    // Reviews
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
