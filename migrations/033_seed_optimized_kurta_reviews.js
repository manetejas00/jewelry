/**
 * Migration 033: Seed Optimized Kurta Reviews
 *
 * Re-inserts optimized, realistic patron reviews dedicated strictly for Kurta products.
 * Cleans out non-kurta preview reviews and creates verified purchase records.
 */
import { KurtaReviewSeeder } from '../seeders/KurtaReviewSeeder.js';

export async function up(k) {
  try {
    await KurtaReviewSeeder(k, { clean: true });
  } catch (err) {
    console.warn('Migration 033 warning (seedKurtaReviews):', err.message);
  }
}

export async function down(k) {
  if (await k.schema.hasTable('reviews')) {
    await k('reviews').where({ subject_type: 'kurta' }).orWhereNotNull('kurta_id').del();
  }
}
