import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  ShoppingBag,
  Heart,
  Plus,
  ArrowRight,
  ArrowUpRight
} from 'lucide-react';
import { money } from '../catalogue.js';
import { api } from '../api.js';
import ProductMagicZoom from '../ProductMagicZoom.jsx';
import { RatingBadge, ProductReviewsSection } from '../Reviews.jsx';

export function CommonPDP({
  product: p,
  variants = [],
  allVariants = [],
  colors = [],
  selectedColor = '',
  onColorSelect,
  selectedSku = '',
  onSkuSelect,
  images = [],
  breadcrumbs = [],
  onAdd,
  isSaved = false,
  onToggleSave,
  sizeType = 'standard', // 'kurta' | 'coin' | 'ring' | 'standard'
  onOpenSizeGuide,
  specs = [],
  priceDetailsNode = null,
  craftsmanshipNode = null,
  careNode = null,
  relatedProducts = [],
  ProductCardComponent,
  StructuredProductComponent
}) {
  const navigate = useNavigate();
  const [recs, setRecs] = useState({ similar: [], youMayLike: [], completeLook: [] });

  useEffect(() => {
    if (!p) return;
    const identifier = p.product_code || p.slug || p.sku;
    if (!identifier) return;

    let cancelled = false;
    const colorParam = selectedColor ? `?color=${encodeURIComponent(selectedColor)}` : '';
    api(`/products/${encodeURIComponent(identifier)}/recommendations${colorParam}`)
      .then(res => {
        if (!cancelled && res) {
          setRecs({
            similar: Array.isArray(res.similar) ? res.similar : [],
            youMayLike: Array.isArray(res.youMayLike) ? res.youMayLike : [],
            completeLook: Array.isArray(res.completeLook) ? res.completeLook : []
          });
        }
      })
      .catch(() => {
        // Fallback silently if recommendation API fails
      });

    return () => { cancelled = true; };
  }, [p?.product_code, p?.slug, p?.sku, selectedColor]);

  if (!p) return null;

  const hasDiscount = p.original_price && p.original_price > p.price;
  const isCoin = sizeType === 'coin' || p.is_coin || p.sku?.startsWith('COIN-');
  const isKurta = sizeType === 'kurta' || p.is_kurta;

  return (
    <>
      {StructuredProductComponent && <StructuredProductComponent p={p} />}

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div className="breadcrumbs section">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={crumb.href || crumb.label}>
              {idx > 0 && <span>/</span>}
              {crumb.href ? (
                <Link to={crumb.href}>{crumb.label}</Link>
              ) : (
                <span>{crumb.label}</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      <section className="product-detail section">
        {/* Magic Zoom multi-angle gallery */}
        <ProductMagicZoom
          id={p.sku}
          images={images}
          title={`${p.name}, ${p.size || ''}, ${p.metal || ''}`}
        >
          <p className="caption">
            {images.length > 1
              ? 'MULTI-ANGLE PHOTOGRAPHY · PREVIEW CATALOGUE'
              : 'PRODUCT PHOTOGRAPHY · PREVIEW CATALOGUE'}
          </p>
        </ProductMagicZoom>

        {/* Product Details & Actions */}
        <div className="detail-copy">
          <span className="eyebrow">
            {isKurta
              ? 'CHICKEN CURRY KURTAS · HERITAGE NEEDLECRAFT'
              : isCoin
              ? 'THE COIN COLLECTION · PURE BULLION'
              : 'THE VEYORA COLLECTION'}
          </span>
          <h1>{p.name}</h1>
          <p className="material-line">
            {isKurta
              ? `${p.metal} · ${p.purity || 'Handcrafted Chikankari Embroidery'}`
              : isCoin
              ? `${p.purity} ${p.metal} · ${p.weight_g} g`
              : `${p.purity || ''} ${p.metal || ''} · ${p.finish || ''}`}
          </p>

          {/* Rating */}
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

          {/* Pricing & Savings */}
          <div className="detail-price">
            {hasDiscount ? (
              <div className="price-row" style={{ alignItems: 'baseline', gap: '10px', margin: 0 }}>
                <span className="discounted-price" style={{ fontSize: '26px' }}>{money(p.price)}</span>
                <del className="original-price-del" style={{ fontSize: '16px' }}>{money(p.original_price)}</del>
                {p.discount_amount > 0 && <span className="offer-save-tag">SAVE {money(p.discount_amount)}</span>}
              </div>
            ) : p.price === null ? (
              'Awaiting approved rate'
            ) : (
              money(p.price)
            )}
          </div>

          {/* Applied Offer Banner */}
          {p.offer && (
            <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span className="offer-ribbon-badge" style={{ position: 'static', clipPath: 'none', borderRadius: '2px', padding: '4px 10px', fontSize: '10px', boxShadow: 'none' }}>
                ✦ {p.offer.name}: {p.offer.badge_text}
              </span>
              {p.offer.code && <span className="status-badge" style={{ fontSize: '9px' }}>CODE: {p.offer.code}</span>}
            </div>
          )}

          {/* Dynamic Rate Badge */}
          {p.pricing_mode === 'GOLD_LINKED' && (
            <div style={{ marginTop: '6px' }}>
              <span className="gold-linked-pill"><Sparkles size={12} /> Gold-Linked Rate</span>
            </div>
          )}
          {isCoin && p.pricing_mode === 'METAL_LINKED' && (
            <div style={{ marginTop: '6px' }}>
              <span className="gold-linked-pill"><Sparkles size={12} /> Metal-Linked Rate</span>
            </div>
          )}

          <p className="small muted">
            {isKurta
              ? 'Handcrafted in Lucknow · Free shipping across India'
              : 'Preview price · Shipping calculated before payment'}
          </p>

          <p className="detail-description">{p.description}</p>

          {/* PDP Interactive Colour Selector */}
          {colors.length > 1 && (
            <div className="pdp-color-selector">
              <div className="pdp-color-heading">
                <span className="pdp-color-label">
                  Colour:{' '}
                  <strong className="pdp-color-active-name">{selectedColor || p.color}</strong>
                </span>
                <span className="small muted">{colors.length} shades available</span>
              </div>
              <div className="pdp-color-swatches" role="group" aria-label="Available colours">
                {colors.map(col => {
                  const isSelected = (selectedColor || p.color) === col.name || selectedColor === col.code;
                  return (
                    <button
                      key={col.name}
                      type="button"
                      className={`pdp-color-swatch-btn ${isSelected ? 'active' : ''}`}
                      style={{ backgroundColor: col.hex }}
                      title={`${col.name}${col.in_stock === false ? ' (Out of stock)' : ''}`}
                      aria-label={`Select ${col.name} colour`}
                      aria-pressed={isSelected}
                      onClick={() => onColorSelect && onColorSelect(col.name)}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Size / Sizing Options */}
          {sizeType === 'kurta' ? (
            <div className="kurta-size-selector" style={{ margin: '20px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  Select Kurta Size (XS to XXXL)
                </label>
                {onOpenSizeGuide && (
                  <button
                    type="button"
                    className="underlink"
                    onClick={onOpenSizeGuide}
                    style={{ fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                  >
                    Size Guide & Measurements ↗
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {variants.map(v => {
                  const isSelected = v.sku === (selectedSku || p.sku);
                  const isOutOfStock = v.stock === 0;
                  return (
                    <button
                      key={v.sku}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => onSkuSelect && onSkuSelect(v.sku)}
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
                      title={isOutOfStock ? `${v.size} is out of stock` : `Select size ${v.size} (${v.stock} in stock)`}
                    >
                      {v.size ? v.size.split(' ')[0] : v.sku}
                    </button>
                  );
                })}
              </div>
              <span className="small muted" style={{ display: 'block', marginTop: '6px' }}>
                Selected: <strong>{p.size}</strong> {p.stock > 0 ? `(${p.stock} ready in stock)` : '— Currently Out of Stock'}
              </span>
            </div>
          ) : sizeType === 'coin' ? (
            <div style={{ margin: '18px 0' }}>
              <div className="size-label"><label htmlFor="coin-weight">Weight</label></div>
              <select
                id="coin-weight"
                value={p.sku}
                onChange={e => navigate('/coins/product/' + encodeURIComponent(e.target.value))}
              >
                {variants.map(c => (
                  <option key={c.sku} value={c.sku}>
                    {c.weight_g} g{c.stock === 0 ? ' — Out of stock' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : variants.length > 1 ? (
            <div style={{ margin: '18px 0' }}>
              <div className="size-label">
                <label htmlFor="size">{p.category === 'Rings' ? 'Ring size' : 'Size / options'}</label>
                {onOpenSizeGuide && (
                  <button type="button" className="underlink" onClick={onOpenSizeGuide}>
                    Size guide ↗
                  </button>
                )}
              </div>
              <select
                id="size"
                value={selectedSku || p.sku}
                onChange={e => onSkuSelect && onSkuSelect(e.target.value)}
              >
                {variants.map(v => (
                  <option value={v.sku} key={v.sku}>
                    {v.size}{v.stock === 0 ? ' — Out of stock' : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {/* Stock Indicator */}
          <p className={'stock ' + (!p.checkout_available || p.stock === 0 ? 'unavailable' : '')}>
            <span />
            {p.stock === 0
              ? 'Currently out of stock'
              : !p.checkout_available
              ? 'Awaiting fresh verified rate'
              : `${p.stock} available · Ready for your next chapter`}
          </p>

          {/* Add to Bag and Wishlist Row */}
          <div className="add-row">
            <button
              className="button dark"
              disabled={!p.checkout_available || p.stock === 0}
              onClick={() => onAdd && onAdd(p)}
            >
              {p.stock === 0
                ? 'Out of stock'
                : p.checkout_available
                ? 'Add to shopping bag'
                : 'Currently unavailable'}
              <ShoppingBag size={18} />
            </button>

            {onToggleSave && (
              <button
                className={'wishlist-button ' + (isSaved ? 'selected' : '')}
                aria-label={isSaved ? `Remove ${p.name} from saved` : `Save ${p.name}`}
                onClick={onToggleSave}
              >
                <Heart fill={isSaved ? 'currentColor' : 'none'} size={20} />
              </button>
            )}
          </div>

          {/* Specifications Accordion */}
          {specs.length > 0 && (
            <dl className="specs">
              {specs.map(([label, val]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{val}</dd>
                </div>
              ))}
            </dl>
          )}

          {/* Custom Accordions (Price Breakdown, Craftsmanship, Care, Delivery) */}
          {priceDetailsNode}
          {craftsmanshipNode}
          {careNode}

          <details>
            <summary>Delivery & returns <Plus size={15} /></summary>
            <p>
              Delivery and return policies are awaiting merchant details.{' '}
              <Link to="/information/shipping">View current information</Link>.
            </p>
          </details>
        </div>
      </section>

      {/* Customer Reviews Section */}
      <ProductReviewsSection product={p} />

      {/* Recommendation Shelf 1: Similar Products */}
      {recs.similar.length > 0 && ProductCardComponent && (
        <section className="related-products-section section" style={{ borderTop: '1px solid var(--line)', paddingTop: '40px' }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">HARMONIOUS SILHOUETTES</span>
              <h2>Similar Pieces</h2>
            </div>
            <Link className="underlink" to={`/collections/${p.category ? p.category.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'all'}`}>
              View all {p.category || 'pieces'} <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {recs.similar.map(item => (
              <ProductCardComponent key={item.sku || item.product_code} p={item} />
            ))}
          </div>
        </section>
      )}

      {/* Recommendation Shelf 2: You May Also Like */}
      {recs.youMayLike.length > 0 && ProductCardComponent && (
        <section className="related-products-section section" style={{ borderTop: '1px solid var(--line)', paddingTop: '40px' }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">CURATED FOR YOUR AESTHETIC</span>
              <h2>You May Also Adore</h2>
            </div>
            <Link className="underlink" to="/collections/all">
              Explore more pieces <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {recs.youMayLike.map(item => (
              <ProductCardComponent key={item.sku || item.product_code} p={item} />
            ))}
          </div>
        </section>
      )}

      {/* Recommendation Shelf 3: Complete the Look (Cross-Category Styling) */}
      {recs.completeLook.length > 0 && ProductCardComponent && (
        <section className="related-products-section section" style={{ borderTop: '1px solid var(--line)', paddingTop: '40px', background: 'var(--paper)', margin: '40px 0', padding: '40px 24px' }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">ARTISAN ENSEMBLE</span>
              <h2>Complete the Look</h2>
            </div>
            <span className="small muted">Stylist-curated pairings that harmonize across metals and needlework</span>
          </div>
          <div className="product-grid">
            {recs.completeLook.map(item => (
              <ProductCardComponent key={item.sku || item.product_code} p={item} />
            ))}
          </div>
        </section>
      )}

      {/* Fallback to basic related products if no recommendations returned */}
      {recs.similar.length === 0 && recs.youMayLike.length === 0 && recs.completeLook.length === 0 && relatedProducts.length > 0 && ProductCardComponent && (
        <section className="related-products-section section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CURATED COMPLEMENTS</span>
              <h2>You may also adore</h2>
            </div>
            <Link className="underlink" to="/collections/all">
              Explore more pieces <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="product-grid">
            {relatedProducts.map(rel => (
              <ProductCardComponent key={rel.sku} p={rel} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export default CommonPDP;
