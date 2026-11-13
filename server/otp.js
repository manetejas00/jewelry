import crypto from 'node:crypto';
import {validationError} from './errors.js';
import {classifyGatewayResult, createOtpGateway, gatewayFailure} from './otp-gateway.js';

export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_COOLDOWN_MS = 60 * 1000;
export const OTP_DESTINATION_WINDOW_MS = 15 * 60 * 1000;
export const OTP_DESTINATION_MAX = 5;
export const SENT_MESSAGE = 'If we can reach you, a verification code is on its way.';

const PURPOSES = {
  register: ['email'],
  login: ['email'],
  verify_email: ['email'],
  verify_phone: ['sms', 'whatsapp'],
  password_reset: ['email'],
  checkout: ['sms', 'whatsapp'],
};

const flag = (env, name) => env[name] === 'true';

export function normalizeEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 100) throw validationError('Enter a valid email address.');
  return email;
}

export function normalizeIndianMobile(value) {
  const compact = String(value || '').trim().replace(/[\s()-]/g, '');
  let digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (!/^[6-9]\d{9}$/.test(digits)) throw validationError('Enter a valid Indian mobile number.');
  return {national: digits, e164: `+91${digits}`};
}

export function smsProvider(env) {
  if (!flag(env, 'OTP_SMS_ENABLED')) return null;
  if (env.OTP_SMS_PROVIDER === 'kaleyra_sms' && env.KALEYRA_API_KEY && env.KALEYRA_SID && env.KALEYRA_SMS_SENDER) return 'kaleyra_sms';
  if (env.OTP_SMS_PROVIDER === 'pinpoint_sms' && env.PINPOINT_APPLICATION_ID && env.PINPOINT_ACCESS_KEY && env.PINPOINT_SECRET_KEY && env.PINPOINT_REGION) return 'pinpoint_sms';
  return null;
}

export function whatsappProvider(env) {
  if (!flag(env, 'OTP_WHATSAPP_ENABLED')) return null;
  if (env.KALEYRA_WHATSAPP_API_KEY && env.KALEYRA_WHATSAPP_SID && env.KALEYRA_WHATSAPP_SENDER && env.KALEYRA_WHATSAPP_TEMPLATE) return 'kaleyra_whatsapp';
  return null;
}

export function emailProvider(env) {
  if (!flag(env, 'OTP_EMAIL_ENABLED')) return null;
  if (env.SMTP_HOST && env.SMTP_FROM) return 'smtp';
  return null;
}

export function providerFor(env, channel) {
  if (channel === 'email') return emailProvider(env);
  if (channel === 'sms') return smsProvider(env);
  if (channel === 'whatsapp') return whatsappProvider(env);
  return null;
}

export function availableChannels(env, gateway = createOtpGateway(env)) {
  if (!gateway.configured()) return [];
  return ['email', 'sms', 'whatsapp'].filter(channel => providerFor(env, channel));
}

export function otpAvailability(env = process.env, gateway = createOtpGateway(env)) {
  const channels = availableChannels(env, gateway);
  const email = channels.includes('email');
  const phone = channels.includes('sms') || channels.includes('whatsapp');
  return {
    channels,
    requireRegister: flag(env, 'OTP_REQUIRE_REGISTER') && email,
    requireLogin: flag(env, 'OTP_REQUIRE_LOGIN') && email,
    requireCheckout: flag(env, 'OTP_REQUIRE_CHECKOUT') && phone,
    passwordReset: flag(env, 'OTP_PASSWORD_RESET') && email,
  };
}

function destinationFor(channel, destination) {
  return channel === 'email' ? normalizeEmail(destination) : normalizeIndianMobile(destination).e164;
}

function assertPurpose(purpose, channel) {
  const channels = PURPOSES[purpose];
  if (!channels || !channels.includes(channel)) throw validationError('Verification is not available.', 400);
}

