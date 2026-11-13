export const GUEST_MESSAGE = 'Please log in or create an account to access our AI assistant.';
export const DEFAULT_DAILY_LIMIT = 10;
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_MODEL = 'gpt-4o-mini';
export const DEFAULT_API_URL = 'https://api.openai.com/v1';
export const MAX_HISTORY_MESSAGES = 16;
export const STALE_RESERVATION_MS = 120000;

export function limitReachedMessage(limit) {
  return `You've reached your daily limit of ${limit} AI messages. Your free messages will reset at midnight. Please come back tomorrow.`;
}

// Published list prices in USD per 1,000,000 tokens. Unknown models stay unpriced.
export const MODEL_PRICE_PER_MILLION = {
  'gpt-4o-mini': {input: 0.15, output: 0.6},
  'gpt-4o': {input: 2.5, output: 10},
  'gpt-4.1-mini': {input: 0.4, output: 1.6},
  'gpt-4.1': {input: 2, output: 8}
};

export function estimateCost(model, inputTokens, outputTokens) {
  const price = MODEL_PRICE_PER_MILLION[model];
  if (!price) return null;
  const input = Number(inputTokens) || 0;
  const output = Number(outputTokens) || 0;
  return Number(((input * price.input + output * price.output) / 1000000).toFixed(6));
}
