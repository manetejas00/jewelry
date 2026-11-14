import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  Heart,
  ArrowRight,
  ArrowUpRight,
  Plus,
  Minus,
  Check,
  X,
  SlidersHorizontal,
  ChevronRight,
  Info
} from 'lucide-react';
import { useStore } from './store.jsx';
import { api } from './api.js';
import { money } from './catalogue.js';
import BrandedImage from './BrandedImage.jsx';
import ProductMagicZoom from './ProductMagicZoom.jsx';
import ImageViewer from './ImageViewer.jsx';
import { RatingBadge, ProductReviewsSection } from './Reviews.jsx';
import { KURTA_SIZES } from './kurta-constants.js';
import useScrollLock from './useScrollLock.js';

function KurtaModal({ title, children, onClose }) {
  const el = useRef();
  useScrollLock(true, el, { onEscape: onClose, trapFocus: true });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        ref={el}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal kurta-sizing-modal"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '640px' }}
      >
        <div className="modal-heading">
          <h2>{title}</h2>
          <button className="icon" aria-label="Close dialog" onClick={onClose}>
            <X />
          </button>
        </div>
        {children}
      </section>
    </div>
  );
}

export function KurtaSizeChartModal({ onClose }) {
  const [unit, setUnit] = useState('inches');

  return (
    <KurtaModal title="Chicken Curry Kurta Sizing Chart" onClose={onClose}>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.6 }}>
        Our authentic Lucknowi Chikankari kurtas feature a traditional straight cut with side slits, tailored from pre-washed breathable mulmul cotton, fluid georgette, and handloom Chanderi silk.
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
        <div style={{ display: 'inline-flex', border: '1px solid var(--line)', borderRadius: '3px', overflow: 'hidden' }}>
          <button
            type="button"
            onClick={() => setUnit('inches')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: 'none',
              background: unit === 'inches' ? 'var(--ink)' : '#fff',
              color: unit === 'inches' ? '#fff' : 'var(--ink)',
              cursor: 'pointer'
            }}
          >
            Inches
          </button>
          <button
            type="button"
            onClick={() => setUnit('cm')}
            style={{
              padding: '4px 12px',
              fontSize: '12px',
              border: 'none',
              background: unit === 'cm' ? 'var(--ink)' : '#fff',
              color: unit === 'cm' ? '#fff' : 'var(--ink)',
              cursor: 'pointer'
            }}
          >
            Centimetres (cm)
          </button>
        </div>
      </div>

      <div className="table-wrap" style={{ margin: '0 0 16px' }}>
        <table style={{ width: '100%', fontSize: '13px', textAlign: 'center' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Size</th>
              <th>Bust</th>
              <th>Waist</th>
              <th>Hip</th>
              <th>Shoulder</th>
              <th>Length</th>
              <th>Sleeve</th>
            </tr>
          </thead>
          <tbody>
            {KURTA_SIZES.map(s => {
              const toCm = val => Math.round(parseFloat(val) * 2.54);
              return (
                <tr key={s.code}>
                  <td style={{ textAlign: 'left', fontWeight: 600 }}>{s.label}</td>
                  <td>{unit === 'inches' ? s.chest : `${toCm(s.chest)} cm`}</td>
                  <td>{unit === 'inches' ? s.waist : `${toCm(s.waist)} cm`}</td>
                  <td>{unit === 'inches' ? s.hip : `${toCm(s.hip)} cm`}</td>
                  <td>{unit === 'inches' ? s.shoulder : `${toCm(s.shoulder)} cm`}</td>
                  <td>{unit === 'inches' ? s.length : `${toCm(s.length)} cm`}</td>
                  <td>{unit === 'inches' ? s.sleeve : `${toCm(s.sleeve)} cm`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ background: '#faf9f5', border: '1px solid var(--line)', padding: '14px 16px', borderRadius: '3px' }}>
        <h4 style={{ margin: '0 0 6px', fontSize: '13px', color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Info size={15} color="var(--gold)" /> Tailoring & Fit Recommendations
        </h4>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
          <li><strong>Traditional Straight Cut:</strong> Choose a garment bust measurement 2 to 3 inches larger than your natural bust for a comfortable, classic fit.</li>
          <li><strong>Georgette Kurtas:</strong> Includes a matching dyed cotton inner slip (lining) for complete opacity and comfort.</li>
          <li><strong>Care Instructions:</strong> Gentle hand-wash in cold water with mild detergent; dry in shade to preserve the delicate hand-embroidery.</li>
        </ul>
      </div>
    </KurtaModal>
  );
}

export function KurtasPage({ Layout, ProductCard }) {
  const { products, error } = useStore();
  const [kurtas, setKurtas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fabricFilter, setFabricFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [priceBracket, setPriceBracket] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api('/kurtas')
      .then(data => {
        if (active) {
          setKurtas(data || []);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          // Fallback to store products with is_kurta = true
          const fallback = products.filter(p => p.is_kurta || p.category === 'Chicken Curry Kurtas');
          setKurtas(fallback);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [products]);

  const filteredKurtas = useMemo(() => {
    let list = [...kurtas];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(k =>
        k.name.toLowerCase().includes(q) ||
        (k.description && k.description.toLowerCase().includes(q)) ||
        (k.metal && k.metal.toLowerCase().includes(q))
      );
    }

    if (fabricFilter) {
      list = list.filter(k => k.metal && k.metal.toLowerCase().includes(fabricFilter.toLowerCase()));
    }

    if (sizeFilter) {
      list = list.filter(k =>
        (k.availableSizes && k.availableSizes.some(s => s.toLowerCase().includes(sizeFilter.toLowerCase()))) ||
        (k.variants && k.variants.some(v => v.stock > 0 && v.size.toLowerCase().includes(sizeFilter.toLowerCase()))) ||
        (k.size && k.size.toLowerCase().includes(sizeFilter.toLowerCase()))
      );
    }

    if (priceBracket) {
      if (priceBracket === 'under-3500') list = list.filter(k => (k.minPrice || k.price) < 3500);
      else if (priceBracket === '3500-4500') list = list.filter(k => (k.minPrice || k.price) >= 3500 && (k.minPrice || k.price) <= 4500);
      else if (priceBracket === 'above-4500') list = list.filter(k => (k.maxPrice || k.price) > 4500);
    }

    if (inStockOnly) {
      list = list.filter(k => (k.totalStock || k.stock) > 0);
    }

    // Sort
    if (sortBy === 'price-low') {
      list.sort((a, b) => (a.minPrice || a.price) - (b.minPrice || b.price));
    } else if (sortBy === 'price-high') {
      list.sort((a, b) => (b.maxPrice || b.price) - (a.maxPrice || a.price));
    } else if (sortBy === 'name') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [kurtas, searchQuery, fabricFilter, sizeFilter, priceBracket, inStockOnly, sortBy]);

  const clearFilters = () => {
    setFabricFilter('');
    setSizeFilter('');
    setPriceBracket('');
    setInStockOnly(false);
    setSearchQuery('');
    setSortBy('featured');
  };

  return (
    <Layout>
      <section className="section collection-header kurta-header" style={{ paddingTop: '28px' }}>
        <div className="breadcrumbs" style={{ margin: '0 0 16px' }}>
          <Link to="/">Home</Link>
          <span>/</span>
          <span>Chicken Curry Kurtas</span>
        </div>

        <div className="kurta-banner-card" style={{
          position: 'relative',
          padding: '48px 36px',
          background: 'linear-gradient(135deg, #182324 0%, #101c1e 100%)',
          color: '#fff',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '32px'
        }}>
          <div style={{ position: 'relative', zIndex: 2, maxWidth: '640px' }}>
            <span className="eyebrow" style={{ color: 'var(--gold)' }}>HERITAGE AWADHI NEEDLECRAFT · THE ETHNIC COLLECTION</span>
            <h1 style={{ fontSize: 'clamp(28px, 4vw, 42px)', margin: '10px 0 14px', color: '#fff', fontFamily: 'var(--font-serif)', fontWeight: 400 }}>
              Chicken Curry Kurtas for Women
            </h1>
            <p style={{ fontSize: '15px', lineHeight: 1.7, color: 'rgba(255,255,255,0.85)', margin: 0 }}>
              Exquisite hand-embroidered Lucknowi Chikankari kurtas crafted by master artisans in pure mulmul cotton, fluid georgette, and shimmering Chanderi silk. Timeless shadow work and delicate pearl-stitch motifs tailored for everyday poise and festive celebrations.
            </p>
          </div>
        </div>

        <div className="collection-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="small muted">
              Showing {filteredKurtas.length} {filteredKurtas.length === 1 ? 'kurta' : 'kurtas'}
            </span>
            <button
              type="button"
              className="button secondary small-button"
              onClick={() => setShowFilters(s => !s)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <SlidersHorizontal size={14} /> {showFilters ? 'Hide filters' : 'Filters'}
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="kurta-sort" className="small muted">Sort by:</label>
            <select
              id="kurta-sort"
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '13px', borderRadius: '3px', border: '1px solid var(--line)' }}
            >
              <option value="featured">Featured Collection</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A to Z</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <div className="filters" style={{ margin: '0 0 28px', padding: '18px 20px', background: '#faf9f5', border: '1px solid var(--line)', borderRadius: '3px' }}>
            <label>
              Search
              <input
                placeholder="Search styles, fabrics, embroidery…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </label>

            <label>
              Fabric
              <select value={fabricFilter} onChange={e => setFabricFilter(e.target.value)}>
                <option value="">All Fabrics</option>
                <option value="mulmul">Pure Mulmul Cotton</option>
                <option value="georgette">Viscose Georgette</option>
                <option value="chanderi">Chanderi Silk</option>
              </select>
            </label>

            <label>
              Size
              <select value={sizeFilter} onChange={e => setSizeFilter(e.target.value)}>
                <option value="">All Sizes (XS–XXXL)</option>
                <option value="XS">XS (34)</option>
                <option value="S">S (36)</option>
                <option value="M">M (38)</option>
                <option value="L">L (40)</option>
                <option value="XL">XL (42)</option>
                <option value="XXL">XXL (44)</option>
                <option value="XXXL">XXXL (46)</option>
              </select>
            </label>

            <label>
              Price Bracket
              <select value={priceBracket} onChange={e => setPriceBracket(e.target.value)}>
                <option value="">All Prices</option>
                <option value="under-3500">Under ₹3,500</option>
                <option value="3500-4500">₹3,500 – ₹4,500</option>
                <option value="above-4500">Above ₹4,500</option>
              </select>
            </label>

            <label className="checkbox" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={e => setInStockOnly(e.target.checked)}
              />
              In stock only
            </label>

            <button type="button" className="text-button" onClick={clearFilters}>
              Clear all filters
            </button>
          </div>
        )}

        {loading ? (
          <p className="empty" role="status">Curating Chicken Curry Kurtas…</p>
        ) : filteredKurtas.length ? (
          <div className="product-grid">
            {filteredKurtas.map(k => (
              <ProductCard key={k.sku || k.product_code} p={k} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <Sparkles size={36} color="var(--gold)" />
            <h2>No kurtas matched your search</h2>
            <p>Try clearing your filters or explore our complete handcrafted collection.</p>
            <button className="button dark" onClick={clearFilters} style={{ marginTop: '16px' }}>
              Show all kurtas
            </button>
          </div>
        )}
      </section>
    </Layout>
  );
}

export function KurtaDetailPage({ Layout, StructuredProduct, ProductCard }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { products, add, saved, toggleSave, accountReady, error, refreshCatalogue } = useStore();
  const [kurtaData, setKurtaData] = useState(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/kurtas/${slug}`)
      .then(data => {
        if (active) {
          setKurtaData(data);
          setSelectedSku(data.sku);
          setLoading(false);
        }
      })
      .catch(() => {
        // Fallback to store products
        if (active) {
          const match = products.find(p => p.slug === slug || p.product_code === slug);
          if (match) {
            const allVariants = products.filter(p => p.product_code === match.product_code);
            setKurtaData({
              ...match,
              variants: allVariants,
              images: match.images || []
            });
            setSelectedSku(match.sku);
          }
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [slug, products]);

  const variants = kurtaData?.variants || [];
  const currentVariant = variants.find(v => v.sku === selectedSku) || kurtaData;

  useEffect(() => {
    if (currentVariant) {
      document.title = currentVariant.seo_title || `${currentVariant.name} | Veyora`;
    }
  }, [currentVariant]);

  if (loading && !kurtaData) {
    return (
      <Layout>
        <div className="empty">Finding your Chicken Curry Kurta…</div>
      </Layout>
    );
  }

  if (!kurtaData) {
    return (
      <Layout>
        <div className="empty">
          <h1>Kurta not found</h1>
          <p>The piece you are looking for is unavailable.</p>
          <Link to="/kurtas" className="button dark">Explore Chicken Curry Kurtas</Link>
        </div>
      </Layout>
    );
  }

  const p = currentVariant;
  const angleImages = (p.images && p.images.length) ? p.images : [
    { id: 'hero', role: 'hero', url: p.image, alt_text: p.name }
  ];

  const relatedKurtas = products.filter(item =>
    item.product_code !== p.product_code && (item.is_kurta || item.category === 'Chicken Curry Kurtas')
  ).slice(0, 4);

  return (
    <Layout>
      {StructuredProduct && <StructuredProduct p={p} />}

      <div className="breadcrumbs section">
        <Link to="/">Home</Link>
        <span>/</span>
        <Link to="/kurtas">Chicken Curry Kurtas</Link>
        <span>/</span>
        <span>{p.name}</span>
      </div>

      <section className="product-detail section">
        <ProductMagicZoom
          id={p.sku}
          images={angleImages}
          title={`${p.name}, ${p.size}, ${p.metal}`}
        >
          <p className="caption">
            {angleImages.length > 1
              ? 'AUTHENTIC LUCKNOWI MULTI-ANGLE PHOTOGRAPHY'
              : 'HANDCRAFTED CHIKANKARI EDITORIAL PHOTOGRAPHY'}
          </p>
        </ProductMagicZoom>

        <div className="detail-copy">
          <span className="eyebrow" style={{ color: 'var(--gold)' }}>
            CHICKEN CURRY KURTAS · HERITAGE NEEDLECRAFT
          </span>
          <h1>{p.name}</h1>
          <p className="material-line">
            {p.metal} · {p.purity || 'Handcrafted Lucknowi Chikankari Embroidery'}
          </p>

          <div className="pdp-rating-row" style={{ marginBottom: '10px' }}>
            <RatingBadge
              rating={p.rating_average}
              count={p.rating_count}
              showEmpty={true}
              size="md"
              onClick={() => {
                const el = document.getElementById('reviews');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />
          </div>

          <div className="detail-price">
            {p.original_price && p.original_price > p.price ? (
              <div className="price-row" style={{ alignItems: 'baseline', gap: '10px', margin: 0 }}>
                <span className="discounted-price" style={{ fontSize: '26px' }}>{money(p.price)}</span>
                <del className="original-price-del" style={{ fontSize: '16px' }}>{money(p.original_price)}</del>
                {p.discount_amount > 0 && <span className="offer-save-tag">SAVE {money(p.discount_amount)}</span>}
              </div>
            ) : (
              money(p.price)
            )}
          </div>

          <p className="small muted">Handcrafted in Lucknow · Free shipping across India</p>

          <p className="detail-description">{p.description}</p>

          {/* Sizing Section: XS to XXXL */}
          <div className="kurta-size-selector" style={{ margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Select Kurta Size (XS to XXXL)
              </label>
              <button
                type="button"
                className="underlink"
                onClick={() => setShowChart(true)}
                style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              >
                Size Guide & Measurements ↗
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {variants.map(v => {
                const isSelected = v.sku === p.sku;
                const isOutOfStock = v.stock === 0;
                return (
                  <button
                    key={v.sku}
                    type="button"
                    disabled={isOutOfStock}
                    onClick={() => setSelectedSku(v.sku)}
                    style={{
                      minWidth: '54px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: isSelected ? 700 : 500,
                      borderRadius: '3px',
                      border: isSelected ? '2px solid var(--ink)' : '1px solid var(--line)',
                      background: isSelected ? 'var(--ink)' : isOutOfStock ? '#f5f5f5' : '#fff',
                      color: isSelected ? '#fff' : isOutOfStock ? '#999' : 'var(--ink)',
                      cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                      textDecoration: isOutOfStock ? 'line-through' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                    title={isOutOfStock ? `${v.size} is currently out of stock` : `Select size ${v.size} (${v.stock} in stock)`}
                  >
                    {v.size.split(' ')[0]}
                  </button>
                );
              })}
            </div>
            <span className="small muted" style={{ display: 'block', marginTop: '6px' }}>
              Selected: <strong>{p.size}</strong> {p.stock > 0 ? `(${p.stock} ready in stock)` : '— Currently Out of Stock'}
            </span>
          </div>

          <p className={'stock ' + (p.stock === 0 ? 'unavailable' : '')}>
            <span />
            {p.stock === 0
              ? 'This size is currently sold out. Please select another size.'
              : `${p.stock} pieces in stock · Ready to dispatch`}
          </p>

          <div className="add-row">
            <button
              className="button dark"
              disabled={p.stock === 0}
              onClick={() => add(p)}
            >
              {p.stock === 0 ? 'Out of Stock' : 'Add to Shopping Bag'}
              <ShoppingBag size={18} />
            </button>

            <button
              className={'wishlist-button ' + (saved.includes(p.product_code) ? 'selected' : '')}
              aria-label={saved.includes(p.product_code) ? `Remove ${p.name} from saved` : `Save ${p.name}`}
              onClick={() => toggleSave(p.product_code)}
            >
              <Heart fill={saved.includes(p.product_code) ? 'currentColor' : 'none'} size={20} />
            </button>
          </div>

          {/* Specifications Accordion */}
          <dl className="specs">
            <div>
              <dt>Fabric</dt>
              <dd>{p.metal || 'Pure Mulmul Cotton'}</dd>
            </div>
            <div>
              <dt>Craftsmanship</dt>
              <dd>{p.purity || 'Authentic Lucknowi Chikankari Needlework'}</dd>
            </div>
            <div>
              <dt>Selected Size</dt>
              <dd>{p.size}</dd>
            </div>
            <div>
              <dt>SKU</dt>
              <dd>{p.sku}</dd>
            </div>
          </dl>

          <details>
            <summary>Authentic Craftsmanship & Stitches <Plus size={15} /></summary>
            <p style={{ margin: '8px 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--muted)' }}>
              Each piece features handcrafted Lucknowi Chikankari stitches: <em>Bakhiya</em> (shadow stitch worked on the reverse for an opaque glow), <em>Phanda</em> (delicate pearl milgrain knots), and <em>Keel Kangan</em> (chain-stitch floral vines). Sourced directly from Lucknow master needlecrafters.
            </p>
          </details>

          <details>
            <summary>Garment Care & Fabric Maintenance <Plus size={15} /></summary>
            <p style={{ margin: '8px 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--muted)' }}>
              Hand-wash gently in cold water using mild liquid detergent. Do not wring or soak. Dry flat in natural shade. Warm iron on reverse side to retain stitch embossing.
            </p>
          </details>
        </div>
      </section>

      {/* Reviews */}
      <ProductReviewsSection product={p} />

      {/* Related Kurtas */}
      {relatedKurtas.length > 0 && (
        <section className="related-products-section section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CURATED SILHOUETTES</span>
              <h2>Complementary Chikankari Pieces</h2>
            </div>
            <Link className="underlink" to="/kurtas">
              Explore all Chicken Curry Kurtas <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {relatedKurtas.map(rel => (
              <ProductCard key={rel.sku} p={rel} />
            ))}
          </div>
        </section>
      )}

      {showChart && <KurtaSizeChartModal onClose={() => setShowChart(false)} />}
    </Layout>
  );
}
