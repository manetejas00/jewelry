import {validationError} from '../errors.js';
import {usageDate, nextReset, assertTimeZone} from './clock.js';
import {loadChatConfig, publicChatConfig} from './config.js';
import {defaultSystemPrompt} from './system-prompt.js';
import {cleanModel, clampInt, escapeLike} from './validation.js';

function strictInt(value, min, max, message) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) throw validationError(message);
  return number;
}
import {listConversations} from './repository.js';

let dashboardCache = {at: 0, key: '', value: null};
export function clearChatAdminCache() {
  dashboardCache = {at: 0, key: '', value: null};
}

function enabledFlag(value) {
  return !(value === false || value === 0 || value === '0');
}

function addDays(iso, days) {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function weekStart(iso) {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}

function rangeOrDefault(query, timeZone, now) {
  const today = usageDate(now, timeZone);
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to || '') ? query.to : today;
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from || '') ? query.from : addDays(to, -29);
  if (from > to) throw validationError('Choose a start date on or before the end date.');
  return {from, to};
}

async function limitMap(db, fallback) {
  const rows = await db('chatbot_user_settings').select('user_id', 'daily_message_limit', 'chatbot_access_enabled');
  return new Map(rows.map(row => [row.user_id, row]));
}

function limitFor(settings, userId, fallback) {
  const row = settings.get(userId);
  const custom = row?.daily_message_limit;
  const number = Number(custom);
  if (Number.isInteger(number) && number >= 1 && number <= 100) return number;
  return fallback;
}

export async function chatDashboard(db, env = process.env, now = new Date()) {
  const config = await loadChatConfig(db, env);
  const today = usageDate(now, config.timeZone);
  const month = today.slice(0, 7);
  const key = `${today}:${config.maxDaily}:${config.enabled}:${config.ready}`;
  if (dashboardCache.key === key && Date.now() - dashboardCache.at < 15000) return dashboardCache.value;
  const settings = await limitMap(db, config.maxDaily);
  const [customers, chatbotUsers, todayUsage, monthUsage, logs, todayLogs] = await Promise.all([
    db('customers').count({total: 'id'}).first(),
    db('chatbot_usage_logs').countDistinct({total: 'user_id'}).first(),
    db('chat_daily_usage').where({usage_date: today}),
    db('chat_daily_usage').where('usage_date', 'like', `${month}%`).sum({total: 'message_count'}).first(),
    db('chatbot_usage_logs').select('request_status').count({total: '*'}).groupBy('request_status'),
    db('chatbot_usage_logs').where({usage_date: today}).select('request_status', 'input_tokens', 'output_tokens', 'estimated_cost')
  ]);
  const statusCount = Object.fromEntries(logs.map(row => [row.request_status, Number(row.total)]));
  const reached = todayUsage.filter(row => Number(row.message_count) >= limitFor(settings, row.user_id, config.maxDaily)).length;
  const tokens = todayLogs.reduce((sum, row) => sum + Number(row.input_tokens || 0) + Number(row.output_tokens || 0), 0);
  const costValues = todayLogs.map(row => row.estimated_cost).filter(value => value != null);
  const value = {
    ...publicChatConfig(config),
    totalUsers: Number(customers.total || 0),
    chatbotUsers: Number(chatbotUsers.total || 0),
    activeUsersToday: todayUsage.filter(row => Number(row.message_count) > 0).length,
    messagesToday: todayUsage.reduce((sum, row) => sum + Number(row.message_count), 0),
    messagesThisMonth: Number(monthUsage.total || 0),
    successfulResponses: statusCount.succeeded || 0,
    failedResponses: statusCount.refunded || 0,
    usersAtLimitToday: reached,
    tokensToday: tokens,
    estimatedCostToday: costValues.length ? Number(costValues.reduce((sum, value) => sum + Number(value), 0).toFixed(6)) : null,
    resetAt: nextReset(now, config.timeZone).toISOString(),
    usageDate: today
  };
  dashboardCache = {at: Date.now(), key, value};
  return value;
}

