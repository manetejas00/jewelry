import {validationError} from './errors.js';
import {now, parse} from './db.js';

/**
 * Sanitize text input to prevent XSS and strip potentially malicious HTML.
 */
export function sanitizeText(text = '') {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '') // Strip HTML tags
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F]/g, '') // Strip control chars
    .trim();
}

/**
 * Basic spam heuristic check.
 */
export function checkSpam(title, comment) {
  const combined = `${title} ${comment}`.toLowerCase();
  
  // Check for excessive repeating characters (e.g., "aaaaaaa")
  if (/(.)\1{7,}/.test(combined)) {
    throw validationError('Review contains repetitive characters and could not be accepted.');
  }

  // Check for common spam/phishing patterns
  const spamPatterns = [
    /\b(casino|viagra|cialis|crypto\s*airdrop|whatsapp\s*\+?\d{8,})\b/i,
    /https?:\/\/[^\s]+/i // Review comments should not contain raw URLs
  ];

  for (const pattern of spamPatterns) {
    if (pattern.test(combined)) {
      throw validationError('Review contains prohibited links or promotional terms.');
    }
  }
}

/**
 * Validate customer review input.
 */
export function validateReviewInput({ rating, title, comment, images }) {
  const numericRating = Number(rating);
  if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
    throw validationError('Star rating must be an integer between 1 and 5.');
  }

  const cleanTitle = sanitizeText(title);
  if (!cleanTitle || cleanTitle.length < 3) {
    throw validationError('Review title must be at least 3 characters long.');
  }
  if (cleanTitle.length > 150) {
    throw validationError('Review title cannot exceed 150 characters.');
  }

  const cleanComment = sanitizeText(comment);
  if (!cleanComment || cleanComment.length < 10) {
    throw validationError('Review description must be at least 10 characters long.');
  }
  if (cleanComment.length > 3000) {
    throw validationError('Review description cannot exceed 3000 characters.');
  }

  checkSpam(cleanTitle, cleanComment);

  let cleanImages = [];
  if (images !== undefined && images !== null) {
    if (!Array.isArray(images)) {
      throw validationError('Review images must be an array.');
    }
    if (images.length > 5) {
      throw validationError('You can upload up to 5 images per review.');
    }
    cleanImages = images.map(img => {
      if (typeof img !== 'string') throw validationError('Invalid image URL.');
      const trimmed = img.trim();
      // Allow relative uploads or http/https image URLs
      if (!/^\/uploads\/[a-zA-Z0-9_.-]+\.(jpe?g|png|webp|gif)$/i.test(trimmed) &&
          !/^https?:\/\/[a-zA-Z0-9_.~:/?#[\]@!$&'()*+,;=-]+\.(jpe?g|png|webp|gif)$/i.test(trimmed) &&
          !/^\/assets\/[a-zA-Z0-9_.~:/?#\[\]@!$&'()*+,;=-]+$/i.test(trimmed)) {
        throw validationError('Review images must be valid JPG, PNG, or WebP files.');
      }
      return trimmed;
    });
  }

  return {
    rating: numericRating,
    title: cleanTitle,
    comment: cleanComment,
    images: cleanImages
  };
}

/**
 * Resolve product and canonical product ID (so sibling variants share reviews).
 */
export async function resolveProduct(k, identifier) {
  let product;
  if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
    product = await k('products').where({ id: Number(identifier) }).first();
  } else {
    product = await k('products').where({ slug: identifier }).orWhere({ product_code: identifier }).orWhere({ sku: identifier }).first();
  }

  if (!product) {
    const hasCoins = await k.schema.hasTable('coins').catch(() => false);
    if (hasCoins) {
      const coin = (typeof identifier === 'number' || /^\d+$/.test(identifier))
        ? await k('coins').where({ id: Number(identifier) }).first()
        : await k('coins').where({ sku: identifier }).first();
      if (coin) {
        return {
          product: { ...coin, product_code: coin.sku },
          canonicalId: coin.id
        };
      }
    }
    throw validationError('Product not found.', 404);
  }

  // Canonical product is the first variant of this product_code
  const canonical = await k('products')
    .where({ product_code: product.product_code })
    .orderBy('id', 'asc')
    .first();

  return {
    product,
    canonicalId: canonical ? canonical.id : product.id
  };
}

