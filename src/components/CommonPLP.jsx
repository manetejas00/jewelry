import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  SlidersHorizontal,
  X,
  Gem,
  ArrowRight,
  ShoppingBag,
  Sparkles
} from 'lucide-react';
import { money } from '../catalogue.js';

export function CommonPLP({
  eyebrow = 'THE VEYORA COLLECTIONS',
  title = 'The Collection',
  description = 'Considered pieces. Quiet statements. Endlessly you.',
  tabs = [],
  priceBrackets = [],
  activePrice = '',
  onPriceChange,
  items = [],
  loading = false,
  error = '',
  sortBy = 'featured',
  onSortChange,
  searchQuery = '',
  onSearchChange,
  activeFilters = {},
  onFilterChange,
  onClearFilters,
  facets = [],
  trustBanner = null,
  emptyIcon: EmptyIcon = Gem,
  emptyTitle = 'No pieces found',
  emptyMessage = 'Try clearing your filters or explore our full collection.',
  onRetry,
  ProductCardComponent,
  visible = 24,
  onLoadMore,
  itemLabel = 'pieces'
}) {
  const [showFilters, setShowFilters] = useState(false);

  // Active filters count
  const activeChips = [];
  if (searchQuery) {
    activeChips.push({ key: 'q', label: `Search: “${searchQuery}”`, onRemove: () => onSearchChange && onSearchChange('') });
  }
  if (activePrice) {
    const b = priceBrackets.find(p => p.value === activePrice);
    activeChips.push({ key: 'price', label: `Price: ${b ? b.label : activePrice}`, onRemove: () => onPriceChange && onPriceChange('') });
  }
  for (const [k, v] of Object.entries(activeFilters)) {
    if (v && v !== 'all' && v !== false) {
      const facet = facets.find(f => f.key === k);
      const label = facet ? `${facet.label}: ${v}` : String(v);
      activeChips.push({ key: k, label, onRemove: () => onFilterChange && onFilterChange(k, '') });
    }
  }

  const hasActiveFilters = activeChips.length > 0;

  return (
    <>
      <div className="collection-intro">
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>

        {tabs.length > 0 && (
          <div className="collection-tabs">
            {tabs.map(tab => (
              <Link
                key={tab.href}
                className={tab.active ? 'active' : ''}
                to={tab.href}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        )}

        {priceBrackets.length > 0 && onPriceChange && (
          <div className="price-bracket-bar" role="group" aria-label="Filter by price bracket">
            <span className="price-bracket-title">Price:</span>
            {priceBrackets.map(b => {
              const isActive = (activePrice || '') === b.value;
              return (
                <button
                  key={b.value}
                  type="button"
                  className={'price-bracket-pill ' + (isActive ? 'active' : '')}
                  onClick={() => onPriceChange(isActive && b.value ? '' : b.value)}
                  aria-pressed={isActive}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <section className="section catalogue">
        {trustBanner}

        <div className="filter-toolbar">
          <button
            type="button"
            className="text-button"
            onClick={() => setShowFilters(s => !s)}
          >
            <SlidersHorizontal size={16} /> Filter & refine {hasActiveFilters && `(${activeChips.length})`}
          </button>
          <span>{items.length} {itemLabel}</span>
          <label>
            Sort by{' '}
            <select
              aria-label="Sort products"
              value={sortBy}
              onChange={e => onSortChange && onSortChange(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
        </div>

        {hasActiveFilters && (
          <div className="active-filters-row">
            {activeChips.map(chip => (
              <button
                key={chip.key}
                type="button"
                className="active-filter-chip"
                onClick={chip.onRemove}
              >
                {chip.label} <X size={12} />
              </button>
            ))}
            {onClearFilters && (
              <button
                type="button"
                className="underlink"
                style={{ fontSize: '10px', padding: 0 }}
                onClick={onClearFilters}
              >
                Clear all
              </button>
            )}
          </div>
        )}

        {showFilters && (
          <div className="filters">
            {onSearchChange && (
              <label>
                Search
                <input
                  placeholder="Search the collection"
                  value={searchQuery}
                  onChange={e => onSearchChange(e.target.value)}
                />
              </label>
            )}

            {facets.map(f => (
              <label key={f.key}>
                {f.label}
                <select
                  value={activeFilters[f.key] || ''}
                  onChange={e => onFilterChange && onFilterChange(f.key, e.target.value)}
                >
                  <option value="">{f.allLabel || `All ${f.label}`}</option>
                  {f.options.map(opt => (
                    <option key={opt.value || opt} value={opt.value || opt}>
                      {opt.label || opt}
                    </option>
                  ))}
                </select>
              </label>
            ))}

            {priceBrackets.length > 0 && onPriceChange && (
              <label>
                Price bracket
                <select
                  value={activePrice || ''}
                  onChange={e => onPriceChange(e.target.value)}
                >
                  {priceBrackets.map(b => (
                    <option key={b.value} value={b.value}>
                      {b.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {onFilterChange && (
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={Boolean(activeFilters.stock)}
                  onChange={e => onFilterChange('stock', e.target.checked ? '1' : '')}
                />
                In stock only
              </label>
            )}

            {onClearFilters && (
              <button type="button" className="text-button" onClick={onClearFilters}>
                Clear all
              </button>
            )}
          </div>
        )}

        {error ? (
          <div className="empty">
            <p className="error" role="alert">{error}</p>
            {onRetry && (
              <button className="underlink" onClick={onRetry}>
                Try again
              </button>
            )}
          </div>
        ) : loading ? (
          <p className="empty" role="status">Loading collection…</p>
        ) : items.length ? (
          <>
            <div className="product-grid">
              {items.slice(0, visible).map(p => (
                <ProductCardComponent key={p.sku || p.product_code} p={p} />
              ))}
            </div>

            {items.length > visible && onLoadMore && (
              <div className="load-more">
                <button
                  type="button"
                  className="button dark"
                  onClick={onLoadMore}
                >
                  Load more ({items.length - visible} remaining)
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="empty">
            <EmptyIcon size={36} color="var(--gold)" />
            <h2>{emptyTitle}</h2>
            <p>{emptyMessage}</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '18px' }}>
              {hasActiveFilters && onClearFilters && (
                <button type="button" className="button dark" onClick={onClearFilters}>
                  Clear all filters
                </button>
              )}
              <Link className="button secondary" to="/collections/all">
                Explore all collections
              </Link>
            </div>
          </div>
        )}
      </section>
    </>
  );
}

export default CommonPLP;
