import { PRODUCTS, DEFAULT_PRODUCT, DISCOUNT, FREE_SHIPPING_THRESHOLD, MAX_QTY, STORE, findProduct, formatMoney } from '../../shared/catalog.js';
import { T, lang, rtl } from './strings.js';

const money = (fils) => formatMoney(fils, lang);

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Toast ---------- */
const toastEl = $('[data-toast]');
let toastTimer;
function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3200);
}

/* ---------- Nav ---------- */
const nav = $('[data-nav]');
const onScroll = () => nav.classList.toggle('is-scrolled', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true });
onScroll();
$('[data-year]').textContent = new Date().getFullYear();

/* ---------- Reveal on scroll ---------- */
const revealIO = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.classList.add('is-in');
      revealIO.unobserve(e.target);
    }
  },
  { rootMargin: '0px 0px -8% 0px' },
);
$$('.reveal').forEach((el, i) => {
  el.style.transitionDelay = `${(i % 4) * 70}ms`;
  revealIO.observe(el);
});

/* ---------- 3D tilt cards ---------- */
if (!reduceMotion && matchMedia('(hover: hover)').matches) {
  for (const card of $$('[data-tilt]')) {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${-y * 8}deg) rotateY(${x * 10}deg) translateY(-4px)`;
    });
    card.addEventListener('pointerleave', () => (card.style.transform = ''));
  }
}

/* ---------- Ingredients ---------- */
const leaf = (c) =>
  `<svg viewBox="0 0 100 100"><path d="M50 92V30" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>${[30, 42, 54, 66, 78]
    .map((y, i) => `<path d="M50 ${y}c-${14 + i * 2} -4 -${22 + i * 2} -14 -${24 + i} -${22 - i}c${12} 0 ${22} 8 ${24 + i} ${22 - i}Z" fill="${c}" opacity=".85"/><path d="M50 ${y}c${14 + i * 2} -4 ${22 + i * 2} -14 ${24 + i} -${22 - i}c-${12} 0 -${22} 8 -${24 + i} ${22 - i}Z" fill="${c}" opacity=".65"/>`)
    .join('')}</svg>`;
const seeds = (c, rx = 9, ry = 14) =>
  `<svg viewBox="0 0 100 100">${[
    [32, 38, -20],
    [56, 30, 15],
    [70, 56, 40],
    [42, 62, -35],
    [58, 76, 5],
    [28, 76, 60],
  ]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${r} ${x} ${y})" fill="${c}"/><ellipse cx="${x - 2}" cy="${y - 4}" rx="${rx / 3}" ry="${ry / 3}" transform="rotate(${r} ${x} ${y})" fill="#fff" opacity=".45"/>`)
    .join('')}</svg>`;
const bloom = (c) =>
  `<svg viewBox="0 0 100 100">${[0, 72, 144, 216, 288]
    .map((r) => `<ellipse cx="50" cy="30" rx="15" ry="22" fill="${c}" opacity=".8" transform="rotate(${r} 50 50)"/>`)
    .join('')}<circle cx="50" cy="50" r="9" fill="#e9b949"/></svg>`;
const drop = (c) =>
  `<svg viewBox="0 0 100 100"><path d="M50 12c14 20 28 34 28 50a28 28 0 0 1-56 0c0-16 14-30 28-50Z" fill="${c}"/><path d="M38 62a12 12 0 0 0 12 12" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".6"/></svg>`;

const ART = {
  rosemary: leaf('#6f8f5e'),
  castor: drop('#c9a46a'),
  pumpkin: seeds('#4c6b3c'),
  jojoba: seeds('#d9b45a', 11, 11),
  rosehip: bloom('#d0546f'),
  peppermint: leaf('#4fa58a'),
};

const tabs = $$('[data-ingredient-tabs] [role="tab"]');
const panel = $('[data-ingredient-panel]');
function showIngredient(key) {
  const ing = T.ingredients[key];
  const tab = tabs.find((t) => t.dataset.key === key);
  tabs.forEach((t) => {
    const on = t.dataset.key === key;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
  });
  $('[data-ingredient-art]').innerHTML = ART[key];
  $('[data-ingredient-art]').dataset.key = key;
  $('[data-ingredient-name]').textContent = tab.textContent.trim();
  $('[data-ingredient-latin]').textContent = ing.latin;
  $('[data-ingredient-text]').textContent = ing.text;
  $('[data-ingredient-tags]').innerHTML = ing.tags.map((t) => `<li>${t}</li>`).join('');
  panel.classList.remove('is-swapping');
  void panel.offsetWidth;
  panel.classList.add('is-swapping');
}
tabs.forEach((t, i) => {
  t.addEventListener('click', () => showIngredient(t.dataset.key));
  t.addEventListener('keydown', (e) => {
    const dir = { ArrowDown: 1, ArrowRight: rtl ? -1 : 1, ArrowUp: -1, ArrowLeft: rtl ? 1 : -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = tabs[(i + dir + tabs.length) % tabs.length];
    next.focus();
    showIngredient(next.dataset.key);
  });
});
showIngredient('rosemary');
panel.classList.remove('is-swapping');

/* ---------- Massage timer ---------- */
{
  const root = $('[data-timer]');
  const timeEl = $('[data-timer-time]');
  const ring = $('[data-timer-progress]');
  const btn = $('[data-timer-toggle]');
  const sub = $('[data-timer-sub]');
  const TOTAL = 180;
  const CIRC = 2 * Math.PI * 52;
  const cues = T.timerCues;
  let left = TOTAL;
  let tick = null;
  const render = () => {
    timeEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    ring.style.strokeDashoffset = String(CIRC * (1 - left / TOTAL));
  };
  const stop = (label = T.resume) => {
    clearInterval(tick);
    tick = null;
    root.classList.remove('is-running');
    btn.textContent = label;
  };
  btn.addEventListener('click', () => {
    if (tick) return stop();
    if (left <= 0) left = TOTAL;
    root.classList.add('is-running');
    btn.textContent = T.pause;
    tick = setInterval(() => {
      left -= 1;
      sub.textContent = cues[Math.min(2, Math.floor((TOTAL - left) / 60))];
      render();
      if (left <= 0) {
        stop(T.startAgain);
        sub.textContent = T.timerDone;
        toast(T.timerToast);
      }
    }, 1000);
  });
  render();
}

/* ---------- Results slider + strands visualisation ---------- */
{
  const svg = $('[data-strands]');
  const range = $('[data-results-range]');
  const STAGES = [1, 3, 5, 8, 11].map((w, i) => [w, ...T.stages[i]]);
  const N = 46;
  const strands = [];
  const NS = 'http://www.w3.org/2000/svg';
  const defs = document.createElementNS(NS, 'defs');
  defs.innerHTML = '<linearGradient id="hair" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#7a1f45"/><stop offset="1" stop-color="#f4a6bd"/></linearGradient>';
  svg.append(defs);
  const scalp = document.createElementNS(NS, 'path');
  scalp.setAttribute('d', 'M0 196 Q160 176 320 196 L320 200 L0 200Z');
  scalp.setAttribute('fill', '#f4c7d1');
  scalp.setAttribute('opacity', '.35');
  for (let i = 0; i < N; i++) {
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('stroke', 'url(#hair)');
    const seed = Math.sin(i * 91.7) * 0.5 + 0.5;
    strands.push({ el: p, x: 12 + (i / (N - 1)) * 296 + (seed - 0.5) * 6, seed, order: (i * 7) % N });
    svg.append(p);
  }
  svg.append(scalp);

  function update(week) {
    const stage = [...STAGES].reverse().find(([w]) => week >= w);
    $('[data-results-week]').textContent = T.week(week);
    $('[data-results-title]').textContent = stage[1];
    $('[data-results-text]').textContent = stage[2];
    range.style.setProperty('--p', `${((week - 1) / 11) * 100}%`);
    const visible = Math.round(N * (0.45 + (week / 12) * 0.55));
    for (const s of strands) {
      const base = 186 - Math.abs(s.x - 160) * 0.06;
      const len = (50 + week * 8) * (0.75 + s.seed * 0.4);
      const sway = ((s.seed - 0.5) * 30 + (s.x - 160) * 0.12) * (len / 160);
      s.el.setAttribute('d', `M${s.x} ${base} C${s.x} ${base - len * 0.4} ${s.x + sway} ${base - len * 0.7} ${s.x + sway * 1.3} ${base - len}`);
      s.el.style.strokeWidth = `${1.2 + week * 0.12}`;
      s.el.style.opacity = s.order < visible ? `${0.55 + s.seed * 0.45}` : '0';
    }
  }
  range.addEventListener('input', () => update(Number(range.value)));
  update(1);
}

/* ---------- Cart ---------- */
const CART_KEY = 'pinkoil.cart.v1';
const cart = {
  items: (() => {
    try {
      const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return saved.filter((i) => findProduct(i.id) && Number.isInteger(i.qty) && i.qty > 0);
    } catch {
      return [];
    }
  })(),
  save() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(this.items));
    } catch {}
    renderCart();
    document.dispatchEvent(new Event('cart:change'));
  },
  add(id, qty) {
    const line = this.items.find((i) => i.id === id);
    if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
    else this.items.push({ id, qty: Math.min(MAX_QTY, qty) });
    this.save();
  },
  set(id, qty) {
    if (qty <= 0) this.items = this.items.filter((i) => i.id !== id);
    else this.items.find((i) => i.id === id).qty = Math.min(MAX_QTY, qty);
    this.save();
  },
  get count() {
    return this.items.reduce((n, i) => n + i.qty, 0);
  },
  get subtotal() {
    return this.items.reduce((n, i) => n + findProduct(i.id).price * i.qty, 0);
  },
};

const miniBottle =
  '<svg viewBox="0 0 30 46" aria-hidden="true"><rect x="13" y="1" width="4" height="9" rx="2" fill="#f08e9c"/><rect x="9.5" y="9" width="11" height="9" rx="1.2" fill="#f08e9c"/><rect x="8" y="17.5" width="14" height="26" rx="2.4" fill="#e4475f"/><rect x="11" y="27" width="8" height="1.6" rx=".8" fill="#f2d08f"/><rect x="12" y="30.5" width="6" height="1" rx=".5" fill="#f2d08f"/></svg>';

function renderCart() {
  const count = cart.count;
  $('[data-cart-count]').textContent = count;
  $('[data-cart-open]').setAttribute('aria-label', T.openBag(count));
  const empty = cart.items.length === 0;
  $('[data-cart-empty]').hidden = !empty;
  $('[data-cart-foot]').hidden = empty;
  $('[data-cart-items]').hidden = empty;
  $('[data-cart-items]').innerHTML = cart.items
    .map(({ id, qty }) => {
      const p = findProduct(id);
      return `<li class="line">
        <div class="line__thumb">${miniBottle}</div>
        <div>
          <p class="line__name">${p.name[lang]}</p>
          <p class="line__meta">${p.tagline[lang]}</p>
          <div class="qty" role="group" aria-label="${T.qtyFor(p.name[lang])}">
            <button type="button" data-line-dec="${id}" aria-label="${T.decrease}">−</button><span>${qty}</span><button type="button" data-line-inc="${id}" aria-label="${T.increase}">+</button>
          </div>
        </div>
        <div class="line__right"><strong>${money(p.price * qty)}</strong><button class="line__remove" type="button" data-line-remove="${id}">${T.remove}</button></div>
      </li>`;
    })
    .join('');
  const sub = cart.subtotal;
  $('[data-cart-subtotal]').textContent = money(sub);
  // One meter, two goals: free delivery first, then the 10% discount.
  const goal = sub < FREE_SHIPPING_THRESHOLD ? FREE_SHIPPING_THRESHOLD : DISCOUNT.threshold;
  $('[data-ship-text]').textContent =
    sub < FREE_SHIPPING_THRESHOLD
      ? T.awayFromFree(money(FREE_SHIPPING_THRESHOLD - sub))
      : sub < DISCOUNT.threshold
        ? T.awayFromDiscount(money(DISCOUNT.threshold - sub))
        : T.allUnlocked;
  $('[data-ship-bar]').style.width = `${Math.min(100, (sub / goal) * 100)}%`;
  const saving = sub >= DISCOUNT.threshold ? Math.round((sub * DISCOUNT.percent) / 100) : 0;
  $('[data-cart-discount]').hidden = !saving;
  $('[data-cart-discount-amount]').textContent = `−${money(saving)}`;
  $('[data-cart-total]').textContent = money(sub - saving);
}

$('[data-cart-items]').addEventListener('click', (e) => {
  const t = e.target.closest('button');
  if (!t) return;
  const { lineInc, lineDec, lineRemove } = t.dataset;
  const id = lineInc || lineDec || lineRemove;
  const line = cart.items.find((i) => i.id === id);
  if (!line) return;
  if (lineRemove) cart.set(id, 0);
  else cart.set(id, line.qty + (lineInc ? 1 : -1));
});

/* ---------- Drawer ---------- */
const drawer = $('[data-drawer]');
let lastFocus = null;
function openCart() {
  lastFocus = document.activeElement;
  drawer.hidden = false;
  requestAnimationFrame(() => drawer.classList.add('is-open'));
  $('.drawer__panel').focus();
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  drawer.classList.remove('is-open');
  document.body.style.overflow = '';
  setTimeout(() => (drawer.hidden = true), reduceMotion ? 0 : 400);
  lastFocus?.focus?.();
}
$('[data-cart-open]').addEventListener('click', openCart);
$$('[data-cart-close]').forEach((el) => el.addEventListener('click', closeCart));
addEventListener('keydown', (e) => {
  if (drawer.hidden) return;
  if (e.key === 'Escape') closeCart();
  if (e.key === 'Tab') {
    const focusables = $$('button, a[href], input', drawer).filter((el) => el.offsetParent !== null);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
    else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
  }
});

/* ---------- Checkout (Stripe) ---------- */
async function checkout(items, button) {
  const label = button.textContent;
  button.disabled = true;
  button.textContent = T.redirecting;
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items, lang }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || T.checkoutDown);
    location.assign(data.url);
  } catch (err) {
    toast(err.message);
    button.disabled = false;
    button.textContent = label;
  }
}
$('[data-checkout]').addEventListener('click', (e) => checkout(cart.items, e.currentTarget));

if (new URLSearchParams(location.search).get('checkout') === 'cancelled') {
  toast(T.cancelled);
  history.replaceState(null, '', location.pathname + location.hash);
}

/* ---------- Product picker ---------- */
let selected = DEFAULT_PRODUCT;
const variantsEl = $('[data-variants]');
variantsEl.insertAdjacentHTML(
  'beforeend',
  PRODUCTS.map(
    (p) => `<label class="variant">
      <input type="radio" name="variant" value="${p.id}" ${p.id === selected ? 'checked' : ''}>
      <span class="variant__radio" aria-hidden="true"></span>
      <span class="variant__info"><strong>${p.short[lang]}</strong><span>${p.tagline[lang]}</span></span>
      <span class="variant__price">${money(p.price)}${p.compareAt ? `<s>${money(p.compareAt)}</s>` : ''}</span>
      ${p.badge ? `<span class="variant__badge">${p.badge[lang]}</span>` : ''}
    </label>`,
  ).join(''),
);
const qtyInput = $('[data-qty-input]');
const clampQty = (n) => Math.max(1, Math.min(MAX_QTY, Number.parseInt(n, 10) || 1));
$('[data-qty-dec]').addEventListener('click', () => (qtyInput.value = clampQty(qtyInput.value - 1)));
$('[data-qty-inc]').addEventListener('click', () => (qtyInput.value = clampQty(Number(qtyInput.value) + 1)));
qtyInput.addEventListener('change', () => (qtyInput.value = clampQty(qtyInput.value)));

let shopBottle = null;
function selectVariant(id) {
  selected = id;
  const p = findProduct(id);
  const radio = $(`input[value="${id}"]`, variantsEl);
  if (radio) radio.checked = true;
  $('[data-price]').textContent = money(p.price);
  $('[data-compare]').textContent = p.compareAt ? money(p.compareAt) : '';
  shopBottle?.setVariant({ bottles: 1, scale: p.scale, ml: p.ml });
}
variantsEl.addEventListener('change', (e) => selectVariant(e.target.value));

$('[data-add]').addEventListener('click', () => {
  const qty = clampQty(qtyInput.value);
  cart.add(selected, qty);
  const btn = $('[data-cart-open]');
  btn.classList.remove('is-bump');
  void btn.offsetWidth;
  btn.classList.add('is-bump');
  toast(T.added(qty, findProduct(selected).short[lang]));
});
$('[data-buy-now]').addEventListener('click', (e) =>
  checkout([{ id: selected, qty: clampQty(qtyInput.value) }], e.currentTarget),
);

/* ---------- Quiz ---------- */
{
  const body = $('[data-quiz-body]');
  const stepEl = $('[data-quiz-step]');
  const QUESTIONS = T.quiz;
  const answers = {};
  let step = 0;
  function renderQuiz() {
    if (step < QUESTIONS.length) {
      const { q, opts } = QUESTIONS[step];
      stepEl.textContent = step + 1;
      body.innerHTML = `<div><p class="quiz__q">${q}</p><div class="quiz__opts">${opts
        .map(([v, l, s]) => `<button type="button" data-v="${v}">${l}${s ? `<small>${s}</small>` : ''}</button>`)
        .join('')}</div></div>`;
      return;
    }
    stepEl.textContent = '3';
    const id = answers.commit === '4' ? 'pink-oil-100' : 'pink-oil-50';
    const p = findProduct(id);
    body.innerHTML = `<div class="quiz__result">
      <p class="eyebrow">${T.yourMatch}</p>
      <h3>${p.name[lang]}</h3>
      <p>${T.tips[answers.goal]} ${T.typeTips[answers.type]}</p>
      <button class="btn btn--primary" type="button" data-quiz-shop="${id}">${T.shopRitual(money(p.price))}</button>
      <button class="btn btn--ghost" type="button" data-quiz-restart>${T.retake}</button>
    </div>`;
  }
  body.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.v) {
      answers[QUESTIONS[step].key] = btn.dataset.v;
      step++;
      renderQuiz();
    } else if (btn.dataset.quizShop) {
      selectVariant(btn.dataset.quizShop);
      $('#shop').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
    } else if ('quizRestart' in btn.dataset) {
      step = 0;
      renderQuiz();
    }
  });
  renderQuiz();
}

/* ---------- Reviews carousel ---------- */
{
  const track = $('[data-reviews]');
  // In RTL the track scrolls toward negative offsets.
  const by = (dir) => track.scrollBy({ left: (rtl ? -dir : dir) * track.clientWidth * 0.9, behavior: reduceMotion ? 'auto' : 'smooth' });
  $('[data-reviews-prev]').addEventListener('click', () => by(-1));
  $('[data-reviews-next]').addEventListener('click', () => by(1));
}

/* ---------- 3D bottles (lazy) ---------- */
// Real-time 3D only on a hardware GPU. Software rasterisers (no GPU / blocklisted
// drivers) would render on the CPU and make the page sluggish, so they keep the
// lightweight illustrated bottle instead.
function gpuAvailable() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return false;
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(renderer);
  } catch {
    return false;
  }
}
const saveData = navigator.connection?.saveData === true;
// ?still freezes the bottles at their front pose (used to capture product photos).
const still = new URLSearchParams(location.search).has('still');
const heroStage = $('[data-stage="hero"]');
// No-GPU fallback for the shop: a pre-rendered photo of the same 3D bottle.
function showShopPhoto() {
  shopStage.querySelector('.stage__hint')?.remove();
  shopStage.insertAdjacentHTML(
    'beforeend',
    `<img class="stage__photo" src="/product.jpg" alt="${findProduct(DEFAULT_PRODUCT).name[lang]}" width="894" height="966" loading="lazy" decoding="async">`,
  );
}
const shopStage = $('[data-stage="shop"]');

if ((gpuAvailable() || still) && !saveData) {
  const load = () => import('./bottle3d.js');
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 200));
  // Hero: start after first paint so text (the LCP) is never blocked by WebGL.
  addEventListener('load', () =>
    idle(() =>
      load()
        .then(({ mountBottle }) => mountBottle(heroStage, { autoRotate: still ? 0 : 0.4, scrollSpin: !still }))
        .catch((err) => console.warn('3D unavailable', err)),
    ),
  );
  // Shop: mount when it approaches the viewport.
  const shopIO = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return;
      shopIO.disconnect();
      try {
        const { mountBottle } = await load();
        shopBottle = await mountBottle(shopStage, { autoRotate: still ? 0 : 0.25 });
        selectVariant(selected);
      } catch (err) {
        console.warn('3D unavailable', err);
        showShopPhoto();
      }
    },
    { rootMargin: '400px 0px' },
  );
  shopIO.observe(shopStage);
} else {
  heroStage.querySelector('.stage__hint')?.remove();
  shopStage.querySelector('.stage__hint')?.remove();
  showShopPhoto();
}

selectVariant(selected);
renderCart();

/* ---------- WhatsApp ordering ---------- */
if (STORE.whatsapp) {
  const wa = $('[data-whatsapp]');
  const link = () => {
    const lines = cart.items.map(({ id, qty }) => `• ${qty} × ${findProduct(id).name[lang]}`);
    const text = lines.length ? `${T.waMessage}\n${lines.join('\n')}` : T.waGeneric;
    return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
  };
  // Keep the prefilled message in sync with the bag.
  wa.href = link();
  document.addEventListener('cart:change', () => (wa.href = link()));
  wa.hidden = false;
}
