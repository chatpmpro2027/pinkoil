// Procedural, real-time 3D Pink Oil bottle. Loaded on demand (code-split) so the
// rest of the page is interactive before any WebGL work starts.
import {
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  NeutralToneMapping,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const BODY_R = 1;
const LABEL_FONT = '"Fraunces", Georgia, serif';

// Smooth lathe profile from a list of [radius, y] control points.
function profile(points, segments = 6) {
  const out = [];
  for (let i = 0; i < points.length - 1; i++) {
    const [r0, y0] = points[i];
    const [r1, y1] = points[i + 1];
    for (let s = 0; s < segments; s++) {
      const t = s / segments;
      const e = t * t * (3 - 2 * t); // ease between control points for soft shoulders
      out.push(new Vector2(MathUtils.lerp(r0, r1, e), MathUtils.lerp(y0, y1, t)));
    }
  }
  const [rl, yl] = points[points.length - 1];
  out.push(new Vector2(rl, yl));
  return out;
}

function fontsReady() {
  if (!document.fonts?.load) return Promise.resolve();
  return Promise.race([
    Promise.all([
      document.fonts.load(`600 120px ${LABEL_FONT}`),
      document.fonts.load('italic 400 60px "Fraunces"'),
      document.fonts.load('700 24px "Manrope"'),
    ]),
    new Promise((r) => setTimeout(r, 1500)),
  ]).catch(() => {});
}

// Matches the real Pink Oil bottle: an opaque coral-pink cylinder with soft
// edges, a wide satin-pink cap and a rubber dropper bulb, with the text
// printed directly on the bottle in gold foil.
const COLORS = {
  body: '#e4475f',
  cap: '#e67a89',
  bulb: '#e3808e',
  gold: '#f2d08f',
};
const BODY_H = 2.75;
const CAP_R = 0.68;
const CAP_H = 0.75;
const MODEL_SCALE = 1.2; // uniform scale: full bottle ≈5.9 units tall, filling most of the frame so the print reads clearly

/** Lathe profile for a cylinder with rounded top and bottom edges. */
function roundedCylinder(r, h, fillet, y0 = 0, steps = 8) {
  const pts = [new Vector2(0, y0), new Vector2(r - fillet, y0)];
  for (let i = 1; i <= steps; i++) {
    const a = -Math.PI / 2 + (i / steps) * (Math.PI / 2);
    pts.push(new Vector2(r - fillet + Math.cos(a) * fillet, y0 + fillet + Math.sin(a) * fillet));
  }
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * (Math.PI / 2);
    pts.push(new Vector2(r - fillet + Math.cos(a) * fillet, y0 + h - fillet + Math.sin(a) * fillet));
  }
  pts.push(new Vector2(0, y0 + h));
  return pts;
}

/** Dropper bulb: a small flare where it meets the cap, a straight barrel and a round tip. */
function bulbProfile(y0) {
  const r = 0.29;
  const pts = [new Vector2(0, y0), new Vector2(0.4, y0), new Vector2(0.4, y0 + 0.05)];
  for (let i = 1; i <= 6; i++) {
    const t = i / 6;
    pts.push(new Vector2(MathUtils.lerp(0.4, r, t * t * (3 - 2 * t)), y0 + 0.05 + t * 0.22));
  }
  const top = y0 + 0.88;
  pts.push(new Vector2(r, top));
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * (Math.PI / 2);
    pts.push(new Vector2(Math.cos(a) * r, top + Math.sin(a) * r));
  }
  return pts;
}

/** Gold print artwork as an alpha mask: white = gold foil, black = bare bottle. */
function drawPrint(canvas, ml) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#fff';
  const cx = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  ctx.font = '700 29px "Manrope", Arial, sans-serif';
  ctx.letterSpacing = '6px';
  ctx.fillText('NATURAL · ORGANIC · VEGAN', cx + 3, 82);

  // Rosemary sprig
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 90, 140);
  ctx.quadraticCurveTo(cx, 126, cx + 90, 140);
  ctx.stroke();
  for (let i = -3; i <= 3; i++) {
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(cx + i * 24, 134 + dir * 9, 11, 4.2, dir * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.letterSpacing = '0px';
  ctx.font = `600 196px ${LABEL_FONT}`;
  ctx.fillText('Pink Oil', cx, 345);

  ctx.font = `italic 400 76px ${LABEL_FONT}`;
  ctx.fillText('hair growth oil', cx, 432);

  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 190, 478);
  ctx.lineTo(cx + 190, 478);
  ctx.stroke();

  ctx.font = '700 26px "Manrope", Arial, sans-serif';
  ctx.letterSpacing = '3px';
  ctx.fillText('ROSEMARY · CASTOR · PUMPKIN SEED', cx + 2, 532);
  ctx.font = '700 38px "Manrope", Arial, sans-serif';
  ctx.fillText(ml === 50 ? '50 ml / 1.7 fl oz' : '100 ml / 3.4 fl oz', cx + 3, 604);
}

