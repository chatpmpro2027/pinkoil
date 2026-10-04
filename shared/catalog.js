// Single source of truth for products & shipping. The server re-prices every
// cart from this file, so prices sent by the browser are never trusted.

export const CURRENCY = 'usd';

export const PRODUCTS = [
  {
    id: 'pink-oil-30',
    name: 'Pink Oil · 30 ml',
    short: '30 ml',
    tagline: 'Starter · about 1 month',
    price: 3400,
    compareAt: null,
    bottles: 1,
    scale: 0.86,
  },
  {
    id: 'pink-oil-60',
    name: 'Pink Oil · 60 ml',
    short: '60 ml',
    tagline: 'Most loved · about 2 months',
    price: 5400,
    compareAt: 6800,
    bottles: 1,
    scale: 1,
    badge: 'Best seller',
  },
  {
    id: 'pink-oil-duo',
    name: 'Pink Oil Ritual Duo · 2 × 60 ml',
    short: 'Duo 2 × 60 ml',
    tagline: 'Full 4-month ritual · save 20%',
    price: 8900,
    compareAt: 10800,
    bottles: 2,
    scale: 1,
    badge: 'Best value',
  },
];

export const FREE_SHIPPING_THRESHOLD = 5000;

export const SHIPPING = {
  standard: { label: 'Standard shipping (3–6 business days)', amount: 595, min: 3, max: 6 },
  free: { label: 'Free standard shipping (3–6 business days)', amount: 0, min: 3, max: 6 },
  express: { label: 'Express shipping (1–2 business days)', amount: 1495, min: 1, max: 2 },
};

export const MAX_QTY = 10;

export const findProduct = (id) => PRODUCTS.find((p) => p.id === id);

export const formatMoney = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: CURRENCY.toUpperCase() }).format(cents / 100);
