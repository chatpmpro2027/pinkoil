import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Stripe from 'stripe';

const dataDir = await mkdtemp(path.join(tmpdir(), 'pinkoil-'));
process.env.DATA_DIR = dataDir;
const { createApp, priceCart } = await import('../server/app.js');

const WEBHOOK_SECRET = 'whsec_test_secret';
const real = new Stripe('sk_test_dummy');
const sessions = new Map();
const created = [];

// Stripe double: real signature verification, fake API calls.
const stripe = {
  webhooks: real.webhooks,
  checkout: {
    sessions: {
      async create(params) {
        created.push(params);
        return { id: 'cs_test_new', url: 'https://checkout.stripe.com/c/pay/cs_test_new' };
      },
      async retrieve(id) {
        if (!sessions.has(id)) throw new Error('No such session');
        return sessions.get(id);
      },
    },
  },
};

const paidSession = (id, status = 'paid') => ({
  id,
  payment_status: status,
  amount_total: 9495,
  currency: 'usd',
  customer_details: { email: 'jane@example.com', name: 'Jane Doe', phone: '+15555550100' },
  collected_information: { shipping_details: { name: 'Jane Doe', address: { line1: '1 Rose St', city: 'Austin', country: 'US' } } },
  shipping_cost: { amount_total: 595 },
  payment_intent: 'pi_123',
  line_items: { data: [{ description: 'Pink Oil Ritual Duo · 2 × 60 ml', quantity: 1, amount_total: 8900 }] },
});

let server;
let base;
before(async () => {
  const app = createApp({ stripe, webhookSecret: WEBHOOK_SECRET, baseUrl: 'https://pinkoil.test', staticDir: dataDir, adminToken: 'admintoken' });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.close();
  await rm(dataDir, { recursive: true, force: true });
});

const sendWebhook = (event, secret = WEBHOOK_SECRET) => {
  const payload = JSON.stringify(event);
  const header = real.webhooks.generateTestHeaderString({ payload, secret });
  return fetch(`${base}/api/stripe/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'stripe-signature': header },
    body: payload,
  });
};

test('priceCart uses server prices, merges lines and caps quantity', () => {
  const { lines, subtotal } = priceCart([
    { id: 'pink-oil-60', qty: 2, price: 1 },
    { id: 'pink-oil-60', qty: 50 },
    { id: 'pink-oil-30', qty: 1 },
  ]);
  assert.equal(lines.find((l) => l.product.id === 'pink-oil-60').qty, 10);
  assert.equal(subtotal, 10 * 5400 + 3400);
});

test('priceCart rejects bad carts', () => {
  assert.throws(() => priceCart([]));
  assert.throws(() => priceCart([{ id: 'nope', qty: 1 }]));
  assert.throws(() => priceCart([{ id: 'pink-oil-30', qty: 0 }]));
  assert.throws(() => priceCart([{ id: 'pink-oil-30', qty: 1.5 }]));
  assert.throws(() => priceCart('x'));
});

test('POST /api/checkout creates a Stripe session priced from the catalog', async () => {
  const res = await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'pink-oil-duo', qty: 1 }] }),
  });
  assert.equal(res.status, 200);
  assert.match((await res.json()).url, /^https:\/\/checkout\.stripe\.com/);
  const params = created.at(-1);
  assert.equal(params.mode, 'payment');
  assert.equal(params.line_items[0].price_data.unit_amount, 8900);
  assert.equal(params.shipping_options[0].shipping_rate_data.fixed_amount.amount, 0, 'free shipping over threshold');
  assert.match(params.success_url, /\{CHECKOUT_SESSION_ID\}/);
});

test('POST /api/checkout charges shipping under the free threshold', async () => {
  await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'pink-oil-30', qty: 1 }] }),
  });
  assert.equal(created.at(-1).shipping_options[0].shipping_rate_data.fixed_amount.amount, 595);
});

test('POST /api/checkout rejects invalid carts', async () => {
  const res = await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'free-stuff', qty: 1 }] }),
  });
  assert.equal(res.status, 400);
});

test('webhook rejects a bad signature', async () => {
  const res = await sendWebhook({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_x' } } }, 'whsec_wrong');
  assert.equal(res.status, 400);
});

test('webhook does not fulfil an unpaid session', async () => {
  sessions.set('cs_test_unpaid', paidSession('cs_test_unpaid', 'unpaid'));
  const res = await sendWebhook({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_unpaid' } } });
  assert.equal(res.status, 200);
  const orders = await (await fetch(`${base}/api/admin/orders`, { headers: { authorization: 'Bearer admintoken' } })).json();
  assert.equal(orders.length, 0);
});

test('paid session is fulfilled exactly once (webhook retries + success page)', async () => {
  sessions.set('cs_test_paid', paidSession('cs_test_paid'));
  const event = { type: 'checkout.session.completed', data: { object: { id: 'cs_test_paid' } } };
  await Promise.all([sendWebhook(event), sendWebhook(event)]);
  const page = await (await fetch(`${base}/api/order?session_id=cs_test_paid`)).json();
  assert.equal(page.status, 'paid');
  assert.equal(page.firstName, 'Jane');
  assert.equal(page.total, 9495);

  const stored = JSON.parse(await readFile(path.join(dataDir, 'orders.json'), 'utf8'));
  assert.deepEqual(Object.keys(stored), ['cs_test_paid']);
  assert.equal(stored.cs_test_paid.shipping.address.city, 'Austin');
});

test('admin endpoint requires the token', async () => {
  assert.equal((await fetch(`${base}/api/admin/orders`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/orders`, { headers: { authorization: 'Bearer nope' } })).status, 401);
});

test('order lookup validates the session id', async () => {
  assert.equal((await fetch(`${base}/api/order?session_id=../../etc`)).status, 400);
});
