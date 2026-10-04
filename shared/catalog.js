// Single source of truth for products, delivery and store settings. The server
// re-prices every cart from this file, so prices sent by the browser are never trusted.
// Prices are in fils (AED × 100) and include VAT.

export const CURRENCY = 'aed';

export const STORE = {
  // International format without + or spaces. Leave empty to hide the WhatsApp button.
  whatsapp: '971541625003',
  email: 'hello@pinkoil.net',
};

// About 1 ml (one pipette) per use, 2–3 times a week.
export const PRODUCTS = [
  {
    id: 'pink-oil-50',
    ml: 50,
    name: { en: 'Pink Oil · 50 ml', ar: 'بينك أويل · 50 مل' },
    short: { en: '50 ml', ar: '50 مل' },
    tagline: { en: 'About 2 months of the ritual', ar: 'يكفي الروتين شهرين تقريبًا' },
    price: 10000,
    scale: 0.86,
  },
  {
    id: 'pink-oil-100',
    ml: 100,
    name: { en: 'Pink Oil · 100 ml', ar: 'بينك أويل · 100 مل' },
    short: { en: '100 ml', ar: '100 مل' },
    tagline: { en: 'About 4 months: the full 12-week journey', ar: 'يكفي 4 أشهر تقريبًا: رحلة الـ12 أسبوعًا كاملة' },
    price: 20000,
    scale: 1,
    badge: { en: 'Full ritual', ar: 'الروتين الكامل' },
  },
];

export const DEFAULT_PRODUCT = 'pink-oil-100';

// Standard UAE delivery is free from this subtotal.
export const FREE_SHIPPING_THRESHOLD = 40000;

// Automatic discount at checkout (applied as a Stripe coupon, shown as its own line).
export const DISCOUNT = {
  threshold: 50000,
  percent: 10,
  couponId: 'PINKOIL_10_OFF_500',
  name: '10% off orders of AED 500+',
};

export const SHIPPING = {
  standard: {
    code: 'uae_standard',
    label: { en: 'UAE delivery (1–2 business days)', ar: 'توصيل داخل الإمارات (1–2 يوم عمل)' },
    amount: 1500,
    estimate: { unit: 'business_day', min: 1, max: 2 },
  },
  standardFree: {
    code: 'uae_standard',
    label: { en: 'Free UAE delivery (1–2 business days)', ar: 'توصيل مجاني داخل الإمارات (1–2 يوم عمل)' },
    amount: 0,
    estimate: { unit: 'business_day', min: 1, max: 2 },
  },
  sameDay: {
    code: 'dubai_same_day',
    label: { en: 'Dubai same-day delivery (order by 2 pm)', ar: 'توصيل في نفس اليوم داخل دبي (اطلبي قبل 2 ظهرًا)' },
    amount: 2500,
    estimate: { unit: 'hour', min: 3, max: 8 },
  },
};

export const MAX_QTY = 10;

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id);

/** Formats fils as AED, e.g. "AED 200" / "‏199 د.إ.‏" (Western digits, as used in the UAE). */
export const formatMoney = (fils, lang = 'en') =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE', {
    style: 'currency',
    currency: CURRENCY.toUpperCase(),
    minimumFractionDigits: fils % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(fils / 100);
