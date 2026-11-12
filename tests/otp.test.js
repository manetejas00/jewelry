import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createOtpGateway} from '../server/otp-gateway.js';
import {availableChannels, confirmOtp, normalizeIndianMobile, otpAvailability, otpStatus, prepareCheckoutOtp, resendOtp, sendOtp, sendPasswordResetOtp, spendVerified, verifyOtp, SENT_MESSAGE} from '../server/otp.js';

const env = {
  OTP_GATEWAY_URL: 'http://127.0.0.1:9000',
  OTP_GATEWAY_NAMESPACE: 'Veyora',
  OTP_GATEWAY_SECRET: 'test-secret-value-32chars-minimum',
  OTP_EMAIL_ENABLED: 'true',
  SMTP_HOST: 'smtp.example.test',
  SMTP_FROM: 'Veyora <otp@example.test>',
  OTP_SMS_ENABLED: 'true',
  OTP_SMS_PROVIDER: 'kaleyra_sms',
  KALEYRA_API_KEY: 'sms-key',
  KALEYRA_SID: 'sms-sid',
  KALEYRA_SMS_SENDER: 'VEYORA',
  OTP_WHATSAPP_ENABLED: 'true',
  KALEYRA_WHATSAPP_API_KEY: 'wa-key',
  KALEYRA_WHATSAPP_SID: 'wa-sid',
  KALEYRA_WHATSAPP_SENDER: '919876543210',
  KALEYRA_WHATSAPP_TEMPLATE: 'otp_login',
};

function mockGateway() {
  const records = new Map();
  let sends = 0;
  const gateway = {
    sends,
    records,
    configured: () => true,
    async send({id, to, provider}) {
      sends += 1;
      gateway.sends = sends;
      if (provider === 'fail') return {status: 500, ok: false, message: 'Error sending OTP.'};
      records.set(id, {otp: `10000${sends}`.slice(-6), to, attempts: 0});
      return {status: 200, ok: true, message: ''};
    },
    async verify({id, otp}) {
      const row = records.get(id);
      if (!row) return {status: 410, ok: false, message: 'the OTP does not exist'};
      row.attempts += 1;
      if (row.attempts > 5) return {status: 429, ok: false, message: 'Too many attempts.'};
      if (row.otp !== otp) return {status: 400, ok: false, message: 'Incorrect OTP'};
      records.delete(id);
      row.closed = true;
      return {status: 200, ok: true, message: ''};
    },
  };
  return gateway;
}

function memoryDb() {
  const tables = {otp_challenges: [], customers: [], orders: []};
  function query(name) {
    const rows = tables[name];
    const filters = [];
    let order = null;
    let op = 'select';
    const api = {
      where(column, operator, value) {
        if (column && typeof column === 'object') filters.push(row => Object.entries(column).every(([key, expected]) => row[key] === expected));
        else if (value === undefined) filters.push(row => row[column] === operator);
        else if (operator === '>') filters.push(row => Number(row[column]) > value);
        return api;
      },
      whereNull(column) { filters.push(row => row[column] == null); return api; },
      orderBy(column, direction) { order = {column, direction}; return api; },
      count() { op = 'count'; return api; },
      async first() {
        let list = rows.filter(row => filters.every(check => check(row)));
        if (order) list = [...list].sort((a, b) => order.direction === 'desc' ? Number(b[order.column]) - Number(a[order.column]) : Number(a[order.column]) - Number(b[order.column]));
        return op === 'count' ? {total: list.length} : list[0];
      },
      async insert(row) { rows.push({...row}); },
      async update(patch) {
        const list = rows.filter(row => filters.every(check => check(row)));
        for (const row of list) Object.assign(row, patch);
        return list.length;
      },
    };
    return api;
  }
  query.tables = tables;
  return query;
}