function applyUserFilters(query, {search, status, access, date, maxDaily}) {
  let rows = query.clone();
  if (search) {
    const term = `%${escapeLike(search)}%`;
    rows = rows.whereRaw("(c.name LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\')", [term, term]);
  }
  if (access === 'enabled') rows = rows.whereRaw('(s.chatbot_access_enabled IS NULL OR s.chatbot_access_enabled != 0)');
  if (access === 'disabled') rows = rows.whereRaw('s.chatbot_access_enabled = 0');
  const used = 'coalesce(u.message_count, 0)';
  const limit = `coalesce(s.daily_message_limit, ${Number(maxDaily)})`;
  if (status === 'not_used') rows = rows.whereRaw(`${used} = 0`).whereRaw('(s.chatbot_access_enabled IS NULL OR s.chatbot_access_enabled != 0)');
  if (status === 'limit_reached') rows = rows.whereRaw(`${used} >= ${limit}`).whereRaw('(s.chatbot_access_enabled IS NULL OR s.chatbot_access_enabled != 0)');
  if (status === 'active') rows = rows.whereRaw(`${used} > 0 AND ${used} < ${limit}`).whereRaw('(s.chatbot_access_enabled IS NULL OR s.chatbot_access_enabled != 0)');
  return rows;
}

export async function listChatUsers(db, query, env = process.env, now = new Date()) {
  const config = await loadChatConfig(db, env);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date || '') ? query.date : usageDate(now, config.timeZone);
  const page = clampInt(query.page, 1, 1, 10000);
  const pageSize = clampInt(query.pageSize, 25, 1, 100);
  const filters = {search: query.search || query.q || '', status: query.status || 'all', access: query.access || 'all', date, maxDaily: config.maxDaily};
  const base = () => db('customers as c')
    .leftJoin('chat_daily_usage as u', function joinUsage() {
      this.on('u.user_id', '=', 'c.id').andOn('u.usage_date', '=', db.raw('?', [date]));
    })
    .leftJoin('chatbot_user_settings as s', 's.user_id', 'c.id');
  const filtered = applyUserFilters(base(), filters);
  const countRow = await filtered.clone().count({total: 'c.id'}).first();
  const sort = query.sort === 'name' ? 'c.name' : query.sort === 'lifetime' ? 'lifetime_messages' : 'used_today';
  const direction = query.direction === 'asc' ? 'asc' : 'desc';
  const rows = await filtered.clone().select(
    'c.id',
    'c.name',
    'c.email',
    'c.created_at',
    db.raw('coalesce(u.message_count, 0) as used_today'),
    's.daily_message_limit',
    's.chatbot_access_enabled',
    db.raw('(select coalesce(sum(message_count), 0) from chat_daily_usage where user_id = c.id) as lifetime_messages'),
    db.raw('(select max(updated_at) from chat_conversations where user_id = c.id) as last_chat')
  ).orderByRaw(`${sort} ${direction}`).orderBy('c.id', 'asc').limit(pageSize).offset((page - 1) * pageSize);
  const total = Number(countRow.total || 0);
  return {
    date,
    page,
    pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
    users: rows.map(row => presentUser(row, config.maxDaily))
  };
}

function presentUser(row, fallback) {
  const limit = row.daily_message_limit != null && row.daily_message_limit !== '' ? Number(row.daily_message_limit) : fallback;
  const used = Number(row.used_today || 0);
  const access = enabledFlag(row.chatbot_access_enabled == null ? true : row.chatbot_access_enabled);
  let usageStatus = 'not_used';
  if (!access) usageStatus = 'disabled';
  else if (used >= limit) usageStatus = 'limit_reached';
  else if (used > 0) usageStatus = 'active';
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    registeredAt: row.created_at,
    used,
    limit,
    remaining: Math.max(0, limit - used),
    usageStatus,
    lifetimeMessages: Number(row.lifetime_messages || 0),
    lastChat: row.last_chat || null,
    accessEnabled: access
  };
}

