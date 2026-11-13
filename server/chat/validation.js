import {validationError} from '../errors.js';

export function cleanMessage(value, maxLength) {
  if (typeof value !== 'string') throw validationError('Enter a message.');
  const message = value.replace(/\u0000/g, '').replace(/\r\n/g, '\n').trim();
  if (!message) throw validationError('Enter a message.');
  if (message.length > maxLength) throw validationError(`Messages are limited to ${maxLength} characters.`);
  return message;
}

export function cleanIdempotencyKey(value) {
  const key = typeof value === 'string' ? value.trim() : '';
  if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) throw validationError('A valid message request id is required.');
  return key;
}

export function cleanConversationId(value) {
  if (value == null || value === '') return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw validationError('Conversation not found.');
  return id;
}

export function clampInt(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isInteger(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function cleanModel(value) {
  const model = String(value || '').trim();
  if (!/^[A-Za-z0-9._:-]{2,80}$/.test(model)) throw validationError('Enter a valid model name.');
  return model;
}

export function escapeLike(value) {
  return String(value || '').replace(/[\\%_]/g, match => `\\${match}`).slice(0, 80);
}
