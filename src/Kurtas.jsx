import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  Info
} from 'lucide-react';
import { useStore } from './store.jsx';
import { api } from './api.js';
import { money } from './catalogue.js';
import { KURTA_SIZES } from './kurta-constants.js';
import useScrollLock from './useScrollLock.js';
import CommonPLP from './components/CommonPLP.jsx';
import CommonPDP from './components/CommonPDP.jsx';

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

const kurtaPriceBrackets = [
  { label: 'All prices', value: '' },
  { label: 'Under ₹3,000', value: '0-3000' },
  { label: '₹3,000 – ₹3,500', value: '3000-3500' },
  { label: '₹3,500 – ₹4,000', value: '3500-4000' },
  { label: 'Above ₹4,000', value: '4000-' }
];

function matchKurtaPrice(price, bracket) {
  if (!bracket) return true;
  if (price === null || price === undefined) return false;
  if (bracket === '0-3000') return price < 3000;
  if (bracket === '3000-3500') return price >= 3000 && price <= 3500;
  if (bracket === '3500-4000') return price >= 3500 && price <= 4000;
  if (bracket === '4000-') return price > 4000;
  if (bracket.includes('-')) {
    const [minStr, maxStr] = bracket.split('-');
    if (minStr && price < Number(minStr)) return false;
    if (maxStr && price > Number(maxStr)) return false;
    return true;
  }
  return price <= Number(bracket);
}

