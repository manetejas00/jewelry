import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDb, migrate, now} from '../server/db.js';
import {matchOffer, describeCoupon, quote, fingerprint} from '../server/pricing.js';
import {validateOffer} from '../server/offers.js';
import {announcementSlides, routeCatalogue} from '../src/announcement.js';

const stamp = now();
const auto = {name:'Festive', code:'FESTIVE50', badge_text:'50% OFF', discount_type:'making_percent', discount_value:50, applies_to:'all', status:'active', priority:30, code_required:0};
const jewel = {name:'Jewellery coupon', code:'JEWEL10', badge_text:'10% OFF', discount_type:'total_percent', discount_value:10, applies_to:'products', status:'active', priority:10, code_required:1};
const kurta = {name:'Kurta coupon', code:'KURTA10', badge_text:'10% OFF', discount_type:'total_percent', discount_value:10, applies_to:'kurtas', status:'active', priority:10, code_required:1};
const coin = {name:'Coin coupon', code:'COIN10', badge_text:'10% OFF', discount_type:'total_percent', discount_value:10, applies_to:'coins', status:'active', priority:10, code_required:1};
const offers = [auto, jewel, kurta, coin];

test('a coupon stays on its catalogue and beats an automatic offer', () => {
  const ring = {sku:'RING-1', category:'Rings', metal:'Gold'};
  const kurtaPiece = {sku:'KURTA-1', category:'Kurtas', is_kurta:1};
  const silverCoin = {sku:'COIN-AG-1', coin_type:'Silver Coin', metal:'Silver', weight_g:10};
  assert.equal(matchOffer(ring, offers, 'JEWEL10').code, 'JEWEL10');
  assert.equal(matchOffer(kurtaPiece, offers, 'JEWEL10').code, 'FESTIVE50');
  assert.equal(matchOffer(silverCoin, offers, 'COIN10').code, 'COIN10');
  assert.equal(matchOffer(kurtaPiece, offers, 'KURTA10').code, 'KURTA10');
  assert.equal(matchOffer(ring, offers, 'KURTA10').code, 'FESTIVE50');
  assert.equal(matchOffer(kurtaPiece, offers).code, 'FESTIVE50');
});

test('an unknown or mismatched coupon explains itself', () => {
  assert.equal(describeCoupon('MISSING', [], offers).applied, false);
  assert.match(describeCoupon('MISSING', [], offers).message, /not active/);
  const missed = describeCoupon('KURTA10', [{offer:{code:'FESTIVE50'}, discount_amount:100, quantity:1}], offers);
  assert.equal(missed.applied, false);
  assert.match(missed.message, /kurtas/);
  const applied = describeCoupon('JEWEL10', [{offer:{code:'JEWEL10'}, discount_amount:100, quantity:2}], offers);
  assert.equal(applied.applied, true);
  assert.equal(applied.savings, 200);
});

test('a checkout coupon needs a code', () => {
  assert.throws(() => validateOffer({name:'Coupon', badge_text:'10%', discount_type:'total_percent', discount_value:10, applies_to:'kurtas', status:'active', priority:1, show_in_banner:1, show_in_grid:0, code_required:1, code:''}), /coupon code/);
});

test('the announcement carousel keeps a slide for jewellery, coins, and kurtas', () => {
  const home = announcementSlides([{id:7, show_in_banner:1, banner_headline:'Kurta week', code:'KURTA10', applies_to:'kurtas'}], routeCatalogue('/'));
  assert.deepEqual(home.map(slide => slide.id), ['jewelry', 'coins', 'kurtas', 'offer-7']);
  const kurtas = announcementSlides([{id:7, show_in_banner:1, banner_headline:'Kurta week', code:'KURTA10', applies_to:'kurtas'}], routeCatalogue('/kurtas'));
  assert.deepEqual(kurtas.map(slide => slide.catalogue), ['kurtas', 'kurtas']);
  assert.equal(kurtas[1].cta, 'Code: KURTA10');
  assert.equal(routeCatalogue('/coins/silver'), 'coins');
  assert.equal(routeCatalogue('/jewelry/ring'), 'jewelry');
});

test('quote applies a jewellery coupon and leaves a kurta coupon unused', async () => {
  const k = createDb(':memory:');
  try {
    await migrate(k);
    await k('products').insert({product_code:'coupon-ring', slug:'coupon-ring', sku:'COUPON-RING', name:'Coupon ring', category:'Rings', metal:'Gold', purity:'22K', pricing_mode:'FIXED', fixed_price:1000, stock:4, status:'published', source_timestamp:stamp, updated_at:stamp});
    const [kurtaId] = await k('kurtas').insert({sku:'COUPON-KURTA', product_code:'coupon-kurta', slug:'coupon-kurta', name:'Coupon kurta', category:'Kurtas', price:2000, fixed_price:2000, stock:4, status:'published', source_timestamp:stamp, created_at:stamp, updated_at:stamp});
    await k('kurta_variants').insert({kurta_id:kurtaId, product_code:'coupon-kurta', sku:'COUPON-KURTA-M', slug:'coupon-kurta-m', size:'M (38)', price:2000, fixed_price:2000, stock:4, status:'published', created_at:stamp, updated_at:stamp});
    await k('offers').insert({...jewel, target_value:null, banner_headline:'Jewellery coupon', banner_subtext:null, show_in_banner:1, show_in_grid:0, created_at:stamp, updated_at:stamp});
    await k('offers').insert({...kurta, target_value:null, banner_headline:'Kurta coupon', banner_subtext:null, show_in_banner:1, show_in_grid:0, created_at:stamp, updated_at:stamp});
    const ring = await quote(k, [{sku:'COUPON-RING', quantity:1}], {code:'jewel10'});
    assert.equal(ring.subtotal, 900);
    assert.equal(ring.coupon.applied, true);
    assert.equal(ring.coupon.code, 'JEWEL10');
    const wrong = await quote(k, [{sku:'COUPON-RING', quantity:1}], {code:'KURTA10'});
    assert.equal(wrong.subtotal, 1000);
    assert.equal(wrong.coupon.applied, false);
    const sized = await quote(k, [{sku:'COUPON-KURTA-M', quantity:1}], {code:'KURTA10'});
    assert.equal(sized.subtotal, 1800);
    assert.equal(sized.coupon.applied, true);
    const {token, coupon, ...priced} = ring;
    assert.equal(token, fingerprint(priced));
    assert.equal(coupon.applied, true);
  } finally {
    await k.destroy();
  }
});