/**
 * Check if customer has verified purchase for this product.
 */
export async function checkVerifiedPurchase(k, customerId, productCode) {
  if (!customerId || !productCode) return false;

  let skus = await k('products').where({ product_code: productCode }).pluck('sku');
  if (!skus.length) {
    skus = [productCode];
  }

  const orderItem = await k('order_items')
    .join('orders', 'orders.id', 'order_items.order_id')
    .where('orders.customer_id', customerId)
    .whereIn('order_items.sku', skus)
    .first();

  if (orderItem) return true;

  // Fallback: check by customer email in case orders were placed as guest before account creation
  const customer = await k('customers').where({ id: customerId }).first();
  if (!customer?.email) return false;

  const guestOrders = await k('orders')
    .whereRaw('LOWER(customer) LIKE ?', [`%"email":"${customer.email.toLowerCase()}"%`])
    .select('id');

  if (guestOrders.length) {
    const guestOrderIds = guestOrders.map(o => o.id);
    const guestItem = await k('order_items')
      .whereIn('order_id', guestOrderIds)
      .whereIn('sku', skus)
      .first();
    if (guestItem) return true;
  }

  return false;
}

/**
 * Format customer name for privacy (e.g. "Ananya Iyer" -> "Ananya I.")
 */
export function formatCustomerName(name = 'Customer') {
  const parts = name.trim().split(/\s+/);
  if (parts.length <= 1) return parts[0] || 'Customer';
  const first = parts[0];
  const lastInitial = parts[parts.length - 1][0].toUpperCase();
  return `${first} ${lastInitial}.`;
}

/**
 * Get approved reviews and rating breakdown for a product.
 */