test('phone numbers normalise to +91 and channels stay disabled without credentials', () => {
  assert.deepEqual(normalizeIndianMobile(' 98765 43210 '), {national: '9876543210', e164: '+919876543210'});
  assert.equal(normalizeIndianMobile('+91-9876543210').e164, '+919876543210');
  assert.equal(normalizeIndianMobile('09876543210').national, '9876543210');
  assert.throws(() => normalizeIndianMobile('+14155552671'), /Indian mobile/);
  assert.deepEqual(availableChannels({...env, OTP_GATEWAY_URL: ''}), []);
  assert.deepEqual(availableChannels({...env, OTP_SMS_ENABLED: 'true', KALEYRA_API_KEY: '', OTP_EMAIL_ENABLED: 'false', OTP_WHATSAPP_ENABLED: 'false', SMTP_HOST: ''}), []);
  const published = JSON.stringify(otpAvailability(env));
  assert.equal(published.includes('test-secret'), false);
  assert.equal(published.includes('sms-key'), false);
  assert.deepEqual(otpAvailability(env).channels, ['email', 'sms', 'whatsapp']);
});

test('gateway client strips the OTP and verification URL from upstream responses', async () => {
  const gateway = createOtpGateway(env, async (url, options) => {
    assert.equal(options.headers.Authorization.startsWith('Basic '), true);
    assert.equal(String(url).includes('654321'), false);
    assert.equal(options.body.includes('otp='), false);
    return {ok: true, status: 200, text: async () => JSON.stringify({status: 'success', data: {otp: '654321', url: 'http://127.0.0.1:9000/otp/Veyora/abc?otp=654321', to: 'ada@example.test'}})};
  });
  const result = await gateway.send({id: 'abc123def456', provider: 'smtp', to: 'ada@example.test'});
  assert.equal(JSON.stringify(result).includes('654321'), false);
  assert.equal(result.ok, true);
});

test('valid, invalid, expired, reused and resent codes share one gateway authority', async () => {
  const k = memoryDb();
  const gateway = mockGateway();
  const session = {};
  let now = 1_700_000_000_000;
  const clock = () => now;
  const sent = await sendOtp(k, session, {purpose: 'register', channel: 'email', destination: 'Ada@Example.test'}, env, gateway, clock);
  assert.equal(sent.message, SENT_MESSAGE);
  assert.equal(JSON.stringify(sent).includes(gateway.records.values().next().value?.otp || '100001'), false);
  const code = [...gateway.records.values()][0].otp;
  await assert.rejects(verifyOtp(k, session, {purpose: 'register', otp: '000000'}, env, gateway, clock), /incorrect/i);
  assert.equal((await otpStatus(k, session, 'register', clock)).state, 'pending');
  await verifyOtp(k, session, {purpose: 'register', otp: code}, env, gateway, clock);
  await assert.rejects(verifyOtp(k, session, {purpose: 'register', otp: code}, env, gateway, clock), /already been used/);
  const held = await spendVerified(k, session, 'register', 'ada@example.test', clock);
  await assert.rejects(spendVerified(k, session, 'register', 'ada@example.test', clock), /already been used/);
  assert.equal(typeof held, 'string');

  now += 61_000;
  const session2 = {};
  await sendOtp(k, session2, {purpose: 'verify_email', channel: 'email', destination: 'ada@example.test'}, env, gateway, clock);
  const first = [...gateway.records.values()][0].otp;
  now += 61_000;
  await resendOtp(k, session2, 'verify_email', env, gateway, clock);
  const second = [...gateway.records.values()][0].otp;
  assert.notEqual(first, second);
  await assert.rejects(verifyOtp(k, session2, {purpose: 'verify_email', otp: first}, env, gateway, clock), /incorrect|expired|already/i);
  now += 5 * 60 * 1000 + 1;
  await assert.rejects(verifyOtp(k, session2, {purpose: 'verify_email', otp: second}, env, gateway, clock), /expired/);
  assert.equal((await otpStatus(k, session2, 'verify_email', clock)).state, 'expired');
});

