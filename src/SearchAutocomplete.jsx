import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, X, ArrowRight, ArrowUpRight, Tag, Sparkles, Gem, AlertCircle, Loader2 } from 'lucide-react';
import { listingThumbnail, imageFallback } from './listing-media.js';

const money = v => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
  minimumFractionDigits: 0
}).format(v || 0);

const DEFAULT_POPULAR = [
  'Pearl Ring',
  'Gold Necklace',
  'Silver Coin',
  '10 Gram Gold Coin',
  'Nocturne Cuff',
  '999 Silver',
  'Earrings'
];

const DEFAULT_CATEGORIES = [
  { name: 'The Pearl Edit', url: '/collections/pearls' },
  { name: 'All Jewellery', url: '/collections/all' },
  { name: 'Gold & Silver Coins', url: '/coins' },
  { name: 'Gold Coins', url: '/coins/gold' },
  { name: 'Silver Coins', url: '/coins/silver' },
  { name: 'Earrings', url: '/collections/earrings' },
  { name: 'Necklaces', url: '/collections/necklaces' },
  { name: 'Rings', url: '/collections/rings' },
  { name: 'Bracelets', url: '/collections/bracelets' }
];

export function SearchAutocomplete({ onClose, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(true);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [emptyMeta, setEmptyMeta] = useState({ popularSearches: DEFAULT_POPULAR, categories: DEFAULT_CATEGORIES });

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const listboxRef = useRef(null);
  const navigate = useNavigate();

  // Load empty state meta if needed
  useEffect(() => {
    let active = true;
    fetch('/api/search?q=')
      .then(r => r.ok ? r.json() : null)
      .then(res => {
        if (active && res) {
          setEmptyMeta({
            popularSearches: res.popularSearches || DEFAULT_POPULAR,
            categories: res.categories || DEFAULT_CATEGORIES
          });
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Fetch search suggestions with 150ms debounce and request cancellation
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      setData(null);
      setLoading(false);
      setError('');
      setActiveIndex(-1);
      return;
    }

    setLoading(true);
    setError('');
    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        .then(res => {
          if (!res.ok) throw new Error('Could not load suggestions');
          return res.json();
        })
        .then(json => {
          setData(json);
          setLoading(false);
          setActiveIndex(-1);
        })
        .catch(err => {
          if (err.name !== 'AbortError') {
            setError(err.message || 'Unable to load search suggestions');
            setLoading(false);
          }
        });
    }, 150);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Click outside listener: close dropdown while keeping query in input
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  // Flatten selectable items for keyboard navigation
  const selectableItems = useMemo(() => {
    if (query.trim().length < 1) {
      const items = [];
      for (const phrase of emptyMeta.popularSearches) {
        items.push({
          id: `pop-${phrase}`,
          type: 'popular',
          text: phrase,
          url: `/collections/all?q=${encodeURIComponent(phrase)}`
        });
      }
      for (const cat of emptyMeta.categories) {
        items.push({
          id: `cat-${cat.name}`,
          type: 'category',
          text: cat.name,
          url: cat.url
        });
      }
      return items;
    }

    if (!data) return [];
    const items = [];

    // Suggestions (categories & phrases)
    if (data.suggestions) {
      for (let i = 0; i < data.suggestions.length; i++) {
        const s = data.suggestions[i];
        items.push({
          id: `sug-${i}-${s.text}`,
          type: s.type, // 'category' or 'phrase'
          text: s.text,
          url: s.type === 'category' ? (s.url || `/collections/${s.text.toLowerCase()}`) : `/collections/all?q=${encodeURIComponent(s.text)}`
        });
      }
    }

    // Products
    if (data.products) {
      for (let i = 0; i < data.products.length; i++) {
        const p = data.products[i];
        items.push({
          id: `prod-${p.sku}`,
          type: 'product',
          text: p.name,
          url: p.url,
          product: p
        });
      }
    }

    // View all option
    if (data.totalMatches > 0) {
      items.push({
        id: 'view-all',
        type: 'view_all',
        text: `View all results for “${query.trim()}”`,
        url: `/collections/all?q=${encodeURIComponent(query.trim())}`
      });
    }

    return items;
  }, [query, data, emptyMeta]);

  // Execute selection
  function executeSelection(item) {
    if (!item) return;
    if (item.type === 'phrase' || item.type === 'popular') {
      setQuery(item.text);
      navigate(item.url);
      onClose();
    } else {
      navigate(item.url);
      onClose();
    }
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const trimmed = query.trim();
    if (activeIndex >= 0 && selectableItems[activeIndex]) {
      executeSelection(selectableItems[activeIndex]);
      return;
    }
    if (trimmed) {
      navigate(`/collections/all?q=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/collections/all');
    }
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      setShowDropdown(false);
      return;
    }

    if (!showDropdown || selectableItems.length === 0) {
      if (e.key === 'ArrowDown') {
        setShowDropdown(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1 >= selectableItems.length ? 0 : prev + 1));
      scrollActiveIntoView(activeIndex + 1 >= selectableItems.length ? 0 : activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev <= 0 ? selectableItems.length - 1 : prev - 1));
      scrollActiveIntoView(activeIndex <= 0 ? selectableItems.length - 1 : activeIndex - 1);
    }
  }

  function scrollActiveIntoView(index) {
    setTimeout(() => {
      const activeEl = listboxRef.current?.querySelector(`[data-index="${index}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }, 10);
  }

  function handleClear() {
    setQuery('');
    setData(null);
    setActiveIndex(-1);
    setShowDropdown(true);
    inputRef.current?.focus();
  }

  const isQueryLongEnough = query.trim().length >= 2;
  const activeDescendantId = activeIndex >= 0 && selectableItems[activeIndex] ? selectableItems[activeIndex].id : undefined;

  return (
    <div className="search-autocomplete-wrap" ref={containerRef}>
      <form
        className="search-panel"
        role="search"
        onSubmit={handleFormSubmit}
      >
        <div className="search-input-wrapper">
          <Search size={20} className="search-panel-icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="search"
            autoFocus
            autoComplete="off"
            spellCheck="false"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
            aria-controls="search-autocomplete-listbox"
            aria-activedescendant={activeDescendantId}
            aria-label="Search jewellery and coins"
            placeholder="Find rings, earrings, coins, pearls, bracelets…"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
          />
          {loading && (
            <span className="search-spinner" aria-label="Searching…" role="status">
              <Loader2 size={16} className="spin" />
            </span>
          )}
          {query && (
            <button
              type="button"
              className="search-clear-btn"
              aria-label="Clear search input"
              onClick={handleClear}
            >
              <X size={16} />
            </button>
          )}
        </div>
        <button className="text-button" type="submit">
          Search <ArrowRight size={16} />
        </button>
        <button
          className="icon"
          type="button"
          aria-label="Close search"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </form>

      {/* Autocomplete Dropdown */}
      {showDropdown && (
        <div
          id="search-autocomplete-listbox"
          ref={listboxRef}
          className="search-dropdown"
          role="listbox"
          aria-label="Search suggestions"
        >
          {/* STATE 1: Empty Search (< 2 chars) */}
          {!isQueryLongEnough && (
            <div className="search-dropdown-content empty-state">
              <div className="search-section">
                <span className="search-section-title">Popular Searches</span>
                <div className="popular-chips-wrap">
                  {emptyMeta.popularSearches.map(term => {
                    const idx = selectableItems.findIndex(i => i.type === 'popular' && i.text === term);
                    const isSelected = activeIndex === idx;
                    return (
                      <button
                        key={term}
                        type="button"
                        data-index={idx}
                        className={`popular-chip ${isSelected ? 'active' : ''}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => executeSelection({ type: 'popular', text: term, url: `/collections/all?q=${encodeURIComponent(term)}` })}
                      >
                        <Search size={12} /> {term}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="search-section" style={{ marginTop: '16px' }}>
                <span className="search-section-title">Browse Categories</span>
                <div className="category-suggestions-list">
                  {emptyMeta.categories.map(cat => {
                    const idx = selectableItems.findIndex(i => i.type === 'category' && i.text === cat.name);
                    const isSelected = activeIndex === idx;
                    return (
                      <button
                        key={cat.name}
                        type="button"
                        data-index={idx}
                        className={`search-cat-item ${isSelected ? 'active' : ''}`}
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => executeSelection({ type: 'category', text: cat.name, url: cat.url })}
                      >
                        <span className="cat-title"><Sparkles size={13} className="cat-icon" /> {cat.name}</span>
                        <ArrowUpRight size={14} className="cat-arrow" />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STATE 2: Loading (Initial query) */}
          {isQueryLongEnough && loading && !data && (
            <div className="search-dropdown-status" role="status">
              <Loader2 size={20} className="spin" />
              <span>Searching our collection & minted coins…</span>
            </div>
          )}

          {/* STATE 3: Error */}
          {isQueryLongEnough && error && (
            <div className="search-dropdown-status error" role="alert">
              <AlertCircle size={20} />
              <span>{error}. Press Enter to view all results.</span>
            </div>
          )}

          {/* STATE 4: Results loaded */}
          {isQueryLongEnough && data && (
            <div className="search-dropdown-content">
              {/* No results */}
              {data.totalMatches === 0 && data.suggestions.length === 0 ? (
                <div className="search-no-results">
                  <Gem size={28} className="no-res-icon" />
                  <h4>No matching pieces found for “{query}”</h4>
                  <p>Check for spelling mistakes, or try searching for <em>pearls</em>, <em>earrings</em>, <em>rings</em>, or <em>gold coins</em>.</p>
                  <div className="search-fallback-chips">
                    {emptyMeta.categories.slice(0, 5).map(cat => (
                      <Link
                        key={cat.name}
                        to={cat.url}
                        className="fallback-chip"
                        onClick={onClose}
                      >
                        {cat.name} →
                      </Link>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Search Suggestions (Phrases & Categories) */}
                  {data.suggestions && data.suggestions.length > 0 && (
                    <div className="search-section">
                      <span className="search-section-title">Search Suggestions</span>
                      <div className="search-suggestions-list">
                        {data.suggestions.map(s => {
                          const idx = selectableItems.findIndex(i => i.text === s.text && i.type === s.type);
                          const isSelected = activeIndex === idx;
                          return (
                            <button
                              key={s.text}
                              type="button"
                              data-index={idx}
                              className={`search-suggestion-row ${isSelected ? 'active' : ''}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => executeSelection(selectableItems[idx])}
                            >
                              <div className="suggestion-left">
                                {s.type === 'category' ? (
                                  <Tag size={14} className="suggestion-type-icon cat" />
                                ) : (
                                  <Search size={14} className="suggestion-type-icon phrase" />
                                )}
                                <span className="suggestion-text">{s.text}</span>
                              </div>
                              {s.type === 'category' ? (
                                <span className="category-tag">Collection <ArrowUpRight size={13} /></span>
                              ) : (
                                <ArrowRight size={13} className="phrase-arrow" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Matching Products */}
                  {data.products && data.products.length > 0 && (
                    <div className="search-section" style={{ marginTop: data.suggestions?.length ? '18px' : '0' }}>
                      <span className="search-section-title">
                        Products ({data.products.length})
                      </span>
                      <div className="search-products-list">
                        {data.products.map(p => {
                          const idx = selectableItems.findIndex(i => i.type === 'product' && i.product?.sku === p.sku);
                          const isSelected = activeIndex === idx;
                          const thumbUrl = listingThumbnail(p);
                          const isCoin = p.is_coin;
                          const specs = isCoin
                            ? `${p.weight_g}g · ${p.purity} ${p.metal} Coin`
                            : `${p.metal} ${p.purity} · ${p.category}`;

                          return (
                            <button
                              key={p.sku}
                              type="button"
                              data-index={idx}
                              className={`search-product-row ${isSelected ? 'active' : ''}`}
                              role="option"
                              aria-selected={isSelected}
                              onClick={() => executeSelection(selectableItems[idx])}
                            >
                              <div className="product-thumb">
                                <img
                                  src={thumbUrl}
                                  alt={p.name}
                                  loading="lazy"
                                  onError={e => {
                                    if (e.currentTarget.getAttribute('src') !== imageFallback) {
                                      e.currentTarget.src = imageFallback;
                                    }
                                  }}
                                />
                              </div>
                              <div className="product-meta">
                                <span className="product-title">{p.name}</span>
                                <span className="product-category">{specs}</span>
                                {p.rating_count > 0 ? (
                                  <span className="search-product-rating">
                                    ★ {Number(p.rating_average).toFixed(1)} <small>({p.rating_count})</small>
                                  </span>
                                ) : (
                                  <span className="search-product-rating unrated">No reviews yet</span>
                                )}
                              </div>
                              <div className="product-right">
                                <div className="product-pricing">
                                  {p.original_price && p.original_price > p.price ? (
                                    <div className="price-stack">
                                      <span className="current-price">{money(p.price)}</span>
                                      <del className="original-price">{money(p.original_price)}</del>
                                    </div>
                                  ) : (
                                    <span className="current-price">
                                      {p.price !== null ? money(p.price) : 'Awaiting rate'}
                                    </span>
                                  )}
                                </div>
                                <span className={`stock-badge ${p.stock === 0 ? 'out' : p.stock <= 3 ? 'low' : 'in'}`}>
                                  {p.stock === 0 ? 'Out of stock' : p.stock <= 3 ? `${p.stock} left` : 'In stock'}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* View all results link */}
                  {data.totalMatches > 0 && (
                    <button
                      type="button"
                      data-index={selectableItems.findIndex(i => i.type === 'view_all')}
                      className={`search-view-all-btn ${activeIndex === selectableItems.findIndex(i => i.type === 'view_all') ? 'active' : ''}`}
                      onClick={() => {
                        navigate(`/collections/all?q=${encodeURIComponent(query.trim())}`);
                        onClose();
                      }}
                    >
                      <span>View all {data.totalMatches} results for “{query.trim()}”</span>
                      <ArrowRight size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
