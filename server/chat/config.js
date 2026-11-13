import {validationError} from '../errors.js';
import {DEFAULT_API_URL, DEFAULT_DAILY_LIMIT, DEFAULT_MODEL, DEFAULT_TIMEZONE} from './constants.js';
import {assertTimeZone} from './clock.js';
import {clampInt, cleanModel} from './validation.js';
import {defaultSystemPrompt} from './system-prompt.js';

export const SETTING_KEYS = [
  'CHATBOT_ENABLED',
  'CHATBOT_MODEL',
  'CHATBOT_DAILY_LIMIT',
  'CHATBOT_TIMEZONE',
  'CHATBOT_MAX_INPUT',
  'CHATBOT_MAX_TOKENS',
  'CHATBOT_SYSTEM_PROMPT',
  'CHATBOT_RETENTION_DAYS',
  'CHATBOT_PROVIDER'
];

function hostOf(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return '';
    return parsed.host;
  } catch {
    return '';
  }
}

export function envChatConfig(env = process.env) {
  const apiUrl = String(env.AI_API_URL || env.AI_BASE_URL || DEFAULT_API_URL).replace(/\/$/, '');
  const timeZone = env.AI_DAILY_RESET_TIMEZONE || DEFAULT_TIMEZONE;
  assertTimeZone(timeZone);
  return {
    envEnabled: env.AI_ENABLED !== 'false',
    apiKeyConfigured: Boolean(env.AI_API_KEY),
    apiUrl,
    apiHost: hostOf(apiUrl),
    model: env.AI_MODEL || DEFAULT_MODEL,
    maxDaily: clampInt(env.AI_MAX_DAILY_MESSAGES, DEFAULT_DAILY_LIMIT, 1, 100),
    timeZone,
    maxInput: clampInt(env.AI_MAX_INPUT_LENGTH, 2000, 50, 8000),
    maxTokens: clampInt(env.AI_MAX_RESPONSE_TOKENS, 1000, 50, 4000),
    provider: 'openai',
    retentionDays: 365
  };
}

export async function loadChatConfig(db, env = process.env) {
  const base = envChatConfig(env);
  const rows = await db('settings').whereIn('key', SETTING_KEYS);
  const saved = Object.fromEntries(rows.map(row => [row.key, row.value]));
  const timeZone = saved.CHATBOT_TIMEZONE || base.timeZone;
  try {
    assertTimeZone(timeZone);
  } catch {
    throw validationError('The chatbot timezone is invalid.', 500);
  }
  const model = saved.CHATBOT_MODEL || base.model;
  const adminEnabled = saved.CHATBOT_ENABLED !== 'false';
  return {
    ...base,
    model,
    maxDaily: saved.CHATBOT_DAILY_LIMIT ? clampInt(saved.CHATBOT_DAILY_LIMIT, base.maxDaily, 1, 100) : base.maxDaily,
    timeZone,
    maxInput: saved.CHATBOT_MAX_INPUT ? clampInt(saved.CHATBOT_MAX_INPUT, base.maxInput, 50, 8000) : base.maxInput,
    maxTokens: saved.CHATBOT_MAX_TOKENS ? clampInt(saved.CHATBOT_MAX_TOKENS, base.maxTokens, 50, 4000) : base.maxTokens,
    retentionDays: saved.CHATBOT_RETENTION_DAYS ? clampInt(saved.CHATBOT_RETENTION_DAYS, base.retentionDays, 7, 3650) : base.retentionDays,
    systemPrompt: String(saved.CHATBOT_SYSTEM_PROMPT || '').trim() || defaultSystemPrompt,
    provider: saved.CHATBOT_PROVIDER || base.provider,
    adminEnabled,
    enabled: base.envEnabled && adminEnabled,
    ready: base.envEnabled && adminEnabled && base.apiKeyConfigured && Boolean(base.apiHost)
  };
}

export function publicChatConfig(config) {
  return {
    enabled: config.enabled,
    ready: config.ready,
    loginRequired: true,
    provider: config.provider,
    model: config.model,
    apiHost: config.apiHost || null,
    apiKeyConfigured: config.apiKeyConfigured,
    maxDaily: config.maxDaily,
    timeZone: config.timeZone,
    maxInput: config.maxInput,
    maxTokens: config.maxTokens,
    retentionDays: config.retentionDays,
    systemPrompt: config.systemPrompt
  };
}

export function storefrontChatConfig(config) {
  return {enabled: config.enabled && config.ready, loginRequired: true};
}
