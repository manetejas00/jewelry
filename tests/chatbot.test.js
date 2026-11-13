import {test, before, after} from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import rateLimit from 'express-rate-limit';
import {createDb, db, migrate} from '../server/db.js';
import {errorResponse} from '../server/errors.js';
import {usageDate} from '../server/chat/clock.js';
import {registerChatRoutes} from '../server/chat/routes.js';
import {getChatUsage, removeChatHistory, sendChatMessage} from '../server/chat/service.js';
import {chatDashboard, exportChatUsers, listAudit, updateChatSettings, updateUserChatSettings} from '../server/chat/admin.js';
import {GUEST_MESSAGE, limitReachedMessage} from '../server/chat/constants.js';
import fs from 'node:fs';

const env = {
  AI_ENABLED: 'true',
  AI_API_KEY: 'test-key-not-real',
  AI_API_URL: 'https://api.openai.com/v1',
  AI_MODEL: 'gpt-4o-mini',
  AI_MAX_DAILY_MESSAGES: '10',
  AI_DAILY_RESET_TIMEZONE: 'Asia/Kolkata',
  AI_MAX_INPUT_LENGTH: '50',
  AI_MAX_RESPONSE_TOKENS: '100',
  BRAND_NAME: 'Veyora Jewels'
};
const day = new Date('2026-11-13T08:00:00.000Z');
const nextDay = new Date('2026-11-13T19:00:00.000Z');
let k;
let sequence = 0;

function completion(text = 'A short reply.', status = 200, usage = {prompt_tokens: 11, completion_tokens: 7}) {
  return async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({choices: [{message: {content: text}}], usage})
  });
}

function send(userId, message, extra = {}) {
  sequence += 1;
  return sendChatMessage(k, {
    userId,
    message,
    conversationId: extra.conversationId,
    idempotencyKey: extra.key || `msg-${userId}-${sequence}`,
    env,
    fetchImpl: extra.fetchImpl || completion(),
    now: extra.now || day
  });
}

function route(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function appFor({limiter, fetchImpl, clock} = {}) {
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => {
    const user = req.headers['x-user'];
    const role = req.headers['x-staff'];
    req.session = {
      customer: user ? {id: Number(user)} : null,
      customerCsrf: 'csrf-token',
      staff: role ? {id: 1, role: String(role)} : null
    };
    next();
  });
  registerChatRoutes(app, {
    db: k,
    route,
    auth: roles => (req, res, next) => {
      const role = req.session.staff?.role;
      if (!role || (roles && !roles.includes(role))) return res.status(403).json({error: 'Staff access required'});
      next();
    },
    env,
    fetchImpl: fetchImpl || completion('Hello from the assistant.'),
    now: clock || (() => day),
    rateLimit: limiter || (() => (req, res, next) => next())
  });
  app.use((err, req, res, next) => {
    const out = errorResponse(err);
    res.status(out.status).json(out.body);
  });
  return app;
}

async function listen(app) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  return server;
}

