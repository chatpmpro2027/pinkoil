// Procedural, real-time 3D Pink Oil bottle. Loaded on demand (code-split) so the
// rest of the page is interactive before any WebGL work starts.
import {
  ACESFilmicToneMapping,
  CanvasTexture,
  CylinderGeometry,
  DirectionalLight,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
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
      document.fonts.load(`400 120px ${LABEL_FONT}`),
      document.fonts.load('italic 400 60px "Fraunces"'),
      document.fonts.load('700 24px "Manrope"'),
    ]),
    new Promise((r) => setTimeout(r, 1500)),
  ]).catch(() => {});
}

function drawLabel(canvas, size) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);

  const bg = ctx.createLinearGradient(0, 0, w, 0);
  bg.addColorStop(0, '#f6e4e6');
  bg.addColorStop(0.5, '#fffaf8');
  bg.addColorStop(1, '#f6e4e6');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = '#c9a46a';
  ctx.lineWidth = 3;
  ctx.strokeRect(22, 22, w - 44, h - 44);
  ctx.lineWidth = 1;
  ctx.strokeRect(32, 32, w - 64, h - 64);

  const cx = w / 2;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#b4436c';
  ctx.font = `700 22px "Manrope", Arial, sans-serif`;
  ctx.letterSpacing = '8px';
  ctx.fillText('NATURAL · ORGANIC · VEGAN', cx + 4, 96);

  // Sprig illustration
  ctx.strokeStyle = '#6f8f5e';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 70, 128);
  ctx.quadraticCurveTo(cx, 116, cx + 70, 128);
  ctx.stroke();
  ctx.fillStyle = '#6f8f5e';
  for (let i = -3; i <= 3; i++) {
    const x = cx + i * 18;
    for (const dir of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(x, 123 + dir * 7, 8, 3, dir * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.letterSpacing = '0px';
  ctx.fillStyle = '#7a1f45';
  ctx.font = `400 150px ${LABEL_FONT}`;
  ctx.fillText('Pink Oil', cx, 280);

  ctx.font = `italic 400 52px ${LABEL_FONT}`;
  ctx.fillStyle = '#b4436c';
  ctx.fillText('hair growth oil', cx, 345);

  ctx.font = `600 22px "Manrope", Arial, sans-serif`;
  ctx.letterSpacing = '5px';
  ctx.fillStyle = '#5e4651';
  ctx.fillText('ROSEMARY · CASTOR · PUMPKIN SEED', cx + 3, 400);
  ctx.font = `700 24px "Manrope", Arial, sans-serif`;
  ctx.fillStyle = '#7a1f45';
  ctx.fillText(size === 50 ? '50 ml / 1.7 fl oz' : '100 ml / 3.4 fl oz', cx + 3, 446);
}

function createBottle(env) {
  const bottle = new Group();

  const glass = new MeshPhysicalMaterial({
    color: '#ffe3ea',
    roughness: 0.04,
    metalness: 0,
    transparent: true,
    opacity: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.6,
    depthWrite: false,
  });
  const body = new Mesh(
    new LatheGeometry(
      profile([
        [0, 0],
        [0.86, 0],
        [0.99, 0.12],
        [BODY_R, 0.4],
        [BODY_R, 2.2],
        [0.94, 2.55],
        [0.62, 2.82],
        [0.36, 2.92],
        [0.34, 3.1],
      ]),
      72,
    ),
    glass,
  );
  body.renderOrder = 2;
  bottle.add(body);

  const oil = new Mesh(
    new LatheGeometry(
      profile([
        [0, 0.05],
        [0.84, 0.05],
        [0.94, 0.16],
        [0.95, 0.42],
        [0.95, 2.05],
        [0, 2.05],
      ]),
      64,
    ),
    new MeshPhysicalMaterial({
      color: '#ec5a88',
      emissive: '#7a1238',
      emissiveIntensity: 0.35,
      roughness: 0.12,
      clearcoat: 1,
      sheen: 1,
      sheenColor: '#ffd0a0',
      envMapIntensity: 1.2,
    }),
  );
  bottle.add(oil);

  const pipette = new Mesh(
    new CylinderGeometry(0.075, 0.045, 2.75, 20),
    new MeshPhysicalMaterial({ color: '#fbe7ec', roughness: 0.1, transparent: true, opacity: 0.55, depthWrite: false }),
  );
  pipette.position.y = 1.85;
  pipette.renderOrder = 1;
  bottle.add(pipette);

  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 1024;
  labelCanvas.height = 480;
  drawLabel(labelCanvas, 100);
  const labelTex = new CanvasTexture(labelCanvas);
  labelTex.colorSpace = SRGBColorSpace;
  labelTex.anisotropy = 8;
  const labelArc = Math.PI * 0.92;
  const label = new Mesh(
    new CylinderGeometry(BODY_R * 1.008, BODY_R * 1.008, 1.36, 72, 1, true, -labelArc / 2, labelArc),
    new MeshStandardMaterial({ map: labelTex, roughness: 0.6, envMapIntensity: 0.9 }),
  );
  label.position.y = 1.32;
  bottle.add(label);

  const gold = new MeshStandardMaterial({ color: '#e2bd84', metalness: 1, roughness: 0.22, envMapIntensity: 1.4 });
  const collar = new Mesh(new CylinderGeometry(0.43, 0.45, 0.42, 48), gold);
  collar.position.y = 3.2;
  bottle.add(collar);
  const ring = new Mesh(new TorusGeometry(0.43, 0.035, 12, 48), gold);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 3.41;
  bottle.add(ring);

  const bulb = new Mesh(
    new LatheGeometry(
      profile(
        [
          [0, 3.4],
          [0.37, 3.42],
          [0.39, 3.75],
          [0.36, 4.12],
          [0.2, 4.38],
          [0, 4.43],
        ],
        8,
      ),
      48,
    ),
    new MeshPhysicalMaterial({ color: '#8f2852', roughness: 0.38, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: '#ff9fbf' }),
  );
  bottle.add(bulb);

  for (const m of [body, oil, pipette, label, collar, ring, bulb]) m.material.envMap = env;

  return {
    group: bottle,
    setSize(ml) {
      drawLabel(labelCanvas, ml);
      labelTex.needsUpdate = true;
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
export async function mountBottle(stage, { autoRotate = 0.35, scrollSpin = false, droplets = true } = {}) {
  const canvas = stage.querySelector('canvas');
  const renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);
  renderer.toneMapping = ACESFilmicToneMapping;
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
  camera.position.set(0, 2.4, 13);
  camera.lookAt(0, 2.05, 0);

  await fontsReady();

  const rig = new Group(); // user rotation
  scene.add(rig);
  const a = createBottle(env);
  const b = createBottle(env);
  b.group.visible = false;
  rig.add(a.group, b.group);

  const shadow = new Mesh(
    new PlaneGeometry(4.2, 4.2),
    new MeshBasicMaterial({ map: softShadowTexture(), transparent: true, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.01;
  scene.add(shadow);

  const drops = [];
  if (droplets) {
    const dropGeo = new SphereGeometry(1, 24, 16);
    dropGeo.translate(0, 0.35, 0);
    const dropMat = new MeshPhysicalMaterial({
      color: '#ff9fbb',
      roughness: 0.05,
      clearcoat: 1,
      transparent: true,
      opacity: 0.8,
      envMapIntensity: 2,
    });
    const spots = [
      [-2.1, 3.6, -0.5, 0.13],
      [2.0, 1.2, 0.4, 0.16],
      [1.7, 3.9, -1, 0.1],
      [-1.8, 0.9, 0.8, 0.11],
      [2.4, 2.7, -1.6, 0.08],
      [-2.5, 2.2, -1.8, 0.09],
    ];
    for (const [x, y, z, s] of spots) {
      const d = new Mesh(dropGeo, dropMat);
      d.position.set(x, y, z);
      d.scale.set(s, s * 1.3, s);
      d.userData = { y, phase: Math.random() * Math.PI * 2 };
      scene.add(d);
      drops.push(d);
    }
  }

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

    for (const d of drops) {
      d.position.y = d.userData.y + Math.sin(t * 0.9 + d.userData.phase) * 0.18;
      d.rotation.z = Math.sin(t * 0.7 + d.userData.phase) * 0.2;
    }

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
