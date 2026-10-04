import 'dotenv/config';
import path from 'node:path';
import Stripe from 'stripe';
import { createApp } from './app.js';

const port = Number(process.env.PORT) || 3000;
const baseUrl = (process.env.BASE_URL || `http://localhost:${port}`).replace(/\/$/, '');
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

if (!stripe) console.warn('⚠  STRIPE_SECRET_KEY is not set — the site runs, but checkout is disabled.');
if (stripe && !process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('⚠  STRIPE_WEBHOOK_SECRET is not set — paid orders will only be recorded when customers reach the success page.');
}

const app = createApp({
  stripe,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  baseUrl,
  adminToken: process.env.ADMIN_TOKEN,
  staticDir: path.resolve('dist'),
});

app.listen(port, () => console.log(`Pink Oil running at ${baseUrl}`));