export async function chatUserDetail(db, userId, env = process.env, now = new Date()) {
  const id = Number(userId);
  const customer = await db('customers').where({id}).select('id', 'name', 'email', 'phone', 'email_verified_at', 'phone_verified_at', 'created_at').first();
  if (!customer) throw validationError('Customer not found.', 404);
  const [orders, reviews] = await Promise.all([
    db('orders').where({customer_id: id}).count({total: 'id'}).first(),
    db.schema.hasTable('reviews') ? db('reviews').where({user_id: id}).count({total: 'id'}).first() : {total: 0}
  ]);
  const config = await loadChatConfig(db, env);
  const today = usageDate(now, config.timeZone);
  const settings = await db('chatbot_user_settings').where({user_id: id}).first();
  const limit = settings?.daily_message_limit != null ? Number(settings.daily_message_limit) : config.maxDaily;
  const usageRow = await db('chat_daily_usage').where({user_id: id, usage_date: today}).first();
  const used = Number(usageRow?.message_count || 0);
  const daily = await db('chat_daily_usage').where({user_id: id}).orderBy('usage_date', 'desc').limit(90);
  const logs = await db('chatbot_usage_logs').where({user_id: id}).select('request_status', 'input_tokens', 'output_tokens', 'estimated_cost', 'usage_date', 'created_at', 'error_code', 'conversation_id');
  const conversations = await db('chat_conversations').where({user_id: id}).count({total: 'id'}).first();
  const succeeded = logs.filter(row => row.request_status === 'succeeded');
  const failed = logs.filter(row => row.request_status === 'refunded');
  const cost = succeeded.map(row => row.estimated_cost).filter(value => value != null);
  return {
    user: {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone || null,
      emailVerified: Boolean(customer.email_verified_at),
      phoneVerified: Boolean(customer.phone_verified_at),
      registeredAt: customer.created_at,
      orders: Number(orders?.total || 0),
      reviews: Number(reviews?.total || 0)
    },
    usage: {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      usageDate: today,
      resetAt: nextReset(now, config.timeZone).toISOString(),
      timeZone: config.timeZone,
      accessEnabled: enabledFlag(settings ? settings.chatbot_access_enabled : true)
    },
    lifetime: {
      messages: daily.reduce((sum, row) => sum + Number(row.message_count), 0),
      conversations: Number(conversations.total || 0),
      successfulResponses: succeeded.length,
      failedRequests: failed.length,
      inputTokens: succeeded.reduce((sum, row) => sum + Number(row.input_tokens || 0), 0),
      outputTokens: succeeded.reduce((sum, row) => sum + Number(row.output_tokens || 0), 0),
      estimatedCost: cost.length ? Number(cost.reduce((sum, value) => sum + Number(value), 0).toFixed(6)) : null
    },
    daily: daily.map(row => ({date: row.usage_date, messages: Number(row.message_count)})),
    weekly: bucket(daily, row => weekStart(row.usage_date)),
    monthly: bucket(daily, row => row.usage_date.slice(0, 7))
  };
}

function bucket(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    groups.set(key, (groups.get(key) || 0) + Number(row.message_count));
  }
  return [...groups.entries()].map(([period, messages]) => ({period, messages})).sort((a, b) => a.period < b.period ? 1 : -1);
}

export async function chatUserConversations(db, userId) {
  const customer = await db('customers').where({id: Number(userId)}).first();
  if (!customer) throw validationError('Customer not found.', 404);
  return {conversations: await listConversations(db, Number(userId))};
}

export async function updateUserChatSettings(db, {userId, adminId, body, now = new Date()}) {
  const id = Number(userId);
  const customer = await db('customers').where({id}).select('id').first();
  if (!customer) throw validationError('Customer not found.', 404);
  const current = await db('chatbot_user_settings').where({user_id: id}).first();
  const patch = {};
  if ('dailyMessageLimit' in body) {
    if (body.dailyMessageLimit == null || body.dailyMessageLimit === '') patch.daily_message_limit = null;
    else {
      const limit = Number(body.dailyMessageLimit);
      if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw validationError('Daily limit must be a whole number from 1 to 100.');
      patch.daily_message_limit = limit;
    }
  }
  if ('chatbotAccessEnabled' in body) patch.chatbot_access_enabled = body.chatbotAccessEnabled === true;
  if (!Object.keys(patch).length) throw validationError('Choose a limit or access change.');
  const created = now.toISOString();
  if (current) await db('chatbot_user_settings').where({user_id: id}).update({...patch, updated_at: created});
  else await db('chatbot_user_settings').insert({user_id: id, daily_message_limit: null, chatbot_access_enabled: true, ...patch, created_at: created, updated_at: created});
  await db('chatbot_admin_audit_logs').insert({
    admin_id: adminId,
    target_user_id: id,
    action: 'user_chat_settings',
    old_value: JSON.stringify(current ? {dailyMessageLimit: current.daily_message_limit, chatbotAccessEnabled: enabledFlag(current.chatbot_access_enabled)} : null),
    new_value: JSON.stringify({dailyMessageLimit: patch.daily_message_limit === undefined ? current?.daily_message_limit ?? null : patch.daily_message_limit, chatbotAccessEnabled: patch.chatbot_access_enabled === undefined ? enabledFlag(current?.chatbot_access_enabled ?? true) : patch.chatbot_access_enabled}),
    created_at: created
  });
  clearChatAdminCache();
  return db('chatbot_user_settings').where({user_id: id}).first();
}

