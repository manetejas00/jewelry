const CATALOGUE_SLIDES = [
  { id: 'jewelry', catalogue: 'jewelry', href: '/collections/all', text: 'A little wonder. An everyday heirloom.', cta: 'Discover the collection', code: '' },
  { id: 'coins', catalogue: 'coins', href: '/coins', text: 'A little wonder, struck in gold and silver.', cta: 'Discover coins', code: '' },
  { id: 'kurtas', catalogue: 'kurtas', href: '/kurtas', text: 'A little wonder, stitched in chikankari.', cta: 'Discover kurtas', code: '' }
];

export function routeCatalogue(pathname = '') {
  if (pathname.startsWith('/kurta')) return 'kurtas';
  if (pathname.startsWith('/coin')) return 'coins';
  if (pathname.startsWith('/jewelry') || pathname.startsWith('/collections')) return 'jewelry';
  return 'all';
}

function offerCatalogue(appliesTo) {
  if (appliesTo === 'kurtas') return 'kurtas';
  if (appliesTo === 'coins' || appliesTo === 'silver') return 'coins';
  if (appliesTo === 'products' || appliesTo === 'jewelry' || appliesTo === 'gold') return 'jewelry';
  return 'all';
}

function offerHref(offer) {
  if (offer.applies_to === 'kurtas') return '/kurtas';
  if (offer.applies_to === 'silver') return '/coins/silver';
  if (offer.applies_to === 'coins') return '/coins';
  return '/collections/all';
}

function bannerSlides(offers = []) {
  return offers.filter(offer => offer && (offer.show_in_banner === true || offer.show_in_banner === 1 || offer.show_in_banner === '1') && offer.banner_headline).map(offer => ({
    id: `offer-${offer.id}`,
    catalogue: offerCatalogue(offer.applies_to),
    href: offerHref(offer),
    text: offer.banner_headline,
    cta: offer.code ? `Code: ${offer.code}` : 'Offer auto-applied',
    code: offer.code ? String(offer.code).trim().toUpperCase() : ''
  }));
}

function orderedCatalogues(catalogue) {
  if (!catalogue || catalogue === 'all') return CATALOGUE_SLIDES;
  return [
    ...CATALOGUE_SLIDES.filter(slide => slide.catalogue === catalogue),
    ...CATALOGUE_SLIDES.filter(slide => slide.catalogue !== catalogue)
  ];
}

export function announcementSlides(offers = [], catalogue = 'all') {
  const banners = bannerSlides(offers).filter(slide => !catalogue || catalogue === 'all' || slide.catalogue === catalogue || slide.catalogue === 'all');
  return [...orderedCatalogues(catalogue), ...banners];
}
