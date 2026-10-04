import express from 'express';
import compression from 'compression';
import path from 'node:path';
import { timingSafeEqual } from 'node:crypto';
import { PRODUCTS, CURRENCY, SHIPPING, FREE_SHIPPING_THRESHOLD, MAX_QTY, findProduct } from '../shared/catalog.js';
import { fulfillCheckoutSession } from './fulfillment.js';
import { listOrders } from './orders.js';

// UAE launch. Add GCC codes (e.g. 'SA', 'OM', 'BH', 'KW', 'QA') with their own shipping rates to expand.
const ALLOWED_COUNTRIES = ['AE'];
const LANGS = new Set(['en', 'ar']);

// Customer-facing checkout errors in both languages.
const MESSAGES = {
  empty: { en: 'Your bag is empty.', ar: 'حقيبتك فارغة.' },
  invalid: { en: 'Your bag contains an item we couldn’t find. Please remove it and try again.', ar: 'تحتوي حقيبتك على منتج غير متوفر. يُرجى إزالته والمحاولة مجددًا.' },
  busy: { en: 'Too many attempts. Please wait a minute and try again.', ar: 'محاولات كثيرة. يُرجى الانتظار دقيقة ثم المحاولة مجددًا.' },
  offline: { en: 'Online checkout is temporarily unavailable. Please try again soon.', ar: 'الدفع الإلكتروني غير متاح مؤقتًا. يُرجى المحاولة لاحقًا.' },
  failed: { en: 'We couldn’t start checkout. Please try again in a moment.', ar: 'تعذّر بدء الدفع. يُرجى المحاولة بعد قليل.' },
};
const langOf = (req) => (LANGS.has(req.body?.lang) ? req.body.lang : 'en');
const message = (key, req) => MESSAGES[key][langOf(req)];

class CartError extends Error {
  constructor(code) {
    super(MESSAGES[code].en);
    this.code = code;
  }
}

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

/** Validates a browser cart and prices it from the server-side catalog. */
export function priceCart(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0 || rawItems.length > PRODUCTS.length) {
    throw new CartError('empty');
  }
  const merged = new Map();
  for (const item of rawItems) {
    const product = findProduct(item?.id);
    const qty = Number(item?.qty);
    if (!product || !Number.isInteger(qty) || qty < 1) throw new CartError('invalid');
    merged.set(product.id, Math.min(MAX_QTY, (merged.get(product.id) ?? 0) + qty));
  }
  const lines = [...merged].map(([id, qty]) => ({ product: findProduct(id), qty }));
  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.qty, 0);
  return { lines, subtotal };
}

export function shippingOptions(subtotal, lang = 'en') {
  const standard = subtotal >= FREE_SHIPPING_THRESHOLD ? SHIPPING.standardFree : SHIPPING.standard;
  return [standard, SHIPPING.sameDay, SHIPPING.local].map((s) => ({
    shipping_rate_data: {
      type: 'fixed_amount',
      display_name: s.label[lang],
      fixed_amount: { amount: s.amount, currency: CURRENCY },
      delivery_estimate: {
        minimum: { unit: s.estimate.unit, value: s.estimate.min },
        maximum: { unit: s.estimate.unit, value: s.estimate.max },
      },
      metadata: { code: s.code },
    },
  }));
}

// Tiny fixed-window rate limiter for the checkout endpoint.
function rateLimit({ windowMs, max }) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();
  return (req, res, next) => {
    const n = (hits.get(req.ip) ?? 0) + 1;
    hits.set(req.ip, n);
    if (n > max) return res.status(429).json({ error: message('busy', req) });
    next();
  };
}

