import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import Stripe from 'stripe';

const dataDir = await mkdtemp(path.join(tmpdir(), 'pinkoil-'));
process.env.DATA_DIR = dataDir;
const { createApp, priceCart } = await import('../server/app.js');
const { findProduct, FREE_SHIPPING_THRESHOLD, SHIPPING } = await import('../shared/catalog.js');
const price = (id) => findProduct(id).price;

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
  amount_total: 34900,
  currency: 'aed',
  customer_details: { email: 'jane@example.com', name: 'Jane Doe', phone: '+15555550100' },
  collected_information: { shipping_details: { name: 'Jane Doe', address: { line1: 'Villa 12, Sidra 2', city: 'Dubai', state: 'Dubai', country: 'AE' } } },
  shipping_cost: { amount_total: 0, shipping_rate: { id: 'shr_1', display_name: 'Free hand delivery', metadata: { code: 'local_hand_delivery' } } },
  payment_intent: 'pi_123',
  line_items: { data: [{ description: 'Pink Oil Ritual Duo · 2 × 60 ml', quantity: 1, amount_total: 34900 }] },
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
  assert.equal(subtotal, 10 * price('pink-oil-60') + price('pink-oil-30'));
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
  assert.equal(params.line_items[0].price_data.currency, 'aed');
  assert.equal(params.line_items[0].price_data.unit_amount, price('pink-oil-duo'));
  assert.deepEqual(params.shipping_address_collection.allowed_countries, ['AE']);
  const rates = params.shipping_options.map((o) => o.shipping_rate_data);
  assert.deepEqual(rates.map((r) => r.metadata.code), ['uae_standard', 'dubai_same_day', 'local_hand_delivery']);
  assert.equal(rates[0].fixed_amount.amount, 0, 'free UAE delivery over threshold');
  assert.equal(params.locale, 'en');
  assert.match(params.success_url, /^https:\/\/pinkoil\.test\/success\.html\?session_id=\{CHECKOUT_SESSION_ID\}$/);
});

test('POST /api/checkout charges shipping under the free threshold', async () => {
  await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'pink-oil-30', qty: 1 }] }),
  });
  assert.ok(price('pink-oil-30') < FREE_SHIPPING_THRESHOLD);
  assert.equal(created.at(-1).shipping_options[0].shipping_rate_data.fixed_amount.amount, SHIPPING.standard.amount);
});

test('Arabic checkout uses Arabic Stripe locale, names and return pages', async () => {
  await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'pink-oil-60', qty: 1 }], lang: 'ar' }),
  });
  const params = created.at(-1);
  assert.equal(params.locale, 'ar');
  assert.equal(params.line_items[0].price_data.product_data.name, findProduct('pink-oil-60').name.ar);
  assert.equal(params.shipping_options[0].shipping_rate_data.display_name, SHIPPING.standardFree.label.ar);
  assert.match(params.success_url, /\/ar\/success\.html\?/);
  assert.match(params.cancel_url, /\/ar\/\?checkout=cancelled#shop$/);
});

test('unknown language falls back to English', async () => {
  await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [{ id: 'pink-oil-60', qty: 1 }], lang: '../../x' }),
  });
  assert.equal(created.at(-1).locale, 'en');
  assert.doesNotMatch(created.at(-1).success_url, /\/ar\//);
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
  assert.equal(page.total, 34900);
  assert.equal(page.delivery, 'Free hand delivery');

  const stored = JSON.parse(await readFile(path.join(dataDir, 'orders.json'), 'utf8'));
  assert.deepEqual(Object.keys(stored), ['cs_test_paid']);
  assert.equal(stored.cs_test_paid.shipping.address.city, 'Dubai');
  assert.equal(stored.cs_test_paid.delivery.code, 'local_hand_delivery');
  assert.equal(stored.cs_test_paid.needsAddressCheck, true, 'free local delivery is flagged for an address check');
});

test('admin endpoint requires the token', async () => {
  assert.equal((await fetch(`${base}/api/admin/orders`)).status, 401);
  assert.equal((await fetch(`${base}/api/admin/orders`, { headers: { authorization: 'Bearer nope' } })).status, 401);
});

test('order lookup validates the session id', async () => {
  assert.equal((await fetch(`${base}/api/order?session_id=../../etc`)).status, 400);
});

test('checkout errors are returned in the shopper’s language', async () => {
  const res = await fetch(`${base}/api/checkout`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ items: [], lang: 'ar' }),
  });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).error, 'حقيبتك فارغة.');
});
