import { formatMoney } from '../../shared/catalog.js';

const lang = document.documentElement.lang === 'ar' ? 'ar' : 'en';
const T = {
  en: {
    noSession: 'Thanks for visiting Pink Oil.',
    processing: 'Your payment is processing. We’ll email you the moment it’s confirmed. Nothing ships until then.',
    thanks: (name) => `Thank you${name ? `, ${name}` : ''}<em>!</em>`,
    confirmed: (n) => `Order ${n} is confirmed and paid.`,
    total: 'Total paid',
    delivery: 'Delivery',
    discount: '10% off (AED 500+)',
    next: (email) => `A receipt is on its way to <strong>${email}</strong>. We’ll send you a WhatsApp or SMS update when your Pink Oil is on its way.`,
    inbox: 'your inbox',
    fallback: 'Your order was received. Check your email for the receipt from Stripe.',
  },
  ar: {
    noSession: 'شكرًا لزيارتك بينك أويل.',
    processing: 'دفعتك قيد المعالجة. سنراسلك فور تأكيدها، ولن نشحن أي شيء قبل ذلك.',
    thanks: (name) => `شكرًا لك${name ? ` يا ${name}` : ''}<em>!</em>`,
    confirmed: (n) => `تم تأكيد الطلب ${n} ودفعه.`,
    total: 'المبلغ المدفوع',
    delivery: 'التوصيل',
    discount: 'خصم 10٪ (500 درهم فأكثر)',
    next: (email) => `الإيصال في طريقه إلى <strong>${email}</strong>. سنرسل لك تحديثًا عبر واتساب أو رسالة نصية عندما يكون بينك أويل في طريقه إليك.`,
    inbox: 'بريدك الإلكتروني',
    fallback: 'وصلنا طلبك. تحقّقي من بريدك الإلكتروني لإيصال Stripe.',
  },
}[lang];

const $ = (s) => document.querySelector(s);
const id = new URLSearchParams(location.search).get('session_id');
const money = (fils) => formatMoney(fils, lang);

// The customer reached this page from Stripe, so the bag has been checked out.
try {
  localStorage.removeItem('pinkoil.cart.v1');
} catch {}

async function load(attempt = 0) {
  if (!id) {
    $('[data-order-msg]').textContent = T.noSession;
    return;
  }
  try {
    const res = await fetch(`/api/order?session_id=${encodeURIComponent(id)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    if (data.status === 'processing') {
      $('[data-order-msg]').textContent = T.processing;
      if (attempt < 5) setTimeout(() => load(attempt + 1), 3000);
      return;
    }
    $('[data-order-title]').innerHTML = T.thanks(data.firstName ? escapeHtml(data.firstName) : '');
    $('[data-order-msg]').textContent = T.confirmed(data.number);
    const summary = $('[data-order-summary]');
    summary.innerHTML =
      data.items.map((i) => `<li><span>${i.quantity} × ${escapeHtml(i.description)}</span><span>${money(i.amount)}</span></li>`).join('') +
      (data.discount ? `<li class="summary__muted"><span>${T.discount}</span><span>−${money(data.discount)}</span></li>` : '') +
      (data.delivery ? `<li class="summary__muted"><span>${T.delivery}</span><span>${escapeHtml(data.delivery)}</span></li>` : '') +
      `<li><span>${T.total}</span><span>${money(data.total)}</span></li>`;
    summary.hidden = false;
    const next = $('[data-order-next]');
    next.innerHTML = T.next(escapeHtml(data.email ?? T.inbox));
    next.hidden = false;
  } catch {
    $('[data-order-msg]').textContent = T.fallback;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

load();
