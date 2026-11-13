import {validationError} from '../errors.js';
import {STALE_RESERVATION_MS} from './constants.js';

const stamp = date => date.toISOString();

export async function findOwnedConversation(db, id, userId) {
  if (!id) return null;
  const row = await db('chat_conversations').where({id, user_id: userId}).first();
  if (!row) throw validationError('Conversation not found.', 404);
  return row;
}

export async function createConversation(db, userId, now) {
  const created = stamp(now);
  const [id] = await db('chat_conversations').insert({user_id: userId, title: null, status: 'active', created_at: created, updated_at: created});
  return findOwnedConversation(db, id, userId);
}

export async function listMessages(db, conversationId) {
  return db('chat_messages').where({conversation_id: conversationId, status: 'completed'}).orderBy('id');
}

export async function listConversations(db, userId) {
  const conversations = await db('chat_conversations').where({user_id: userId}).orderBy('updated_at', 'desc').limit(30);
  if (!conversations.length) return [];
  const messages = await db('chat_messages').whereIn('conversation_id', conversations.map(row => row.id)).where({status: 'completed'}).orderBy('id');
  return conversations.map(row => ({...presentConversation(row), messages: messages.filter(message => message.conversation_id === row.id).map(presentMessage)}));
}

export async function saveExchange(db, {conversation, userText, assistantText, usage, now}) {
  const created = stamp(now);
  await db.transaction(async trx => {
    await trx('chat_messages').insert([
      {conversation_id: conversation.id, role: 'user', message: userText, status: 'completed', input_tokens: null, output_tokens: null, created_at: created, updated_at: created},
      {conversation_id: conversation.id, role: 'assistant', message: assistantText, status: 'completed', input_tokens: usage.inputTokens || null, output_tokens: usage.outputTokens || null, created_at: created, updated_at: created}
    ]);
    await trx('chat_conversations').where({id: conversation.id}).update({
      title: conversation.title || userText.slice(0, 80),
      updated_at: created
    });
  });
}

export async function clearHistory(db, userId) {
  await db('chat_conversations').where({user_id: userId}).del();
}

export async function deleteOwnedConversation(db, id, userId) {
  const removed = await db('chat_conversations').where({id, user_id: userId}).del();
  if (!removed) throw validationError('Conversation not found.', 404);
}

export function presentConversation(row) {
  return {id: row.id, title: row.title || 'New conversation', status: row.status, createdAt: row.created_at, updatedAt: row.updated_at};
}

export function presentMessage(row) {
  return {
    id: row.id,
    role: row.role,
    message: row.message,
    createdAt: row.created_at,
    inputTokens: row.input_tokens == null ? null : Number(row.input_tokens),
    outputTokens: row.output_tokens == null ? null : Number(row.output_tokens)
  };
}

export async function userSettings(db, userId) {
  return db('chatbot_user_settings').where({user_id: userId}).first();
}

export async function releaseStaleReservations(db, userId, now) {
  const cutoff = new Date(now.getTime() - STALE_RESERVATION_MS).toISOString();
  const stale = await db('chatbot_usage_logs').where({user_id: userId, request_status: 'reserved'}).where('created_at', '<', cutoff);
  for (const row of stale) await refundReservation(db, row, 'stale_reservation', now);
}

export async function reserveMessage(db, {userId, usageDate, limit, idempotencyKey, conversationId, userText, model, now}) {
  return db.transaction(async trx => {
    const prior = await trx('chatbot_usage_logs').where({user_id: userId, idempotency_key: idempotencyKey}).first();
    if (prior) return {prior};
    const created = stamp(now);
    await trx('chat_daily_usage').insert({
      user_id: userId,
      usage_date: usageDate,
      message_count: 0,
      created_at: created,
      updated_at: created
    }).onConflict(['user_id', 'usage_date']).ignore();
    const updated = await trx('chat_daily_usage')
      .where({user_id: userId, usage_date: usageDate})
      .where('message_count', '<', limit)
      .update({message_count: trx.raw('message_count + 1'), updated_at: created});
    if (!updated) {
      const row = await trx('chat_daily_usage').where({user_id: userId, usage_date: usageDate}).first();
      return {exhausted: true, used: Number(row?.message_count || limit)};
    }
    const usage = await trx('chat_daily_usage').where({user_id: userId, usage_date: usageDate}).first();
    const [logId] = await trx('chatbot_usage_logs').insert({
      user_id: userId,
      conversation_id: conversationId,
      usage_date: usageDate,
      idempotency_key: idempotencyKey,
      request_status: 'reserved',
      user_message: userText,
      assistant_message: null,
      model,
      input_tokens: null,
      output_tokens: null,
      estimated_cost: null,
      error_code: null,
      created_at: created
    });
    return {reserved: true, logId, used: Number(usage.message_count)};
  });
}

export async function completeReservation(db, logId, result, now) {
  await db('chatbot_usage_logs').where({id: logId, request_status: 'reserved'}).update({
    request_status: 'succeeded',
    assistant_message: result.text,
    model: result.model,
    input_tokens: result.inputTokens,
    output_tokens: result.outputTokens,
    estimated_cost: result.estimatedCost,
    error_code: null
  });
}

export async function refundReservation(db, logOrId, errorCode, now) {
  const logId = typeof logOrId === 'object' ? logOrId.id : logOrId;
  await db.transaction(async trx => {
    const row = await trx('chatbot_usage_logs').where({id: logId, request_status: 'reserved'}).first();
    if (!row) return;
    const changed = await trx('chatbot_usage_logs').where({id: row.id, request_status: 'reserved'}).update({
      request_status: 'refunded',
      error_code: errorCode
    });
    if (!changed) return;
    await trx('chat_daily_usage').where({user_id: row.user_id, usage_date: row.usage_date}).where('message_count', '>', 0).update({
      message_count: trx.raw('message_count - 1'),
      updated_at: stamp(now)
    });
  });
}

export async function readUsageCount(db, userId, usageDate) {
  const row = await db('chat_daily_usage').where({user_id: userId, usage_date: usageDate}).first();
  return Number(row?.message_count || 0);
}
