import { PRODUCTS, FREE_SHIPPING_THRESHOLD, MAX_QTY, findProduct, formatMoney } from '../../shared/catalog.js';

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

const INGREDIENTS = {
  rosemary: {
    name: 'Rosemary',
    latin: 'Rosmarinus officinalis leaf oil',
    text: 'The hero of the blend. Rosemary boosts micro-circulation in the scalp so follicles receive more nutrients — studies have compared its effect on hair count to popular growth treatments over six months.',
    tags: ['Growth', 'Circulation', 'Density'],
    art: leaf('#6f8f5e'),
  },
  castor: {
    name: 'Castor',
    latin: 'Ricinus communis seed oil',
    text: 'Rich in ricinoleic acid, cold-pressed castor oil coats and thickens each strand, sealing in moisture to reduce breakage and split ends — so length is retained as hair grows.',
    tags: ['Strength', 'Thickness', 'Moisture'],
    art: drop('#c9a46a'),
  },
  pumpkin: {
    name: 'Pumpkin seed',
    latin: 'Cucurbita pepo seed oil',
    text: 'Packed with zinc, phytosterols and vitamin E, pumpkin seed oil supports a balanced scalp environment and is studied for its role in reducing hair thinning.',
    tags: ['Anti-thinning', 'Zinc', 'Vitamin E'],
    art: seeds('#4c6b3c'),
  },
  jojoba: {
    name: 'Jojoba',
    latin: 'Simmondsia chinensis seed oil',
    text: 'Technically a liquid wax that closely mirrors your scalp’s natural sebum. It balances oil production, calms dryness and flaking, and absorbs without clogging follicles.',
    tags: ['Balance', 'Soothing', 'Lightweight'],
    art: seeds('#d9b45a', 11, 11),
  },
  rosehip: {
    name: 'Rosehip',
    latin: 'Rosa canina fruit oil',
    text: 'The source of Pink Oil’s blush. Rosehip is loaded with essential fatty acids and vitamin A that smooth the cuticle for softness and a glass-like shine.',
    tags: ['Shine', 'Softness', 'Omega 3 & 6'],
    art: bloom('#d0546f'),
  },
  peppermint: {
    name: 'Peppermint',
    latin: 'Mentha piperita oil',
    text: 'A cooling tingle that wakes up the scalp. Peppermint’s menthol encourages blood flow to the follicles and leaves the whole ritual feeling fresh.',
    tags: ['Cooling', 'Freshness', 'Stimulating'],
    art: leaf('#4fa58a'),
  },
};

