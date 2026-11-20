// 格闘カマキリ 3D
import * as THREE from 'three';

// ============================================================
//  DOM / レンダラ
// ============================================================
const stage = document.getElementById('stage');
const glCanvas = document.getElementById('gl');
const hud = document.getElementById('hud');
const hctx = hud.getContext('2d');
const titleEl = document.getElementById('title');
const resultEl = document.getElementById('result');
const resultText = document.getElementById('resultText');
const touchEl = document.getElementById('touch');

const renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

let hudScale = 1;
function resize() {
  const w = Math.floor(Math.min(window.innerWidth, window.innerHeight * 16 / 9));
  const h = Math.floor(w * 9 / 16);
  stage.style.width = w + 'px';
  stage.style.height = h + 'px';
  renderer.setSize(w, h, false);
  const pr = Math.min(window.devicePixelRatio || 1, 2);
  hud.width = Math.round(w * pr);
  hud.height = Math.round(h * pr);
  hudScale = hud.width / 960;
}
window.addEventListener('resize', resize);
resize();

// ============================================================
//  サウンド（WebAudioで合成）
// ============================================================
let actx = null;
let muted = false;
function audio() {
  if (!actx) {
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
  }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function tone(freq, dur, type = 'square', vol = 0.12, slide = 0) {
  const a = actx; if (!a || muted) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, a.currentTime);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(20, freq + slide), a.currentTime + dur);
  g.gain.setValueAtTime(vol, a.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur);
}
function noise(dur, vol = 0.2, freq = 2000, q = 1) {
  const a = actx; if (!a || muted) return;
  const len = Math.floor(a.sampleRate * dur);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = a.createBufferSource(); src.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = a.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start();
}
const sfx = {
  swing() { noise(0.09, 0.12, 3500, 0.8); },
  hit() { noise(0.12, 0.45, 1400); tone(160, 0.1, 'sawtooth', 0.12, -90); },
  heavy() { noise(0.2, 0.55, 800); tone(110, 0.18, 'sawtooth', 0.16, -60); },
  block() { tone(1300, 0.05, 'square', 0.06); noise(0.05, 0.15, 5000, 2); },
  jump() { noise(0.06, 0.06, 6000, 1); },
  special() { noise(0.35, 0.25, 2500, 0.5); tone(300, 0.3, 'triangle', 0.08, 500); },
  ko() { tone(220, 0.6, 'sawtooth', 0.15, -180); noise(0.5, 0.4, 600); },
  select() { tone(660, 0.07, 'triangle', 0.12); tone(990, 0.09, 'triangle', 0.08); },
  round() { tone(440, 0.12, 'square', 0.08); setTimeout(() => tone(660, 0.2, 'square', 0.08), 120); },
};

// ============================================================
//  シーン
// ============================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 300);
camera.position.set(0, 2.5, 10);

function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function rnd(a, b) { return a + Math.random() * (b - a); }

// 空
scene.background = canvasTex(4, 256, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, '#6fa6d8'); gr.addColorStop(0.45, '#bcd9e6');
  gr.addColorStop(0.7, '#f3e6c2'); gr.addColorStop(1, '#d9c99a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
});
scene.fog = new THREE.Fog(0xd6dcb8, 16, 60);

// ライト
scene.add(new THREE.HemisphereLight(0xe4f1ff, 0x5a5a2a, 1.1));
const sun = new THREE.DirectionalLight(0xfff0d2, 2.6);
sun.position.set(-6, 14, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14; sun.shadow.camera.right = 14;
sun.shadow.camera.top = 10; sun.shadow.camera.bottom = -6;
sun.shadow.camera.near = 1; sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.02;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xbfe6ff, 0.8);
rim.position.set(4, 5, -8);
scene.add(rim);

// 地面（土と落ち葉）
const soilTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#6b5636'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6000; i++) {
    const c = 70 + Math.random() * 60;
    g.fillStyle = `rgba(${c + 20},${c},${c - 30},${Math.random() * 0.6})`;
    g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 4), rnd(1, 4));
  }
  for (let i = 0; i < 70; i++) {
    g.save(); g.translate(Math.random() * w, Math.random() * h); g.rotate(Math.random() * 6.3);
    const hue = rnd(25, 45);
    g.fillStyle = `hsla(${hue},${rnd(30, 60)}%,${rnd(22, 38)}%,0.85)`;
    g.beginPath(); g.ellipse(0, 0, rnd(10, 26), rnd(4, 9), 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(40,25,10,.5)'; g.beginPath(); g.moveTo(-20, 0); g.lineTo(20, 0); g.stroke();
    g.restore();
  }
}, [10, 5]);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(140, 70),
  new THREE.MeshStandardMaterial({ map: soilTex, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.02; ground.receiveShadow = true;
scene.add(ground);

// 闘技場となる大きな葉っぱ
const leafTex = canvasTex(1024, 320, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, '#9aa64a'); gr.addColorStop(0.5, '#7e9a3c'); gr.addColorStop(1, '#a39a48');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2500; i++) {
    g.fillStyle = `rgba(${rnd(60, 140)},${rnd(90, 150)},${rnd(30, 60)},0.18)`;
    g.fillRect(Math.random() * w, Math.random() * h, 3, 3);
  }
  g.strokeStyle = 'rgba(225,230,170,.75)'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
  g.lineWidth = 2.2; g.strokeStyle = 'rgba(215,225,160,.55)';
  for (let x = 40; x < w - 30; x += 62) {
    for (const s of [-1, 1]) {
      g.beginPath(); g.moveTo(x, h / 2);
      g.quadraticCurveTo(x + 50, h / 2 + s * 60, x + 110, h / 2 + s * 150); g.stroke();
    }
  }
  for (let i = 0; i < 14; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = rnd(6, 26);
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, 'rgba(110,70,25,.65)'); rg.addColorStop(1, 'rgba(110,70,25,0)');
    g.fillStyle = rg; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
});
{
  const L = 12, Wd = 4.2;
  const sh = new THREE.Shape();
  sh.moveTo(-L, 0);
  sh.bezierCurveTo(-L * 0.6, Wd * 1.05, L * 0.45, Wd * 1.1, L, 0);
  sh.bezierCurveTo(L * 0.45, -Wd * 1.1, -L * 0.6, -Wd * 1.05, -L, 0);
  const geo = new THREE.ShapeGeometry(sh, 48);
  leafTex.repeat.set(1 / (2 * L), 1 / (2 * Wd));
  leafTex.offset.set(0.5, 0.5);
  const leaf = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: leafTex, roughness: 0.65, side: THREE.DoubleSide }));
  leaf.rotation.x = -Math.PI / 2; leaf.position.set(0, 0.005, 0.4);
  leaf.receiveShadow = true;
  scene.add(leaf);
  // 葉柄
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 5, 8),
    new THREE.MeshStandardMaterial({ color: 0x8c8a3c, roughness: 0.7 }));
  stem.rotation.z = Math.PI / 2; stem.position.set(-14.2, 0.1, 0.4); stem.receiveShadow = true;
  scene.add(stem);
}