function hashDestination(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function gatewayId(env, purpose, address) {
  return crypto.createHmac('sha256', env.OTP_GATEWAY_SECRET).update(`${env.OTP_GATEWAY_NAMESPACE}\0${purpose}\0${address}`).digest('hex');
}

async function countRecent(k, destinationHash, now) {
  const row = await k('otp_challenges').where({destination_hash: destinationHash}).where('sent_at', '>', now - OTP_DESTINATION_WINDOW_MS).count({total: '*'}).first();
  return Number(row?.total || 0);
}

function flowMap(session) {
  if (!session.otpFlows) session.otpFlows = {};
  return session.otpFlows;
}

export async function sendOtp(k, session, {purpose, channel, destination, customerId = null}, env = process.env, gateway = createOtpGateway(env), now = Date.now()) {
  const provider = providerFor(env, channel);
  if (!provider || !gateway.configured()) throw validationError('Verification is not available.', 503);
  assertPurpose(purpose, channel);
  const address = destinationFor(channel, destination);
  const destinationHash = hashDestination(address);
  if (await countRecent(k, destinationHash, now()) >= OTP_DESTINATION_MAX) throw validationError('Too many verification requests. Try again later.', 429);
  const latest = await k('otp_challenges').where({destination_hash: destinationHash, purpose}).orderBy('sent_at', 'desc').first();
  if (latest && !latest.consumed_at && now() - Number(latest.sent_at) < OTP_COOLDOWN_MS) throw validationError('Please wait a minute before requesting another code.', 429);
  const result = await gateway.send({id: gatewayId(env, purpose, address), provider, to: address, ttl: 300, maxAttempts: 6, maxGenerate: 8});
  if (!result.ok) throw gatewayFailure(classifyGatewayResult(result));
  const stamp = now();
  await k('otp_challenges').where({destination_hash: destinationHash, purpose}).whereNull('consumed_at').update({consumed_at: stamp});
  const id = crypto.randomBytes(16).toString('hex');
  await k('otp_challenges').insert({
    id,
    purpose,
    channel,
    destination_hash: destinationHash,
    customer_id: customerId,
    sent_at: stamp,
    verified_at: null,
    consumed_at: null,
    expires_at: stamp + OTP_TTL_MS,
  });
  flowMap(session)[purpose] = {id, destination: address, channel};
  return {message: SENT_MESSAGE};
}

export async function resendOtp(k, session, purpose, env = process.env, gateway = createOtpGateway(env), now = Date.now()) {
  const flow = session.otpFlows?.[purpose];
  if (!flow?.channel || flow.decoy) {
    if (flow?.decoy) return sendPasswordResetOtp(k, session, flow.destination, env, gateway, now);
    throw validationError('That code has expired. Request a new one.', 400);
  }
  return sendOtp(k, session, {purpose, channel: flow.channel, destination: flow.destination}, env, gateway, now);
}

export async function sendPasswordResetOtp(k, session, email, env = process.env, gateway = createOtpGateway(env), now = Date.now()) {
  const address = normalizeEmail(email);
  const destinationHash = hashDestination(address);
  const stamp = now();
  if (await countRecent(k, destinationHash, stamp) >= OTP_DESTINATION_MAX) throw validationError('Too many verification requests. Try again later.', 429);
  const latest = await k('otp_challenges').where({destination_hash: destinationHash, purpose: 'password_reset'}).orderBy('sent_at', 'desc').first();
  if (latest && stamp - Number(latest.sent_at) < OTP_COOLDOWN_MS) throw validationError('Please wait a minute before requesting another code.', 429);
  const customer = await k('customers').where({email: address}).whereNull('deleted_at').first();
  if (!customer) {
    await k('otp_challenges').insert({id: crypto.randomBytes(16).toString('hex'), purpose: 'password_reset', channel: 'email', destination_hash: destinationHash, customer_id: null, sent_at: stamp, verified_at: null, consumed_at: stamp, expires_at: stamp + OTP_TTL_MS});
    flowMap(session).password_reset = {id: `decoy-${crypto.randomBytes(8).toString('hex')}`, destination: address, decoy: true, channel: 'email'};
    return {message: SENT_MESSAGE};
  }
  return sendOtp(k, session, {purpose: 'password_reset', channel: 'email', destination: address, customerId: customer.id}, env, gateway, now);
}

export async function verifyOtp(k, session, {purpose, otp}, env = process.env, gateway = createOtpGateway(env), now = Date.now()) {
  if (!PURPOSES[purpose]) throw validationError('That code is incorrect.', 400);
  const flow = session.otpFlows?.[purpose];
  if (!flow) throw validationError('That code is incorrect.', 400);
  if (flow.decoy) throw validationError('That code is incorrect.', 400);
  const row = await k('otp_challenges').where({id: flow.id, purpose}).first();
  if (!row || row.destination_hash !== hashDestination(flow.destination)) throw validationError('That code is incorrect.', 400);
  if (Number(row.expires_at) <= now()) throw validationError('That code has expired. Request a new one.', 400);
  if (row.consumed_at || row.verified_at) throw validationError('That code has already been used.', 400);
  if (!/^\d{6}$/.test(String(otp || ''))) throw validationError('That code is incorrect.', 400);
  const result = await gateway.verify({id: gatewayId(env, purpose, flow.destination), otp: String(otp)});
  if (!result.ok) throw gatewayFailure(classifyGatewayResult(result));
  const updated = await k('otp_challenges').where({id: row.id}).whereNull('verified_at').update({verified_at: now()});
  if (!updated) throw validationError('That code has already been used.', 400);
  return {verified: true};
}

export async function confirmOtp(k, session, input, env = process.env, gateway = createOtpGateway(env), now = Date.now()) {
  const flow = session.otpFlows?.[input.purpose];
  const row = flow ? await k('otp_challenges').where({id: flow.id, purpose: input.purpose}).first() : null;
  if (row?.verified_at && !row.consumed_at && Number(row.expires_at) > now()) return {verified: true};
  return verifyOtp(k, session, input, env, gateway, now);
}

export function otpStatus(k, session, purpose, now = Date.now()) {
  const flow = session.otpFlows?.[purpose];
  if (!flow || flow.decoy) return Promise.resolve({state: flow?.decoy ? 'pending' : 'none'});
  return k('otp_challenges').where({id: flow.id, purpose}).first().then(row => {
    if (!row) return {state: 'none'};
    if (row.consumed_at) return {state: 'used'};
    if (row.verified_at) return {state: 'verified'};
    if (Number(row.expires_at) <= now()) return {state: 'expired'};
    const retryAfter = Math.max(0, OTP_COOLDOWN_MS - (now() - Number(row.sent_at)));
    return {state: 'pending', retryAfterMs: retryAfter};
  });
}

function addressChannel(purpose) {
  return PURPOSES[purpose]?.includes('email') ? 'email' : 'sms';
}

export async function spendVerified(k, session, purpose, destination, now = Date.now()) {
  const flow = session.otpFlows?.[purpose];
  const address = destinationFor(addressChannel(purpose), destination);
  if (!flow || flow.decoy || flow.destination !== address) throw validationError('Verify the code sent to you before continuing.', 400);
  const row = await k('otp_challenges').where({id: flow.id, purpose}).first();
  if (!row?.verified_at) throw validationError('Verify the code sent to you before continuing.', 400);
  if (Number(row.expires_at) <= now()) throw validationError('That code has expired. Request a new one.', 400);
  if (row.consumed_at) throw validationError('That code has already been used.', 400);
  const updated = await k('otp_challenges').where({id: row.id}).whereNull('consumed_at').update({consumed_at: now()});
  if (!updated) throw validationError('That code has already been used.', 400);
  return row.id;
}

export async function releaseVerified(k, id) {
  if (!id) return;
  await k('otp_challenges').where({id}).update({consumed_at: null});
}

export async function prepareCheckoutOtp(k, session, body, env = process.env, gateway = createOtpGateway(env), now = Date.now()) {
  const availability = otpAvailability(env, gateway);
  if (!availability.requireCheckout) return null;
  const key = String(body?.idempotencyKey || '');
  if (/^[a-zA-Z0-9-]{16,80}$/.test(key)) {
    const existing = await k('orders').where({idempotency_key: key}).first();
    if (existing) return null;
  }
  const phone = normalizeIndianMobile(body?.customer?.phone).e164;
  const flow = session.otpFlows?.checkout;
  if (!flow || flow.destination !== phone) throw validationError('Verify the mobile number before placing the order.', 400);
  const row = await k('otp_challenges').where({id: flow.id, purpose: 'checkout'}).first();
  if (!row?.verified_at) await confirmOtp(k, session, {purpose: 'checkout', otp: body?.otp}, env, gateway, now);
  return spendVerified(k, session, 'checkout', phone, now);
}