export async function getProductReviews(k, productIdOrSlug, {
  page = 1,
  limit = 10,
  sort = 'recent',
  ratingFilter = null,
  rating = null,
  currentCustomerId = null,
  includePending = false
} = {}) {
  const hasReviews = await k.schema.hasTable('reviews').catch(() => false);
  if (!hasReviews) {
    return {
      summary: { averageRating: null, totalReviews: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }, verifiedPurchasesCount: 0 },
      reviews: [],
      myReview: null,
      pagination: { page: 1, limit, total: 0, totalPages: 0 }
    };
  }

  const { product, canonicalId } = await resolveProduct(k, productIdOrSlug);

  // Compute rating summary using approved reviews only
  const summaryRows = await k('reviews')
    .where({ product_id: canonicalId, status: 'approved' })
    .whereNull('deleted_at')
    .select('rating', 'is_verified_purchase');

  const totalReviews = summaryRows.length;
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const percentages = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let ratingSum = 0;
  let verifiedCount = 0;

  for (const row of summaryRows) {
    const r = Math.min(5, Math.max(1, row.rating));
    distribution[r] = (distribution[r] || 0) + 1;
    ratingSum += r;
    if (row.is_verified_purchase) verifiedCount++;
  }

  const averageRating = totalReviews > 0 ? Number((ratingSum / totalReviews).toFixed(1)) : null;

  if (totalReviews > 0) {
    for (let r = 1; r <= 5; r++) {
      percentages[r] = Math.round((distribution[r] / totalReviews) * 100);
    }
  }

  // Base query for public review listing
  let query = k('reviews')
    .join('customers', 'customers.id', 'reviews.user_id')
    .where('reviews.product_id', canonicalId)
    .whereNull('reviews.deleted_at')
    .select(
      'reviews.id',
      'reviews.product_id',
      'reviews.user_id',
      'reviews.rating',
      'reviews.title',
      'reviews.comment',
      'reviews.status',
      'reviews.is_verified_purchase',
      'reviews.created_at',
      'reviews.updated_at',
      'customers.name as customer_name'
    );

  if (includePending) {
    query = query.whereIn('reviews.status', ['approved', 'pending']);
  } else {
    query = query.where('reviews.status', 'approved');
  }

  const filterRating = ratingFilter !== null && ratingFilter !== undefined ? ratingFilter : rating;
  if (filterRating && [1, 2, 3, 4, 5].includes(Number(filterRating))) {
    query = query.where('reviews.rating', Number(filterRating));
  }

  // Count total matching reviews for pagination
  const countRow = await query.clone().clearSelect().count('* as total').first();
  const total = Number(countRow?.total || 0);

  // Sorting
  if (sort === 'highest') {
    query = query.orderBy('reviews.rating', 'desc').orderBy('reviews.created_at', 'desc');
  } else if (sort === 'lowest') {
    query = query.orderBy('reviews.rating', 'asc').orderBy('reviews.created_at', 'desc');
  } else {
    // default: recent
    query = query.orderBy('reviews.created_at', 'desc');
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(50, Math.max(1, Number(limit) || 10));
  const totalPages = Math.ceil(total / limitNum) || 0;
  const offset = (pageNum - 1) * limitNum;

  const rows = await query.limit(limitNum).offset(offset);

  // Attach images
  const reviewIds = rows.map(r => r.id);
  const hasReviewImages = await k.schema.hasTable('review_images').catch(() => false);
  const imagesByReview = {};

  if (hasReviewImages && reviewIds.length > 0) {
    const images = await k('review_images').whereIn('review_id', reviewIds);
    for (const img of images) {
      if (!imagesByReview[img.review_id]) imagesByReview[img.review_id] = [];
      imagesByReview[img.review_id].push(img.image_url);
    }
  }

  const reviews = rows.map(r => ({
    id: r.id,
    productId: r.product_id,
    userId: r.user_id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    status: r.status,
    isVerifiedPurchase: Boolean(r.is_verified_purchase),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    customerName: formatCustomerName(r.customer_name),
    images: imagesByReview[r.id] || []
  }));

  // Fetch current customer's own review if authenticated (including pending or rejected state)
  let myReview = null;
  if (currentCustomerId) {
    const own = await k('reviews')
      .where({ product_id: canonicalId, user_id: currentCustomerId })
      .whereNull('deleted_at')
      .first();

    if (own) {
      let ownImages = [];
      if (hasReviewImages) {
        ownImages = await k('review_images').where({ review_id: own.id }).pluck('image_url');
      }
      myReview = {
        id: own.id,
        productId: own.product_id,
        userId: own.user_id,
        rating: own.rating,
        title: own.title,
        comment: own.comment,
        status: own.status,
        isVerifiedPurchase: Boolean(own.is_verified_purchase),
        createdAt: own.created_at,
        updatedAt: own.updated_at,
        images: ownImages
      };
    }
  }

  return {
    summary: {
      averageRating,
      totalReviews,
      distribution,
      percentages,
      verifiedPurchasesCount: verifiedCount
    },
    reviews,
    myReview,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
}

/**
 * Submit a customer review.
 */
export async function submitReview(k, customerId, productIdOrSlug, reviewData) {
  if (!customerId) {
    throw validationError('Please sign in to submit a review.', 401);
  }

  const valid = validateReviewInput(reviewData);
  const { product, canonicalId } = await resolveProduct(k, productIdOrSlug);

  // Check if active review already exists
  const existing = await k('reviews')
    .where({ product_id: canonicalId, user_id: customerId })
    .whereNull('deleted_at')
    .first();

  if (existing) {
    const error = validationError('You have already submitted a review for this piece. You can edit your existing review.', 409);
    error.existingReviewId = existing.id;
    throw error;
  }

  // Check verified purchase
  const isVerifiedPurchase = await checkVerifiedPurchase(k, customerId, product.product_code);

  const stamp = now();

  return await k.transaction(async t => {
    // Insert review with pending status
    const [reviewId] = await t('reviews').insert({
      product_id: canonicalId,
      user_id: customerId,
      rating: valid.rating,
      title: valid.title,
      comment: valid.comment,
      status: 'pending', // Pending admin approval
      is_verified_purchase: isVerifiedPurchase,
      created_at: stamp,
      updated_at: stamp,
      deleted_at: null
    });

    // Insert images if present
    if (valid.images.length > 0) {
      await t('review_images').insert(
        valid.images.map(url => ({
          review_id: reviewId,
          image_url: url,
          created_at: stamp
        }))
      );
    }

    return {
      id: reviewId,
      productId: canonicalId,
      userId: customerId,
      rating: valid.rating,
      title: valid.title,
      comment: valid.comment,
      status: 'pending',
      isVerifiedPurchase,
      createdAt: stamp,
      updatedAt: stamp,
      images: valid.images
    };
  });
}

/**
 * Update an existing customer review.
 */
export async function updateCustomerReview(k, customerId, reviewId, reviewData) {
  if (!customerId) {
    throw validationError('Please sign in to update your review.', 401);
  }

  const valid = validateReviewInput(reviewData);
  const review = await k('reviews')
    .where({ id: Number(reviewId), user_id: customerId })
    .whereNull('deleted_at')
    .first();

  if (!review) {
    throw validationError('Review not found or you do not have permission to edit it.', 404);
  }

  const stamp = now();

  return await k.transaction(async t => {
    // Reset status to pending so edited text is re-moderated
    await t('reviews').where({ id: review.id }).update({
      rating: valid.rating,
      title: valid.title,
      comment: valid.comment,
      status: 'pending',
      updated_at: stamp
    });

    // Update images
    await t('review_images').where({ review_id: review.id }).del();
    if (valid.images.length > 0) {
      await t('review_images').insert(
        valid.images.map(url => ({
          review_id: review.id,
          image_url: url,
          created_at: stamp
        }))
      );
    }

    return {
      id: review.id,
      productId: review.product_id,
      userId: customerId,
      rating: valid.rating,
      title: valid.title,
      comment: valid.comment,
      status: 'pending',
      isVerifiedPurchase: Boolean(review.is_verified_purchase),
      createdAt: review.created_at,
      updatedAt: stamp,
      images: valid.images
    };
  });
}

/**
 * Get bulk rating summaries for all products.
 * Used by catalogue(k) to attach rating_average and rating_count.
 */
export async function getAllProductsRatingSummaries(k) {
  const hasReviews = await k.schema.hasTable('reviews').catch(() => false);
  if (!hasReviews) return new Map();

  const rows = await k('reviews')
    .where('reviews.status', 'approved')
    .whereNull('reviews.deleted_at')
    .groupBy('product_id')
    .select(
      'product_id',
      k.raw('COUNT(*) as review_count'),
      k.raw('AVG(rating) as avg_rating')
    );

  const productCodeLookup = new Map();

  // Also map to product_code so all variants share ratings
  if (rows.length > 0) {
    const productIds = rows.map(r => r.product_id);
    const products = await k('products').whereIn('id', productIds).select('id', 'product_code');
    const codeById = new Map(products.map(p => [p.id, p.product_code]));

    for (const row of rows) {
      const avg = Number(Number(row.avg_rating).toFixed(1));
      const count = Number(row.review_count);
      const code = codeById.get(row.product_id);
      if (code) {
        productCodeLookup.set(code, { average: avg, count });
      }
      productCodeLookup.set(row.product_id, { average: avg, count });
    }
  }

  return productCodeLookup;
}

/**
 * Admin: List reviews with stats, filters, search, and pagination.
 */
export async function getAdminReviews(k, {
  page = 1,
  limit = 20,
  status = 'all',
  rating = null,
  productId = null,
  search = '',
  dateFrom = null,
  dateTo = null,
  sort = 'created_at',
  order = 'desc'
} = {}) {
  const hasReviews = await k.schema.hasTable('reviews').catch(() => false);
  if (!hasReviews) {
    return {
      stats: { total: 0, pending: 0, approved: 0, rejected: 0, averageRating: null },
      reviews: [],
      pagination: { page: 1, limit, total: 0, totalPages: 0 }
    };
  }

  // Dashboard stats across all reviews (excluding soft-deleted)
  const statsRows = await k('reviews')
    .whereNull('deleted_at')
    .select('status', 'rating');

  let totalCount = statsRows.length;
  let pendingCount = 0;
  let approvedCount = 0;
  let rejectedCount = 0;
  let approvedRatingSum = 0;

  for (const s of statsRows) {
    if (s.status === 'pending') pendingCount++;
    else if (s.status === 'approved') {
      approvedCount++;
      approvedRatingSum += Number(s.rating);
    } else if (s.status === 'rejected') rejectedCount++;
  }

  const averageRating = approvedCount > 0 ? Number((approvedRatingSum / approvedCount).toFixed(1)) : null;

  // Query reviews with joins
  let query = k('reviews')
    .join('customers', 'customers.id', 'reviews.user_id')
    .join('products', 'products.id', 'reviews.product_id')
    .whereNull('reviews.deleted_at')
    .select(
      'reviews.id',
      'reviews.product_id',
      'reviews.user_id',
      'reviews.rating',
      'reviews.title',
      'reviews.comment',
      'reviews.status',
      'reviews.is_verified_purchase',
      'reviews.created_at',
      'reviews.updated_at',
      'customers.name as customer_name',
      'customers.email as customer_email',
      'products.name as product_name',
      'products.slug as product_slug',
      'products.product_code as product_code',
      'products.sku as product_sku',
      'products.image as product_image'
    );

  if (status && status !== 'all') {
    query = query.where('reviews.status', status);
  }

  if (rating && [1, 2, 3, 4, 5].includes(Number(rating))) {
    query = query.where('reviews.rating', Number(rating));
  }

  if (productId) {
    query = query.where('reviews.product_id', Number(productId));
  }

  if (dateFrom) {
    query = query.where('reviews.created_at', '>=', dateFrom);
  }
  if (dateTo) {
    query = query.where('reviews.created_at', '<=', dateTo);
  }

  if (search && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`;
    query = query.where(function () {
      this.whereRaw('LOWER(customers.name) LIKE ?', [term])
        .orWhereRaw('LOWER(customers.email) LIKE ?', [term])
        .orWhereRaw('LOWER(products.name) LIKE ?', [term])
        .orWhereRaw('LOWER(reviews.title) LIKE ?', [term])
        .orWhereRaw('LOWER(reviews.comment) LIKE ?', [term]);
    });
  }

  const countRow = await query.clone().clearSelect().count('* as total').first();
  const total = Number(countRow?.total || 0);

  // Sorting
  const validSorts = ['created_at', 'rating', 'status', 'title'];
  const sortCol = validSorts.includes(sort) ? `reviews.${sort}` : 'reviews.created_at';
  const sortOrder = order.toLowerCase() === 'asc' ? 'asc' : 'desc';

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const totalPages = Math.ceil(total / limitNum) || 0;
  const offset = (pageNum - 1) * limitNum;

  const rows = await query.orderBy(sortCol, sortOrder).limit(limitNum).offset(offset);

  // Attach images
  const reviewIds = rows.map(r => r.id);
  const hasReviewImages = await k.schema.hasTable('review_images').catch(() => false);
  const imagesByReview = {};

  if (hasReviewImages && reviewIds.length > 0) {
    const images = await k('review_images').whereIn('review_id', reviewIds);
    for (const img of images) {
      if (!imagesByReview[img.review_id]) imagesByReview[img.review_id] = [];
      imagesByReview[img.review_id].push(img.image_url);
    }
  }

  const reviews = rows.map(r => ({
    id: r.id,
    productId: r.product_id,
    userId: r.user_id,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    status: r.status,
    isVerifiedPurchase: Boolean(r.is_verified_purchase),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    productName: r.product_name,
    productSlug: r.product_slug,
    productCode: r.product_code,
    productSku: r.product_sku,
    productImage: r.product_image,
    images: imagesByReview[r.id] || []
  }));

  return {
    stats: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      averageRating
    },
    reviews,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages
    }
  };
}

/**
 * Admin: Get single review with full details.
 */
export async function getAdminReviewById(k, reviewId) {
  const row = await k('reviews')
    .join('customers', 'customers.id', 'reviews.user_id')
    .join('products', 'products.id', 'reviews.product_id')
    .where('reviews.id', Number(reviewId))
    .whereNull('reviews.deleted_at')
    .select(
      'reviews.id',
      'reviews.product_id',
      'reviews.user_id',
      'reviews.rating',
      'reviews.title',
      'reviews.comment',
      'reviews.status',
      'reviews.is_verified_purchase',
      'reviews.created_at',
      'reviews.updated_at',
      'customers.name as customer_name',
      'customers.email as customer_email',
      'products.name as product_name',
      'products.slug as product_slug',
      'products.product_code as product_code',
      'products.sku as product_sku',
      'products.image as product_image'
    )
    .first();

  if (!row) {
    throw validationError('Review not found.', 404);
  }

  const hasReviewImages = await k.schema.hasTable('review_images').catch(() => false);
  const images = hasReviewImages ? await k('review_images').where({ review_id: row.id }).pluck('image_url') : [];

  return {
    id: row.id,
    productId: row.product_id,
    userId: row.user_id,
    rating: row.rating,
    title: row.title,
    comment: row.comment,
    status: row.status,
    isVerifiedPurchase: Boolean(row.is_verified_purchase),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    productName: row.product_name,
    productSlug: row.product_slug,
    productCode: row.product_code,
    productSku: row.product_sku,
    productImage: row.product_image,
    images
  };
}

/**
 * Admin: Approve or Reject a single review.
 */
export async function adminUpdateReviewStatus(k, reviewId, status) {
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw validationError('Status must be approved, rejected, or pending.');
  }

  const review = await k('reviews').where({ id: Number(reviewId) }).first();
  if (!review) {
    throw validationError('Review not found.', 404);
  }

  const stamp = now();
  await k('reviews').where({ id: Number(reviewId) }).update({
    status,
    updated_at: stamp
  });

  return { ok: true, id: Number(reviewId), status };
}

/**
 * Admin: Bulk approve or reject reviews.
 */
export async function adminBulkReviewStatus(k, reviewIds, status) {
  if (!Array.isArray(reviewIds) || !reviewIds.length) {
    throw validationError('Review IDs array is required.');
  }
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    throw validationError('Status must be approved, rejected, or pending.');
  }

  const ids = reviewIds.map(Number).filter(n => Number.isInteger(n) && n > 0);
  if (!ids.length) {
    throw validationError('No valid review IDs provided.');
  }

  const stamp = now();
  const updatedCount = await k('reviews')
    .whereIn('id', ids)
    .whereNull('deleted_at')
    .update({
      status,
      updated_at: stamp
    });

  return { ok: true, updatedCount, status };
}

/**
 * Admin: Edit a review.
 */
export async function adminEditReview(k, reviewId, { rating, title, comment, status }) {
  const review = await k('reviews').where({ id: Number(reviewId) }).whereNull('deleted_at').first();
  if (!review) {
    throw validationError('Review not found.', 404);
  }

  const patch = { updated_at: now() };

  if (rating !== undefined) {
    const num = Number(rating);
    if (!Number.isInteger(num) || num < 1 || num > 5) throw validationError('Rating must be between 1 and 5.');
    patch.rating = num;
  }

  if (title !== undefined) {
    const cleanTitle = sanitizeText(title);
    if (!cleanTitle || cleanTitle.length < 3 || cleanTitle.length > 150) {
      throw validationError('Title must be between 3 and 150 characters.');
    }
    patch.title = cleanTitle;
  }

  if (comment !== undefined) {
    const cleanComment = sanitizeText(comment);
    if (!cleanComment || cleanComment.length < 10 || cleanComment.length > 3000) {
      throw validationError('Description must be between 10 and 3000 characters.');
    }
    patch.comment = cleanComment;
  }

  if (status !== undefined) {
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      throw validationError('Invalid status.');
    }
    patch.status = status;
  }

  await k('reviews').where({ id: Number(reviewId) }).update(patch);
  return { ok: true, id: Number(reviewId), ...patch };
}

/**
 * Admin: Delete a review (with soft delete option).
 */
export async function adminDeleteReview(k, reviewId, { soft = false } = {}) {
  const review = await k('reviews').where({ id: Number(reviewId) }).first();
  if (!review) {
    throw validationError('Review not found.', 404);
  }

  if (soft) {
    await k('reviews').where({ id: Number(reviewId) }).update({ deleted_at: now() });
  } else {
    await k('reviews').where({ id: Number(reviewId) }).del();
  }

  return { ok: true, id: Number(reviewId) };
}