const tabs = $$('[data-ingredient-tabs] [role="tab"]');
const panel = $('[data-ingredient-panel]');
function showIngredient(key) {
  const ing = INGREDIENTS[key];
  tabs.forEach((t) => {
    const on = t.dataset.key === key;
    t.setAttribute('aria-selected', on);
    t.tabIndex = on ? 0 : -1;
  });
  $('[data-ingredient-art]').innerHTML = ing.art;
  $('[data-ingredient-art]').dataset.key = key;
  $('[data-ingredient-name]').textContent = ing.name;
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
    const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
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
  const cues = ['Small circles at the hairline…', 'Move up to the crown…', 'Now behind the ears and nape…'];
  let left = TOTAL;
  let tick = null;
  const render = () => {
    timeEl.textContent = `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
    ring.style.strokeDashoffset = String(CIRC * (1 - left / TOTAL));
  };
  const stop = (label = 'Resume') => {
    clearInterval(tick);
    tick = null;
    root.classList.remove('is-running');
    btn.textContent = label;
  };
  btn.addEventListener('click', () => {
    if (tick) return stop();
    if (left <= 0) left = TOTAL;
    root.classList.add('is-running');
    btn.textContent = 'Pause';
    tick = setInterval(() => {
      left -= 1;
      sub.textContent = cues[Math.min(2, Math.floor((TOTAL - left) / 60))];
      render();
      if (left <= 0) {
        stop('Start again');
        sub.textContent = 'Beautiful. Leave it in for at least an hour ✨';
        toast('Massage complete — your scalp thanks you ✨');
      }
    }, 1000);
  });
  render();
}

/* ---------- Results slider + strands visualisation ---------- */
{
  const svg = $('[data-strands]');
  const range = $('[data-results-range]');
  const STAGES = [
    [1, 'Scalp feels nourished', 'Dryness and tightness ease. Hair feels softer and looks shinier from the very first wash.'],
    [3, 'Less shedding', 'Fewer strands in the brush and shower drain as roots are nourished and breakage drops.'],
    [5, 'Stronger strands', 'Hair feels thicker to the touch, with fewer split ends and more bounce and elasticity.'],
    [8, 'New baby hairs', 'Look closely at your hairline and part — fine new hairs start to appear.'],
    [11, 'Fuller-looking hair', 'A visibly denser, glossier head of hair. Keep the ritual going to maintain your results.'],
  ];
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
    $('[data-results-week]').textContent = `Week ${week}`;
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
  '<svg viewBox="0 0 30 46" aria-hidden="true"><rect x="10" y="2" width="10" height="9" rx="4" fill="#8f2852"/><rect x="9" y="10" width="12" height="5" rx="1" fill="#e2bd84"/><path d="M6 20c0-3 4-4 5-5h8c1 1 5 2 5 5v21c0 2-1 3-3 3H9c-2 0-3-1-3-3Z" fill="#f28daa"/><rect x="8" y="25" width="14" height="10" rx="1.5" fill="#fff8f6"/></svg>';

function renderCart() {
  const count = cart.count;
  $('[data-cart-count]').textContent = count;
  $('[data-cart-open]').setAttribute('aria-label', `Open bag, ${count} item${count === 1 ? '' : 's'}`);
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
          <p class="line__name">${p.name}</p>
          <p class="line__meta">${p.tagline}</p>
          <div class="qty" role="group" aria-label="Quantity for ${p.name}">
            <button type="button" data-line-dec="${id}" aria-label="Decrease">−</button><span>${qty}</span><button type="button" data-line-inc="${id}" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="line__right"><strong>${formatMoney(p.price * qty)}</strong><button class="line__remove" type="button" data-line-remove="${id}">Remove</button></div>
      </li>`;
    })
    .join('');
  const sub = cart.subtotal;
  $('[data-cart-subtotal]').textContent = formatMoney(sub);
  const remaining = FREE_SHIPPING_THRESHOLD - sub;
  $('[data-ship-text]').textContent =
    remaining > 0 ? `You’re ${formatMoney(remaining)} away from free shipping` : 'You’ve unlocked free shipping 🎉';
  $('[data-ship-bar]').style.width = `${Math.min(100, (sub / FREE_SHIPPING_THRESHOLD) * 100)}%`;
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
  button.textContent = 'Redirecting to secure checkout…';
  try {
    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'Checkout is unavailable right now.');
    location.assign(data.url);
  } catch (err) {
    toast(err.message);
    button.disabled = false;
    button.textContent = label;
  }
}
$('[data-checkout]').addEventListener('click', (e) => checkout(cart.items, e.currentTarget));

if (new URLSearchParams(location.search).get('checkout') === 'cancelled') {
  toast('Checkout cancelled — your bag is saved.');
  history.replaceState(null, '', location.pathname + location.hash);
}

