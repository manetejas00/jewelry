import {purgeRetainedChats} from './chat/service.js';

export async function runHousekeeping(db) {
  const sessions = await db('sessions').where('expires', '<', Date.now()).del().catch(() => 0);
  const resets = await db.schema.hasTable('password_resets').catch(() => false)
    ? await db('password_resets').where('expires', '<', Date.now()).del().catch(() => 0)
    : 0;
  const chats = await purgeRetainedChats(db).catch(() => 0);
  return {sessions, resets, chats};
}