// 草（虫の目線なので巨大な草の森）
function makeBlade(h, wBase, bend, color) {
  const geo = new THREE.PlaneGeometry(wBase, h, 1, 8);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) + h / 2; const t = y / h;
    pos.setX(i, pos.getX(i) * (1 - t * 0.92));
    pos.setZ(i, bend * t * t * h * 0.35);
    pos.setY(i, y);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide }));
  return m;
}
const grassColors = [0x5f8f2e, 0x6e9e35, 0x4f7a26, 0x86a845, 0x93a24a, 0x7a8f3a];
for (let i = 0; i < 220; i++) {
  const z = rnd(-28, -3.2);
  const far = -z;
  const h = rnd(2.5, 6) + far * rnd(0.2, 0.5);
  const b = makeBlade(h, rnd(0.25, 0.6) + far * 0.02, rnd(-1, 1), grassColors[i % grassColors.length]);
  b.position.set(rnd(-40, 40), 0, z);
  b.rotation.y = rnd(-1.2, 1.2);
  b.castShadow = far < 10; b.receiveShadow = true;
  scene.add(b);
}
for (let i = 0; i < 90; i++) {
  const z = rnd(3.2, 7);
  const b = makeBlade(rnd(0.3, 1.1), rnd(0.08, 0.18), rnd(-1, 1), grassColors[i % grassColors.length]);
  b.position.set(rnd(-22, 22), 0, z); b.rotation.y = rnd(-1, 1);
  scene.add(b);
}
// 小石・水滴・花
const rockMat = new THREE.MeshStandardMaterial({ color: 0x8a8070, roughness: 0.9, flatShading: true });
for (let i = 0; i < 40; i++) {
  const r = rnd(0.12, 0.7);
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 0), rockMat);
  const side = Math.random() < 0.5 ? -1 : 1;
  rock.position.set(rnd(-30, 30), r * 0.3, side > 0 ? rnd(4.5, 9) : rnd(-12, -4.5));
  rock.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
  rock.scale.y = 0.6; rock.castShadow = true; rock.receiveShadow = true;
  scene.add(rock);
}
const dewMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.02, metalness: 0, transmission: 0.9, thickness: 0.3, ior: 1.33, clearcoat: 1 });
for (let i = 0; i < 6; i++) {
  const r = rnd(0.08, 0.2);
  const d = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), dewMat);
  d.scale.y = 0.75;
  d.position.set(rnd(-9, 9), r * 0.7, rnd(-1.6, 2.6));
  if (Math.abs(d.position.z) < 0.9) d.position.z += 1.8;
  scene.add(d);
}
const flowerCols = [0xf3e9a0, 0xf6f2ff, 0xf2b6d0, 0xffd35a];
for (let i = 0; i < 10; i++) {
  const h = rnd(7, 13), x = rnd(-30, 30), z = rnd(-26, -12);
  const stemM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, h, 6), new THREE.MeshStandardMaterial({ color: 0x5b8a2e }));
  stemM.position.set(x, h / 2, z); scene.add(stemM);
  const head = new THREE.Group(); head.position.set(x, h, z);
  const pm = new THREE.MeshStandardMaterial({ color: flowerCols[i % 4], roughness: 0.8, side: THREE.DoubleSide });
  for (let k = 0; k < 12; k++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 6), pm);
    p.scale.set(1.2, 0.1, 0.35); const a = k / 12 * Math.PI * 2;
    p.position.set(Math.cos(a) * 0.75, 0, Math.sin(a) * 0.75); p.rotation.y = -a;
    head.add(p);
  }
  const c = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 8), new THREE.MeshStandardMaterial({ color: 0xe0a020 }));
  c.scale.y = 0.5; head.add(c);
  head.rotation.x = rnd(0.6, 1.1);
  scene.add(head);
}

// ============================================================
//  カマキリのモデル（手続き生成）
// ============================================================
const UP = new THREE.Vector3(0, 1, 0);
const _v = new THREE.Vector3();

function segGeo(rTop, rBot, len, seg = 10, flatX = 1) {
  const g = new THREE.CylinderGeometry(rTop, rBot, len, seg, 1);
  g.translate(0, len / 2, 0);
  if (flatX !== 1) g.scale(flatX, 1, 1);
  return g;
}

function wingTexture(base, vein) {
  return canvasTex(512, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = base; g.globalAlpha = 0.85;
    g.beginPath(); g.ellipse(w / 2, h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = vein; g.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      g.beginPath(); g.moveTo(0, h / 2 + (i - 3) * 4);
      g.quadraticCurveTo(w * 0.5, h / 2 + (i - 3) * 14, w, h / 2 + (i - 3) * 6); g.stroke();
    }
    g.lineWidth = 1; g.globalAlpha = 0.5;
    for (let x = 20; x < w; x += 14) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 6, h - 8); g.stroke(); }
  });
}

