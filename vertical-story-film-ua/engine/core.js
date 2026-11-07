// core.js — runtime фильма. Каждый кадр — чистая функция t: никаких Math.random/Date, никакого состояния между кадрами.
// Проект пишет только film.js: палитру, миры (3D-сцены), планы, озвучку. Всё остальное здесь.
import * as THREE from './three/three.module.js';
export { THREE };
export const W = 1080, H = 1920;

/* ---------- математика ---------- */
export const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, k) => a + (b - a) * k;
export const inv = (a, b, v) => clamp((v - a) / (b - a));
export const ease = t => { t = clamp(t); return t * t * (3 - 2 * t); };
export const eOut = (t, n = 3) => 1 - Math.pow(1 - clamp(t), n);
export const eIn = (t, n = 3) => Math.pow(clamp(t), n);
export const eIO = t => { t = clamp(t); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
export const back = (t, s = 1.7) => { t = clamp(t); return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2); };
export const spring = (t, f = 2.2, d = 6) => t <= 0 ? 0 : 1 - Math.exp(-d * t) * Math.cos(f * 6.2832 * t);
export const hash = i => { const s = Math.sin(i * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
export const hash2 = (i, j) => hash(i * 57.13 + j * 113.7);
export const noise1 = x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(hash(i), hash(i + 1), u) * 2 - 1; };
export const TAU = Math.PI * 2;
// между двумя ключами по времени: at(lt, [[0, a], [1.2, b], [2, c]], easeFn)
export function keys(t, ks, fn = ease) {
  if (t <= ks[0][0]) return ks[0][1];
  for (let i = 1; i < ks.length; i++) if (t <= ks[i][0]) {
    const [t0, a] = ks[i - 1], [t1, b] = ks[i]; const k = fn((t - t0) / (t1 - t0));
    return Array.isArray(a) ? a.map((v, j) => lerp(v, b[j], k)) : lerp(a, b, k);
  }
  return ks[ks.length - 1][1];
}

/* ---------- цвет ---------- */
export function rgba(hex, a = 1) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
export function shade(hex, k) { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + ((f(n >> 16) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0'); }

/* ---------- холст ---------- */
export let X = null;                       // текущий 2D-контекст (live binding: меняется движком)
const mk = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
let MAIN, SCN, BA, BB, TMP, GRAIN = [];
function setX(c) { X = c; }

/* ---------- шрифты ---------- */
export const F = { head: '"Oswald"', mono: '"JBMono"', serif: '"PTSerif"', sans: '"Oswald"' };
async function loadFonts(base) {
  const list = [['Oswald', 'Oswald.ttf', '200 700'], ['JBMono', 'JetBrainsMono.ttf', '100 800'], ['PTSerif', 'PTSerif.ttf', '400'], ['PTSerif', 'PTSerif-Bold.ttf', '700']];
  for (const [fam, file, weight] of list) { const f = new FontFace(fam, `url(${base}fonts/${file})`, { weight }); await f.load(); document.fonts.add(f); }
}

/* ---------- текст ---------- */
// txt('2007', 540, 900, {size:220, font:'head', weight:700, color:'#FFB347', glow:'#FF7A1A', align:'center'})
export function txt(s, x, y, o = {}) {
  const size = o.size || 64, fam = F[o.font || 'head'] || o.font;
  X.save();
  X.font = `${o.italic ? 'italic ' : ''}${o.weight || 600} ${size}px ${fam}`;
  X.textAlign = o.align || 'left'; X.textBaseline = o.base || 'alphabetic';
  if (o.ls) X.letterSpacing = o.ls + 'px';
  X.globalAlpha *= o.alpha ?? 1;
  if (o.glow) { X.shadowColor = o.glow; X.shadowBlur = o.glowR || size * 0.45; }
  else if (o.shadow !== false) { X.shadowColor = 'rgba(0,0,0,0.55)'; X.shadowBlur = size * 0.18; X.shadowOffsetY = size * 0.04; }
  if (o.stroke) { X.lineJoin = 'round'; X.lineWidth = o.strokeW || size * 0.12; X.strokeStyle = o.stroke; X.strokeText(s, x, y); }
  X.fillStyle = o.color || '#F2EFE8'; X.fillText(s, x, y);
  if (o.glow) X.fillText(s, x, y);
  X.restore();
}
export function measure(s, size, font = 'head', weight = 600) { X.save(); X.font = `${weight} ${size}px ${F[font] || font}`; const w = X.measureText(s).width; X.restore(); return w; }
// строка из кусков с акцентами: rich(['ЦЕЛОЙ ', {t:'СТРАНЫ', c:'#FF8A1F'}], 540, 1180, {size:76, align:'center'})
export function rich(parts, x, y, o = {}) {
  const size = o.size || 64; const segs = parts.map(p => typeof p === 'string' ? { t: p } : p);
  const tot = segs.reduce((a, p) => a + measure(p.t, size, o.font || 'head', o.weight || 700), 0);
  let cx = o.align === 'center' ? x - tot / 2 : o.align === 'right' ? x - tot : x;
  for (const p of segs) { txt(p.t, cx, y, Object.assign({}, o, { align: 'left', color: p.c || o.color })); cx += measure(p.t, size, o.font || 'head', o.weight || 700); }
}
// перенос по ширине; возвращает строки
export function wrap(s, maxW, size, font = 'head', weight = 600) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { const tt = line ? line + ' ' + w : w; if (measure(tt, size, font, weight) > maxW && line) { out.push(line); line = w; } else line = tt; }
  if (line) out.push(line); return out;
}

/* ---------- 2D-примитивы ---------- */
export function rect(x, y, w, h, c) { X.fillStyle = c; X.fillRect(x, y, w, h); }
export function rrect(x, y, w, h, r, fill, stroke, lw = 2) { X.beginPath(); X.roundRect(x, y, w, h, r); if (fill) { X.fillStyle = fill; X.fill(); } if (stroke) { X.strokeStyle = stroke; X.lineWidth = lw; X.stroke(); } }
export function fillAll(c) { X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = c; X.fillRect(0, 0, W, H); X.restore(); }
export function vgrad(c1, c2, y0 = 0, y1 = H) { const g = X.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c1); g.addColorStop(1, c2);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0); X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore(); }
export function rglow(x, y, r, c, a = 1) { const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
  X.fillStyle = g; X.fillRect(x - r, y - r, r * 2, r * 2); }
// конус прожектора сверху: свет, который «держит» кадр
export function spotCone(x, yTop, wTop, wBot, yBot, c = '#FFE8C0', a = 0.16) {
  X.save(); const g = X.createLinearGradient(0, yTop, 0, yBot); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0));
  X.fillStyle = g; X.beginPath(); X.moveTo(x - wTop / 2, yTop); X.lineTo(x + wTop / 2, yTop); X.lineTo(x + wBot / 2, yBot); X.lineTo(x - wBot / 2, yBot); X.closePath();
  X.filter = 'blur(18px)'; X.fill(); X.restore(); rglow(x, yBot - 40, wBot * 0.6, c, a * 1.2);
}
// боке: размытые огни на дальнем плане (чистая функция lt)
export function bokeh(lt, n = 22, cols = ['#FFB347', '#7FC8FF', '#FFFFFF'], seed = 1, a = 0.35, yMin = 0, yMax = H) {
  X.save(); X.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = hash2(i, seed) * W + noise1(lt * 0.25 + i) * 30, y = lerp(yMin, yMax, hash2(i, seed + 7)) + noise1(lt * 0.2 + i * 3) * 20;
    const r = 18 + hash2(i, seed + 3) * 60, c = cols[i % cols.length];
    rglow(x, y, r, c, a * (0.4 + 0.6 * hash2(i, seed + 9)) * (0.85 + 0.15 * Math.sin(lt * 1.3 + i)));
  }
  X.restore();
}
// пыль в луче
export function dust(lt, n = 70, seed = 3, c = '#FFF3DA', a = 0.5, box = [0, 0, W, H]) {
  X.save(); X.fillStyle = c;
  for (let i = 0; i < n; i++) {
    const x = box[0] + ((hash2(i, seed) * box[2] + lt * (8 + hash2(i, seed + 1) * 18)) % box[2]);
    const y = box[1] + ((hash2(i, seed + 2) * box[3] - lt * (4 + hash2(i, seed + 5) * 10)) % box[3] + box[3]) % box[3];
    X.globalAlpha = a * (0.3 + 0.7 * hash2(i, seed + 4)) * (0.6 + 0.4 * Math.sin(lt * 2 + i));
    X.beginPath(); X.arc(x, y, 1.2 + 2.4 * hash2(i, seed + 6), 0, TAU); X.fill();
  }
  X.restore();
}
// нарисовать что угодно с размытием (глубина резкости): blurred(8, () => {...})
export function blurred(px, fn) { const prev = X; const c = TMP.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H);
  c.setTransform(prev.getTransform()); setX(c); fn(); setX(prev);
  prev.save(); prev.setTransform(1, 0, 0, 1, 0, 0); prev.filter = `blur(${px}px)`; prev.drawImage(TMP, 0, 0); prev.restore(); }