function createBottle(env) {
  const bottle = new Group();
  const model = new Group();
  model.scale.setScalar(MODEL_SCALE);
  bottle.add(model);

  const body = new Mesh(
    new LatheGeometry(roundedCylinder(BODY_R, BODY_H, 0.16), 96),
    new MeshPhysicalMaterial({
      color: COLORS.body,
      roughness: 0.55,
      clearcoat: 0.3,
      clearcoatRoughness: 0.45,
      envMapIntensity: 0.9,
    }),
  );
  model.add(body);

  const cap = new Mesh(
    new LatheGeometry(roundedCylinder(CAP_R, CAP_H, 0.06, BODY_H - 0.02), 80),
    new MeshPhysicalMaterial({
      color: COLORS.cap,
      roughness: 0.38,
      clearcoat: 0.5,
      clearcoatRoughness: 0.3,
      envMapIntensity: 1,
    }),
  );
  model.add(cap);

  const bulb = new Mesh(
    new LatheGeometry(bulbProfile(BODY_H + CAP_H - 0.04), 64),
    new MeshPhysicalMaterial({
      color: COLORS.bulb,
      roughness: 0.5,
      sheen: 0.5,
      sheenColor: '#ffc2cc',
      clearcoat: 0.25,
      clearcoatRoughness: 0.5,
    }),
  );
  model.add(bulb);

  // Gold foil print wrapped around the front of the bottle.
  const printCanvas = document.createElement('canvas');
  printCanvas.width = 1024;
  printCanvas.height = 640;
  drawPrint(printCanvas, 100);
  const printTex = new CanvasTexture(printCanvas);
  printTex.anisotropy = 8;
  const arc = Math.PI * 0.9;
  const print = new Mesh(
    new CylinderGeometry(BODY_R * 1.003, BODY_R * 1.003, 1.78, 96, 1, true, -arc / 2, arc),
    new MeshStandardMaterial({
      color: COLORS.gold,
      metalness: 0.9,
      roughness: 0.3,
      emissive: '#6b4a1c',
      emissiveIntensity: 0.35,
      alphaMap: printTex,
      transparent: true,
      alphaTest: 0.35,
      envMapIntensity: 1.7,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    }),
  );
  print.position.y = 1.36;
  model.add(print);

  for (const m of [body, cap, bulb, print]) m.material.envMap = env;

  return {
    group: bottle,
    setSize(ml) {
      drawPrint(printCanvas, ml);
      printTex.needsUpdate = true;
    },
  };
}

function softShadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(122,31,69,0.45)');
  grad.addColorStop(0.5, 'rgba(122,31,69,0.14)');
  grad.addColorStop(1, 'rgba(122,31,69,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new CanvasTexture(c);
}

/**
 * Mounts an interactive bottle into `stage` (an element containing a canvas).
 * Returns a controller: setVariant({ bottles, scale, ml }), dispose().
 */