function makeMantis(cfg) {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const mat = new THREE.MeshPhysicalMaterial({ color: cfg.body, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.35 });
  const dark = new THREE.MeshPhysicalMaterial({ color: cfg.dark, roughness: 0.5, clearcoat: 0.3 });
  const eyeMat = new THREE.MeshPhysicalMaterial({ color: cfg.eye, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111108, roughness: 0.3 });
  const spikeMat = new THREE.MeshStandardMaterial({ color: cfg.spike, roughness: 0.4 });
  const mats = [mat, dark, eyeMat];
  const shadowAll = [];
  const add = (parent, mesh) => { mesh.castShadow = true; parent.add(mesh); shadowAll.push(mesh); return mesh; };

  // 中・後胸
  const thorax = add(body, new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat));
  thorax.scale.set(0.34, 0.13, 0.13); thorax.position.set(-0.05, 1.04, 0);

  // 腹部（体節）
  const abdomen = new THREE.Group(); abdomen.position.set(-0.3, 1.04, 0); body.add(abdomen);
  const radii = [0.15, 0.2, 0.23, 0.24, 0.23, 0.2, 0.16, 0.11, 0.07];
  radii.forEach((r, i) => {
    const s = add(abdomen, new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), i % 2 ? mat : dark));
    s.scale.set(0.2, r * 0.78, r);
    s.position.set(-0.08 - i * 0.205, -i * 0.018 - (i > 6 ? (i - 6) * 0.01 : 0), 0);
  });
  for (const z of [-1, 1]) {
    const cercus = add(abdomen, new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.18, 5), dark));
    cercus.rotation.z = Math.PI / 2 + 0.3; cercus.position.set(-1.92, -0.14, z * 0.04);
  }

  // 翅（前翅＋後翅）
  const wingTex = wingTexture(cfg.wingCss, cfg.veinCss);
  const hindTex = wingTexture(cfg.hindCss, 'rgba(60,40,30,.6)');
  const wings = [];
  for (const s of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(-0.2, 1.2, s * 0.04);
    body.add(pivot);
    const hindGeo = new THREE.PlaneGeometry(1.5, 0.75); hindGeo.translate(-0.75, 0, 0); hindGeo.rotateX(-Math.PI / 2);
    const hind = new THREE.Mesh(hindGeo, new THREE.MeshStandardMaterial({ map: hindTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, roughness: 0.4 }));
    hind.position.y = -0.01; hind.position.z = s * 0.2;
    pivot.add(hind);
    const geo = new THREE.SphereGeometry(1, 24, 10); geo.scale(0.88, 0.022, 0.15); geo.translate(-0.86, 0, 0);
    const wingMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: wingTex, transparent: true, roughness: 0.3, clearcoat: 0.6, side: THREE.DoubleSide });
    const w = add(pivot, new THREE.Mesh(geo, wingMat));
    w.position.z = s * 0.05;
    wings.push({ pivot, hind, s });
  }

  // 前胸（細長い首）
  const pro = add(body, new THREE.Mesh(segGeo(0.05, 0.075, 0.85, 12), mat));
  const proRidge = add(pro, new THREE.Mesh(segGeo(0.02, 0.03, 0.7, 6), dark));
  proRidge.position.set(0.04, 0.08, 0);

  // 頭
  const head = new THREE.Group(); body.add(head);
  const skull = add(head, new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), mat));
  skull.scale.set(0.085, 0.13, 0.15);
  const face = add(head, new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 10), mat));
  face.rotation.z = Math.PI; face.position.set(0.01, -0.12, 0); face.scale.z = 0.8;
  const mand = add(head, new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.07, 6), dark));
  mand.rotation.z = Math.PI; mand.position.set(0.02, -0.24, 0);
  for (const s of [-1, 1]) {
    const eye = add(head, new THREE.Mesh(new THREE.SphereGeometry(0.075, 20, 14), eyeMat));
    eye.position.set(0.0, 0.07, s * 0.15); eye.scale.set(0.95, 1.25, 0.85);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), black);
    pupil.position.set(0.062, 0.0, s * 0.03); eye.add(pupil);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.04, 0.12, s * 0.035),
      new THREE.Vector3(0.12, 0.45, s * 0.12),
      new THREE.Vector3(0.0, 0.85, s * 0.3),
      new THREE.Vector3(-0.35, 1.05, s * 0.45),
    ]);
    add(head, new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.008, 5, false), dark));
  }
  for (let k = -1; k <= 1; k++) {
    const oc = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), black);
    oc.position.set(0.06, 0.1 + (k === 0 ? 0.02 : 0), k * 0.03); head.add(oc);
  }

  // 前脚（鎌）
  function spikes(parent, len, n, side, size) {
    for (let i = 0; i < n; i++) {
      const t = 0.15 + 0.8 * i / (n - 1);
      const sz = size * (i % 2 ? 0.6 : 1);
      const sp = new THREE.Mesh(new THREE.ConeGeometry(sz * 0.18, sz, 5), spikeMat);
      sp.position.set(side * 0.03, len * t, 0);
      sp.rotation.z = -side * (Math.PI / 2 - 0.5);
      parent.add(sp);
    }
  }
  const arms = [];
  for (const s of [1, -1]) {
    const coxa = new THREE.Group(); body.add(coxa);
    add(coxa, new THREE.Mesh(segGeo(0.035, 0.05, 0.34, 10, 1.2), mat));
    const femur = new THREE.Group(); body.add(femur);
    add(femur, new THREE.Mesh(segGeo(0.032, 0.05, 0.56, 10, 1.7), mat));
    spikes(femur, 0.56, 7, 1, 0.09);
    const tibia = new THREE.Group(); body.add(tibia);
    add(tibia, new THREE.Mesh(segGeo(0.018, 0.03, 0.42, 8, 1.4), mat));
    spikes(tibia, 0.42, 6, -1, 0.06);
    const hook = add(tibia, new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.12, 6), spikeMat));
    hook.position.set(-0.02, 0.45, 0); hook.rotation.z = 0.7;
    const tarsus = add(tibia, new THREE.Mesh(segGeo(0.008, 0.012, 0.22, 5), dark));
    tarsus.position.set(0, 0.38, 0); tarsus.rotation.z = 2.4;
    arms.push({ s, coxa, femur, tibia });
  }

  // 歩脚（4本）
  const legs = [];
  const legDefs = [
    { hip: [0.0, 1.0], foot: [0.6, 0.72], ph: 0 },
    { hip: [-0.24, 0.98], foot: [-1.05, 0.82], ph: Math.PI },
  ];
  for (const d of legDefs) for (const s of [-1, 1]) {
    const upper = add(root, new THREE.Mesh(segGeo(0.022, 0.03, 1, 6), mat));
    const lower = add(root, new THREE.Mesh(segGeo(0.012, 0.02, 1, 6), mat));
    const tar = add(root, new THREE.Mesh(segGeo(0.008, 0.01, 1, 5), dark));
    legs.push({
      upper, lower, tar, s,
      hip: new THREE.Vector3(d.hip[0], d.hip[1], s * 0.09),
      foot: new THREE.Vector3(d.foot[0], 0, s * d.foot[1]),
      ph: d.ph + (s > 0 ? Math.PI : 0),
    });
  }

  return { root, body, abdomen, pro, head, arms, legs, wings, mats };
}

// 骨格の姿勢
function poseOf(p) {
  return {
    pro: p.pro ?? 1.0, lean: p.lean ?? 0, crouch: p.crouch ?? 0, wing: p.wing ?? 0, abd: p.abd ?? 0,
    a: p.a ?? [-1.25, 1.15, -1.95], b: p.b ?? p.a ?? [-1.25, 1.15, -1.95],
  };
}
const FOLD = [-1.25, 1.15, -1.95];
const POSES = {
  idle: poseOf({}),
  guard: poseOf({ pro: 1.3, lean: 0.12, crouch: -0.12, a: [-0.55, 1.6, -1.45] }),
  jump: poseOf({ pro: 0.9, lean: -0.1, a: [-0.8, 0.6, -2.3] }),
  lightUp: poseOf({ pro: 0.95, lean: 0.06, a: [-1.45, 1.5, -2.5], b: FOLD }),
  lightHit: poseOf({ pro: 0.72, lean: -0.14, a: [-0.2, 0.15, 0.05], b: FOLD }),
  heavyUp: poseOf({ pro: 1.3, lean: 0.22, a: [0.9, 1.95, 2.6] }),
  heavyHit: poseOf({ pro: 0.68, lean: -0.25, crouch: -0.05, a: [0.15, -0.3, -0.95] }),
  air: poseOf({ pro: 0.8, lean: -0.35, a: [-1.0, -0.7, -1.25] }),
  spUp: poseOf({ pro: 1.2, lean: 0.1, crouch: -0.2, wing: 1, abd: 0.25, a: [0.6, 1.8, 2.4] }),
  sp: poseOf({ pro: 0.9, lean: -0.1, wing: 1, abd: 0.15, a: [0.0, 0.25, 0.1] }),
  hit: poseOf({ pro: 1.35, lean: 0.32, a: [0.4, 1.9, 0.6], b: [0.2, 1.6, 0.2] }),
  block: poseOf({ pro: 1.32, lean: 0.22, crouch: -0.14, a: [-0.5, 1.65, -1.4] }),
  ko: poseOf({ pro: 0.25, lean: -0.32, crouch: -0.62, abd: -0.08, a: [-0.3, -0.6, -1.0], b: [-0.5, -0.9, -1.4] }),
  win: poseOf({ pro: 1.35, lean: 0.15, wing: 1, abd: 0.35, a: [0.6, 2.0, 2.8] }),
};

function lerpPose(cur, tgt, k) {
  for (const key of ['pro', 'lean', 'crouch', 'wing', 'abd']) cur[key] += (tgt[key] - cur[key]) * k;
  for (const arm of ['a', 'b']) for (let i = 0; i < 3; i++) cur[arm][i] += (tgt[arm][i] - cur[arm][i]) * k;
}
function clonePose(p) { return { ...p, a: [...p.a], b: [...p.b] }; }

const N0 = new THREE.Vector2(0.17, 1.12);
const LP = 0.85, LC = 0.34, LF = 0.56, LT = 0.42;

