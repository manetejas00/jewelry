import {validationError} from '../errors.js';
import {estimateCost} from './constants.js';

const log = fields => console.info(JSON.stringify({event: 'chat_completion', ...fields}));

export async function completeChat({env, config, messages, fetchImpl = globalThis.fetch, timeoutMs = 25000}) {
  if (!env.AI_API_KEY) throw validationError('The assistant is temporarily unavailable.', 503);
  const started = Date.now();
  const model = config.model;
  let response;
  try {
    response = await fetchImpl(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(timeoutMs),
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${env.AI_API_KEY}`},
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: config.maxTokens,
        messages
      })
    });
  } catch (error) {
    log({model, outcome: 'timeout', ms: Date.now() - started});
    if (error?.name === 'TimeoutError' || error?.name === 'AbortError') {
      throw Object.assign(validationError('The assistant took too long to respond. Please try again.', 504), {code: 'timeout', refund: true});
    }
    throw Object.assign(validationError('The assistant could not be reached. Please try again.', 502), {code: 'provider_unreachable', refund: true});
  }
  if (response.status === 429) {
    log({model, outcome: 'rate_limited', ms: Date.now() - started, status: 429});
    throw Object.assign(validationError('The assistant is busy. Please wait a moment and try again.', 429), {code: 'provider_rate_limit', refund: true});
  }
  if (response.status === 401 || response.status === 403) {
    log({model, outcome: 'rejected', ms: Date.now() - started, status: response.status});
    throw Object.assign(validationError('The assistant is temporarily unavailable.', 503), {code: 'invalid_api_key', refund: true});
  }
  if (!response.ok) {
    log({model, outcome: 'provider_error', ms: Date.now() - started, status: response.status});
    throw Object.assign(validationError('The assistant could not complete that reply. Please try again.', 502), {code: 'provider_error', refund: true});
  }
  let body;
  try {
    body = await response.json();
  } catch {
    log({model, outcome: 'invalid_response', ms: Date.now() - started});
    throw Object.assign(validationError('The assistant returned an unreadable response. Please try again.', 502), {code: 'invalid_response', refund: true});
  }
  const content = body?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    log({model, outcome: 'invalid_response', ms: Date.now() - started});
    throw Object.assign(validationError('The assistant returned an empty response. Please try again.', 502), {code: 'invalid_response', refund: true});
  }
  const inputTokens = Number(body?.usage?.prompt_tokens) || 0;
  const outputTokens = Number(body?.usage?.completion_tokens) || 0;
  log({model, outcome: 'ok', ms: Date.now() - started, inputTokens, outputTokens});
  return {
    text: redactSecrets(content.trim(), env).slice(0, 8000),
    inputTokens,
    outputTokens,
    estimatedCost: estimateCost(model, inputTokens, outputTokens),
    model
  };
}

export function redactSecrets(text, env) {
  const secret = env.AI_API_KEY;
  if (secret && secret.length > 8 && text.includes(secret)) return 'I can’t share internal configuration.';
  return text;
}