async function call(server, path, {method = 'GET', body, headers = {}} = {}) {
  const {port} = server.address();
  const response = await fetch(`http://127.0.0.1:${port}${path}`, {
    method,
    headers: {'content-type': 'application/json', 'x-customer-csrf': 'csrf-token', ...headers},
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  return {status: response.status, data};
}

before(async () => {
  k = createDb(':memory:');
  await migrate(k);
  const created = day.toISOString();
  await k('customers').insert([
    {name: 'Alice Preview', email: 'alice@example.invalid', password_hash: 'hash', created_at: created},
    {name: 'Bob Preview', email: 'bob@example.invalid', password_hash: 'hash', created_at: created}
  ]);
  await k('staff').insert({email: 'owner@example.invalid', password_hash: 'hash', role: 'owner'});
});

after(async () => {
  await k.destroy();
  await db.destroy();
});

test('usage dates follow Asia/Kolkata midnight', () => {
  assert.equal(usageDate(new Date('2026-11-13T18:29:00.000Z'), 'Asia/Kolkata'), '2026-11-13');
  assert.equal(usageDate(nextDay, 'Asia/Kolkata'), '2026-11-14');
});

test('guest requests are rejected and availability does not expose secrets', async () => {
  const server = await listen(appFor());
  try {
    const availability = await call(server, '/api/chat/availability');
    const usage = await call(server, '/api/chat/usage');
    const message = await call(server, '/api/chat/message', {method: 'POST', body: {message: 'Hello', idempotencyKey: 'guest-message-1'}});
    assert.equal(availability.status, 200);
    assert.equal(availability.data.loginRequired, true);
    assert.equal(availability.data.systemPrompt, undefined);
    assert.equal(JSON.stringify(availability.data).includes(env.AI_API_KEY), false);
    assert.equal(usage.status, 401);
    assert.equal(message.status, 401);
    assert.equal(fs.readFileSync('src/ChatWidget.jsx', 'utf8').includes(GUEST_MESSAGE), true);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('a signed-in customer can send and cannot use another customer id or conversation', async () => {
  const server = await listen(appFor());
  try {
    const first = await call(server, '/api/chat/message', {method: 'POST', headers: {'x-user': '1'}, body: {message: 'Where are the rings?', idempotencyKey: 'owned-message-1', userId: 2, limit: 100}});
    assert.equal(first.status, 200);
    assert.equal(first.data.usage.used, 1);
    const second = await call(server, '/api/chat/message', {method: 'POST', headers: {'x-user': '2'}, body: {message: 'Show me that conversation', idempotencyKey: 'owned-message-2', conversationId: first.data.conversationId}});
    assert.equal(second.status, 404);
    const alice = await getChatUsage(k, 1, env, day);
    const bob = await getChatUsage(k, 2, env, day);
    assert.equal(alice.used, 1);
    assert.equal(bob.used, 0);
    assert.equal(JSON.stringify(first.data).includes(env.AI_API_KEY), false);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('daily quota stops at 10, survives refresh and history clearing, and resets the next Kolkata day', async () => {
  await k('chat_daily_usage').where({user_id: 1}).del();
  const replies = [];
  const fetchImpl = async () => {
    replies.push(1);
    return {ok: true, status: 200, json: async () => ({choices: [{message: {content: 'Noted.'}}], usage: {prompt_tokens: 3, completion_tokens: 2}})};
  };
  for (let count = 0; count < 10; count += 1) await send(1, `Question ${count}`, {fetchImpl, key: `quota-${String(count).padStart(2, '0')}`});
  await assert.rejects(() => send(1, 'One more', {fetchImpl, key: 'quota-over-limit'}), error => error.status === 429 && error.message === limitReachedMessage(10));
  assert.equal(replies.length, 10);
  const refreshed = await getChatUsage(k, 1, env, day);
  assert.equal(refreshed.used, 10);
  assert.equal(refreshed.remaining, 0);
  assert.equal((await getChatUsage(k, 1, env, day)).used, refreshed.used);
  await removeChatHistory(k, 1);
  assert.equal((await k('chat_conversations').where({user_id: 1})).length, 0);
  assert.equal((await getChatUsage(k, 1, env, day)).used, 10);
  const reset = await getChatUsage(k, 1, env, nextDay);
  assert.equal(reset.used, 0);
  assert.equal(reset.usageDate, '2026-11-14');
});

test('the same account quota is shared by later sessions and a custom limit is enforced', async () => {
  await send(2, 'First device', {key: 'device-a'});
  const again = await getChatUsage(k, 2, env, day);
  assert.equal(again.used, 1);
  await updateUserChatSettings(k, {userId: 2, adminId: 1, body: {dailyMessageLimit: 2}, now: day});
  await send(2, 'Second device', {key: 'device-b'});
  await assert.rejects(() => send(2, 'Third device', {key: 'device-c'}), error => error.status === 429 && /daily limit of 2/.test(error.message));
  await updateUserChatSettings(k, {userId: 2, adminId: 1, body: {chatbotAccessEnabled: false}, now: day});
  await assert.rejects(() => send(2, 'Blocked', {key: 'device-d', now: nextDay}), error => error.status === 403);
  await updateUserChatSettings(k, {userId: 2, adminId: 1, body: {chatbotAccessEnabled: true, dailyMessageLimit: null}, now: day});
});

test('concurrent sends cannot pass the daily quota', async () => {
  await k('chat_daily_usage').where({user_id: 1}).del();
  const results = await Promise.allSettled(Array.from({length: 12}, (_, index) => send(1, `Parallel ${index}`, {key: `parallel-${index}`})));
  const fulfilled = results.filter(result => result.status === 'fulfilled');
  const rejected = results.filter(result => result.status === 'rejected');
  assert.equal(fulfilled.length, 10);
  assert.equal(rejected.length, 2);
  assert.equal((await getChatUsage(k, 1, env, day)).used, 10);
});

test('provider failures refund the reserved message', async () => {
  await k('chat_daily_usage').where({user_id: 1}).del();
  const before = (await getChatUsage(k, 1, env, day)).used;
  await assert.rejects(() => send(1, 'Bad key', {key: 'bad-key-401', fetchImpl: completion('', 401)}), error => error.code === 'invalid_api_key');
  await assert.rejects(() => send(1, 'Slow', {key: 'slow-timeout', fetchImpl: () => { const error = new Error('timeout'); error.name = 'TimeoutError'; throw error; }}), error => error.code === 'timeout');
  await assert.rejects(() => send(1, 'Busy', {key: 'busy-rate', fetchImpl: completion('', 429)}), error => error.code === 'provider_rate_limit');
  await assert.rejects(() => send(1, 'Empty', {key: 'empty-body', fetchImpl: async () => ({ok: true, status: 200, json: async () => ({choices: []})})}), error => error.code === 'invalid_response');
  assert.equal((await getChatUsage(k, 1, env, day)).used, before);
});

test('duplicate submissions do not charge twice and validation rejects empty or oversized text', async () => {
  await k('chat_daily_usage').where({user_id: 1}).del();
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return {ok: true, status: 200, json: async () => ({choices: [{message: {content: 'Once.'}}], usage: {prompt_tokens: 4, completion_tokens: 6}})};
  };
  const first = await send(1, 'Remember this', {key: 'duplicate-key', fetchImpl});
  const second = await send(1, 'Remember this', {key: 'duplicate-key', fetchImpl});
  assert.equal(calls, 1);
  assert.equal(second.replay, true);
  assert.equal(second.message, 'Once.');
  assert.equal((await getChatUsage(k, 1, env, day)).used, 1);
  const log = await k('chatbot_usage_logs').where({idempotency_key: 'duplicate-key'}).first();
  assert.equal(Number(log.input_tokens), 4);
  assert.equal(Number(log.output_tokens), 6);
  await assert.rejects(() => send(1, '   ', {key: 'blank'}), /Enter a message/);
  await assert.rejects(() => send(1, 'x'.repeat(51), {key: 'long'}), /50 characters/);
  assert.equal(first.usage.used, 1);
});

test('admin analytics, user controls, export, and audit logs are staff-only', async () => {
  const server = await listen(appFor());
  try {
    const guest = await call(server, '/api/admin/chatbot/dashboard', {headers: {'x-user': '1'}});
    const viewer = await call(server, '/api/admin/chatbot/settings', {method: 'PUT', headers: {'x-staff': 'viewer'}, body: {maxDaily: 10}});
    const dashboard = await call(server, '/api/admin/chatbot/dashboard', {headers: {'x-staff': 'owner'}});
    const users = await call(server, '/api/admin/chatbot/users', {headers: {'x-staff': 'owner'}});
    const detail = await call(server, '/api/admin/chatbot/users/1', {headers: {'x-staff': 'owner'}});
    const history = await call(server, '/api/admin/chatbot/users/1/conversations', {headers: {'x-staff': 'owner'}});
    const analytics = await call(server, '/api/admin/chatbot/analytics', {headers: {'x-staff': 'owner'}});
    const exported = await call(server, '/api/admin/chatbot/export', {headers: {'x-staff': 'owner'}});
    assert.equal(guest.status, 403);
    assert.equal(viewer.status, 403);
    assert.equal(dashboard.status, 200);
    assert.equal(dashboard.data.apiKeyConfigured, true);
    assert.equal(JSON.stringify(dashboard.data).includes(env.AI_API_KEY), false);
    assert.ok(users.data.users.some(user => user.email === 'alice@example.invalid'));
    assert.equal(detail.data.user.id, 1);
    assert.ok(Array.isArray(history.data.conversations));
    assert.ok(Array.isArray(analytics.data.daily));
    assert.match(exported.data, /alice@example.invalid/);
    await updateChatSettings(k, {adminId: 1, body: {maxDaily: 10, model: 'gpt-4o-mini'}, env, now: day});
    const audit = await listAudit(k);
    assert.ok(audit.some(row => row.action === 'user_chat_settings'));
    assert.ok(audit.some(row => row.action === 'chatbot_settings'));
    const summary = await chatDashboard(k, env, day);
    assert.equal(typeof summary.messagesToday, 'number');
    const csv = await exportChatUsers(k, {}, env, day);
    assert.match(csv, /Daily Usage/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('message posts are rate limited', async () => {
  await k('chat_daily_usage').where({user_id: 1}).del();
  const server = await listen(appFor({limiter: options => rateLimit({...options, limit: 2})}));
  try {
    const headers = {'x-user': '1'};
    const first = await call(server, '/api/chat/message', {method: 'POST', headers, body: {message: 'One', idempotencyKey: 'rate-one-1111'}});
    const second = await call(server, '/api/chat/message', {method: 'POST', headers, body: {message: 'Two', idempotencyKey: 'rate-two-2222'}});
    const third = await call(server, '/api/chat/message', {method: 'POST', headers, body: {message: 'Three', idempotencyKey: 'rate-three-333'}});
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.equal(third.status, 429);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