function applyRig(f, time) {
  const m = f.model, p = f.pose;
  const grounded = f.y <= 0.001;
  const bob = (f.state === 'idle' || f.state === 'guard') ? Math.sin(time * 0.06 + f.idx) * 0.012 : 0;
  m.body.position.y = p.crouch + bob + (f.state === 'walk' ? Math.abs(Math.sin(f.walkPhase)) * 0.02 : 0);
  m.body.rotation.set(0, f.spin, p.lean);
  m.abdomen.rotation.z = -0.04 + p.abd + Math.sin(time * 0.05 + f.idx) * 0.015;
  m.abdomen.scale.y = 1 + Math.sin(time * 0.08 + f.idx) * 0.03;

  // 前胸
  const dir = new THREE.Vector2(Math.cos(p.pro), Math.sin(p.pro));
  const P = N0.clone().addScaledVector(dir, LP);
  m.pro.position.set(N0.x, N0.y, 0);
  m.pro.rotation.set(0, 0, p.pro - Math.PI / 2);
  m.head.position.set(P.x + 0.04, P.y + 0.06, 0);
  let yaw = -0.4;
  if (f.state === 'attack' || f.state === 'hit' || f.state === 'ko') yaw = -0.1;
  m.head.rotation.set(0, yaw * f.face, -0.25 + (f.state === 'ko' ? -0.6 : 0) + Math.sin(time * 0.03 + f.idx * 2) * 0.05);

  // 鎌
  const S = N0.clone().addScaledVector(dir, LP * 0.82);
  m.arms.forEach((arm, i) => {
    const ang = i === 0 ? (f.jabArm ? p.b : p.a) : (f.jabArm ? p.a : p.b);
    const z = arm.s * 0.085;
    let x = S.x, y = S.y;
    arm.coxa.position.set(x, y, z); arm.coxa.rotation.set(0, 0, ang[0] - Math.PI / 2);
    x += Math.cos(ang[0]) * LC; y += Math.sin(ang[0]) * LC;
    arm.femur.position.set(x, y, z * 1.25); arm.femur.rotation.set(0, 0, ang[1] - Math.PI / 2);
    x += Math.cos(ang[1]) * LF; y += Math.sin(ang[1]) * LF;
    arm.tibia.position.set(x, y, z * 1.3); arm.tibia.rotation.set(0, 0, ang[2] - Math.PI / 2);
  });

  // 翅
  for (const w of m.wings) {
    w.pivot.rotation.set(-w.s * p.wing * 0.55, 0, -p.wing * 0.85 - 0.06);
    const hs = Math.max(0.001, p.wing);
    w.hind.scale.set(1, 1, hs);
    w.hind.visible = p.wing > 0.05;
    w.hind.rotation.x = -w.s * p.wing * 0.5;
  }

  // 歩脚（簡易IK）
  m.body.updateMatrix();
  const hip = new THREE.Vector3(), foot = new THREE.Vector3(), knee = new THREE.Vector3(), tip = new THREE.Vector3();
  for (const L of m.legs) {
    hip.copy(L.hip).applyMatrix4(m.body.matrix);
    foot.copy(L.foot);
    let lift = 0;
    if (f.state === 'walk') {
      const c = f.walkPhase + L.ph;
      foot.x += Math.sin(c) * 0.16;
      lift = Math.max(0, Math.cos(c)) * 0.12;
    }
    if (f.state === 'ko') { foot.x *= 1.15; foot.z *= 1.25; }
    if (!grounded) {
      foot.set(L.hip.x + L.foot.x * 0.5, 0.35, L.foot.z * 0.8);
    }
    if (f.spin) foot.applyAxisAngle(UP, f.spin);
    foot.y += lift;
    knee.lerpVectors(hip, foot, 0.38);
    knee.y = hip.y + 0.32; knee.z += L.s * 0.18;
    tip.copy(foot); tip.x += (L.foot.x > 0 ? 0.14 : -0.1); tip.z += L.s * 0.08; tip.y = Math.max(0, foot.y - 0.01);
    for (const [mesh, a, b] of [[L.upper, hip, knee], [L.lower, knee, foot], [L.tar, foot, tip]]) {
      _v.subVectors(b, a); const len = _v.length();
      mesh.position.copy(a);
      mesh.quaternion.setFromUnitVectors(UP, _v.normalize());
      mesh.scale.set(1, len, 1);
    }
  }

  // 被弾フラッシュ
  const fl = f.flash > 0 ? f.flash / 10 : 0;
  for (const mt of m.mats) mt.emissive.setRGB(fl * 0.35, fl * 0.06, fl * 0.02);

  // 位置と向き
  m.root.position.set(f.x, f.y, 0);
  const targetRot = f.face > 0 ? 0 : Math.PI;
  let d = targetRot - m.root.rotation.y;
  m.root.rotation.y += d * 0.35;
}

// ============================================================
//  エフェクト
// ============================================================
const sparks = [];
const sparkGeo = new THREE.OctahedronGeometry(0.05);
for (let i = 0; i < 160; i++) {
  const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.visible = false; scene.add(m);
  sparks.push({ m, v: new THREE.Vector3(), life: 0, max: 1, grav: 0 });
}
const rings = [];
for (let i = 0; i < 8; i++) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 40), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.visible = false; scene.add(m);
  rings.push({ m, life: 0, max: 1, grow: 1 });
}
const dustMat = new THREE.MeshBasicMaterial({ color: 0xb9a57a, transparent: true, depthWrite: false });
const dusts = [];
for (let i = 0; i < 50; i++) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), dustMat.clone());
  m.visible = false; scene.add(m);
  dusts.push({ m, v: new THREE.Vector3(), life: 0, max: 1 });
}
let sparkIdx = 0, ringIdx = 0, dustIdx = 0;
function burst(x, y, z, color, n, speed, grav = 0.004) {
  for (let i = 0; i < n; i++) {
    const s = sparks[sparkIdx++ % sparks.length];
    s.m.visible = true; s.m.position.set(x, y, z);
    s.m.material.color.set(color);
    const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI - Math.PI / 2;
    const sp = speed * rnd(0.4, 1);
    s.v.set(Math.cos(a) * Math.cos(b) * sp, Math.sin(b) * sp + speed * 0.3, Math.sin(a) * Math.cos(b) * sp);
    s.life = s.max = Math.floor(rnd(14, 28)); s.grav = grav;
    s.m.scale.setScalar(rnd(0.6, 1.6));
  }
}
function ring(x, y, z, color, grow = 1) {
  const r = rings[ringIdx++ % rings.length];
  r.m.visible = true; r.m.position.set(x, y, z); r.m.material.color.set(color);
  r.life = r.max = 14; r.grow = grow; r.m.scale.setScalar(0.3);
}
function dust(x, n = 6, dir = 0) {
  for (let i = 0; i < n; i++) {
    const d = dusts[dustIdx++ % dusts.length];
    d.m.visible = true; d.m.position.set(x + rnd(-0.3, 0.3), 0.08, rnd(-0.3, 0.3));
    d.v.set(rnd(-0.03, 0.03) + dir * 0.03, rnd(0.005, 0.02), rnd(-0.02, 0.02));
    d.life = d.max = Math.floor(rnd(20, 36));
  }
}
function updateEffects() {
  for (const s of sparks) if (s.life > 0) {
    s.life--; s.m.position.add(s.v); s.v.y -= s.grav; s.v.multiplyScalar(0.93);
    s.m.material.opacity = s.life / s.max; s.m.rotation.x += 0.3; s.m.rotation.y += 0.2;
    if (s.life <= 0) s.m.visible = false;
  }
  for (const r of rings) if (r.life > 0) {
    r.life--; const t = 1 - r.life / r.max;
    r.m.scale.setScalar(0.3 + t * 2.2 * r.grow); r.m.material.opacity = 1 - t;
    r.m.quaternion.copy(camera.quaternion);
    if (r.life <= 0) r.m.visible = false;
  }
  for (const d of dusts) if (d.life > 0) {
    d.life--; d.m.position.add(d.v); d.m.scale.setScalar(1 + (1 - d.life / d.max) * 2);
    d.m.material.opacity = 0.45 * d.life / d.max;
    if (d.life <= 0) d.m.visible = false;
  }
}

