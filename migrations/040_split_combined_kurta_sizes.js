/**
 * A bulk import stored every kurta size in one field: "XS,S,M,L,XL,XXL,XXXL".
 * Split those rows so each size is its own variant and the storefront can select one.
 */
import { splitCombinedKurtaSizes } from '../server/modules/kurta/split-combined-sizes.js';

export async function up(k) {
  await splitCombinedKurtaSizes(k);
}

export async function down() {}