export async function updateChatSettings(db, {adminId, body, env = process.env, now = new Date()}) {
  if (body.apiKey || body.AI_API_KEY) throw validationError('The API key is configured only on the server.');
  const current = await loadChatConfig(db, env);
  const changes = {};
  if ('enabled' in body) changes.CHATBOT_ENABLED = body.enabled === false ? 'false' : 'true';
  if (body.model) changes.CHATBOT_MODEL = cleanModel(body.model);
  if (body.provider) {
    if (!/^[a-z0-9_-]{2,40}$/.test(body.provider)) throw validationError('Enter a provider label using lowercase letters, numbers, or dashes.');
    changes.CHATBOT_PROVIDER = body.provider;
  }
  if ('maxDaily' in body) changes.CHATBOT_DAILY_LIMIT = String(strictInt(body.maxDaily, 1, 100, 'The default daily limit must be from 1 to 100.'));
  if (body.timeZone) {
    try { assertTimeZone(body.timeZone); } catch { throw validationError('Enter a valid IANA timezone.'); }
    changes.CHATBOT_TIMEZONE = body.timeZone;
  }
  if ('maxInput' in body) changes.CHATBOT_MAX_INPUT = String(strictInt(body.maxInput, 50, 8000, 'Maximum input length must be from 50 to 8000.'));
  if ('maxTokens' in body) changes.CHATBOT_MAX_TOKENS = String(strictInt(body.maxTokens, 50, 4000, 'Maximum response tokens must be from 50 to 4000.'));
  if ('retentionDays' in body) changes.CHATBOT_RETENTION_DAYS = String(strictInt(body.retentionDays, 7, 3650, 'Retention must be from 7 to 3650 days.'));
  if ('systemPrompt' in body) {
    const prompt = String(body.systemPrompt || '').trim();
    if (prompt.length > 8000) throw validationError('The system prompt must be 8000 characters or fewer.');
    changes.CHATBOT_SYSTEM_PROMPT = prompt || defaultSystemPrompt;
  }
  if (!Object.keys(changes).length) throw validationError('No chatbot settings were changed.');
  const created = now.toISOString();
  await db.transaction(async trx => {
    for (const [key, value] of Object.entries(changes)) await trx('settings').insert({key, value}).onConflict('key').merge();
    await trx('chatbot_admin_audit_logs').insert({
      admin_id: adminId,
      target_user_id: null,
      action: 'chatbot_settings',
      old_value: JSON.stringify({enabled: current.adminEnabled, model: current.model, maxDaily: current.maxDaily, timeZone: current.timeZone, maxInput: current.maxInput, maxTokens: current.maxTokens, retentionDays: current.retentionDays, provider: current.provider}),
      new_value: JSON.stringify(changes),
      created_at: created
    });
  });
  clearChatAdminCache();
  return publicChatConfig(await loadChatConfig(db, env));
}

export async function chatAnalytics(db, query, env = process.env, now = new Date()) {
  const config = await loadChatConfig(db, env);
  const {from, to} = rangeOrDefault(query, config.timeZone, now);
  const settings = await limitMap(db, config.maxDaily);
  const usage = await db('chat_daily_usage').whereBetween('usage_date', [from, to]);
  const logs = await db('chatbot_usage_logs').whereBetween('usage_date', [from, to]).select('usage_date', 'user_id', 'request_status', 'input_tokens', 'output_tokens', 'estimated_cost');
  const days = new Map();
  for (let cursor = from; cursor <= to; cursor = addDays(cursor, 1)) {
    days.set(cursor, {date: cursor, messages: 0, users: 0, limitReached: 0, success: 0, failed: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0, priced: 0});
  }
  for (const row of usage) {
    const bucket = days.get(row.usage_date);
    if (!bucket) continue;
    const count = Number(row.message_count);
    bucket.messages += count;
    if (count > 0) bucket.users += 1;
    if (count >= limitFor(settings, row.user_id, config.maxDaily)) bucket.limitReached += 1;
  }
  for (const row of logs) {
    const bucket = days.get(row.usage_date);
    if (!bucket) continue;
    if (row.request_status === 'succeeded') {
      bucket.success += 1;
      bucket.inputTokens += Number(row.input_tokens || 0);
      bucket.outputTokens += Number(row.output_tokens || 0);
      if (row.estimated_cost != null) {
        bucket.estimatedCost += Number(row.estimated_cost);
        bucket.priced += 1;
      }
    } else if (row.request_status === 'refunded') bucket.failed += 1;
  }
  const daily = [...days.values()].map(row => ({...row, estimatedCost: row.priced ? Number(row.estimatedCost.toFixed(6)) : null}));
  const success = daily.reduce((sum, row) => sum + row.success, 0);
  const failed = daily.reduce((sum, row) => sum + row.failed, 0);
  return {
    from,
    to,
    timeZone: config.timeZone,
    daily,
    weekly: groupPeriods(daily, row => weekStart(row.date)),
    monthly: groupPeriods(daily, row => row.date.slice(0, 7)),
    success,
    failed,
    successRate: success + failed ? Number((success / (success + failed)).toFixed(4)) : null,
    failureRate: success + failed ? Number((failed / (success + failed)).toFixed(4)) : null
  };
}

