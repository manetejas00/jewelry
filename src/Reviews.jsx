import React, { useState, useEffect, useRef, useId } from 'react';
import { Link } from 'react-router-dom';
import { Star, CheckCircle, Upload, X, AlertCircle, Sparkles, MessageSquare, Image as ImageIcon, ChevronDown, Clock } from 'lucide-react';
import { api } from './api.js';
import { useStore } from './store.jsx';

/**
 * Reusable Star Rating component (supports interactive rating and display).
 */
export function StarRating({
  rating = 0,
  max = 5,
  size = 16,
  interactive = false,
  onRate = null,
  ariaLabel = ''
}) {
  const [hoverRating, setHoverRating] = useState(0);
  const activeRating = interactive && hoverRating > 0 ? hoverRating : Number(rating) || 0;

  return (
    <div
      className={`star-rating-wrap ${interactive ? 'interactive' : 'readonly'}`}
      role={interactive ? 'radiogroup' : 'img'}
      aria-label={ariaLabel || `${rating} out of ${max} stars`}
      onMouseLeave={() => interactive && setHoverRating(0)}
    >
      {Array.from({ length: max }, (_, i) => {
        const starNum = i + 1;
        const isFilled = activeRating >= starNum;
        const isHalf = !isFilled && activeRating >= starNum - 0.5;

        if (interactive) {
          return (
            <button
              key={starNum}
              type="button"
              role="radio"
              aria-checked={rating === starNum}
              aria-label={`${starNum} star${starNum > 1 ? 's' : ''}`}
              className={`star-btn ${isFilled ? 'filled' : ''}`}
              onClick={() => onRate && onRate(starNum)}
              onMouseEnter={() => setHoverRating(starNum)}
              onFocus={() => setHoverRating(starNum)}
              onBlur={() => setHoverRating(0)}
            >
              <Star
                size={size}
                fill={isFilled ? 'var(--gold, #b8860b)' : 'none'}
                stroke={isFilled ? 'var(--gold, #b8860b)' : 'currentColor'}
              />
            </button>
          );
        }

        return (
          <span key={starNum} className={`star-icon-span ${isFilled ? 'filled' : isHalf ? 'half' : 'empty'}`}>
            <Star
              size={size}
              fill={isFilled ? 'var(--gold, #b8860b)' : isHalf ? 'url(#half-star-grad)' : 'none'}
              stroke={isFilled || isHalf ? 'var(--gold, #b8860b)' : 'var(--muted, #999)'}
            />
          </span>
        );
      })}
    </div>
  );
}

/**
 * Compact Rating Badge for product cards, search rows, and PDP headers.
 */
export function RatingBadge({
  rating,
  count,
  onClick = null,
  showEmpty = true,
  size = 'sm'
}) {
  const hasReviews = typeof count === 'number' && count > 0 && typeof rating === 'number' && rating > 0;

  if (!hasReviews) {
    if (!showEmpty) return null;
    return (
      <span className={`rating-badge empty size-${size}`} title="No customer reviews yet">
        <Star size={size === 'lg' ? 15 : 12} className="rating-star-empty" />
        <span className="rating-empty-text">No reviews yet</span>
      </span>
    );
  }

  const content = (
    <>
      <Star size={size === 'lg' ? 16 : 13} fill="var(--gold, #b8860b)" stroke="var(--gold, #b8860b)" />
      <strong className="rating-score">{Number(rating).toFixed(1)}</strong>
      <span className="rating-count">({count})</span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`rating-badge clickable size-${size}`}
        onClick={onClick}
        aria-label={`Rated ${Number(rating).toFixed(1)} out of 5 stars based on ${count} reviews. Click to read reviews.`}
      >
        {content}
      </button>
    );
  }

  return (
    <span className={`rating-badge size-${size}`}>
      {content}
    </span>
  );
}

/**
 * Format date for display in customer reviews (e.g. "12 Oct 2026")
 */
function formatReviewDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch {
    return dateStr;
  }
}

/**
 * Dedicated Product Reviews and Ratings section on PDP.
 */
