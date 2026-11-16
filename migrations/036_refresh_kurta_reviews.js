/**
 * Clears every review, then writes approved reviews for the current kurta catalogue.
 * Existing orders are left untouched.
 */
import { KurtaReviewSeeder } from '../seeders/KurtaReviewSeeder.js';

async function kurtaCount(k) {
  if (!await k.schema.hasTable('kurtas')) return 0;
  const row = await k('kurtas').count('* as total').first();
  return Number(row?.total || 0);
}

export async function up(k) {
  if (!await k.schema.hasTable('reviews')) return;

  if (!await kurtaCount(k)) {
    if (await k.schema.hasTable('review_images')) await k('review_images').where('id', '>', 0).del();
    await k('reviews').where('id', '>', 0).del();
    return;
  }

  await KurtaReviewSeeder(k, { clean: true, recordOrders: false });
}

export async function down(k) {
  if (!await k.schema.hasTable('reviews')) return;
  const kurtaReviews = k('reviews').where({ subject_type: 'kurta' }).orWhereNotNull('kurta_id');
  if (await k.schema.hasTable('review_images')) {
    const ids = await kurtaReviews.clone().pluck('id');
    if (ids.length) await k('review_images').whereIn('review_id', ids).del();
  }
  await kurtaReviews.del();
}