const safeEqual = (a, b) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createApp({ stripe, webhookSecret, baseUrl, staticDir, adminToken }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': CSP,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Cross-Origin-Opener-Policy': 'same-origin',
    });
    if (req.secure) res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
  });

  // Stripe needs the raw body to verify the signature — register before json().
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
    if (!stripe || !webhookSecret) return res.status(503).send('Stripe webhook not configured');
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, req.headers['stripe-signature'], webhookSecret);
    } catch (err) {
      console.warn('[webhook] signature verification failed:', err.message);
      return res.status(400).send('Invalid signature');
    }
    try {
      switch (event.type) {
        case 'checkout.session.completed':
        case 'checkout.session.async_payment_succeeded':
          await fulfillCheckoutSession(stripe, event.data.object.id);
          break;
        case 'checkout.session.async_payment_failed':
          console.warn(`[webhook] payment failed for ${event.data.object.id} — nothing will ship.`);
          break;
      }
      res.json({ received: true });
    } catch (err) {
      console.error('[webhook] handler error:', err);
      res.status(500).send('Webhook handler error'); // Stripe will retry.
    }
  });

  app.use(compression());
  app.use(express.json({ limit: '10kb' }));

  app.get('/api/health', (req, res) => res.json({ ok: true, stripe: Boolean(stripe) }));

  app.post('/api/checkout', rateLimit({ windowMs: 60_000, max: 10 }), async (req, res) => {
    if (!stripe) {
      console.warn('[checkout] STRIPE_SECRET_KEY is not set; checkout is disabled.');
      return res.status(503).json({ error: message('offline', req) });
    }
    const lang = langOf(req);
    const prefix = lang === 'ar' ? '/ar' : '';
    let cart;
    try {
      cart = priceCart(req.body?.items);
    } catch (err) {
      return res.status(400).json({ error: message(err.code ?? 'invalid', req) });
    }
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: cart.lines.map(({ product, qty }) => ({
          quantity: qty,
          price_data: {
            currency: CURRENCY,
            unit_amount: product.price,
            product_data: {
              name: product.name[lang],
              description:
                lang === 'ar'
                  ? 'زيت طبيعي وعضوي لنمو الشعر بإكليل الجبل والخروع وبذور اليقطين.'
                  : 'Natural & organic hair growth oil with rosemary, castor & pumpkin seed.',
              images: [`${baseUrl}/product.jpg`],
              metadata: { sku: product.id },
            },
          },
        })),
        shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
        shipping_options: shippingOptions(cart.subtotal, lang),
        locale: lang === 'ar' ? 'ar' : 'en',
        phone_number_collection: { enabled: true },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        metadata: { cart: cart.lines.map((l) => `${l.product.id}x${l.qty}`).join(','), lang },
        success_url: `${baseUrl}${prefix}/success.html?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}${prefix}/?checkout=cancelled#shop`,
      });
      res.json({ url: session.url });
    } catch (err) {
      console.error('[checkout] Stripe error:', err.message);
      res.status(502).json({ error: message('failed', req) });
    }
  });

  // Called by the success page. Also triggers fulfilment in case the success
  // page loads before the webhook arrives (Stripe's recommended pattern).
  app.get('/api/order', async (req, res) => {
    const id = String(req.query.session_id ?? '');
    if (!stripe || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(id)) return res.status(400).json({ error: 'Invalid order reference.' });
    try {
      const order = await fulfillCheckoutSession(stripe, id);
      if (!order) return res.json({ status: 'processing' });
      res.set('Cache-Control', 'no-store');
      res.json({
        status: order.status,
        number: order.number,
        firstName: order.name?.split(' ')[0] ?? null,
        email: order.email,
        items: order.items,
        total: order.total,
        currency: order.currency,
        delivery: order.delivery?.name ?? null,
      });
    } catch (err) {
      console.error('[order] lookup failed:', err.message);
      res.status(404).json({ error: 'Order not found.' });
    }
  });

  app.get('/api/admin/orders', async (req, res) => {
    const token = (req.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
    if (!adminToken || !token || !safeEqual(token, adminToken)) return res.status(401).json({ error: 'Unauthorized' });
    res.json(await listOrders());
  });

  app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

  // Hashed assets are immutable; HTML must always revalidate.
  app.use(
    express.static(staticDir, {
      extensions: ['html'],
      setHeaders(res, filePath) {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.set('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('.html')) {
          res.set('Cache-Control', 'no-cache');
        } else {
          res.set('Cache-Control', 'public, max-age=86400');
        }
      },
    }),
  );

  app.use((req, res) => res.status(404).sendFile(path.join(staticDir, '404.html')));

  return app;
}