export function ProductReviewsSection({ product }) {
  const { customer } = useStore();
  const [data, setData] = useState({
    summary: {
      averageRating: null,
      totalReviews: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      percentages: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      verifiedPurchasesCount: 0
    },
    reviews: [],
    myReview: null,
    pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('recent');
  const [ratingFilter, setRatingFilter] = useState(null);

  // Form states
  const [formOpen, setFormOpen] = useState(false);
  const [formRating, setFormRating] = useState(5);
  const [formTitle, setFormTitle] = useState('');
  const [formComment, setFormComment] = useState('');
  const [formImages, setFormImages] = useState([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);

  const fileInputRef = useRef(null);

  const productId = product?.id;

  // Load reviews from API
  async function loadReviews(pageNum = page, currentSort = sort, filter = ratingFilter) {
    if (!productId) return;
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      if (pageNum > 1) q.set('page', pageNum);
      if (currentSort !== 'recent') q.set('sort', currentSort);
      if (filter) q.set('rating', filter);

      const qs = q.toString() ? `?${q.toString()}` : '';
      const res = await api(`/products/${productId}/reviews${qs}`);
      setData(res);

      // Pre-fill form if customer already reviewed and user opens edit mode
      if (res.myReview && !formTitle && !formComment) {
        setFormRating(res.myReview.rating || 5);
        setFormTitle(res.myReview.title || '');
        setFormComment(res.myReview.comment || '');
        setFormImages(res.myReview.images || []);
      }
    } catch (e) {
      setError(e.message || 'Unable to load reviews.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
    setRatingFilter(null);
    setFormSuccess('');
    setFormError('');
    loadReviews(1, sort, null);
  }, [productId]);

  useEffect(() => {
    loadReviews(page, sort, ratingFilter);
  }, [page, sort, ratingFilter]);

  // Handle image upload from file picker
  async function handleImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFormError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('Image size cannot exceed 5 MB.');
      return;
    }

    if (formImages.length >= 5) {
      setFormError('You can upload up to 5 images per review.');
      return;
    }

    setUploadingImage(true);
    setFormError('');

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read image file.'));
        reader.readAsDataURL(file);
      });

      const res = await api('/reviews/upload-image', {
        name: file.name,
        data: base64
      });

      if (res.url) {
        setFormImages(prev => [...prev, res.url]);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to upload photo.');
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleRemoveImage(index) {
    setFormImages(prev => prev.filter((_, i) => i !== index));
  }

  function openEditForm() {
    if (data.myReview) {
      setFormRating(data.myReview.rating);
      setFormTitle(data.myReview.title);
      setFormComment(data.myReview.comment);
      setFormImages(data.myReview.images || []);
      setIsEditing(true);
    } else {
      setIsEditing(false);
    }
    setFormOpen(true);
    setFormSuccess('');
    setFormError('');
  }

  // Submit new review or update existing
  async function handleSubmitReview(e) {
    e.preventDefault();
    if (!customer) {
      setFormError('Please sign in to submit your review.');
      return;
    }

    if (!formRating || formRating < 1 || formRating > 5) {
      setFormError('Please select a rating between 1 and 5 stars.');
      return;
    }

    if (!formTitle.trim() || formTitle.trim().length < 3) {
      setFormError('Please enter a review headline of at least 3 characters.');
      return;
    }

    if (!formComment.trim() || formComment.trim().length < 10) {
      setFormError('Please write a review description of at least 10 characters.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    setFormSuccess('');

    try {
      if (isEditing && data.myReview?.id) {
        await api(`/reviews/${data.myReview.id}`, {
          rating: formRating,
          title: formTitle.trim(),
          comment: formComment.trim(),
          images: formImages
        }, 'PUT');
        setFormSuccess('Your review has been updated and submitted for moderation.');
      } else {
        await api(`/products/${productId}/reviews`, {
          rating: formRating,
          title: formTitle.trim(),
          comment: formComment.trim(),
          images: formImages
        });
        setFormSuccess('Thank you! Your review has been submitted and will appear once approved by our atelier team.');
      }

      setFormOpen(false);
      await loadReviews(1, sort, ratingFilter);
    } catch (err) {
      setFormError(err.message || 'Unable to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const { summary, reviews, myReview, pagination } = data;
  const hasReviews = summary.totalReviews > 0;

  return (
    <section className="product-reviews-section section" id="reviews">
      <div className="reviews-header-block">
        <div className="reviews-title-wrap">
          <span className="eyebrow">HEIRLOOM STORIES</span>
          <h2>Client Reviews & Ratings</h2>
          <p className="reviews-subtitle">
            Authentic impressions from patrons who treasure Veyora craftsmanship.
          </p>
        </div>

        <div className="reviews-cta-wrap">
          {myReview ? (
            <div className="my-review-status-pill">
              <span className={`status-dot ${myReview.status}`} />
              <span>
                {myReview.status === 'approved'
                  ? 'Your review is published'
                  : myReview.status === 'pending'
                  ? 'Your review is pending moderation'
                  : 'Your review was rejected'}
              </span>
              <button type="button" className="underlink" onClick={openEditForm}>
                Edit review ↗
              </button>
            </div>
          ) : customer ? (
            <button
              type="button"
              className="button dark write-review-btn"
              onClick={() => {
                setIsEditing(false);
                setFormOpen(prev => !prev);
              }}
            >
              <MessageSquare size={16} />
              {formOpen ? 'Close form' : 'Write a review'}
            </button>
          ) : (
            <Link to="/account" className="button secondary write-review-btn">
              Sign in to write a review
            </Link>
          )}
        </div>
      </div>

      {formSuccess && (
        <div className="review-alert success" role="status">
          <CheckCircle size={18} />
          <span>{formSuccess}</span>
        </div>
      )}

      {/* Write / Edit Review Form */}
      {formOpen && customer && (
        <div className="review-form-card">
          <div className="review-form-header">
            <h3>{isEditing ? 'Edit Your Review' : 'Share Your Experience'}</h3>
            <button
              type="button"
              className="icon-button"
              onClick={() => setFormOpen(false)}
              aria-label="Close review form"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmitReview}>
            <div className="form-group">
              <label id="star-rating-label">Overall rating *</label>
              <StarRating
                rating={formRating}
                interactive={true}
                onRate={setFormRating}
                size={24}
                ariaLabel="Select overall rating from 1 to 5 stars"
              />
              <span className="rating-hint-text">
                {formRating === 5
                  ? 'Exceptional heirloom quality'
                  : formRating === 4
                  ? 'Delightful piece and craftsmanship'
                  : formRating === 3
                  ? 'Average satisfaction'
                  : formRating === 2
                  ? 'Below expectations'
                  : 'Dissatisfied'}
              </span>
            </div>

            <div className="form-group">
              <label htmlFor="review-title">Review headline *</label>
              <input
                id="review-title"
                type="text"
                maxLength={150}
                required
                placeholder="e.g. Sublime pearl luster, fits true to size"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="review-comment">Your review *</label>
              <textarea
                id="review-comment"
                rows={4}
                maxLength={3000}
                required
                placeholder="Describe the craftsmanship, weight, setting, packaging, or styling notes..."
                value={formComment}
                onChange={e => setFormComment(e.target.value)}
              />
              <div className="char-count">{formComment.length} / 3000 characters</div>
            </div>

            <div className="form-group">
              <label>Photographs (Optional, up to 5)</label>
              <div className="review-image-upload-row">
                {formImages.map((imgUrl, idx) => (
                  <div key={idx} className="review-photo-preview">
                    <img src={imgUrl} alt="Customer upload preview" />
                    <button
                      type="button"
                      className="remove-photo-btn"
                      onClick={() => handleRemoveImage(idx)}
                      aria-label="Remove uploaded image"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}

                {formImages.length < 5 && (
                  <label className={`photo-upload-box ${uploadingImage ? 'disabled' : ''}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleImageUpload}
                      disabled={uploadingImage}
                      style={{ display: 'none' }}
                    />
                    <Upload size={18} />
                    <span>{uploadingImage ? 'Uploading…' : 'Add photo'}</span>
                  </label>
                )}
              </div>
              <small className="form-hint">Accepted: JPG, PNG, WebP up to 5 MB per photograph.</small>
            </div>

            {formError && (
              <div className="review-alert error" role="alert">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div className="form-actions">
              <button
                type="submit"
                className="button dark"
                disabled={submitting || uploadingImage}
              >
                {submitting
                  ? 'Submitting…'
                  : isEditing
                  ? 'Update Review'
                  : 'Submit for Moderation'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setFormOpen(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ratings Summary Card */}
      <div className="reviews-summary-card">
        <div className="summary-left-score">
          <div className="score-big-number">
            {hasReviews ? summary.averageRating.toFixed(1) : '—'}
          </div>
          <StarRating rating={summary.averageRating || 0} size={20} />
          <div className="score-count-label">
            {hasReviews
              ? `Based on ${summary.totalReviews} verified ${summary.totalReviews === 1 ? 'review' : 'reviews'}`
              : 'No customer reviews yet'}
          </div>
          {summary.verifiedPurchasesCount > 0 && (
            <div className="verified-badge-pill">
              <CheckCircle size={12} />
              <span>{summary.verifiedPurchasesCount} verified buyer reviews</span>
            </div>
          )}
        </div>

        <div className="summary-distribution-bars">
          {[5, 4, 3, 2, 1].map(stars => {
            const count = summary.distribution[stars] || 0;
            const pct = summary.percentages[stars] || 0;
            const isSelected = ratingFilter === stars;

            return (
              <button
                key={stars}
                type="button"
                className={`dist-bar-row ${isSelected ? 'active-filter' : ''}`}
                onClick={() => {
                  setPage(1);
                  setRatingFilter(isSelected ? null : stars);
                }}
                aria-label={`Filter by ${stars} stars: ${count} reviews`}
                title={`${stars} stars: ${count} reviews (${pct}%)`}
              >
                <span className="dist-star-label">{stars} ★</span>
                <div className="dist-track">
                  <div
                    className="dist-fill"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="dist-count">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters and Controls */}
      {hasReviews && (
        <div className="reviews-controls-bar">
          <div className="active-filters-wrap">
            {ratingFilter ? (
              <div className="filter-pill">
                <span>Filtered by {ratingFilter} Stars ({pagination.total})</span>
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setRatingFilter(null);
                  }}
                  aria-label="Clear star filter"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <span className="showing-count">
                Showing {reviews.length} of {pagination.total} reviews
              </span>
            )}
          </div>

          <div className="sort-select-wrap">
            <label htmlFor="review-sort-select">Sort by:</label>
            <select
              id="review-sort-select"
              value={sort}
              onChange={e => {
                setPage(1);
                setSort(e.target.value);
              }}
            >
              <option value="recent">Most recent</option>
              <option value="highest">Highest rated</option>
              <option value="lowest">Lowest rated</option>
            </select>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading && !reviews.length ? (
        <div className="reviews-loading" role="status">
          <span className="spinner-icon" />
          <p>Loading customer reviews…</p>
        </div>
      ) : error ? (
        <div className="review-alert error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button type="button" className="underlink" onClick={() => loadReviews()}>
            Try again
          </button>
        </div>
      ) : !reviews.length ? (
        <div className="reviews-empty-state">
          <Sparkles size={32} className="empty-sparkle" />
          <h3>
            {ratingFilter
              ? `No ${ratingFilter}-star reviews found`
              : 'Be the first to adore this piece'}
          </h3>
          <p>
            {ratingFilter
              ? 'Try selecting another star rating or reset filters to see all reviews.'
              : 'Share your thoughts on the craftsmanship, fit, and luster for future patrons.'}
          </p>
          {ratingFilter ? (
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setPage(1);
                setRatingFilter(null);
              }}
            >
              Show all reviews
            </button>
          ) : !customer ? (
            <Link to="/account" className="button dark">
              Sign in to write a review
            </Link>
          ) : (
            <button
              type="button"
              className="button dark"
              onClick={() => setFormOpen(true)}
            >
              Write the first review
            </button>
          )}
        </div>
      ) : (
        <div className="reviews-list">
          {reviews.map(rev => (
            <article key={rev.id} className="review-item-card">
              <div className="review-author-row">
                <div className="author-avatar" aria-hidden="true">
                  {rev.customerName[0] || 'C'}
                </div>
                <div className="author-meta">
                  <div className="author-name-wrap">
                    <span className="author-name">{rev.customerName}</span>
                    {rev.isVerifiedPurchase && (
                      <span className="verified-purchase-tag" title="Verified purchaser of this piece">
                        <CheckCircle size={12} /> Verified Purchase
                      </span>
                    )}
                    {rev.status === 'pending' && (
                      <span className="pending-review-tag" title="Review is awaiting moderator approval">
                        <Clock size={11} /> Pending Review
                      </span>
                    )}
                  </div>
                  <time className="review-date" dateTime={rev.createdAt}>
                    {formatReviewDate(rev.createdAt)}
                  </time>
                </div>
                <div className="review-star-rating">
                  <StarRating rating={rev.rating} size={15} />
                </div>
              </div>

              {rev.status === 'pending' && (
                <div className="review-pending-banner">
                  <Clock size={13} />
                  <span>This review is currently awaiting moderation by Veyora Studio.</span>
                </div>
              )}

              <h4 className="review-title">{rev.title}</h4>
              <p className="review-comment">{rev.comment}</p>

              {rev.images && rev.images.length > 0 && (
                <div className="review-attached-photos">
                  {rev.images.map((photoUrl, pIdx) => (
                    <button
                      key={pIdx}
                      type="button"
                      className="attached-photo-btn"
                      onClick={() => setZoomedImage(photoUrl)}
                      aria-label="View enlarged customer review photograph"
                    >
                      <img src={photoUrl} alt="Customer review photograph" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {/* Pagination / Load more */}
      {pagination.totalPages > 1 && (
        <div className="reviews-pagination">
          <button
            type="button"
            className="pagination-btn"
            disabled={page <= 1 || loading}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className="pagination-info">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            className="pagination-btn"
            disabled={page >= pagination.totalPages || loading}
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
          >
            Next
          </button>
        </div>
      )}

      {/* Zoom Modal for Review Photos */}
      {zoomedImage && (
        <div className="review-photo-lightbox" onClick={() => setZoomedImage(null)}>
          <div className="lightbox-content" onClick={e => e.stopPropagation()}>
            <img src={zoomedImage} alt="Enlarged review photograph" />
            <button
              type="button"
              className="lightbox-close-btn"
              onClick={() => setZoomedImage(null)}
              aria-label="Close image preview"
            >
              <X size={20} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