// ============================================================
//  入力
// ============================================================
const keys = new Set();
const P1KEYS = { left: ['KeyA'], right: ['KeyD'], up: ['KeyW'], down: ['KeyS'], light: ['KeyJ'], heavy: ['KeyK'], special: ['KeyL'] };
const P2KEYS = { left: ['ArrowLeft'], right: ['ArrowRight'], up: ['ArrowUp'], down: ['ArrowDown'], light: ['Numpad1', 'Comma', 'Digit1'], heavy: ['Numpad2', 'Period', 'Digit2'], special: ['Numpad3', 'Slash', 'Digit3'] };

class KeyController {
  constructor(maps) { this.maps = maps; this.buf = { up: 0, light: 0, heavy: 0, special: 0 }; this.prev = {}; }
  isDown(name) { return this.maps.some(m => m[name].some(k => keys.has(k))); }
  update() {
    for (const b of Object.keys(this.buf)) {
      const d = this.isDown(b);
      if (d && !this.prev[b]) this.buf[b] = 7; else if (this.buf[b] > 0) this.buf[b]--;
      this.prev[b] = d;
    }
    return {
      left: this.isDown('left'), right: this.isDown('right'), down: this.isDown('down'),
      up: this.buf.up > 0, light: this.buf.light > 0, heavy: this.buf.heavy > 0, special: this.buf.special > 0,
    };
  }
  consume(name) { this.buf[name] = 0; }
}

class AIController {
  constructor(diff) {
    this.react = [24, 13, 6][diff];
    this.guardP = [0.2, 0.5, 0.82][diff];
    this.aggr = [0.45, 0.65, 0.85][diff];
    this.cd = 30; this.hold = null; this.holdT = 0; this.out = {}; this.seenAtk = -1;
  }
  bind(self, opp) { this.self = self; this.opp = opp; }
  update() {
    const f = this.self, o = this.opp;
    const out = { left: false, right: false, down: false, up: false, light: false, heavy: false, special: false };
    if (!f || !o) return out;
    const dx = o.x - f.x, dist = Math.abs(dx), fwd = dx > 0 ? 'right' : 'left', back = dx > 0 ? 'left' : 'right';

    // 反応ガード
    if (o.state === 'attack' && o.atkId !== this.seenAtk && o.mt >= Math.max(1, Math.floor(this.react * 0.5))) {
      this.seenAtk = o.atkId;
      if (dist < 3.2 && Math.random() < this.guardP) {
        this.hold = { down: true }; this.holdT = o.move.startup + o.move.active + 6 - o.mt; this.cd = this.holdT;
      }
    }
    if (this.holdT > 0) { this.holdT--; Object.assign(out, this.hold); return out; }
    if (--this.cd > 0) { if (this.walk) out[this.walk] = true; return out; }
    this.cd = Math.floor(this.react * rnd(0.6, 1.4));
    this.walk = null;

    const r = Math.random();
    if (o.y > 0.3 && dist < 2.6 && r < this.aggr * 0.6) { out.heavy = true; return out; }
    if (f.en >= 50 && dist < 3.2 && dist > 1.2 && r < 0.25 * this.aggr) { out.special = true; return out; }
    if (dist < 1.9) {
      if (r < 0.45 * this.aggr + 0.15) out.light = true;
      else if (r < 0.75 * this.aggr + 0.1) out.heavy = true;
      else if (r < 0.85) { this.walk = back; this.cd = 14; }
      else { this.hold = { down: true }; this.holdT = 20; }
    } else if (dist < 2.5) {
      if (r < 0.35 * this.aggr) out.heavy = true; else { this.walk = fwd; this.cd = 10; }
    } else {
      if (r < 0.06) { out.up = true; out[fwd] = true; }
      else { this.walk = fwd; this.cd = Math.floor(rnd(10, 30)); }
    }
    if (this.walk) out[this.walk] = true;
    return out;
  }
  consume() {}
}

window.addEventListener('keydown', e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  keys.add(e.code);
  if ((e.code === 'KeyP' || e.code === 'Escape') && game.mode === 'match' && game.phase === 'fight') game.paused = !game.paused;
  if (e.code === 'KeyM') muted = !muted;
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// タッチ
if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
  touchEl.dataset.enabled = '1';
  touchEl.querySelectorAll('button').forEach(b => {
    const k = b.dataset.key;
    const on = e => { e.preventDefault(); keys.add(k); b.classList.add('on'); audio(); };
    const off = e => { e.preventDefault(); keys.delete(k); b.classList.remove('on'); };
    b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
  });
}

// ============================================================
//  技データ（フレーム@60fps、距離はワールド単位）
// ============================================================
const MOVES = {
  light: { name: 'カマジャブ', startup: 5, active: 4, recovery: 10, dmg: 5, hb: [0.3, 2.05, 0.9, 2.1], kb: 0.07, hitstun: 15, blockstun: 10, en: 6, hitstop: 5, shake: 0.05, pose: ['lightUp', 'lightHit'] },
  heavy: { name: '大鎌斬り', startup: 14, active: 5, recovery: 22, dmg: 13, hb: [0.2, 2.35, 0.1, 2.7], kb: 0.15, hitstun: 24, blockstun: 15, en: 10, hitstop: 9, shake: 0.14, lunge: 0.06, chip: 1, pose: ['heavyUp', 'heavyHit'] },
  air: { name: '急降下鎌', startup: 4, active: 14, recovery: 6, dmg: 8, hb: [-0.1, 1.7, -0.3, 1.3], kb: 0.1, hitstun: 18, blockstun: 11, en: 7, hitstop: 6, shake: 0.08, pose: ['jump', 'air'] },
  special: { name: '旋風鎌', startup: 12, active: 28, recovery: 20, dmg: 4, multi: 6, hb: [-0.6, 1.9, 0.0, 2.3], kb: 0.05, lastKb: 0.22, hitstun: 20, blockstun: 12, en: 0, cost: 50, hitstop: 4, shake: 0.08, dash: 0.13, chip: 1, pose: ['spUp', 'sp'] },
};

// ============================================================
//  ファイター
// ============================================================
const STAGE_HALF = 8.2;
const WALK_F = 0.055, WALK_B = 0.04, JUMP_V = 0.21, GRAV = 0.0115;

const SPECIES = [
  { name: 'オオカマキリ', body: 0x7cae3a, dark: 0x557f22, eye: 0xc9e88e, spike: 0x2f3b14, wingCss: 'rgb(140,190,80)', veinCss: 'rgba(60,100,30,.7)', hindCss: 'rgb(120,80,60)' },
  { name: 'チョウセンカマキリ', body: 0x9b7646, dark: 0x6c4f2c, eye: 0xdcc58e, spike: 0x2f2414, wingCss: 'rgb(170,130,80)', veinCss: 'rgba(90,60,30,.7)', hindCss: 'rgb(90,70,90)' },
];