export async function mountBottle(stage, { autoRotate = 0.35, scrollSpin = false } = {}) {
  const canvas = stage.querySelector('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  // Neutral tone mapping keeps the bottle's pink true to the real product.
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;

  const scene = new Scene();
  const pmrem = new PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.environment = env;

  const key = new DirectionalLight('#ffffff', 1.8);
  key.position.set(3, 6, 5);
  const rim = new DirectionalLight('#ff8fb4', 3);
  rim.position.set(-5, 3, -4);
  const fill = new DirectionalLight('#ffe2c4', 0.8);
  fill.position.set(4, 1, -2);
  scene.add(key, rim, fill);

  const camera = new PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 3.1, 13);
  camera.lookAt(0, 2.8, 0);

  await fontsReady();

  const rig = new Group(); // user rotation
  scene.add(rig);
  const a = createBottle(env);
  const b = createBottle(env);
  b.group.visible = false;
  rig.add(a.group, b.group);

  const shadow = new Mesh(
    new PlaneGeometry(5.6, 5.6),
    new MeshBasicMaterial({ map: softShadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.01;
  scene.add(shadow);

  // Variant state (animated toward targets)
  let duo = false;
  let scaleTarget = 1;
  let scaleNow = 1;
  let spread = 0;

  // Interaction
  let rotY = -0.35;
  let velocity = 0;
  let dragging = false;
  let lastX = 0;
  let tiltX = 0;
  let tiltTarget = 0;
  let idleSpin = autoRotate;

  const onDown = (e) => {
    dragging = true;
    lastX = e.clientX;
    velocity = 0;
    stage.classList.add('is-dragging', 'has-interacted');
  };
  const onMove = (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    velocity = dx * 0.0085;
    rotY += velocity;
  };
  const onUp = () => {
    dragging = false;
    stage.classList.remove('is-dragging');
  };
  const onHover = (e) => {
    const r = stage.getBoundingClientRect();
    tiltTarget = ((e.clientY - r.top) / r.height - 0.5) * 0.25;
  };
  stage.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  stage.addEventListener('pointermove', onHover, { passive: true });
  stage.addEventListener('pointerleave', () => (tiltTarget = 0));

  const resize = () => {
    const { width, height } = stage.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the bottle fully framed on narrow (portrait) stages.
    camera.position.z = 13 / Math.min(1, camera.aspect * 1.05);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  resize();

  // Dynamic resolution: if the device struggles (sustained < ~40fps), drop the
  // pixel ratio step by step so scrolling and taps stay smooth.
  let slowFrames = 0;
  let sampled = 0;
  function adapt(dt) {
    if (pixelRatio <= 1 || ++sampled < 20) return;
    slowFrames = dt > 0.025 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 30) {
      pixelRatio = Math.max(1, pixelRatio - 0.5);
      renderer.setPixelRatio(pixelRatio);
      resize();
      slowFrames = 0;
    }
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let last = performance.now();
  let t = 0;
  let firstFrame = true;

  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    t += dt;

    if (!dragging) {
      velocity *= 0.94;
      rotY += velocity + (reduceMotion ? 0 : idleSpin * dt);
    }
    const scrollTurn = scrollSpin && !reduceMotion ? MathUtils.clamp(scrollY / innerHeight, 0, 1) * 1.6 : 0;
    tiltX += (tiltTarget - tiltX) * 0.06;
    // Each bottle spins on its own axis so the Duo never overlaps itself.
    rig.rotation.set(tiltX, 0, 0);
    a.group.rotation.y = rotY + scrollTurn;
    b.group.rotation.y = rotY + scrollTurn + 0.7;
    rig.position.y = reduceMotion ? 0 : Math.sin(t * 1.3) * 0.06;

    scaleNow += (scaleTarget - scaleNow) * 0.1;
    spread += ((duo ? 1 : 0) - spread) * 0.1;
    const gap = 1.25 * spread;
    a.group.scale.setScalar(scaleNow);
    a.group.position.set(-gap * 0.9, 0, -gap * 0.35);
    b.group.visible = spread > 0.02;
    b.group.scale.setScalar(scaleNow * spread);
    b.group.position.set(gap * 0.95, 0, gap * 0.45);
    shadow.scale.set(1 + spread * 0.9, 1, 1 + spread * 0.3);

    renderer.render(scene, camera);
    adapt(dt);
    if (firstFrame) {
      firstFrame = false;
      stage.classList.add('is-ready');
    }
  }

  // Only render while the stage is on-screen and the tab is visible.
  let onScreen = false;
  const sync = () => {
    const run = onScreen && !document.hidden;
    renderer.setAnimationLoop(run ? frame : null);
    if (run) last = performance.now();
  };
  const io = new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  });
  io.observe(stage);
  document.addEventListener('visibilitychange', sync);

  return {
    setVariant({ bottles = 1, scale = 1, ml = 100 }) {
      duo = bottles > 1;
      scaleTarget = duo ? 0.82 : scale;
      a.setSize(ml);
      b.setSize(ml);
      if (idleSpin) velocity += 0.12; // a little celebratory spin
    },
    setAutoRotate(v) {
      idleSpin = v;
    },
    dispose() {
      renderer.setAnimationLoop(null);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      renderer.dispose();
    },
  };
}
