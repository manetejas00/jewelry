import rateLimit from 'express-rate-limit';
import {loadChatConfig, storefrontChatConfig} from './config.js';
import {getChatHistory, getChatUsage, removeChatHistory, removeConversation, sendChatMessage, startConversation} from './service.js';
import {
  chatAnalytics,
  chatDashboard,
  chatLogs,
  chatUserConversations,
  chatUserDetail,
  deleteChatConversation,
  exportChatUsers,
  listAudit,
  listChatUsers,
  updateChatSettings,
  updateUserChatSettings
} from './admin.js';

export function registerChatRoutes(app, deps) {
  const {db, route, auth} = deps;
  const env = () => deps.env || process.env;
  const now = () => (deps.now ? deps.now() : new Date());
  const fetchImpl = deps.fetchImpl;
  const limit = deps.rateLimit || rateLimit;
  const customerAuth = (req, res, next) => req.session?.customer?.id ? next() : res.status(401).json({error: 'Please sign in to your customer account.'});
  const customerCsrf = (req, res, next) => req.session?.customerCsrf && req.get('x-customer-csrf') === req.session.customerCsrf ? next() : res.status(403).json({error: 'Please reload and try again.'});
  const chatLimit = limit({
    windowMs: 60000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => res.status(429).json({error: 'Too many chat messages. Please wait a minute and try again.'})
  });

  app.get('/api/chat/availability', route(async (req, res) => {
    res.json(storefrontChatConfig(await loadChatConfig(db, env())));
  }));
  app.get('/api/chat/usage', customerAuth, route(async (req, res) => {
    res.json(await getChatUsage(db, req.session.customer.id, env(), now()));
  }));
  app.get('/api/chat/history', customerAuth, route(async (req, res) => {
    res.json({...(await getChatHistory(db, req.session.customer.id)), usage: await getChatUsage(db, req.session.customer.id, env(), now())});
  }));
  app.post('/api/chat/conversations', chatLimit, customerAuth, customerCsrf, route(async (req, res) => {
    res.status(201).json(await startConversation(db, req.session.customer.id, env(), now()));
  }));
  app.post('/api/chat/message', chatLimit, customerAuth, customerCsrf, route(async (req, res) => {
    const body = req.body || {};
    res.json(await sendChatMessage(db, {
      userId: req.session.customer.id,
      message: body.message,
      conversationId: body.conversationId,
      idempotencyKey: body.idempotencyKey,
      env: env(),
      fetchImpl,
      now: now()
    }));
  }));
  app.delete('/api/chat/history', customerAuth, customerCsrf, route(async (req, res) => {
    await removeChatHistory(db, req.session.customer.id);
    res.json({ok: true, usage: await getChatUsage(db, req.session.customer.id, env(), now())});
  }));
  app.delete('/api/chat/conversations/:id', customerAuth, customerCsrf, route(async (req, res) => {
    await removeConversation(db, req.session.customer.id, req.params.id);
    res.json({ok: true, usage: await getChatUsage(db, req.session.customer.id, env(), now())});
  }));

  app.get('/api/admin/chatbot/dashboard', auth(), route(async (req, res) => res.json(await chatDashboard(db, env(), now()))));
  app.get('/api/admin/chatbot/users', auth(), route(async (req, res) => res.json(await listChatUsers(db, req.query, env(), now()))));
  app.get('/api/admin/chatbot/users/:id', auth(), route(async (req, res) => res.json(await chatUserDetail(db, req.params.id, env(), now()))));
  app.get('/api/admin/chatbot/users/:id/usage', auth(), route(async (req, res) => {
    const detail = await chatUserDetail(db, req.params.id, env(), now());
    res.json({user: detail.user, usage: detail.usage, lifetime: detail.lifetime, daily: detail.daily, weekly: detail.weekly, monthly: detail.monthly});
  }));
  app.get('/api/admin/chatbot/users/:id/conversations', auth(), route(async (req, res) => res.json(await chatUserConversations(db, req.params.id))));
  app.put('/api/admin/chatbot/users/:id/settings', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await updateUserChatSettings(db, {userId: req.params.id, adminId: req.session.staff.id, body: req.body || {}, now: now()}));
  }));
  app.get('/api/admin/chatbot/analytics', auth(), route(async (req, res) => res.json(await chatAnalytics(db, req.query, env(), now()))));
  app.get('/api/admin/chatbot/logs', auth(), route(async (req, res) => res.json({...(await chatLogs(db, req.query)), audit: await listAudit(db)})));
  app.put('/api/admin/chatbot/settings', auth(['owner']), route(async (req, res) => {
    res.json(await updateChatSettings(db, {adminId: req.session.staff.id, body: req.body || {}, env: env(), now: now()}));
  }));
  app.get('/api/admin/chatbot/export', auth(['owner', 'manager']), route(async (req, res) => {
    const csv = await exportChatUsers(db, req.query, env(), now());
    res.set('Content-Type', 'text/csv; charset=utf-8').attachment('chatbot-usage.csv').send(csv);
  }));
  app.delete('/api/admin/chatbot/conversations/:id', auth(['owner', 'manager']), route(async (req, res) => {
    res.json(await deleteChatConversation(db, {conversationId: req.params.id, adminId: req.session.staff.id, now: now()}));
  }));
}