let atkCounter = 0;
class Fighter {
  constructor(idx) {
    this.idx = idx;
    this.sp = SPECIES[idx];
    this.name = this.sp.name;
    this.model = makeMantis(this.sp);
    scene.add(this.model.root);
    this.reset(idx === 0 ? -2.6 : 2.6, idx === 0 ? 1 : -1, true);
  }
  reset(x, face, full) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0; this.face = face;
    this.hp = 100; this.dispHp = 100; if (full) this.en = 0;
    this.state = 'idle'; this.move = null; this.mt = 0; this.stun = 0; this.hasHit = false;
    this.airUsed = false; this.flash = 0; this.walkPhase = 0; this.spin = 0; this.jabArm = false;
    this.combo = 0; this.comboT = 0; this.atkId = -1;
    this.pose = clonePose(POSES.idle);
    this.model.root.rotation.y = face > 0 ? 0 : Math.PI;
  }
  get grounded() { return this.y <= 0.0001 && this.vy === 0; }
  startMove(key) {
    this.move = MOVES[key]; this.moveKey = key; this.mt = 0; this.hasHit = false; this.state = 'attack';
    this.atkId = ++atkCounter;
    if (key === 'light') this.jabArm = !this.jabArm;
    if (key === 'special') { this.en -= this.move.cost; game.sound && sfx.special(); }
    if (key === 'air') this.airUsed = true;
    this.vx = this.grounded ? 0 : this.vx;
  }
  update(inp, ctrl, opp) {
    this.flash = Math.max(0, this.flash - 1);
    if (this.comboT > 0 && --this.comboT === 0) this.combo = 0;

    switch (this.state) {
      case 'ko':
      case 'win':
        break;
      case 'hit':
      case 'block':
        this.stun--;
        if (this.stun <= 0 && this.grounded) this.state = 'idle';
        break;
      case 'land':
        this.stun--; this.vx *= 0.7;
        if (this.stun <= 0) this.state = 'idle';
        break;
      case 'attack': {
        const m = this.move; this.mt++;
        const act = this.mt >= m.startup && this.mt < m.startup + m.active;
        if (this.mt === m.startup && game.sound) sfx.swing();
        if (m.lunge && act) this.x += this.face * m.lunge;
        if (m.dash) {
          if (act) { this.vx = this.face * m.dash; this.spin += 0.55; if (this.mt % 4 === 0) dust(this.x, 2, -this.face); }
          else { this.vx *= 0.8; this.spin = 0; }
        }
        if (this.mt >= m.startup + m.active + m.recovery) {
          this.state = this.grounded ? 'idle' : 'jump'; this.move = null; this.spin = 0;
        }
        break;
      }
      default: { // idle / walk / guard / jump
        if (this.grounded) {
          this.airUsed = false;
          this.face = opp.x >= this.x ? 1 : -1;
          if (inp.special && this.en >= MOVES.special.cost) { ctrl.consume('special'); this.startMove('special'); }
          else if (inp.heavy) { ctrl.consume('heavy'); this.startMove('heavy'); }
          else if (inp.light) { ctrl.consume('light'); this.startMove('light'); }
          else if (inp.down) { this.state = 'guard'; this.vx = 0; }
          else if (inp.up) {
            ctrl.consume('up');
            this.state = 'jump'; this.vy = JUMP_V;
            this.vx = inp.left ? -0.075 : inp.right ? 0.075 : 0;
            game.sound && sfx.jump(); dust(this.x, 5);
          } else if (inp.left || inp.right) {
            const dir = inp.left ? -1 : 1;
            this.state = 'walk';
            this.vx = dir * (dir === this.face ? WALK_F : WALK_B);
            this.walkPhase += 0.22 * dir * this.face;
          } else { this.state = 'idle'; this.vx = 0; }
        } else if ((inp.light || inp.heavy) && !this.airUsed) {
          ctrl.consume('light'); ctrl.consume('heavy'); this.startMove('air');
        }
      }
    }

    // 物理
    if (!this.grounded || this.vy > 0) {
      this.vy -= GRAV; this.y += this.vy; this.x += this.vx;
      if (this.y <= 0) {
        this.y = 0; this.vy = 0;
        dust(this.x, 6);
        if (this.state === 'jump') this.state = 'idle';
        else if (this.state === 'attack' && this.moveKey === 'air') { this.state = 'land'; this.stun = 7; this.move = null; }
        else if (this.state === 'ko') { this.vx *= 0.4; dust(this.x, 10); }
      }
    } else {
      this.x += this.vx;
      if (this.state !== 'walk' && this.state !== 'attack') this.vx *= 0.82;
    }
    this.x = Math.max(-STAGE_HALF, Math.min(STAGE_HALF, this.x));

    // 姿勢
    let tgt = POSES.idle, k = 0.22;
    switch (this.state) {
      case 'guard': tgt = POSES.guard; k = 0.4; break;
      case 'jump': tgt = POSES.jump; break;
      case 'hit': tgt = POSES.hit; k = 0.45; break;
      case 'block': tgt = POSES.block; k = 0.45; break;
      case 'ko': tgt = POSES.ko; k = 0.12; break;
      case 'win': tgt = POSES.win; k = 0.08; break;
      case 'land': tgt = POSES.guard; break;
      case 'attack': {
        const m = this.move;
        if (this.mt < m.startup) { tgt = POSES[m.pose[0]]; k = 0.35; }
        else if (this.mt < m.startup + m.active + 4) { tgt = POSES[m.pose[1]]; k = 0.6; }
        else { tgt = POSES[m.pose[1]]; k = 0.06; }
      }
    }
    lerpPose(this.pose, tgt, k);
  }
  hurtbox() { return [this.x - 0.6, this.x + 0.6, this.y, this.y + (this.state === 'guard' || this.state === 'block' ? 1.9 : 2.1)]; }
}

// ============================================================
//  ゲーム進行
// ============================================================
const fighters = [new Fighter(0), new Fighter(1)];
const game = {
  mode: 'title', // title / match / result
  vsCpu: true, diff: 1, phase: 'intro', phaseT: 0, round: 1, wins: [0, 0], timer: 99 * 60,
  hitstop: 0, shake: 0, slow: 0, paused: false, msg: '', sub: '', winner: -1, sound: false,
  ctrls: [null, null],
};
let camMid = 0, camDist = 9;

function setupControllers() {
  if (game.mode === 'title') {
    const a = new AIController(2), b = new AIController(1);
    a.bind(fighters[0], fighters[1]); b.bind(fighters[1], fighters[0]);
    game.ctrls = [a, b];
  } else if (game.vsCpu) {
    const ai = new AIController(game.diff); ai.bind(fighters[1], fighters[0]);
    game.ctrls = [new KeyController([P1KEYS, P2KEYS]), ai];
  } else {
    game.ctrls = [new KeyController([P1KEYS]), new KeyController([P2KEYS])];
  }
}

