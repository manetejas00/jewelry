import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import {validationError} from '../../errors.js';
import {saveUploadedImage} from '../../thumbnails.js';
import {invalidateSearchCache} from '../../search.js';
import {customerAuth, customerCsrf} from '../customers/policies.js';
import {
  getProductReviews,
  submitReview,
  updateCustomerReview,
  getAdminReviews,
  getAdminReviewById,
  adminUpdateReviewStatus,
  adminBulkReviewStatus,
  adminEditReview,
  adminDeleteReview
} from '../../reviews.js';

export function registerPublicReviewRoutes(app, { db, route, uploadsDir }) {
  const reviewSubmissionLimit = rateLimit({windowMs:15*60000,limit:25,message:{error:'Too many reviews submitted. Please try again later.'}});
  const reviewUploadLimit = rateLimit({windowMs:15*60000,limit:30,message:{error:'Too many image uploads. Please try again later.'}});

  app.get('/api/products/:productId/reviews', route(async (req, res) => {
    const currentCustomerId = req.session.customer?.id || null;
    const result = await getProductReviews(db, req.params.productId, {
      page: req.query.page,
      limit: req.query.limit,
      sort: req.query.sort,
      ratingFilter: req.query.rating,
      currentCustomerId
    });
    res.json(result);
  }));

  app.get('/api/products/:productId/ratings', route(async (req, res) => {
    const result = await getProductReviews(db, req.params.productId, { limit: 1 });
    res.json(result.summary);
  }));

  app.post('/api/products/:productId/reviews', reviewSubmissionLimit, customerAuth, customerCsrf, route(async (req, res) => {
    const result = await submitReview(db, req.session.customer.id, req.params.productId, req.body);
    invalidateSearchCache();
    res.status(201).json(result);
  }));

  app.put('/api/reviews/:id', reviewSubmissionLimit, customerAuth, customerCsrf, route(async (req, res) => {
    const result = await updateCustomerReview(db, req.session.customer.id, req.params.id, req.body);
    invalidateSearchCache();
    res.json(result);
  }));

  app.post('/api/reviews/upload-image', reviewUploadLimit, customerAuth, customerCsrf, route(async (req, res) => {
    const { name, data } = req.body;
    if (!data || typeof data !== 'string') throw validationError('Image data is required');
    const match = data.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (!match) throw validationError('Invalid image data format. Please upload a PNG, JPG, or WEBP image.');
    const ext = match[1].toLowerCase().replace('jpeg', 'jpg');
    if (!['jpg', 'png', 'webp'].includes(ext)) throw validationError('Supported review image formats: JPG, PNG, WEBP');
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 5 * 1024 * 1024) throw validationError('Maximum review image size is 5 MB');
    const cleanName = String(name || 'customer-photo').toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9_-]+/g, '-').slice(0, 30) || 'review';
    const filename = `review-${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${cleanName}.${ext}`;
    const saved = await saveUploadedImage(uploadsDir, filename, buffer);
    res.json({ ok: true, url: saved.url, thumbnail: saved.thumbnail });
  }));
}

export function registerAdminReviewRoutes(app, { db, route, auth, audit }) {
  app.get('/api/admin/reviews', auth(), route(async (req, res) => {
    const result = await getAdminReviews(db, {
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
      rating: req.query.rating,
      productId: req.query.productId,
      search: req.query.search,
      dateFrom: req.query.dateFrom,
      dateTo: req.query.dateTo,
      sort: req.query.sort,
      order: req.query.order
    });
    res.json(result);
  }));

  app.get('/api/admin/reviews/:id', auth(), route(async (req, res) => {
    const review = await getAdminReviewById(db, req.params.id);
    res.json(review);
  }));

  app.patch('/api/admin/reviews/:id/status', auth(['owner', 'manager']), route(async (req, res) => {
    const result = await adminUpdateReviewStatus(db, req.params.id, req.body.status);
    await audit(req, 'update_review_status', { reviewId: req.params.id, status: req.body.status });
    invalidateSearchCache();
    res.json(result);
  }));

  app.post('/api/admin/reviews/bulk-status', auth(['owner', 'manager']), route(async (req, res) => {
    const result = await adminBulkReviewStatus(db, req.body.reviewIds, req.body.status);
    await audit(req, 'bulk_update_review_status', { reviewIds: req.body.reviewIds, status: req.body.status, count: result.updatedCount });
    invalidateSearchCache();
    res.json(result);
  }));

  app.put('/api/admin/reviews/:id', auth(['owner', 'manager']), route(async (req, res) => {
    const result = await adminEditReview(db, req.params.id, req.body);
    await audit(req, 'edit_review', { reviewId: req.params.id, patch: req.body });
    invalidateSearchCache();
    res.json(result);
  }));

  app.delete('/api/admin/reviews/:id', auth(['owner', 'manager']), route(async (req, res) => {
    const soft = req.query.soft === 'true' || req.body?.soft === true;
    const result = await adminDeleteReview(db, req.params.id, { soft });
    await audit(req, 'delete_review', { reviewId: req.params.id, soft });
    invalidateSearchCache();
    res.json(result);
  }));
}
