import nodemailer from 'nodemailer';
import {parse} from './db.js';

const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD && process.env.SMTP_FROM);

export async function sendOrderMail(order) {
  if (!mailConfigured() || !order) return {sent: false};
  const customer = parse(order.customer);
  const port = Number(process.env.SMTP_PORT || 465);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: {user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD},
    connectionTimeout: 10000,
    socketTimeout: 15000,
    logger: false,
    debug: false
  });
  const brand = process.env.BRAND_NAME || 'Veyora Jewels';
  const total = Number(order.total);
  const customerText = `${brand} order ${order.id}\n\nCash on delivery total: ₹${total}\nStatus: ${order.status}\n\nWe will use the delivery details from your order. Payment is collected on delivery.`;
  const merchant = process.env.MERCHANT_EMAIL;
  try {
    if (customer.email) await transport.sendMail({from: process.env.SMTP_FROM, to: customer.email, subject: `${brand} order ${order.id}`, text: customerText});
    if (merchant && merchant !== customer.email) {
      await transport.sendMail({
        from: process.env.SMTP_FROM,
        to: merchant,
        subject: `New ${brand} order ${order.id}`,
        text: `Order ${order.id}\nStatus: ${order.status}\nTotal: ₹${total}\nCustomer: ${customer.name || ''}\nEmail: ${customer.email || ''}\nPhone: ${customer.phone || ''}\n${customer.address || ''}, ${customer.city || ''} ${customer.pincode || ''}`
      });
    }
    return {sent: true};
  } finally {
    transport.close();
  }
}