/* ---------- 3D ---------- */
export const GL = { renderer: null, canvas: null, worlds: {}, THREE };
function initGL(o) {
  o = Object.assign({ glScale: 0.55, env: false, shadows: true }, o);   // 0.66 и без env — в 3–4 раза быстрее в программном WebGL
  GL.canvas = mk(Math.round(W * o.glScale), Math.round(H * o.glScale));
  const R = new THREE.WebGLRenderer({ canvas: GL.canvas, antialias: o.aa !== false, preserveDrawingBuffer: true, alpha: true });
  R.setPixelRatio(1); R.setSize(GL.canvas.width, GL.canvas.height, false);
  R.shadowMap.enabled = o.shadows !== false; R.shadowMap.type = THREE.PCFShadowMap;
  R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = o.exposure || 1.0; R.outputColorSpace = THREE.SRGBColorSpace;
  GL.renderer = R; GL.opts = o;
}
function world(name) {
  if (!GL.worlds[name]) { const b = FILM.worlds[name]; if (!b) throw new Error('нет мира ' + name);
    const w = b(GL); w.camera = w.camera || new THREE.PerspectiveCamera(35, W / H, 0.05, 200); w.camera.aspect = W / H; w.camera.updateProjectionMatrix(); GL.worlds[name] = w; }
  return GL.worlds[name];
}
// плавный пролёт камеры: camPath(cam, lt, [[0,{pos:[..],at:[..]}],[3,{...}]])
export function camPath(cam, t, ks, fn = eIO) {
  const pos = keys(t, ks.map(k => [k[0], k[1].pos]), fn), at = keys(t, ks.map(k => [k[0], k[1].at]), fn);
  cam.position.set(pos[0], pos[1], pos[2]); cam.lookAt(at[0], at[1], at[2]);
  const fov = ks[0][1].fov ? keys(t, ks.map(k => [k[0], k[1].fov || ks[0][1].fov]), fn) : null; if (fov) { cam.fov = fov; cam.updateProjectionMatrix(); }
}