function groupPeriods(rows, keyFn) {
  const groups = new Map();
  for (const row of rows) {
    const key = keyFn(row);
    const current = groups.get(key) || {period: key, messages: 0, users: 0, limitReached: 0, success: 0, failed: 0, inputTokens: 0, outputTokens: 0, estimatedCost: 0, priced: 0};
    current.messages += row.messages;
    current.users += row.users;
    current.limitReached += row.limitReached;
    current.success += row.success;
    current.failed += row.failed;
    current.inputTokens += row.inputTokens;
    current.outputTokens += row.outputTokens;
    if (row.estimatedCost != null) {
      current.estimatedCost += row.estimatedCost;
      current.priced += 1;
    }
    groups.set(key, current);
  }
  return [...groups.values()].map(row => ({...row, estimatedCost: row.priced ? Number(row.estimatedCost.toFixed(6)) : null}));
}

export async function chatLogs(db, query) {
  const page = clampInt(query.page, 1, 1, 10000);
  const pageSize = clampInt(query.pageSize, 25, 1, 100);
  let rows = db('chatbot_usage_logs as l').leftJoin('customers as c', 'c.id', 'l.user_id');
  if (query.status) rows = rows.where('l.request_status', String(query.status).slice(0, 20));
  if (/^\d{4}-\d{2}-\d{2}$/.test(query.date || '')) rows = rows.where('l.usage_date', query.date);
  const count = await rows.clone().count({total: 'l.id'}).first();
  const logs = await rows.clone().select('l.id', 'l.user_id', 'c.name', 'c.email', 'l.conversation_id', 'l.usage_date', 'l.request_status', 'l.input_tokens', 'l.output_tokens', 'l.estimated_cost', 'l.error_code', 'l.created_at').orderBy('l.id', 'desc').limit(pageSize).offset((page - 1) * pageSize);
  return {
    page,
    pageSize,
    total: Number(count.total || 0),
    logs: logs.map(row => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      email: row.email,
      conversationId: row.conversation_id,
      usageDate: row.usage_date,
      status: row.request_status,
      inputTokens: row.input_tokens == null ? null : Number(row.input_tokens),
      outputTokens: row.output_tokens == null ? null : Number(row.output_tokens),
      estimatedCost: row.estimated_cost == null ? null : Number(row.estimated_cost),
      errorCode: row.error_code,
      createdAt: row.created_at
    }))
  };
}

export async function exportChatUsers(db, query, env = process.env, now = new Date()) {
  const listed = await listChatUsers(db, {...query, page: 1, pageSize: 100}, env, now);
  const pages = [listed];
  for (let page = 2; page <= listed.pageCount && page <= 50; page += 1) pages.push(await listChatUsers(db, {...query, page, pageSize: 100}, env, now));
  const users = pages.flatMap(page => page.users);
  const header = ['User ID', 'Name', 'Email', 'Daily Usage', 'Daily Limit', 'Remaining', 'Usage Status', 'Lifetime Messages', 'Last Chat', 'Access'];
  const lines = users.map(user => [user.id, user.name, user.email, user.used, user.limit, user.remaining, user.usageStatus, user.lifetimeMessages, user.lastChat || '', user.accessEnabled ? 'enabled' : 'disabled'].map(csvCell).join(','));
  return `\uFEFF${header.join(',')}\n${lines.join('\n')}\n`;
}

function csvCell(value) {
  const text = String(value ?? '');
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export async function deleteChatConversation(db, {conversationId, adminId, now = new Date()}) {
  const id = Number(conversationId);
  const row = await db('chat_conversations').where({id}).first();
  if (!row) throw validationError('Conversation not found.', 404);
  await db('chat_conversations').where({id}).del();
  await db('chatbot_admin_audit_logs').insert({
    admin_id: adminId,
    target_user_id: row.user_id,
    action: 'delete_conversation',
    old_value: JSON.stringify({id: row.id, title: row.title}),
    new_value: null,
    created_at: now.toISOString()
  });
  clearChatAdminCache();
  return {ok: true};
}

export async function listAudit(db) {
  return db('chatbot_admin_audit_logs').orderBy('id', 'desc').limit(100);
}
