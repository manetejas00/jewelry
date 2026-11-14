import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import {parse} from '../../db.js';
import {commerceConfig} from '../../runtime.js';
import {quote} from '../../pricing.js';
import {checkout, requireSignedInCsrf} from '../../orders.js';
import {mayReadOrder} from '../../customers.js';
import {prepareCheckoutOtp, releaseVerified} from '../../otp.js';

export function registerOrderRoutes(app, {db, route, preview, otpGateway}) {
  app.post('/api/quote', route(async (req, res) => {
    res.json(await quote(db, req.body.items, {code: req.body.offerCode}));
  }));

  app.post('/api/checkout', rateLimit({windowMs: 60_000, limit: 20}), route(async (req, res) => {
    if (!commerceConfig(process.env, preview).checkoutEnabled) {
      return res.status(503).json({error: 'Checkout is awaiting merchant configuration.'});
    }
    requireSignedInCsrf(req);
    req.session.checkoutScope ||= crypto.randomUUID();
    const held = await prepareCheckoutOtp(db, req.session, req.body, process.env, otpGateway);
    try {
      const result = await checkout(
        db,
        {...req.body, offerCode: req.body.offerCode || null},
        preview,
        req.session.customer?.id || null,
        req.session.checkoutScope
      );
      req.session.orderIds = [...new Set([...(req.session.orderIds || []), result.id])].slice(-100);
      res.json(result);
    } catch (error) {
      if (held) await releaseVerified(db, held);
      throw error;
    }
  }));

  app.get('/api/orders/:id', route(async (req, res) => {
    const order = await db('orders').where({id: req.params.id}).first();
    if (!mayReadOrder(req.session, order)) return res.status(404).json({error: 'Order not found'});

    const items = await db('order_items').where({order_id: order.id});
    res.json({...order, customer: parse(order.customer), items: items.map(item => parse(item.snapshot))});
  }));
}