/* ---------- фильм ---------- */
export let FILM = null; let T0 = [], DUR = 0;
const TR = { cut: 0, match: 0.0, whip: 0.28, push: 0.42, pull: 0.42, flash: 0.16, dim: 0.6, glitch: 0.22, slide: 0.36 };
function trOf(s) { if (!s.tin) return ['cut', 0, 'left']; const a = Array.isArray(s.tin) ? s.tin : [s.tin]; return [a[0], a[1] ?? TR[a[0]] ?? 0, a[2] || FILM.current || 'left']; }

// авто-камера: у каждого плана есть движение, направления не повторяются подряд
const AUTO = [[1.00, 1.07, 0, -0.012, 0, 0], [1.08, 1.01, 0.012, 0, 0, 0.006], [1.02, 1.10, 0, 0, 0.012, -0.004], [1.06, 1.00, -0.014, 0.006, 0, 0]];
function camOf(s, i) { const c = s.cam === false ? [1, 1, 0, 0, 0, 0] : (s.cam || AUTO[i % AUTO.length]); return c; }

function renderShot(i, t, ctx) {
  const s = FILM.shots[i], lt = t - T0[i], p = clamp(lt / s.d);
  setX(ctx); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.filter = 'none'; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = s.bg || FILM.bg || '#07090D'; ctx.fillRect(0, 0, W, H);
  const c = camOf(s, i), e = (s.camEase || eIO)(p), z = lerp(c[0], c[1], e), dx = lerp(c[2], c[3], e) * W, dy = lerp(c[4], c[5], e) * H;
  const pop = s.pop === false ? 1 : 1 + 0.035 * Math.exp(-Math.max(0, lt) * 10);
  ctx.save(); ctx.translate(W / 2 + dx, H / 2 + dy); ctx.scale(z * pop, z * pop); ctx.translate(-W / 2, -H / 2);
  if (s.gl) {
    const w = world(s.gl.world); s.gl.update && s.gl.update(w, lt, p, s);
    GL.renderer.setClearColor(0x000000, 0); GL.renderer.render(w.scene, w.camera);
    if (s.under) s.under(p, lt, s);          // 2D позади 3D (фон)
    ctx.drawImage(GL.canvas, 0, 0, W, H);
  }
  s.draw && s.draw(p, lt, s);
  ctx.restore();
  if (s.hud) { ctx.save(); s.hud(p, lt, s); ctx.restore(); }   // HUD поверх, без камеры
}

