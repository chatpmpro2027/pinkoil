# Pink Oil — storefront

An interactive single-product store for **Pink Oil**, a natural and organic hair growth oil. It has a real-time 3D bottle, an ingredient explorer, a ritual timer, a results slider, a product quiz and a bag. Checkout runs on **Stripe**, and orders are recorded for fulfilment **only after Stripe confirms the payment**.

## Quick start

```bash
npm install
cp .env.example .env      # add your Stripe test keys (see below)
npm run build             # bundles + minifies into dist/
npm start                 # http://localhost:3000
npm test                  # checkout, webhook and fulfilment tests
```

The site runs without Stripe keys. Every page works, and the checkout buttons say checkout isn't connected yet.

## Connecting Stripe

1. Create a Stripe account. In **test mode**, copy the secret key (`sk_test_…`) into `STRIPE_SECRET_KEY` in `.env`.
2. Webhook (this is what triggers fulfilment):
   - **Local:** install the [Stripe CLI](https://docs.stripe.com/stripe-cli) and run
     `stripe listen --forward-to localhost:3000/api/stripe/webhook`.
     Copy the `whsec_…` secret it prints into `STRIPE_WEBHOOK_SECRET`.
   - **Production:** go to Dashboard → Developers → Webhooks → *Add endpoint*.
     Use `https://YOUR-DOMAIN/api/stripe/webhook` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`. Copy that endpoint's signing secret.
3. Set `BASE_URL` to the public URL. Stripe redirects there, and social preview tags use it. Then rebuild.
4. Buy something with the test card `4242 4242 4242 4242`, any future date and any CVC.
5. When you're ready to go live, switch to the live keys (`sk_live_…`) and the live webhook secret.

### How orders flow

1. The customer clicks **Checkout**. The browser sends only product IDs and quantities to `POST /api/checkout`.
2. The server **re-prices the cart from `shared/catalog.js`**, so prices sent by the browser are never trusted. It then creates a Stripe Checkout Session. Shipping address, phone and promo codes are collected on Stripe's hosted page. Free standard shipping applies over $50, and express shipping is offered.
3. The customer pays on Stripe. Card details never touch this server.
4. Stripe calls the webhook. The server verifies the signature, then confirms `payment_status === 'paid'` before recording the order in `data/orders.json`. Delayed payment methods are only fulfilled once they succeed. Every step is idempotent, so webhook retries and the success page can't create duplicate orders.
5. If `FULFILLMENT_WEBHOOK_URL` is set, each paid order is POSTed there as JSON (`{ event: "order.paid", order }`). Point it at Zapier/Make, your 3PL, a Slack hook or a Google Sheet.
6. To see orders, call `GET /api/admin/orders` with `Authorization: Bearer $ADMIN_TOKEN`, or use the Stripe Dashboard.

Stripe emails the customer a receipt if you turn on **Settings → Customer emails → Successful payments**.

## Editing the store

| What | Where |
| --- | --- |
| Prices, sizes, shipping rates, free-shipping threshold | `shared/catalog.js` (used by both the site and the server) |
| Page copy, FAQ, reviews | `src/index.html` |
| Ingredient copy, quiz logic, results timeline | `src/js/main.js` |
| Colours, fonts, layout | `src/css/styles.css` (design tokens are at the top) |
| 3D bottle shape, label artwork, materials | `src/js/bottle3d.js` |
| Product/social images | `src/static/product.jpg`, `src/static/og.jpg` |

Also update the JSON-LD prices in `src/index.html` if you change prices. Run `npm run build` after any change.

## Before launch, replace these placeholders

- [ ] **Reviews:** the five reviews are sample copy. Replace them with genuine customer reviews. Publishing invented reviews is illegal in the US (FTC) and the EU/UK.
- [ ] **Prices** ($34 / $54 / $89) and the "compare at" prices.
- [ ] Contact email `hello@pinkoil.com`, the 30-day guarantee terms and the shipping countries (`ALLOWED_COUNTRIES` in `server/app.js`).
- [ ] The "98% natural origin" and ingredient claims must match your actual formula and supplier certificates.
- [ ] Add Privacy Policy, Terms and Refund Policy pages. Stripe requires them for live payments.
- [ ] Optional: your own product photography. The site already renders the bottle in 3D, so photos are only needed for marketing.

## Performance and optimisation

Lighthouse (mobile emulation): **Performance 99 · Accessibility 100 · Best Practices 100 · SEO 100**. Total Blocking Time is 0 ms and there is no layout shift.

- The page is static HTML with about 7 KB of gzipped JS and 7 KB of CSS. Assets have content-hashed filenames and are cached for a year. Responses are gzip-compressed.
- The 3D engine (Three.js, about 139 KB gzipped) is **code-split**. It loads only after the page is interactive, and the shop viewer mounts only when it scrolls near the viewport. Rendering pauses when a viewer is off-screen or the tab is hidden.
- There are no 3D model downloads: the bottle and its label are generated in code. On slow devices the resolution steps down automatically.
- Devices without a GPU, Data Saver users and browsers without WebGL get a lightweight illustration or a pre-rendered photo instead of 3D.
- Fonts are self-hosted (SIL Open Font License), so there are no third-party requests or render blocking, and no Google Fonts GDPR concerns.
- A strict Content-Security-Policy and other security headers are set, and the checkout endpoint is rate-limited.
- Product schema (JSON-LD), Open Graph and Twitter cards are included. Users who prefer reduced motion get a calm version.

## Deploying

The site is a standard Node 20+ app and runs on Render, Railway, Fly.io, Heroku or a VPS:

- Build command: `npm ci && npm run build`
- Start command: `npm start`
- Environment: everything in `.env.example`

`data/orders.json` needs a persistent disk. Most hosts call it a "volume", and you set `DATA_DIR` to it. Alternatively, rely on the fulfilment webhook and the Stripe Dashboard as your source of truth.

### Project layout

```
shared/catalog.js     products & shipping (single source of truth)
server/               Express app: checkout, webhook, fulfilment, order store
src/                  HTML, CSS, JS, static assets (built into dist/)
scripts/build.mjs     esbuild bundling, minification, hashing
test/                 node:test suite for the payment path
```
