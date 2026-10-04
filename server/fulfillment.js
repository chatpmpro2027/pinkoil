import { getOrder, insertOrderOnce, updateOrder } from './orders.js';

/**
 * Records a paid Checkout Session as an order and hands it to fulfilment.
 * Safe to call many times for the same session (webhook retries, the success
 * page, async payment events) — only the first paid call creates the order.
 */
export async function fulfillCheckoutSession(stripe, sessionId) {
  const existing = await getOrder(sessionId);
  if (existing) return existing;

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items'],
  });

  // Card payments are 'paid' immediately; delayed methods arrive later via
  // checkout.session.async_payment_succeeded. Never fulfil before that.
  if (session.payment_status !== 'paid') return null;

  const shipping = session.collected_information?.shipping_details ?? session.shipping_details ?? null;
  const order = {
    id: session.id,
    number: `PO-${session.id.slice(-8).toUpperCase()}`,
    status: 'paid',
    fulfillment: 'pending',
    createdAt: new Date().toISOString(),
    email: session.customer_details?.email ?? null,
    name: session.customer_details?.name ?? shipping?.name ?? null,
    phone: session.customer_details?.phone ?? null,
    shipping: shipping ? { name: shipping.name, address: shipping.address } : null,
    shippingRate: session.shipping_cost?.amount_total ?? 0,
    items: (session.line_items?.data ?? []).map((li) => ({
      description: li.description,
      quantity: li.quantity,
      amount: li.amount_total,
    })),
    total: session.amount_total,
    currency: session.currency,
    paymentIntent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
  };

  const inserted = await insertOrderOnce(order);
  if (!inserted) return getOrder(sessionId);

  console.log(`[order] ${order.number} paid — ${order.email} — ${(order.total / 100).toFixed(2)} ${order.currency}`);
  await notifyFulfillment(order);
  return getOrder(sessionId);
}

async function notifyFulfillment(order) {
  const url = process.env.FULFILLMENT_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'order.paid', order }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await updateOrder(order.id, { fulfillment: 'sent' });
  } catch (err) {
    console.error(`[order] fulfilment hand-off failed for ${order.number}:`, err.message);
    await updateOrder(order.id, { fulfillment: 'handoff_failed' });
  }
}
