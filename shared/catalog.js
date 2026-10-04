// Single source of truth for products, delivery and store settings. The server
// re-prices every cart from this file, so prices sent by the browser are never trusted.
// Prices are in fils (AED × 100) and include VAT.

export const CURRENCY = 'aed';

export const STORE = {
  // International format without + or spaces, e.g. '971501234567'. Leave empty to hide the WhatsApp button.
  whatsapp: '',
  email: 'hello@pinkoil.com',
};

export const PRODUCTS = [
  {
    id: 'pink-oil-30',
    name: { en: 'Pink Oil · 30 ml', ar: 'بينك أويل · 30 مل' },
    short: { en: '30 ml', ar: '30 مل' },
    tagline: { en: 'Starter · about 1 month', ar: 'للتجربة · يكفي شهرًا تقريبًا' },
    price: 12900,
    compareAt: null,
    bottles: 1,
    scale: 0.86,
  },
  {
    id: 'pink-oil-60',
    name: { en: 'Pink Oil · 60 ml', ar: 'بينك أويل · 60 مل' },
    short: { en: '60 ml', ar: '60 مل' },
    tagline: { en: 'Most loved · about 2 months', ar: 'الأكثر طلبًا · يكفي شهرين تقريبًا' },
    price: 19900,
    compareAt: 24900,
    bottles: 1,
    scale: 1,
    badge: { en: 'Best seller', ar: 'الأكثر مبيعًا' },
  },
  {
    id: 'pink-oil-duo',
    name: { en: 'Pink Oil Ritual Duo · 2 × 60 ml', ar: 'ثنائي بينك أويل · 2 × 60 مل' },
    short: { en: 'Duo 2 × 60 ml', ar: 'ثنائي 2 × 60 مل' },
    tagline: { en: 'Full 4-month ritual · save 30%', ar: 'روتين كامل لـ4 أشهر · وفّري 30٪' },
    price: 34900,
    compareAt: 49800,
    bottles: 2,
    scale: 1,
    badge: { en: 'Best value', ar: 'أفضل قيمة' },
  },
];

// Standard UAE delivery is free from this subtotal.
export const FREE_SHIPPING_THRESHOLD = 15000;

// The communities served by free hand delivery from Dubai Hills.
export const LOCAL_AREAS = {
  en: 'Dubai Hills Estate, Al Barsha South, Arabian Ranches, Mudon, Damac Hills & Al Quoz',
  ar: 'دبي هيلز إستيت، البرشاء جنوب، المرابع العربية، مدن، داماك هيلز والقوز',
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
  local: {
    code: 'local_hand_delivery',
    label: {
      en: 'Free hand delivery: Dubai Hills & nearby communities only',
      ar: 'توصيل يدوي مجاني: دبي هيلز والمجتمعات القريبة فقط',
    },
    amount: 0,
    estimate: { unit: 'business_day', min: 1, max: 1 },
  },
};

export const MAX_QTY = 10;

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id);

/** Formats fils as AED, e.g. "AED 199" / "‏199 د.إ.‏" (Western digits, as used in the UAE). */
export const formatMoney = (fils, lang = 'en') =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar-AE-u-nu-latn' : 'en-AE', {
    style: 'currency',
    currency: CURRENCY.toUpperCase(),
    minimumFractionDigits: fils % 100 ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(fils / 100);