function startMatch(vsCpu, diff) {
  game.mode = 'match'; game.vsCpu = vsCpu; game.diff = diff; game.sound = true;
  game.wins = [0, 0]; game.round = 1;
  fighters.forEach(f => f.en = 0);
  setupControllers();
  startRound();
  titleEl.classList.add('hidden'); resultEl.classList.add('hidden');
  if (touchEl.dataset.enabled) touchEl.classList.remove('hidden');
}
function startRound() {
  fighters[0].reset(-2.6, 1, false); fighters[1].reset(2.6, -1, false);
  game.timer = 99 * 60; game.phase = 'intro'; game.phaseT = 0; game.winner = -1; game.slow = 0; game.paused = false;
  if (game.sound) sfx.round();
}
function toTitle() {
  game.mode = 'title'; game.sound = false;
  titleEl.classList.remove('hidden'); resultEl.classList.add('hidden'); touchEl.classList.add('hidden');
  setupControllers(); startRound(); game.phase = 'fight';
}

document.querySelectorAll('#title button').forEach(b => b.addEventListener('click', () => {
  audio(); sfx.select();
  startMatch(b.dataset.mode === 'cpu', Number(b.dataset.diff || 1));
}));
document.getElementById('againBtn').addEventListener('click', () => { audio(); sfx.select(); startMatch(game.vsCpu, game.diff); });
document.getElementById('titleBtn').addEventListener('click', () => { sfx.select(); toTitle(); });

function checkHit(a, d) {
  if (a.state !== 'attack' || d.state === 'ko') return;
  const m = a.move;
  const at = a.mt - m.startup;
  if (at < 0 || at >= m.active) return;
  if (m.multi) { if (at % m.multi !== 0) return; }
  else if (a.hasHit) return;
  const x0 = a.x + a.face * m.hb[0], x1 = a.x + a.face * m.hb[1];
  const hx0 = Math.min(x0, x1), hx1 = Math.max(x0, x1);
  const hy0 = a.y + m.hb[2], hy1 = a.y + m.hb[3];
  const [dx0, dx1, dy0, dy1] = d.hurtbox();
  if (hx1 < dx0 || hx0 > dx1 || hy1 < dy0 || hy0 > dy1) return;
  a.hasHit = true;

  const last = m.multi && at + m.multi >= m.active;
  const hx = (Math.max(hx0, dx0) + Math.min(hx1, dx1)) / 2;
  const hy = Math.min(hy1, dy1) - 0.5;
  const facingAttacker = Math.sign(a.x - d.x) === d.face || Math.abs(a.x - d.x) < 0.05;
  const blocking = (d.state === 'guard' || d.state === 'block') && d.grounded && facingAttacker;

  if (blocking) {
    d.state = 'block'; d.stun = m.blockstun;
    d.vx = a.face * (last ? m.lastKb : m.kb) * 0.7;
    d.hp = Math.max(1, d.hp - (m.chip || 0));
    a.en = Math.min(100, a.en + 2); d.en = Math.min(100, d.en + 4);
    game.hitstop = 4; game.shake = 0.03;
    burst(hx, hy, 0.4, 0x9fdcff, 8, 0.07, 0.002); ring(hx, hy, 0.4, 0x9fdcff, 0.6);
    game.sound && sfx.block();
    return;
  }
  d.hp -= m.dmg;
  d.flash = 10;
  d.state = 'hit'; d.stun = m.hitstun; d.move = null; d.spin = 0;
  d.vx = a.face * (last ? m.lastKb : m.kb);
  if (!d.grounded || a.moveKey === 'heavy' || last) d.vy = Math.max(d.vy, last ? 0.14 : 0.1);
  a.en = Math.min(100, a.en + m.en); d.en = Math.min(100, d.en + m.en * 0.7);
  a.combo++; a.comboT = 50;
  game.hitstop = m.hitstop; game.shake = m.shake;
  const big = a.moveKey === 'heavy' || last;
  burst(hx, hy, 0.4, big ? 0xfff07a : 0xffffff, big ? 22 : 12, big ? 0.13 : 0.09);
  burst(hx, hy, 0.4, 0x9bd54a, big ? 10 : 5, 0.06, 0.008); // 体液
  ring(hx, hy, 0.4, big ? 0xffc040 : 0xffffff, big ? 1.4 : 0.9);
  if (game.sound) (big ? sfx.heavy : sfx.hit)();

  if (d.hp <= 0) {
    d.hp = 0; d.state = 'ko'; d.vx = a.face * 0.12; d.vy = 0.16;
    game.phase = 'ko'; game.phaseT = 0; game.slow = 70; game.hitstop = 18; game.shake = 0.3;
    game.winner = a.idx; game.msg = 'K.O.!';
    if (game.sound) sfx.ko();
  }
}

function pushApart() {
  const [a, b] = fighters;
  const dx = b.x - a.x, minD = 1.1;
  if (Math.abs(dx) < minD && Math.abs(a.y - b.y) < 1.6 && a.state !== 'ko' && b.state !== 'ko') {
    const ov = (minD - Math.abs(dx)) / 2, s = dx >= 0 ? 1 : -1;
    a.x -= s * ov; b.x += s * ov;
    for (const f of fighters) {
      if (f.x < -STAGE_HALF) { const o = -STAGE_HALF - f.x; f.x = -STAGE_HALF; (f === a ? b : a).x += o; }
      if (f.x > STAGE_HALF) { const o = f.x - STAGE_HALF; f.x = STAGE_HALF; (f === a ? b : a).x -= o; }
    }
  }
}

const NEUTRAL = { left: false, right: false, down: false, up: false, light: false, heavy: false, special: false };
let simTime = 0;
function step() {
  simTime++;
  updateEffects();
  if (game.mode === 'result') { // 決着後も勝者のポーズを見せる
    for (const f of fighters) f.update(NEUTRAL, game.ctrls[f.idx], fighters[1 - f.idx]);
    return;
  }
  if (game.paused) return;
  if (game.hitstop > 0) { game.hitstop--; return; }
  if (game.slow > 0) { game.slow--; if (game.slow % 3 !== 0) return; }

  game.phaseT++;
  const live = game.phase === 'fight';
  const inputs = game.ctrls.map(c => c.update());
  fighters.forEach((f, i) => f.update(live ? inputs[i] : NEUTRAL, game.ctrls[i], fighters[1 - i]));
  if (live) {
    checkHit(fighters[0], fighters[1]);
    checkHit(fighters[1], fighters[0]);
  }
  pushApart();

  if (game.phase === 'intro') {
    game.msg = game.phaseT < 70 ? `ROUND ${game.round}` : 'FIGHT!';
    if (game.phaseT === 70 && game.sound) sfx.round();
    if (game.phaseT >= 110) { game.phase = 'fight'; game.msg = ''; }
  } else if (game.phase === 'fight') {
    if (game.mode === 'match') game.timer--;
    if (game.timer <= 0) {
      game.phase = 'ko'; game.phaseT = 0; game.msg = 'TIME UP';
      const [a, b] = fighters;
      game.winner = a.hp === b.hp ? -1 : a.hp > b.hp ? 0 : 1;
    }
  } else if (game.phase === 'ko') {
    const w = game.winner;
    if (game.phaseT === 90) {
      if (w >= 0) { fighters[w].state = 'win'; fighters[w].move = null; fighters[w].spin = 0; }
      if (game.mode === 'title') { game.wins = [0, 0]; startRound(); game.phase = 'fight'; return; }
      if (w >= 0) game.wins[w]++;
      game.msg = w < 0 ? 'DRAW' : `${fighters[w].name} の勝ち`;
    }
    if (game.phaseT === 200) {
      if (game.wins[0] >= 2 || game.wins[1] >= 2 || game.round >= 5) {
        const mw = game.wins[0] === game.wins[1] ? -1 : game.wins[0] > game.wins[1] ? 0 : 1;
        game.mode = 'result'; game.msg = '';
        let txt;
        if (mw < 0) txt = '引き分け';
        else if (game.vsCpu) txt = mw === 0 ? 'YOU WIN!' : 'YOU LOSE…';
        else txt = `${mw + 1}P ${fighters[mw].name} の勝利！`;
        resultText.textContent = txt;
        resultEl.classList.remove('hidden'); touchEl.classList.add('hidden');
      } else { game.round++; startRound(); }
    }
  }
}