test('resend cooldown, destination rate limit and delivery failure do not expose codes', async () => {
  const k = memoryDb();
  const gateway = mockGateway();
  const session = {};
  let now = 1_800_000_000_000;
  const clock = () => now;
  await sendOtp(k, session, {purpose: 'checkout', channel: 'sms', destination: '9876543210'}, env, gateway, clock);
  await assert.rejects(resendOtp(k, session, 'checkout', env, gateway, clock), /wait a minute/);
  for (let i = 0; i < 4; i += 1) {
    now += 61_000;
    await resendOtp(k, session, 'checkout', env, gateway, clock);
  }
  now += 61_000;
  await assert.rejects(resendOtp(k, session, 'checkout', env, gateway, clock), /Too many verification requests/);
  const failing = mockGateway();
  failing.send = async () => ({status: 500, ok: false, message: 'Error sending OTP. 654321'});
  const fresh = {};
  await assert.rejects(sendOtp(k, fresh, {purpose: 'checkout', channel: 'whatsapp', destination: '+91 9123456789'}, env, failing, clock), error => {
    assert.equal(error.status, 503);
    assert.equal(String(error.message).includes('654321'), false);
    return true;
  });
  assert.equal(fresh.otpFlows, undefined);
});

test('concurrent verification can close a challenge only once', async () => {
  const k = memoryDb();
  const gateway = mockGateway();
  gateway.verify = async () => ({status: 200, ok: true, message: ''});
  const session = {};
  const now = 1_900_000_000_000;
  await sendOtp(k, session, {purpose: 'login', channel: 'email', destination: 'concurrent@example.test'}, env, gateway, () => now);
  const results = await Promise.allSettled([
    verifyOtp(k, session, {purpose: 'login', otp: '123456'}, env, gateway, () => now),
    verifyOtp(k, session, {purpose: 'login', otp: '123456'}, env, gateway, () => now),
  ]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal(results.filter(result => result.status === 'rejected').length, 1);
});

test('password reset uses the same gateway and does not reveal missing accounts', async () => {
  const k = memoryDb();
  const gateway = mockGateway();
  k.tables.customers.push({id: 1, email: 'ada.reset@example.test', name: 'Ada Preview'});
  const known = {};
  const unknown = {};
  const now = 2_000_000_000_000;
  const knownSent = await sendPasswordResetOtp(k, known, 'ada.reset@example.test', env, gateway, () => now);
  const unknownSent = await sendPasswordResetOtp(k, unknown, 'missing.reset@example.test', env, gateway, () => now);
  assert.equal(knownSent.message, unknownSent.message);
  assert.equal(gateway.sends, 1);
  await assert.rejects(verifyOtp(k, unknown, {purpose: 'password_reset', otp: '123456'}, env, gateway, () => now), /incorrect/);
  const code = [...gateway.records.values()][0].otp;
  await verifyOtp(k, known, {purpose: 'password_reset', otp: code}, env, gateway, () => now);
  await confirmOtp(k, known, {purpose: 'password_reset', otp: '000000'}, env, gateway, () => now);
  await spendVerified(k, known, 'password_reset', 'ada.reset@example.test', () => now);
});

test('checkout spends one verified mobile proof and keeps an idempotent retry', async () => {
  const k = memoryDb();
  const gateway = mockGateway();
  const session = {};
  const checkoutEnv = {...env, OTP_REQUIRE_CHECKOUT: 'true'};
  const now = 2_100_000_000_000;
  k.tables.orders.push({idempotency_key: 'checkout-otp-proof-0001'});
  assert.equal(await prepareCheckoutOtp(k, {}, {customer: {phone: '9988776655'}, idempotencyKey: 'checkout-otp-proof-0001'}, checkoutEnv, gateway, () => now), null);
  k.tables.orders.pop();
  await sendOtp(k, session, {purpose: 'checkout', channel: 'sms', destination: '9988776655'}, checkoutEnv, gateway, () => now);
  const code = [...gateway.records.values()][0].otp;
  const body = {customer: {phone: '9988776655'}, otp: code, idempotencyKey: 'checkout-otp-proof-0001'};
  await assert.rejects(prepareCheckoutOtp(k, {}, body, checkoutEnv, gateway, () => now), /Verify the mobile number/);
  const held = await prepareCheckoutOtp(k, session, body, checkoutEnv, gateway, () => now);
  assert.equal(typeof held, 'string');
  await assert.rejects(prepareCheckoutOtp(k, session, body, checkoutEnv, gateway, () => now), /already been used/);
});