export function KurtasPage({ Layout, ProductCard }) {
  const { products, error } = useStore();
  const [kurtas, setKurtas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fabricFilter, setFabricFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [priceBracket, setPriceBracket] = useState('');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const [visible, setVisible] = useState(24);

  useEffect(() => {
    document.title = 'Chicken Curry Kurtas | Authentic Lucknowi Chikankari | Veyora';
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
        (k.metal && k.metal.toLowerCase().includes(q)) ||
        (k.colors && k.colors.some(c => c.name.toLowerCase().includes(q)))
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

    if (colorFilter) {
      list = list.filter(k =>
        (k.colors && k.colors.some(c => c.name.toLowerCase().includes(colorFilter.toLowerCase()) || c.code === colorFilter.toLowerCase())) ||
        (k.color && k.color.toLowerCase().includes(colorFilter.toLowerCase()))
      );
    }

    if (priceBracket) {
      list = list.filter(k => matchKurtaPrice(k.minPrice || k.price, priceBracket));
    }

    if (inStockOnly) {
      list = list.filter(k => (k.totalStock || k.stock) > 0);
    }

    // Sort
    if (sortBy === 'price-asc' || sortBy === 'price-low') {
      list.sort((a, b) => (a.minPrice || a.price) - (b.minPrice || b.price));
    } else if (sortBy === 'price-desc' || sortBy === 'price-high') {
      list.sort((a, b) => (b.maxPrice || b.price) - (a.maxPrice || a.price));
    }

    return list;
  }, [kurtas, searchQuery, fabricFilter, sizeFilter, colorFilter, priceBracket, inStockOnly, sortBy]);

  const clearFilters = () => {
    setFabricFilter('');
    setSizeFilter('');
    setColorFilter('');
    setPriceBracket('');
    setInStockOnly(false);
    setSearchQuery('');
    setSortBy('featured');
  };

  const tabs = [
    { label: 'Chicken Curry Kurtas', href: '/kurtas', active: true },
    { label: 'All jewellery', href: '/collections/all', active: false },
    { label: 'The Pearl Edit', href: '/collections/pearls', active: false },
    { label: 'Earrings', href: '/collections/earrings', active: false },
    { label: 'Necklaces', href: '/collections/necklaces', active: false },
    { label: 'Rings', href: '/collections/rings', active: false },
    { label: 'Bracelets', href: '/collections/bracelets', active: false },
    { label: 'Coins', href: '/coins', active: false }
  ];

  const facets = [
    {
      key: 'fabric',
      label: 'Fabric',
      allLabel: 'All Fabrics',
      options: [
        { label: 'Pure Mulmul Cotton', value: 'mulmul' },
        { label: 'Viscose Georgette', value: 'georgette' },
        { label: 'Chanderi Silk', value: 'chanderi' },
        { label: 'Modal Cotton', value: 'modal' },
        { label: 'Kota Doria Cotton', value: 'kota' },
        { label: 'Tussar Silk', value: 'tussar' },
        { label: 'Silk Organza', value: 'organza' },
        { label: 'Linen Blend', value: 'linen' }
      ]
    },
    {
      key: 'size',
      label: 'Size',
      allLabel: 'All Sizes',
      options: KURTA_SIZES.map(s => ({ label: s.label, value: s.code }))
    }
  ];

  const handleFilterChange = (key, val) => {
    if (key === 'fabric') setFabricFilter(val);
    if (key === 'size') setSizeFilter(val);
    if (key === 'stock') setInStockOnly(Boolean(val));
  };

  return (
    <Layout>
      <CommonPLP
        eyebrow="THE VEYORA COLLECTIONS"
        title="Chicken Curry Kurtas"
        description="Exquisite hand-embroidered Lucknowi Chikankari needlecraft in pure mulmul cotton, fluid georgette, and shimmering Chanderi silk."
        tabs={tabs}
        priceBrackets={kurtaPriceBrackets}
        activePrice={priceBracket}
        onPriceChange={setPriceBracket}
        items={filteredKurtas}
        loading={loading}
        error={error}
        sortBy={sortBy}
        onSortChange={setSortBy}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilters={{
          fabric: fabricFilter,
          size: sizeFilter,
          stock: inStockOnly ? '1' : ''
        }}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
        facets={facets}
        emptyIcon={Sparkles}
        emptyTitle="No kurtas matched your search"
        emptyMessage="Try clearing your filters or explore our complete handcrafted Lucknowi collection."
        ProductCardComponent={ProductCard}
        visible={visible}
        onLoadMore={() => setVisible(v => v + 24)}
        itemLabel="handcrafted silhouettes"
      />
    </Layout>
  );
}

export function KurtaDetailPage({ Layout, StructuredProduct, ProductCard }) {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { products, add, saved, toggleSave } = useStore();
  const [kurtaData, setKurtaData] = useState(null);
  const [selectedSku, setSelectedSku] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api(`/kurtas/${slug}`)
      .then(data => {
        if (active) {
          setKurtaData(data);
          const initColor = searchParams.get('color') || data.color || (data.colors && data.colors[0]?.name) || '';
          setSelectedColor(initColor);
          setSelectedSku(data.sku);
          setLoading(false);
        }
      })
      .catch(() => {
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
  }, [slug, products, searchParams]);

  const allVariants = kurtaData?.all_variants || kurtaData?.variants || [];
  const colors = kurtaData?.colors || [];

  // Filter variants and images for active color
  const activeColorName = selectedColor || kurtaData?.color || (colors.length ? colors[0].name : '');
  const activeVariants = useMemo(() => {
    if (!allVariants.length) return [];
    const forColor = allVariants.filter(v => v.color === activeColorName);
    return forColor.length ? forColor : allVariants.slice(0, 7);
  }, [allVariants, activeColorName]);

  const currentVariant = activeVariants.find(v => v.sku === selectedSku) || activeVariants[0] || kurtaData;

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

  // Filter gallery images by active colour
  const colorFilteredImages = (kurtaData.images || []).filter(img =>
    !img.color || img.color === activeColorName
  );
  const angleImages = colorFilteredImages.length ? colorFilteredImages : (kurtaData.images || [
    { id: 'hero', role: 'hero', url: p.image, alt_text: p.name }
  ]);

  const relatedKurtas = products.filter(item =>
    item.product_code !== p.product_code && (item.is_kurta || item.category === 'Chicken Curry Kurtas')
  ).slice(0, 4);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Chicken Curry Kurtas', href: '/kurtas' },
    { label: p.name }
  ];

  const specs = [
    ['Fabric', p.metal || 'Pure Mulmul Cotton'],
    ['Craftsmanship', p.purity || 'Authentic Lucknowi Chikankari Needlework'],
    ['Selected Colour', p.color || activeColorName || 'Natural Ivory'],
    ['Selected Size', p.size],
    ['SKU', p.sku]
  ];

  const craftsmanshipAccordion = (
    <details>
      <summary>Authentic Craftsmanship & Stitches <Plus size={15} /></summary>
      <p style={{ margin: '8px 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--muted)' }}>
        Each piece features handcrafted Lucknowi Chikankari stitches: <em>Bakhiya</em> (shadow stitch worked on the reverse for an opaque glow), <em>Phanda</em> (delicate pearl milgrain knots), and <em>Keel Kangan</em> (chain-stitch floral vines). Sourced directly from Lucknow master needlecrafters.
      </p>
    </details>
  );

  const careAccordion = (
    <details>
      <summary>Garment Care & Fabric Maintenance <Plus size={15} /></summary>
      <p style={{ margin: '8px 0', fontSize: '13px', lineHeight: 1.6, color: 'var(--muted)' }}>
        Hand-wash gently in cold water using mild liquid detergent. Do not wring or soak. Dry flat in natural shade. Warm iron on reverse side to retain stitch embossing.
      </p>
    </details>
  );

  return (
    <Layout>
      <CommonPDP
        product={p}
        variants={activeVariants}
        allVariants={allVariants}
        colors={colors}
        selectedColor={activeColorName}
        onColorSelect={colName => {
          setSelectedColor(colName);
          const matchVar = allVariants.find(v => v.color === colName && v.size === p.size) || allVariants.find(v => v.color === colName);
          if (matchVar) setSelectedSku(matchVar.sku);
        }}
        selectedSku={p.sku}
        onSkuSelect={setSelectedSku}
        images={angleImages}
        breadcrumbs={breadcrumbs}
        onAdd={add}
        isSaved={saved.includes(p.product_code)}
        onToggleSave={() => toggleSave(p.product_code)}
        sizeType="kurta"
        onOpenSizeGuide={() => setShowChart(true)}
        specs={specs}
        craftsmanshipNode={craftsmanshipAccordion}
        careNode={careAccordion}
        relatedProducts={relatedKurtas}
        ProductCardComponent={ProductCard}
        StructuredProductComponent={StructuredProduct}
      />

      {showChart && <KurtaSizeChartModal onClose={() => setShowChart(false)} />}
    </Layout>
  );
}

export default KurtasPage;