// ============================================================
//  カメラ
// ============================================================
function updateCamera(time) {
  const [a, b] = fighters;
  if (game.mode === 'title') {
    const t = time * 0.0025;
    const mid = (a.x + b.x) / 2;
    camMid += (mid - camMid) * 0.05;
    camera.position.set(camMid + Math.sin(t) * 7, 1.6 + Math.sin(t * 0.7) * 0.6, 4.5 + Math.cos(t) * 3.5 + 2);
    camera.lookAt(camMid, 1.2, 0);
    return;
  }
  const mid = (a.x + b.x) / 2;
  const sep = Math.abs(a.x - b.x);
  const tgtDist = Math.max(7.2, Math.min(13, 5.2 + sep * 0.9));
  camMid += (mid - camMid) * 0.1;
  camDist += (tgtDist - camDist) * 0.06;
  let zoom = 0;
  if (game.phase === 'ko' && game.winner >= 0 && game.phaseT > 90) zoom = 2.2;
  const s = game.shake;
  const sx = (Math.random() - 0.5) * s, sy = (Math.random() - 0.5) * s;
  const d = camDist - zoom;
  camera.position.set(camMid * 0.92 + sx + 0.8, 1.7 + d * 0.1 + sy, d);
  camera.lookAt(camMid + sx * 0.5, 1.15 + (zoom ? 0.3 : 0), 0);
  game.shake *= 0.86;
}

// ============================================================
//  HUD
// ============================================================
function drawHUD() {
  const g = hctx;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, hud.width, hud.height);
  g.setTransform(hudScale, 0, 0, hudScale, 0, 0);
  if (game.mode === 'title') return;

  const bw = 380, bh = 22, top = 22;
  fighters.forEach((f, i) => {
    f.dispHp += (f.hp - f.dispHp) * (f.dispHp > f.hp ? 0.04 : 1);
    const left = i === 0 ? 40 : 960 - 40 - bw;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(left - 3, top - 3, bw + 6, bh + 6);
    g.fillStyle = '#5a1010'; g.fillRect(left, top, bw, bh);
    const w1 = bw * f.dispHp / 100, w2 = bw * f.hp / 100;
    g.fillStyle = '#ff5a3c';
    if (i === 0) g.fillRect(left + bw - w1, top, w1, bh); else g.fillRect(left, top, w1, bh);
    const grd = g.createLinearGradient(0, top, 0, top + bh);
    grd.addColorStop(0, f.hp > 30 ? '#e8ff8a' : '#ffd84d'); grd.addColorStop(1, f.hp > 30 ? '#6fbf2a' : '#e08a10');
    g.fillStyle = grd;
    if (i === 0) g.fillRect(left + bw - w2, top, w2, bh); else g.fillRect(left, top, w2, bh);
    // 名前
    g.font = 'bold 16px "Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif';
    g.textAlign = i === 0 ? 'left' : 'right';
    g.lineWidth = 4; g.strokeStyle = 'rgba(0,0,0,.7)'; g.fillStyle = '#fff';
    const label = (game.vsCpu && i === 1 ? 'CPU ' : `${i + 1}P `) + f.name;
    const nx = i === 0 ? left : left + bw;
    g.strokeText(label, nx, top + bh + 20); g.fillText(label, nx, top + bh + 20);
    // 勝利数
    for (let k = 0; k < 2; k++) {
      const cx = i === 0 ? left + bw - 10 - k * 22 : left + 10 + k * 22;
      g.beginPath(); g.arc(cx, top + bh + 15, 7, 0, 7);
      g.fillStyle = game.wins[i] > k ? '#ffd84d' : 'rgba(0,0,0,.5)'; g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.stroke();
    }
    // 気力ゲージ
    const ew = 220, eh = 12, ey = 540 - 34;
    const ex = i === 0 ? 40 : 960 - 40 - ew;
    g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(ex - 2, ey - 2, ew + 4, eh + 4);
    const full = f.en >= 50;
    g.fillStyle = full ? (Math.floor(simTime / 6) % 2 ? '#ffe36a' : '#ffb020') : '#4aa8ff';
    const en = ew * f.en / 100;
    if (i === 0) g.fillRect(ex, ey, en, eh); else g.fillRect(ex + ew - en, ey, en, eh);
    g.fillStyle = 'rgba(255,255,255,.6)'; g.fillRect(ex + ew / 2 - 1, ey, 2, eh);
    g.font = 'bold 12px sans-serif'; g.fillStyle = '#fff';
    g.textAlign = i === 0 ? 'left' : 'right';
    g.fillText(full ? '旋風鎌 OK!' : '気力', i === 0 ? ex : ex + ew, ey - 6);
    // コンボ
    if (f.combo >= 2 && f.comboT > 0) {
      g.font = 'bold 30px sans-serif'; g.textAlign = i === 0 ? 'left' : 'right';
      g.lineWidth = 5; g.strokeStyle = '#000'; g.fillStyle = '#ffd84d';
      const t = `${f.combo} HIT!`;
      const cx = i === 0 ? 40 : 920;
      g.strokeText(t, cx, 150); g.fillText(t, cx, 150);
    }
  });
  // タイマー
  g.textAlign = 'center';
  g.font = 'bold 40px sans-serif';
  g.lineWidth = 6; g.strokeStyle = '#000'; g.fillStyle = '#fff';
  const t = String(Math.max(0, Math.ceil(game.timer / 60)));
  g.strokeText(t, 480, 56); g.fillText(t, 480, 56);

  // メッセージ
  if (game.msg) {
    const big = game.msg.length < 10;
    g.font = `900 ${big ? 84 : 52}px "Hiragino Kaku Gothic ProN","Noto Sans JP",sans-serif`;
    g.lineWidth = 10; g.strokeStyle = '#1b2a0c';
    const grd = g.createLinearGradient(0, 220, 0, 300);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#a6ff4d');
    g.fillStyle = grd;
    g.strokeText(game.msg, 480, 290); g.fillText(game.msg, 480, 290);
  }
  if (game.paused) {
    g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, 960, 540);
    g.font = 'bold 56px sans-serif'; g.fillStyle = '#fff'; g.fillText('PAUSE', 480, 280);
    g.font = '18px sans-serif'; g.fillText('P / Esc で再開', 480, 320);
  }
}

// ============================================================
//  メインループ
// ============================================================
toTitle();
let last = performance.now(), acc = 0;
function frame(now) {
  acc += Math.min(100, now - last); last = now;
  while (acc >= 1000 / 60) { step(); acc -= 1000 / 60; }
  for (const f of fighters) applyRig(f, simTime);
  updateCamera(simTime);
  renderer.render(scene, camera);
  drawHUD();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// デバッグ用
window.__kamakiri = { game, fighters, startMatch, MOVES };
