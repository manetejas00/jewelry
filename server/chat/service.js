import {validationError} from '../errors.js';
import {limitReachedMessage, MAX_HISTORY_MESSAGES} from './constants.js';
import {usageDate, nextReset} from './clock.js';
import {loadChatConfig} from './config.js';
import {cleanConversationId, cleanIdempotencyKey, cleanMessage} from './validation.js';
import {buildKnowledge} from './knowledge.js';
import {completeChat} from './ai-provider.js';
import {
  clearHistory,
  completeReservation,
  createConversation,
  deleteOwnedConversation,
  findOwnedConversation,
  listConversations,
  listMessages,
  presentConversation,
  presentMessage,
  readUsageCount,
  refundReservation,
  releaseStaleReservations,
  reserveMessage,
  saveExchange,
  userSettings
} from './repository.js';

function accessEnabled(settings) {
  if (!settings) return true;
  return settings.chatbot_access_enabled !== false && settings.chatbot_access_enabled !== 0 && settings.chatbot_access_enabled !== '0';
}

function resolveLimit(settings, fallback) {
  if (settings && settings.daily_message_limit != null && settings.daily_message_limit !== '') {
    const number = Number(settings.daily_message_limit);
    if (Number.isInteger(number) && number >= 1 && number <= 100) return number;
  }
  return fallback;
}

async function usagePayload(db, userId, config, settings, now) {
  const date = usageDate(now, config.timeZone);
  const limit = resolveLimit(settings, config.maxDaily);
  const used = await readUsageCount(db, userId, date);
  return {
    enabled: Boolean(config.enabled && config.ready),
    accessEnabled: accessEnabled(settings),
    limit,
    used,
    remaining: Math.max(0, limit - used),
    usageDate: date,
    resetAt: nextReset(now, config.timeZone).toISOString(),
    timeZone: config.timeZone,
    maxInput: config.maxInput
  };
}

export async function getChatUsage(db, userId, env = process.env, now = new Date()) {
  const config = await loadChatConfig(db, env);
  const settings = await userSettings(db, userId);
  return usagePayload(db, userId, config, settings, now);
}

export async function getChatHistory(db, userId) {
  return {conversations: await listConversations(db, userId)};
}

export async function removeChatHistory(db, userId) {
  await clearHistory(db, userId);
  return {ok: true};
}

export async function removeConversation(db, userId, conversationId) {
  await deleteOwnedConversation(db, cleanConversationId(conversationId), userId);
  return {ok: true};
}

export async function startConversation(db, userId, env = process.env, now = new Date()) {
  const config = await loadChatConfig(db, env);
  if (!config.enabled || !config.ready) throw validationError('The assistant is temporarily unavailable.', 503);
  const settings = await userSettings(db, userId);
  if (!accessEnabled(settings)) throw validationError('The assistant is not available for this account.', 403);
  const conversation = await createConversation(db, userId, now);
  return {conversation: presentConversation(conversation), usage: await usagePayload(db, userId, config, settings, now)};
}

async function replay(db, userId, prior, config, settings, now) {
  if (prior.request_status === 'reserved') throw validationError('This message is already being sent.', 409);
  if (prior.request_status !== 'succeeded' || !prior.assistant_message) {
    throw validationError('This message was already submitted. Please try sending it again.', 409);
  }
  const usage = await usagePayload(db, userId, config, settings, now);
  return {
    replay: true,
    conversationId: prior.conversation_id,
    message: prior.assistant_message,
    usage
  };
}

async function dropEmpty(db, conversation) {
  if (!conversation) return;
  const existing = await db('chat_messages').where({conversation_id: conversation.id}).first();
  if (!existing) await db('chat_conversations').where({id: conversation.id}).del();
}

export async function sendChatMessage(db, input) {
  const env = input.env || process.env;
  const now = input.now || new Date();
  const fetchImpl = input.fetchImpl;
  const config = await loadChatConfig(db, env);
  if (!config.enabled || !config.ready) throw validationError('The assistant is temporarily unavailable.', 503);
  const settings = await userSettings(db, input.userId);
  if (!accessEnabled(settings)) throw validationError('The assistant is not available for this account.', 403);
  const limit = resolveLimit(settings, config.maxDaily);
  const message = cleanMessage(input.message, config.maxInput);
  const idempotencyKey = cleanIdempotencyKey(input.idempotencyKey);
  const requestedId = cleanConversationId(input.conversationId);
  await releaseStaleReservations(db, input.userId, now);

  const prior = await db('chatbot_usage_logs').where({user_id: input.userId, idempotency_key: idempotencyKey}).first();
  if (prior) return replay(db, input.userId, prior, config, settings, now);

  let createdNow = false;
  let conversation = requestedId ? await findOwnedConversation(db, requestedId, input.userId) : null;
  if (!conversation) {
    conversation = await createConversation(db, input.userId, now);
    createdNow = true;
  }
  const date = usageDate(now, config.timeZone);
  let reservation;
  try {
    reservation = await reserveMessage(db, {
      userId: input.userId,
      usageDate: date,
      limit,
      idempotencyKey,
      conversationId: conversation.id,
      userText: message,
      model: config.model,
      now
    });
  } catch (error) {
    if (createdNow) await dropEmpty(db, conversation);
    const raced = await db('chatbot_usage_logs').where({user_id: input.userId, idempotency_key: idempotencyKey}).first();
    if (raced) return replay(db, input.userId, raced, config, settings, now);
    throw error;
  }
  if (reservation.prior) {
    if (createdNow) await dropEmpty(db, conversation);
    return replay(db, input.userId, reservation.prior, config, settings, now);
  }
  if (reservation.exhausted) {
    if (createdNow) await dropEmpty(db, conversation);
    throw validationError(limitReachedMessage(limit), 429);
  }

  try {
    const history = await listMessages(db, conversation.id);
    const knowledge = await buildKnowledge(db, env);
    const completion = await completeChat({
      env,
      config,
      fetchImpl,
      messages: [
        {role: 'system', content: config.systemPrompt},
        {role: 'system', content: `Approved storefront facts:\n${knowledge}`},
        ...history.slice(-MAX_HISTORY_MESSAGES).map(row => ({role: row.role === 'assistant' ? 'assistant' : 'user', content: row.message})),
        {role: 'user', content: message}
      ]
    });
    await completeReservation(db, reservation.logId, completion, now);
    await saveExchange(db, {conversation, userText: message, assistantText: completion.text, usage: completion, now});
    const saved = await listMessages(db, conversation.id);
    const usage = await usagePayload(db, input.userId, config, settings, now);
    return {
      replay: false,
      conversationId: conversation.id,
      conversation: presentConversation({...conversation, title: conversation.title || message.slice(0, 80)}),
      userMessage: presentMessage(saved.filter(row => row.role === 'user').at(-1)),
      assistantMessage: presentMessage(saved.filter(row => row.role === 'assistant').at(-1)),
      message: completion.text,
      usage
    };
  } catch (error) {
    if (error.refund) await refundReservation(db, reservation.logId, error.code || 'provider_error', now);
    if (createdNow) await dropEmpty(db, conversation);
    throw error;
  }
}

export async function purgeRetainedChats(db, env = process.env, now = new Date()) {
  if (!(await db.schema.hasTable('chat_conversations'))) return 0;
  const config = await loadChatConfig(db, env);
  const cutoff = new Date(now.getTime() - config.retentionDays * 86400000).toISOString();
  return db('chat_conversations').where('updated_at', '<', cutoff).del();
}
