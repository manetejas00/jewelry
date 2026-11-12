import {validationError} from './errors.js';

const SECRET_FIELDS = new Set(['otp', 'url', 'OTP', 'OTPURL']);

function stripSecrets(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripSecrets);
  const copy = {};
  for (const [key, item] of Object.entries(value)) {
    if (SECRET_FIELDS.has(key)) continue;
    copy[key] = item && typeof item === 'object' ? stripSecrets(item) : item;
  }
  return copy;
}

function safeMessage(value) {
  return String(value || '').replace(/\d{4,}/g, '######').slice(0, 180);
}

/**
 * HTTP client for knadh/otpgateway. OTP generation and verification stay in the gateway.
 * This module never returns the code, the gateway URL, or the upstream response body.
 */
export function createOtpGateway(env = process.env, fetchImpl = globalThis.fetch) {
  const base = String(env.OTP_GATEWAY_URL || '').replace(/\/$/, '');
  const namespace = String(env.OTP_GATEWAY_NAMESPACE || '');
  const secret = String(env.OTP_GATEWAY_SECRET || '');
  const configured = () => Boolean(base && namespace && secret && /^https?:\/\//.test(base));

  async function request(method, path, fields) {
    if (!configured()) throw validationError('Verification is not available.', 503);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetchImpl(new URL(path, base + '/'), {
        method,
        signal: controller.signal,
        headers: {
          Authorization: `Basic ${Buffer.from(`${namespace}:${secret}`, 'utf8').toString('base64')}`,
          Accept: 'application/json',
          ...(fields ? {'Content-Type': 'application/x-www-form-urlencoded'} : {}),
        },
        body: fields ? new URLSearchParams(fields).toString() : undefined,
      });
      const text = await response.text();
      let parsed = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = null; }
      const safe = stripSecrets(parsed);
      return {
        status: response.status,
        ok: response.ok && safe?.status === 'success',
        message: safeMessage(safe?.message),
      };
    } catch (error) {
      if (error.expose) throw error;
      throw validationError('Verification is temporarily unavailable.', 503);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    configured,
    send({id, provider, to, ttl = 300, maxAttempts = 6, maxGenerate = 8}) {
      return request('PUT', `/api/otp/${encodeURIComponent(id)}`, {
        provider,
        to,
        ttl: String(ttl),
        max_attempts: String(maxAttempts),
        max_generate: String(maxGenerate),
      });
    },
    verify({id, otp}) {
      return request('POST', `/api/otp/${encodeURIComponent(id)}`, {otp: String(otp)});
    },
  };
}

export function classifyGatewayResult(result) {
  const message = String(result?.message || '').toLowerCase();
  if (result?.status === 429 || message.includes('too many') || message.includes('attempts exceeded')) return 'locked';
  if (message.includes('incorrect')) return 'incorrect';
  if (result?.status === 410 || message.includes('not exist') || message.includes('expired')) return 'expired';
  if (message.includes('sending') || (result?.status || 500) >= 500) return 'delivery';
  if (message.includes('unknown provider') || message.includes('invalid')) return 'rejected';
  return 'unavailable';
}

export function gatewayFailure(kind) {
  if (kind === 'locked') return validationError('Too many attempts. Request a new code later.', 429);
  if (kind === 'incorrect') return validationError('That code is incorrect.', 400);
  if (kind === 'expired') return validationError('That code has expired. Request a new one.', 400);
  if (kind === 'delivery') return validationError('We could not send the code. Try again later.', 503);
  if (kind === 'rejected') return validationError('Verification is not available for that destination.', 400);
  return validationError('Verification is temporarily unavailable.', 503);
}