/* ---------- Product picker ---------- */
let selected = 'pink-oil-60';
const variantsEl = $('[data-variants]');
variantsEl.insertAdjacentHTML(
  'beforeend',
  PRODUCTS.map(
    (p) => `<label class="variant">
      <input type="radio" name="variant" value="${p.id}" ${p.id === selected ? 'checked' : ''}>
      <span class="variant__radio" aria-hidden="true"></span>
      <span class="variant__info"><strong>${p.short}</strong><span>${p.tagline}</span></span>
      <span class="variant__price">${formatMoney(p.price)}${p.compareAt ? `<s>${formatMoney(p.compareAt)}</s>` : ''}</span>
      ${p.badge ? `<span class="variant__badge">${p.badge}</span>` : ''}
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
  $('[data-price]').textContent = formatMoney(p.price);
  $('[data-compare]').textContent = p.compareAt ? formatMoney(p.compareAt) : '';
  shopBottle?.setVariant({ bottles: p.bottles, scale: p.scale, ml: id === 'pink-oil-30' ? 30 : 60 });
}
variantsEl.addEventListener('change', (e) => selectVariant(e.target.value));

$('[data-add]').addEventListener('click', () => {
  const qty = clampQty(qtyInput.value);
  cart.add(selected, qty);
  const btn = $('[data-cart-open]');
  btn.classList.remove('is-bump');
  void btn.offsetWidth;
  btn.classList.add('is-bump');
  toast(`Added ${qty} × ${findProduct(selected).short} to your bag`);
});
$('[data-buy-now]').addEventListener('click', (e) =>
  checkout([{ id: selected, qty: clampQty(qtyInput.value) }], e.currentTarget),
);

/* ---------- Quiz ---------- */
{
  const body = $('[data-quiz-body]');
  const stepEl = $('[data-quiz-step]');
  const QUESTIONS = [
    {
      q: 'What’s your #1 hair goal?',
      key: 'goal',
      opts: [
        ['growth', 'Fuller, thicker hair', 'Thinning or sparse areas'],
        ['edges', 'Restore my edges', 'Hairline & temples'],
        ['breakage', 'Stop breakage', 'Split ends & snapping'],
        ['shine', 'Softness & shine', 'Dull or dry lengths'],
      ],
    },
    {
      q: 'How would you describe your hair?',
      key: 'type',
      opts: [
        ['fine', 'Fine & straight', ''],
        ['wavy', 'Wavy', ''],
        ['curly', 'Curly', ''],
        ['coily', 'Coily & kinky', ''],
      ],
    },
    {
      q: 'How long will you commit to the ritual?',
      key: 'commit',
      opts: [
        ['1', 'Let me try it first', 'About 1 month'],
        ['2', 'Two months', 'See real change'],
        ['4', 'The full journey', '12+ weeks for best results'],
      ],
    },
  ];
  const TIPS = {
    growth: 'Focus every drop on the scalp along your parts and never skip the 3-minute massage.',
    edges: 'Apply 1–2 drops directly to the hairline with your fingertip and massage gently — avoid tight styles while you grow.',
    breakage: 'Use on the scalp, then smooth the remainder through your ends to seal them.',
    shine: 'After your scalp, rub one drop between your palms and glaze over dry lengths for instant gloss.',
  };
  const TYPE_TIP = {
    fine: 'Fine hair loves 3 drops per part and an overnight treatment before wash day.',
    wavy: 'Use 4 drops per part, and scrunch any leftover oil into your ends.',
    curly: 'Apply on damp hair before your styler to lock in moisture and definition.',
    coily: 'Use 5 drops per part and seal ends — coily hair drinks this up.',
  };
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
    const id = answers.commit === '4' ? 'pink-oil-duo' : answers.commit === '2' ? 'pink-oil-60' : 'pink-oil-30';
    const p = findProduct(id);
    body.innerHTML = `<div class="quiz__result">
      <p class="eyebrow">Your match</p>
      <h3>${p.name}</h3>
      <p>${TIPS[answers.goal]} ${TYPE_TIP[answers.type]}</p>
      <button class="btn btn--primary" type="button" data-quiz-shop="${id}">Shop my ritual — ${formatMoney(p.price)}</button>
      <button class="btn btn--ghost" type="button" data-quiz-restart>Retake</button>
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
  const by = (dir) => track.scrollBy({ left: dir * track.clientWidth * 0.9, behavior: reduceMotion ? 'auto' : 'smooth' });
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
    '<img class="stage__photo" src="/product.jpg" alt="Pink Oil hair growth oil, 60 ml bottle with dropper" width="894" height="966" loading="lazy" decoding="async">',
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
        shopBottle = await mountBottle(shopStage, { autoRotate: still ? 0 : 0.25, droplets: false });
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