function composite(kind, u, dir) {
  const c = SCN.getContext('2d'); setX(c); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.filter = 'none';
  const sg = dir === 'right' || dir === 'down' ? 1 : -1, horiz = dir === 'left' || dir === 'right';
  if (kind === 'whip' || kind === 'slide') {
    const A = u < 0.5, k = A ? eIn(u * 2, 3) : 1 - eOut((u - 0.5) * 2, 3), img = A ? BA : BB, off = (A ? 1 : -1) * k * (kind === 'whip' ? 0.7 : 1) * sg;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H);
    const n = kind === 'whip' ? 6 : 1;
    for (let g = 0; g < n; g++) { c.globalAlpha = g === 0 ? 1 : 0.22 * (1 - g / n); const o2 = off * (1 + g * 0.06 * k);
      c.drawImage(img, horiz ? o2 * W : 0, horiz ? 0 : o2 * H); }
    c.globalAlpha = 1;
  } else if (kind === 'push' || kind === 'pull') {          // Z: обе стороны растут (push) или обе уменьшаются (pull)
    const A = u < 0.5, k = A ? eIn(u * 2, 2) : eOut((u - 0.5) * 2, 2);
    const sc = kind === 'push' ? (A ? lerp(1, 1.7, k) : lerp(0.72, 1, k)) : (A ? lerp(1, 0.75, k) : lerp(1.4, 1, k));
    const bl = A ? k * 14 : (1 - k) * 14;
    c.fillStyle = '#000'; c.fillRect(0, 0, W, H); c.save(); c.translate(W / 2, H / 2); c.scale(sc, sc); c.translate(-W / 2, -H / 2);
    c.filter = `blur(${bl}px)`; c.globalAlpha = A ? 1 - 0.3 * k : 0.7 + 0.3 * k; c.drawImage(A ? BA : BB, 0, 0); c.restore();
  } else if (kind === 'dim') {
    const A = u < 0.5, k = A ? u * 2 : (u - 0.5) * 2; c.drawImage(A ? BA : BB, 0, 0); c.fillStyle = `rgba(0,0,0,${A ? k : 1 - k})`; c.fillRect(0, 0, W, H);
  } else if (kind === 'flash') {
    c.drawImage(u < 0.5 ? BA : BB, 0, 0); c.fillStyle = `rgba(255,248,235,${0.85 * (1 - Math.abs(u - 0.5) * 2)})`; c.fillRect(0, 0, W, H);
  } else if (kind === 'glitch') {
    const img = u < 0.5 ? BA : BB; c.drawImage(img, 0, 0);
    for (let k = 0; k < 9; k++) { const y = hash2(k, Math.floor(u * 12)) * H, h = 30 + hash2(k, 3) * 140, sh = (hash2(k, 5) - 0.5) * 160 * (1 - Math.abs(u - 0.5) * 2);
      c.drawImage(img, 0, y, W, h, sh, y, W, h); }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.35 * (1 - Math.abs(u - 0.5) * 2); c.drawImage(img, 14, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  } else c.drawImage(u < 0.5 ? BA : BB, 0, 0);
}

/* ---------- верхняя плашка: дело, место, идущие часы ---------- */
function clockStr(s, lt) { if (!s.clock) return null; const [h, m, sec] = s.clock.split(':').map(Number); let tot = h * 3600 + m * 60 + sec + Math.floor(Math.max(0, lt) * (s.clockRate || 1));
  const p2 = v => String(v).padStart(2, '0'); tot %= 86400; return `${p2(Math.floor(tot / 3600))}:${p2(Math.floor(tot / 60) % 60)}:${p2(tot % 60)}`; }
