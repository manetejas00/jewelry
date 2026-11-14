import React, { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, ShoppingBag, Sparkles, Check, Package, Heart } from 'lucide-react';
import { api } from './api.js';
import { useStore } from './store.jsx';
import BrandedImage from './BrandedImage.jsx';
import ProductMagicZoom from './ProductMagicZoom.jsx';

const money = v => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(v || 0);

export function ComboCard({ combo }) {
  const { add } = useStore();
  const [added, setAdded] = useState(false);

  const handleAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    add({
      id: `combo-${combo.id}`,
      sku: combo.sku,
      name: combo.name,
      price: combo.price,
      original_price: combo.original_price,
      image: combo.thumbnail || combo.image,
      is_combo: true,
      size: 'Curated Ensemble',
      stock: combo.stock,
      checkout_available: combo.checkout_available
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2200);
  };

  return (
    <article className="combo-card product-card">
      <Link to={`/combos/${combo.slug}`} className="combo-image-link" aria-label={combo.name}>
        <div className="product-photo combo-photo">
          <BrandedImage
            src={combo.thumbnail || combo.image}
            alt={combo.name}
            loading="lazy"
            decoding="async"
          />
          {combo.savings > 0 && (
            <span className="combo-savings-badge">
              <Sparkles size={11} /> SAVE {money(combo.savings)} ({combo.discount_percent}% OFF)
            </span>
          )}
          <span className="round-arrow">
            <ArrowUpRight size={18} />
          </span>
        </div>
      </Link>

      <div className="combo-card-details">
        <span className="eyebrow" style={{ color: 'var(--gold)' }}>CURATED ENSEMBLE</span>
        <h3 className="combo-title">
          <Link to={`/combos/${combo.slug}`}>{combo.name}</Link>
        </h3>
        <p className="combo-card-description">{combo.description}</p>

        {combo.components && combo.components.length > 0 && (
          <ul className="combo-components-list">
            {combo.components.map((c, i) => (
              <li key={i}>
                <span className="bullet">✦</span>
                <span className="name">{c.product?.name || c.product_sku}</span>
                {c.product?.price && <span className="val">{money(c.product.price)}</span>}
              </li>
            ))}
          </ul>
        )}

        <div className="combo-card-footer">
          <div className="combo-pricing">
            <span className="combo-current-price">{money(combo.price)}</span>
            {combo.original_price > combo.price && (
              <del className="combo-original-price">{money(combo.original_price)}</del>
            )}
          </div>

          <button
            type="button"
            className="button dark small-button"
            disabled={!combo.checkout_available}
            onClick={handleAdd}
            aria-label={`Add ${combo.name} combo to shopping bag`}
          >
            {added ? (
              <>Added <Check size={14} /></>
            ) : combo.stock === 0 ? (
              'Out of stock'
            ) : (
              <>Add set <ShoppingBag size={14} /></>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

export function CombosPage({ Layout }) {
  const [combos, setCombos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Curated Combos & Gift Sets | Veyora Jewels';
    setLoading(true);
    api('/combos')
      .then(data => setCombos(data || []))
      .catch(err => setError(err.message || 'Could not load combos.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="collection-intro combo-hero-intro">
        <span className="eyebrow">HARMONIOUS ENSEMBLES</span>
        <h1>Kurta & Jewellery Combos</h1>
        <p>
          Handcrafted Lucknowi Chikankari kurtas paired with Veyora fine cultured pearl and gold jewellery.
          Thoughtfully curated to elevate every celebration with effortless elegance and bundled savings.
        </p>
        <div className="value-strip" style={{ borderBottom: 'none', padding: '16px 0 0', justifyContent: 'center' }}>
          <span><Sparkles size={15} /> 15% Exclusive Bundle Savings</span>
          <span><Package size={15} /> Luxury Gift Box Packaging</span>
          <span><Check size={15} /> Free Insured Delivery</span>
        </div>
      </div>

      <section className="section catalogue">
        {loading ? (
          <p className="empty" role="status">Curating your gift sets…</p>
        ) : error ? (
          <div className="empty">
            <p className="error">{error}</p>
          </div>
        ) : !combos.length ? (
          <div className="empty">
            <Package size={36} />
            <h2>No combos currently available</h2>
            <p>Our stylists are curating fresh seasonal ensembles. Please explore our individual kurtas and jewellery.</p>
            <Link className="button dark" to="/collections/chicken-curry-kurtas">Explore Kurtas</Link>
          </div>
        ) : (
          <div className="product-grid combos-grid">
            {combos.map(combo => (
              <ComboCard key={combo.id} combo={combo} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}

export function ComboDetailPage({ Layout }) {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { add } = useStore();
  const [combo, setCombo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setLoading(true);
    api(`/combos/${encodeURIComponent(slug)}`)
      .then(data => {
        setCombo(data);
        if (data) document.title = `${data.name} — Curated Set | Veyora Jewels`;
      })
      .catch(err => setError(err.message || 'Could not load combo.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="empty">
          <h1>Finding your curated set…</h1>
        </div>
      </Layout>
    );
  }

  if (error || !combo) {
    return (
      <Layout>
        <div className="empty">
          <h1>Curated Set Not Found</h1>
          <p>{error || 'The requested combo may have moved or sold out.'}</p>
          <Link className="button dark" to="/combos">Back to Combos</Link>
        </div>
      </Layout>
    );
  }

  const handleAdd = () => {
    add({
      id: `combo-${combo.id}`,
      sku: combo.sku,
      name: combo.name,
      price: combo.price,
      original_price: combo.original_price,
      image: combo.thumbnail || combo.image,
      is_combo: true,
      size: 'Curated Ensemble',
      stock: combo.stock,
      checkout_available: combo.checkout_available
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2400);
  };

  const images = [
    { id: `combo-${combo.id}`, role: 'hero', url: combo.image, alt_text: combo.name },
    ...(combo.components || []).filter(c => c.product?.image).map((c, i) => ({
      id: `comp-${i}`,
      role: 'detail',
      url: c.product.image,
      alt_text: c.product.name
    }))
  ];

  return (
    <Layout>
      <div className="breadcrumbs section">
        <Link to="/combos">Combos & Sets</Link>
        <span>/</span>
        <span>{combo.name}</span>
      </div>

      <section className="product-detail section combo-detail-section">
        <ProductMagicZoom id={combo.sku} images={images} title={combo.name}>
          <p className="caption">CURATED ENSEMBLE · INCLUDES KURTA & JEWELLERY</p>
        </ProductMagicZoom>

        <div className="detail-copy">
          <span className="eyebrow" style={{ color: 'var(--gold)' }}>CURATED COMBO & GIFT SET</span>
          <h1>{combo.name}</h1>
          <p className="material-line">Handcrafted Lucknowi Chikankari & Fine Pearl Jewellery</p>

          <div className="detail-price" style={{ margin: '14px 0' }}>
            <div className="price-row" style={{ alignItems: 'baseline', gap: '12px' }}>
              <span className="discounted-price" style={{ fontSize: '28px', color: 'var(--ink)' }}>
                {money(combo.price)}
              </span>
              {combo.original_price > combo.price && (
                <del className="original-price-del" style={{ fontSize: '18px' }}>
                  {money(combo.original_price)}
                </del>
              )}
              {combo.savings > 0 && (
                <span className="offer-save-tag">
                  SAVE {money(combo.savings)} ({combo.discount_percent}% OFF)
                </span>
              )}
            </div>
          </div>

          <p className="detail-description">{combo.description}</p>

          <div className="combo-components-showcase" style={{ margin: '24px 0', border: '1px solid var(--line)', padding: '18px', background: '#faf9f5' }}>
            <h4 style={{ margin: '0 0 12px', fontSize: '13px', letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--ink)' }}>
              Included in this Ensemble:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {(combo.components || []).map((comp, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  {comp.product?.thumbnail && (
                    <img
                      src={comp.product.thumbnail}
                      alt={comp.product.name}
                      style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '2px', border: '1px solid var(--line)' }}
                    />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)' }}>
                      {comp.product ? (
                        <Link to={`/products/${comp.product.slug}`} className="underlink" style={{ color: 'inherit' }}>
                          {comp.product.name}
                        </Link>
                      ) : (
                        comp.product_sku
                      )}
                    </div>
                    <small style={{ color: 'var(--muted)' }}>
                      {comp.product?.category} · Individual: {money(comp.product?.price || comp.unit_price)}
                    </small>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className={'stock ' + (!combo.checkout_available ? 'unavailable' : '')}>
            <span />
            {combo.stock === 0 ? 'Currently out of stock' : `${combo.stock} sets ready to ship · Complete coordinated styling`}
          </p>

          <div className="add-row">
            <button
              className="button dark"
              disabled={!combo.checkout_available}
              onClick={handleAdd}
            >
              {added ? (
                <>Added to Bag <Check size={18} /></>
              ) : combo.checkout_available ? (
                <>Add Complete Set to Bag <ShoppingBag size={18} /></>
              ) : (
                'Out of stock'
              )}
            </button>
          </div>

          <details style={{ marginTop: '20px' }}>
            <summary>Ensemble Styling & Care <Sparkles size={14} /></summary>
            <p>
              Pair the handcrafted Chicken Curry Kurta with the matching Veyora cultured pearl jewellery for weddings,
              soirees, or festive family gatherings. Gentle hand wash or dry clean recommended for pure mulmul and georgette needlecraft.
            </p>
          </details>

          <details>
            <summary>Delivery & Gift Packaging <Package size={14} /></summary>
            <p>
              Every combo set is presented in our signature Veyora luxury gift box with ribbon tie and authenticity certificate.
              Insured courier delivery across India.
            </p>
          </details>
        </div>
      </section>
    </Layout>
  );
}
