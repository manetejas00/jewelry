import React, { useState, useEffect } from 'react';
import {
  Star,
  Check,
  X,
  Edit2,
  Trash2,
  Eye,
  Filter,
  Search,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  MessageSquare
} from 'lucide-react';
import { api } from './api.js';

export function ReviewsAdmin({ readonly = false, refreshParent = null }) {
  const [data, setData] = useState({
    stats: { total: 0, pending: 0, approved: 0, rejected: 0, averageRating: null },
    reviews: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);

  // Modals
  const [detailReview, setDetailReview] = useState(null);
  const [editReviewData, setEditReviewData] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [actionBusy, setActionBusy] = useState(false);

  async function loadReviews(pageNum = page) {
    setLoading(true);
    setError('');
    try {
      const q = new URLSearchParams();
      q.set('page', pageNum);
      q.set('limit', 20);
      if (statusFilter && statusFilter !== 'all') q.set('status', statusFilter);
      if (ratingFilter) q.set('rating', ratingFilter);
      if (searchTerm.trim()) q.set('search', searchTerm.trim());
      if (dateFrom) q.set('dateFrom', dateFrom);
      if (dateTo) q.set('dateTo', dateTo);

      const res = await api(`/admin/reviews?${q.toString()}`);
      setData(res);
      setSelectedIds(new Set());
    } catch (e) {
      setError(e.message || 'Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReviews(page);
  }, [page, statusFilter, ratingFilter]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    loadReviews(1);
  }

  function handleResetFilters() {
    setStatusFilter('all');
    setRatingFilter('');
    setSearchTerm('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  // Single review moderation
  async function handleStatusChange(reviewId, newStatus) {
    if (readonly) return;
    setActionBusy(true);
    setError('');
    setSuccess('');
    try {
      await api(`/admin/reviews/${reviewId}/status`, { status: newStatus }, 'PATCH');
      setSuccess(`Review #${reviewId} marked as ${newStatus}.`);
      if (detailReview?.id === reviewId) {
        setDetailReview(prev => (prev ? { ...prev, status: newStatus } : null));
      }
      await loadReviews(page);
      if (refreshParent) refreshParent();
    } catch (e) {
      setError(e.message || `Failed to update review status.`);
    } finally {
      setActionBusy(false);
    }
  }

  // Bulk actions
  async function handleBulkAction(newStatus) {
    if (readonly || selectedIds.size === 0) return;
    setBulkBusy(true);
    setError('');
    setSuccess('');
    try {
      const reviewIds = Array.from(selectedIds);
      const res = await api('/admin/reviews/bulk-status', {
        reviewIds,
        status: newStatus
      });
      setSuccess(`Successfully ${newStatus === 'approved' ? 'approved' : 'rejected'} ${res.updatedCount} reviews.`);
      setSelectedIds(new Set());
      await loadReviews(page);
      if (refreshParent) refreshParent();
    } catch (e) {
      setError(e.message || 'Bulk operation failed.');
    } finally {
      setBulkBusy(false);
    }
  }

  function toggleSelectAll() {
    if (selectedIds.size === data.reviews.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.reviews.map(r => r.id)));
    }
  }

  function toggleSelectOne(id) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  // Edit review
  async function handleSaveEdit(e) {
    e.preventDefault();
    if (readonly || !editReviewData) return;
    setActionBusy(true);
    setError('');
    try {
      await api(`/admin/reviews/${editReviewData.id}`, {
        rating: editReviewData.rating,
        title: editReviewData.title,
        comment: editReviewData.comment,
        status: editReviewData.status,
        isVerifiedPurchase: Boolean(editReviewData.isVerifiedPurchase)
      }, 'PUT');
      setSuccess(`Review #${editReviewData.id} updated successfully.`);
      setEditReviewData(null);
      await loadReviews(page);
      if (refreshParent) refreshParent();
    } catch (e) {
      setError(e.message || 'Failed to update review.');
    } finally {
      setActionBusy(false);
    }
  }

  // Delete review
  async function handleDeleteReview() {
    if (readonly || !deleteId) return;
    setActionBusy(true);
    setError('');
    try {
      await api(`/admin/reviews/${deleteId}`, {}, 'DELETE');
      setSuccess(`Review #${deleteId} permanently removed.`);
      setDeleteId(null);
      if (detailReview?.id === deleteId) setDetailReview(null);
      await loadReviews(page);
      if (refreshParent) refreshParent();
    } catch (e) {
      setError(e.message || 'Failed to delete review.');
    } finally {
      setActionBusy(false);
    }
  }

  const { stats, reviews, pagination } = data;

  return (
    <div className="admin-reviews-panel">
      {/* Top Banner & Stats */}
      <div className="reviews-stats-grid">
        <div className="stat-card total-card">
          <div className="stat-card-header">
            <span className="stat-label">Total Reviews</span>
            <span className="stat-card-icon"><MessageSquare size={15} /></span>
          </div>
          <strong className="stat-value">{stats.total}</strong>
          <span className="stat-detail">Across all collection pieces</span>
        </div>
        <div className="stat-card pending-card">
          <div className="stat-card-header">
            <span className="stat-label">Pending Moderation</span>
            <span className="stat-card-icon"><Clock size={15} /></span>
          </div>
          <strong className="stat-value">{stats.pending}</strong>
          <span className="stat-detail">{stats.pending ? `${stats.pending} awaiting moderation` : 'Queue all clear'}</span>
        </div>
        <div className="stat-card approved-card">
          <div className="stat-card-header">
            <span className="stat-label">Approved Reviews</span>
            <span className="stat-card-icon"><CheckCircle size={15} /></span>
          </div>
          <strong className="stat-value">{stats.approved}</strong>
          <span className="stat-detail">Publicly visible on storefront</span>
        </div>
        <div className="stat-card rejected-card">
          <div className="stat-card-header">
            <span className="stat-label">Rejected Reviews</span>
            <span className="stat-card-icon"><X size={15} /></span>
          </div>
          <strong className="stat-value">{stats.rejected}</strong>
          <span className="stat-detail">Hidden from catalogue</span>
        </div>
        <div className="stat-card score-card">
          <div className="stat-card-header">
            <span className="stat-label">Average Rating</span>
            <span className="stat-card-icon"><Star size={15} fill="var(--gold, #ab9162)" stroke="var(--gold, #ab9162)" /></span>
          </div>
          <strong className="stat-value">{stats.averageRating ? `${stats.averageRating} ★` : '—'}</strong>
          <span className="stat-detail">Approved reviews only</span>
        </div>
      </div>

      {readonly && (
        <div className="notice" style={{ margin: '14px 0' }}>
          Viewer account: You have read-only access to customer reviews. Moderation actions (approve, reject, edit, delete) require a Manager or Owner account.
        </div>
      )}

      {success && (
        <div className="review-alert success" role="status" style={{ margin: '12px 0' }}>
          <CheckCircle size={16} />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="review-alert error" role="alert" style={{ margin: '12px 0' }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="reviews-admin-filters-card">
        <form onSubmit={handleSearchSubmit} className="reviews-filter-form">
          <div className="filter-field search-field">
            <label htmlFor="rev-search">Search reviews</label>
            <div className="search-input-box">
              <Search size={15} />
              <input
                id="rev-search"
                type="text"
                placeholder="Search customer, email, piece, headline, or text…"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-field">
            <label htmlFor="rev-status">Status</label>
            <select
              id="rev-status"
              value={statusFilter}
              onChange={e => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="all">All statuses ({stats.total})</option>
              <option value="pending">Pending ({stats.pending})</option>
              <option value="approved">Approved ({stats.approved})</option>
              <option value="rejected">Rejected ({stats.rejected})</option>
            </select>
          </div>

          <div className="filter-field">
            <label htmlFor="rev-rating">Rating</label>
            <select
              id="rev-rating"
              value={ratingFilter}
              onChange={e => {
                setRatingFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All ratings</option>
              <option value="5">5 Stars ★★★★★</option>
              <option value="4">4 Stars ★★★★☆</option>
              <option value="3">3 Stars ★★★☆☆</option>
              <option value="2">2 Stars ★★☆☆☆</option>
              <option value="1">1 Star ★☆☆☆☆</option>
            </select>
          </div>

          <div className="filter-field date-field">
            <label htmlFor="rev-date-from">From date</label>
            <input
              id="rev-date-from"
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
            />
          </div>

          <div className="filter-field date-field">
            <label htmlFor="rev-date-to">To date</label>
            <input
              id="rev-date-to"
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
            />
          </div>

          <div className="filter-buttons">
            <button type="submit" className="button dark sm">
              <Search size={14} /> Filter
            </button>
            <button
              type="button"
              className="button secondary sm"
              onClick={handleResetFilters}
              title="Reset all filters"
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
        </form>
      </div>

      {/* Bulk Action Controls */}
      <div className="reviews-bulk-bar">
        <div className="bulk-selection-info">
          <label className="checkbox-wrap">
            <input
              type="checkbox"
              checked={reviews.length > 0 && selectedIds.size === reviews.length}
              onChange={toggleSelectAll}
              disabled={reviews.length === 0}
            />
            <span>Select all on page</span>
          </label>
          {selectedIds.size > 0 && (
            <span className="selected-count-pill">
              {selectedIds.size} {selectedIds.size === 1 ? 'review' : 'reviews'} selected
            </span>
          )}
        </div>

        {!readonly && selectedIds.size > 0 && (
          <div className="bulk-action-buttons">
            <button
              type="button"
              className="button dark sm approve-btn"
              disabled={bulkBusy}
              onClick={() => handleBulkAction('approved')}
            >
              <Check size={14} /> Bulk Approve ({selectedIds.size})
            </button>
            <button
              type="button"
              className="button secondary sm reject-btn"
              disabled={bulkBusy}
              onClick={() => handleBulkAction('rejected')}
            >
              <X size={14} /> Bulk Reject ({selectedIds.size})
            </button>
          </div>
        )}
      </div>

      {/* Reviews Table */}
      <div className="table-wrap reviews-table-wrap">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40 }}>
                <span className="sr-only">Select</span>
              </th>
              <th>Customer</th>
              <th>Product</th>
              <th>Rating</th>
              <th>Review Headline & Comment</th>
              <th>Date</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && !reviews.length ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '30px' }}>
                  Loading reviews…
                </td>
              </tr>
            ) : !reviews.length ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                  <Sparkles size={24} style={{ color: 'var(--gold, #b8860b)', marginBottom: 8 }} />
                  <p style={{ margin: 0 }}>No reviews matched the current filters.</p>
                </td>
              </tr>
            ) : (
              reviews.map(r => {
                const isSelected = selectedIds.has(r.id);
                const hasImages = r.images && r.images.length > 0;

                return (
                  <tr key={r.id} className={isSelected ? 'selected-row' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(r.id)}
                        aria-label={`Select review #${r.id}`}
                      />
                    </td>
                    <td>
                      <div className="table-customer-cell">
                        <strong>{r.customerName}</strong>
                        <small>{r.customerEmail}</small>
                        {r.isVerifiedPurchase && (
                          <span className="verified-tag-mini" title="Verified Purchase">
                            <Check size={10} /> Verified
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="table-product-cell">
                        {r.productImage && (
                          <img
                            src={r.productImage}
                            alt=""
                            className="table-product-thumb"
                          />
                        )}
                        <div>
                          <strong>{r.productName}</strong>
                          <small>{r.productCode}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table-rating-stars">
                        <span className="rating-num">{r.rating}★</span>
                        <div className="stars-mini">
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              size={11}
                              fill={i < r.rating ? 'var(--gold, #b8860b)' : 'none'}
                              stroke={i < r.rating ? 'var(--gold, #b8860b)' : 'var(--muted, #999)'}
                            />
                          ))}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="table-content-snippet">
                        <strong className="snippet-title">{r.title}</strong>
                        <p className="snippet-body">{r.comment}</p>
                        {hasImages && (
                          <span className="has-images-indicator">
                            📷 {r.images.length} {r.images.length === 1 ? 'photo' : 'photos'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <small className="date-cell">
                        {new Date(r.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </small>
                    </td>
                    <td>
                      <span className={`status-badge-review ${r.status}`}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions-cell">
                        <button
                          type="button"
                          className="icon-action-btn"
                          title="View complete review details"
                          onClick={() => setDetailReview(r)}
                        >
                          <Eye size={15} />
                        </button>

                        {!readonly && r.status !== 'approved' && (
                          <button
                            type="button"
                            className="icon-action-btn approve"
                            title="Approve review"
                            disabled={actionBusy}
                            onClick={() => handleStatusChange(r.id, 'approved')}
                          >
                            <Check size={15} />
                          </button>
                        )}

                        {!readonly && r.status !== 'rejected' && (
                          <button
                            type="button"
                            className="icon-action-btn reject"
                            title="Reject review"
                            disabled={actionBusy}
                            onClick={() => handleStatusChange(r.id, 'rejected')}
                          >
                            <X size={15} />
                          </button>
                        )}

                        {!readonly && (
                          <button
                            type="button"
                            className="icon-action-btn edit"
                            title="Edit review"
                            onClick={() => setEditReviewData({ ...r })}
                          >
                            <Edit2 size={14} />
                          </button>
                        )}

                        {!readonly && (
                          <button
                            type="button"
                            className="icon-action-btn delete"
                            title="Delete review"
                            onClick={() => setDeleteId(r.id)}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination.totalPages > 1 && (
        <div className="admin-pagination-bar">
          <span className="pagination-text">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} reviews
          </span>
          <div className="pagination-nav">
            <button
              type="button"
              className="page-nav-btn"
              disabled={page <= 1 || loading}
              onClick={() => setPage(p => Math.max(1, p - 1))}
            >
              <ChevronLeft size={16} /> Prev
            </button>
            <span className="current-page-tag">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              type="button"
              className="page-nav-btn"
              disabled={page >= pagination.totalPages || loading}
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailReview && (
        <div className="admin-modal-backdrop" onClick={() => setDetailReview(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Review Details #{detailReview.id}</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDetailReview(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-meta-grid">
                <div>
                  <span className="detail-field-label">Customer</span>
                  <strong>{detailReview.customerName}</strong>
                  <small>{detailReview.customerEmail}</small>
                </div>
                <div>
                  <span className="detail-field-label">Piece</span>
                  <strong>{detailReview.productName}</strong>
                  <small>{detailReview.productCode}</small>
                </div>
                <div>
                  <span className="detail-field-label">Rating</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <strong style={{ fontSize: 18, color: 'var(--gold, #b8860b)' }}>
                      {detailReview.rating} / 5
                    </strong>
                    <span>{'★'.repeat(detailReview.rating)}</span>
                  </div>
                </div>
                <div>
                  <span className="detail-field-label">Status</span>
                  <span className={`status-badge-review ${detailReview.status}`}>
                    {detailReview.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="detail-field-label">Purchase Verification</span>
                  <span>{detailReview.isVerifiedPurchase ? '✓ Verified Purchase' : 'Unverified (No order match)'}</span>
                </div>
                <div>
                  <span className="detail-field-label">Submitted On</span>
                  <span>{new Date(detailReview.createdAt).toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="detail-text-section">
                <span className="detail-field-label">Review Headline</span>
                <h4 style={{ margin: '4px 0 12px', fontSize: 16 }}>{detailReview.title}</h4>

                <span className="detail-field-label">Description</span>
                <p className="detail-comment-text">{detailReview.comment}</p>
              </div>

              {detailReview.images && detailReview.images.length > 0 && (
                <div className="detail-images-section">
                  <span className="detail-field-label">Customer Attached Photographs ({detailReview.images.length})</span>
                  <div className="detail-photos-row">
                    {detailReview.images.map((img, idx) => (
                      <a
                        key={idx}
                        href={img}
                        target="_blank"
                        rel="noreferrer"
                        className="detail-photo-link"
                      >
                        <img src={img} alt="Customer upload" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              {!readonly && (
                <>
                  {detailReview.status !== 'approved' && (
                    <button
                      type="button"
                      className="button dark"
                      disabled={actionBusy}
                      onClick={() => handleStatusChange(detailReview.id, 'approved')}
                    >
                      <Check size={16} /> Approve Review
                    </button>
                  )}
                  {detailReview.status !== 'rejected' && (
                    <button
                      type="button"
                      className="button secondary"
                      disabled={actionBusy}
                      onClick={() => handleStatusChange(detailReview.id, 'rejected')}
                    >
                      <X size={16} /> Reject Review
                    </button>
                  )}
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      const current = detailReview;
                      setDetailReview(null);
                      setEditReviewData({ ...current });
                    }}
                  >
                    <Edit2 size={15} /> Edit Review
                  </button>
                </>
              )}
              <button
                type="button"
                className="button secondary"
                onClick={() => setDetailReview(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Review Modal */}
      {editReviewData && (
        <div className="admin-modal-backdrop" onClick={() => setEditReviewData(null)}>
          <div className="admin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Review #{editReviewData.id}</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditReviewData(null)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="edit-rating">Rating (1 to 5 Stars)</label>
                  <select
                    id="edit-rating"
                    value={editReviewData.rating}
                    onChange={e => setEditReviewData(prev => ({ ...prev, rating: Number(e.target.value) }))}
                  >
                    {[5, 4, 3, 2, 1].map(n => (
                      <option key={n} value={n}>
                        {n} Stars ({'★'.repeat(n)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-status">Moderation Status</label>
                  <select
                    id="edit-status"
                    value={editReviewData.status}
                    onChange={e => setEditReviewData(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div className="form-group checkbox-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '8px 0 14px' }}>
                  <input
                    id="edit-verified"
                    type="checkbox"
                    checked={Boolean(editReviewData.isVerifiedPurchase)}
                    onChange={e => setEditReviewData(prev => ({ ...prev, isVerifiedPurchase: e.target.checked }))}
                  />
                  <label htmlFor="edit-verified" style={{ margin: 0, cursor: 'pointer', fontSize: '12px', fontWeight: '500' }}>
                    Mark as Verified Purchase (Shows green Verified Purchase badge)
                  </label>
                </div>

                <div className="form-group">
                  <label htmlFor="edit-title">Headline</label>
                  <input
                    id="edit-title"
                    type="text"
                    required
                    maxLength={150}
                    value={editReviewData.title}
                    onChange={e => setEditReviewData(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="edit-comment">Customer Comment</label>
                  <textarea
                    id="edit-comment"
                    rows={5}
                    required
                    maxLength={3000}
                    value={editReviewData.comment}
                    onChange={e => setEditReviewData(prev => ({ ...prev, comment: e.target.value }))}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="submit"
                  className="button dark"
                  disabled={actionBusy}
                >
                  {actionBusy ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setEditReviewData(null)}
                  disabled={actionBusy}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="admin-modal-backdrop" onClick={() => setDeleteId(null)}>
          <div className="admin-modal-card confirm-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Review Removal</h3>
              <button
                type="button"
                className="icon-button"
                onClick={() => setDeleteId(null)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to permanently delete review <strong>#{deleteId}</strong>?
                This action cannot be undone and will recalculate product rating statistics immediately.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="button dark"
                style={{ background: '#c62828', borderColor: '#c62828' }}
                disabled={actionBusy}
                onClick={handleDeleteReview}
              >
                {actionBusy ? 'Deleting…' : 'Delete Permanently'}
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => setDeleteId(null)}
                disabled={actionBusy}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