function topbar(s, lt) {
  const B = FILM.bar; if (!B || s.bar === false) return;
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  const g = X.createLinearGradient(0, 0, 0, 150); g.addColorStop(0, 'rgba(0,0,0,0.55)'); g.addColorStop(1, 'rgba(0,0,0,0)'); X.fillStyle = g; X.fillRect(0, 0, W, 150);
  X.fillStyle = B.dot || '#E5484D'; X.globalAlpha = 0.75 + 0.25 * Math.sin(lt * 5); X.beginPath(); X.arc(58, 72, 7, 0, TAU); X.fill(); X.globalAlpha = 1;
  txt(`${B.tag || ''}${s.bar ? '  ·  ' + s.bar : ''}`.toUpperCase(), 78, 81, { size: 26, font: 'mono', weight: 600, color: B.color || '#C9CED6', shadow: false, ls: 2 });
  const ck = clockStr(s, lt); if (ck) txt(ck, W - 56, 82, { size: 30, font: 'mono', weight: 700, color: B.clockColor || '#F2EFE8', align: 'right', shadow: false });
  X.restore();
}

/* ---------- пост: свечение, виньетка, зерно ---------- */
function post() {
  const fx = Object.assign({ bloom: 0.32, vignette: 0.55, grain: 0.06 }, FILM.fx || {});
  const c = MAIN.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.filter = 'none';
  c.drawImage(SCN, 0, 0);
  if (fx.bloom) { const q = TMP.getContext('2d'); q.setTransform(1, 0, 0, 1, 0, 0); q.clearRect(0, 0, W, H); q.filter = 'brightness(0.9) contrast(2.2) blur(22px)';
    q.drawImage(SCN, 0, 0, W / 3, H / 3); q.filter = 'none'; c.globalCompositeOperation = 'screen'; c.globalAlpha = fx.bloom; c.drawImage(TMP, 0, 0, W / 3, H / 3, 0, 0, W, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
  if (fx.vignette) { const g = c.createRadialGradient(W / 2, H * 0.48, H * 0.25, W / 2, H * 0.5, H * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${fx.vignette})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  if (fx.grain) { c.globalCompositeOperation = 'overlay'; c.globalAlpha = fx.grain * 4; c.drawImage(GRAIN[FRAME % GRAIN.length], 0, 0, W, H); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; }
}
function makeGrain() { for (let k = 0; k < 6; k++) { const g = mk(540, 960), q = g.getContext('2d'), im = q.createImageData(540, 960);
  for (let i = 0; i < im.data.length; i += 4) { const v = 128 + (hash(i * 0.37 + k * 9137.1) - 0.5) * 150; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  q.putImageData(im, 0, 0); GRAIN.push(g); } }

/* ---------- вшитые слова (по умолчанию выкл.: субтитры отдаются .srt) ---------- */
function burn(t) {
  if (!FILM.burn || !NARR.length) return; const b = NARR.find(n => t >= n.t0 && t < n.t1); if (!b) return;
  const words = b.text.split(' '), per = (b.t1 - b.t0) / words.length, k = Math.min(words.length, Math.floor((t - b.t0) / per) + 1);
  const shown = words.slice(Math.max(0, k - 3), k);
  X.save(); X.setTransform(1, 0, 0, 1, 0, 0);
  rich(shown.map((w, j) => { const acc = w.startsWith('*'); const ww = w.replace(/\*/g, ''); return { t: ww + ' ', c: acc ? (FILM.accent || '#FF8A1F') : '#F2EFE8' }; }), W / 2, H * 0.615, { size: 74, weight: 700, align: 'center', stroke: 'rgba(0,0,0,0.6)', strokeW: 10 });
  X.restore();
}

/* ---------- кадр ---------- */
let FRAME = 0, NARR = [];
function idxAt(t) { let i = FILM.shots.length - 1; while (i > 0 && t < T0[i]) i--; return i; }
export function frame(t) {
  FRAME = Math.round(t * FILM.fps); const i = idxAt(t);
  let done = false;
  for (const b of [i, i + 1]) {            // окно перехода вокруг границы b
    if (b <= 0 || b >= FILM.shots.length) continue; const [kind, dur, dir] = trOf(FILM.shots[b]); if (!dur) continue;
    const a0 = T0[b] - dur / 2, a1 = T0[b] + dur / 2; if (t < a0 || t >= a1) continue;
    renderShot(b - 1, t, BA.getContext('2d')); renderShot(b, t, BB.getContext('2d')); composite(kind, (t - a0) / dur, dir); done = true; break;
  }
  if (!done) renderShot(i, t, SCN.getContext('2d'));
  post(); setX(MAIN.getContext('2d')); const s = FILM.shots[i];
  topbar(s, t - T0[i]); burn(t);
  if (FILM.overlay) { X.save(); FILM.overlay(t, i); X.restore(); }
  if (window.QA_HOOK) window.QA_HOOK(i);
}

/* ---------- запуск ---------- */
const BASE = new URL('.', import.meta.url).href;
export async function run(film, base = BASE) {
  FILM = film; FILM.fps = FILM.fps || 30;
  const Q = new URLSearchParams(location.search);              // отладка скорости: ?bloom=0&gl=0.5&shadow=0
  if (Q.has('bloom')) FILM.fx = Object.assign({}, FILM.fx, { bloom: +Q.get('bloom') });
  if (Q.has('gl')) FILM.gl = Object.assign({}, FILM.gl, { glScale: +Q.get('gl') });
  if (Q.has('aa')) FILM.gl = Object.assign({}, FILM.gl, { aa: Q.get('aa') !== '0' });
  if (Q.has('env')) FILM.gl = Object.assign({}, FILM.gl, { env: Q.get('env') !== '0' });
  if (Q.has('shadow')) FILM.gl = Object.assign({}, FILM.gl, { shadows: Q.get('shadow') !== '0' });
  // timing.json (subs.py --align по реальному голосу): растянуть планы каждого блока озвучки под голос
  try { const r = await fetch('timing.json'); if (r.ok) { const tm = await r.json(); const nb = (FILM.narr || []).map(n => n[0]);
    nb.forEach((s0, k) => { const s1 = k + 1 < nb.length ? nb[k + 1] : FILM.shots.length; const want = (k + 1 < nb.length ? tm.blocks[k + 1] : tm.end) - (k ? tm.blocks[k] : 0);
      let have = 0; for (let i = (k ? s0 : 0); i < s1; i++) have += FILM.shots[i].d; for (let i = (k ? s0 : 0); i < s1; i++) FILM.shots[i].d *= want / have; }); } } catch (e) {}
  T0 = []; let acc = 0; for (const s of FILM.shots) { T0.push(acc); acc += s.d; } DUR = acc;
  MAIN = document.getElementById('c'); MAIN.width = W; MAIN.height = H; SCN = mk(); BA = mk(); BB = mk(); TMP = mk();
  await loadFonts(base); makeGrain(); initGL(FILM.gl || {});
  // озвучка: блоки [индекс первого плана, текст] -> окна по времени планов
  NARR = (FILM.narr || []).map((n, k, a) => ({ t0: T0[n[0]], t1: k + 1 < a.length ? T0[a[k + 1][0]] : DUR, text: n[1] }));
  for (const name of Object.keys(FILM.worlds || {})) world(name);          // собрать все 3D-миры заранее
  const events = [];
  FILM.shots.forEach((s, i) => { const [kind] = trOf(s);
    if (i > 0) events.push({ t: T0[i], kind: ({ whip: 'whoosh', slide: 'whoosh', push: 'swoosh_in', pull: 'boom', flash: 'hit', glitch: 'glitch', dim: 'none', cut: s.hit ? 'hit' : 'tick', match: 'tick' })[kind] || 'tick', g: s.hit ? 1 : 0.6 });
    (s.sfx || []).forEach(e => events.push({ t: T0[i] + e[0], kind: e[1], g: e[2] ?? 1, d: e[3] }));
  });
  window.film = { frame, duration: DUR, fps: FILM.fps, W, H, events: events.sort((a, b) => a.t - b.t),
    shots: FILM.shots.map((s, i) => ({ i, t0: T0[i], d: s.d, id: s.id || 's' + (i + 1), see: s.see || '' })), narr: NARR, audio: FILM.audio || {}, title: FILM.title || 'film' };
  frame(0); window.READY = true;
}
