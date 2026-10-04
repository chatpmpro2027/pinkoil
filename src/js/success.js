import { formatMoney } from '../../shared/catalog.js';

const $ = (s) => document.querySelector(s);
const id = new URLSearchParams(location.search).get('session_id');

// The customer reached this page from Stripe, so the bag has been checked out.
try {
  localStorage.removeItem('pinkoil.cart.v1');
} catch {}

async function load(attempt = 0) {
  if (!id) {
    $('[data-order-msg]').textContent = 'Thanks for visiting Pink Oil.';
    return;
  }
  try {
    const res = await fetch(`/api/order?session_id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.status === 'processing') {
      $('[data-order-msg]').textContent = 'Your payment is processing. We’ll email you the moment it’s confirmed — nothing ships until then.';
      if (attempt < 5) setTimeout(() => load(attempt + 1), 3000);
      return;
    }
    $('[data-order-title]').innerHTML = `Thank you${data.firstName ? `, ${escapeHtml(data.firstName)}` : ''}<em>!</em>`;
    $('[data-order-msg]').textContent = `Order ${data.number} is confirmed and paid.`;
    const summary = $('[data-order-summary]');
    summary.innerHTML =
      data.items.map((i) => `<li><span>${i.quantity} × ${escapeHtml(i.description)}</span><span>${formatMoney(i.amount)}</span></li>`).join('') +
      `<li><span>Total paid</span><span>${formatMoney(data.total)}</span></li>`;
    summary.hidden = false;
    $('[data-order-email]').textContent = data.email ?? 'your inbox';
    $('[data-order-next]').hidden = false;
  } catch {
    $('[data-order-msg]').textContent = 'Your order was received. Check your email for the receipt from Stripe.';
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

load();
