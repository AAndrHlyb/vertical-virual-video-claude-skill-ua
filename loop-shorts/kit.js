// kit.js — набор 2D-элементов для простых зацикленных вертикальных роликов (1080×1920, чёрный фон).
// Всё рисуется функцией от времени t; петля: состояние в t = D совпадает с t = 0.
// Ролик: import * as K from '../../kit.js'; K.film({ d: 12, draw(t) { ... }, sfx: [[t,'pop'],...] })
import { run, W, H, X, txt, clamp, lerp, inv, ease, eIO, eOut, eIn, back, spring, hash, hash2, noise1, TAU, rgba } from '../vertical-story-film-ua/engine/core.js';
export { W, H, X, clamp, lerp, inv, eIO, eOut, eIn, back, spring, hash, hash2, noise1, TAU, rgba };

/* ================= ПАЛИТРА ================= */
export const C = { bg: '#000', ink: '#EDEDED', dim: '#8A8A8A', faint: '#3A3A3A',
  pink: '#CC6677', blue: '#88CCEE', indigo: '#332288', yel: '#DDCC77', green: '#2EE6A0', teal: '#44AA99', red: '#FF4A3D', orange: '#FF8A1F', gold: '#F5B83D', violet: '#9C8CFF', fire: '#FF7A1A' };

/* ================= ВРЕМЯ И ПЕТЛЯ ================= */
export let D = 10;                                                   // длина петли, задаётся в film()
export const ph = (t, n = 1) => ((t / D) * n % 1 + 1) % 1;            // фаза 0..1, n целых циклов за петлю — шва нет
export const osc = (t, n = 1, a = 1, off = 0) => a * Math.sin(TAU * (ph(t, n) + off));
export const seg = (t, t0, t1, e = eIO) => e(inv(t0, t1, t));          // прогресс 0..1 на отрезке
export const bump = (t, t0, dur) => Math.sin(Math.PI * clamp((t - t0) / dur));   // 0→1→0
export const fadeIO = (t, f = 0.4) => clamp(t / f) * clamp((D - t) / f);       // мягкий вход/выход для того, что не замыкается само
// ключи: tl(t, [[0, 0], [2, 100], [5, 100, eOut], [D, 0]]) — числа или массивы; в конце ставь значение начала
export function tl(t, keys, e = eIO) {
  if (t <= keys[0][0]) return keys[0][1]; for (let i = 1; i < keys.length; i++) { const [t1, v1, ee] = keys[i], [t0, v0] = keys[i - 1];
    if (t <= t1) { const k = (ee || e)(inv(t0, t1, t)); return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], k)) : lerp(v0, v1, k); } }
  return keys[keys.length - 1][1]; }
// по шагам: какой этап сейчас и прогресс в нём: const [i, k] = step(t, [0, 3, 6, 9])
export function step(t, marks) { let i = 0; while (i + 1 < marks.length && t >= marks[i + 1]) i++; const t1 = marks[i + 1] ?? D; return [i, clamp((t - marks[i]) / (t1 - marks[i]))]; }

/* ================= СТИЛЬ ЛИНИЙ ================= */
// o: { c: цвет, w: толщина, fill, a: прозрачность, glow: радиус свечения, dash: [10,8], cap }
function st(o = {}) { X.globalAlpha *= o.a ?? 1; X.strokeStyle = o.c || C.ink; X.lineWidth = o.w ?? 3; X.lineCap = o.cap || 'round'; X.lineJoin = 'round';
  if (o.glow) { X.shadowColor = o.gc || o.c || C.ink; X.shadowBlur = o.glow; } if (o.dash) X.setLineDash(o.dash); }
const plen = (p, closed) => { let L = 0; for (let i = 1; i < p.length + (closed ? 1 : 0); i++) { const a = p[i - 1], b = p[i % p.length]; L += Math.hypot(b[0] - a[0], b[1] - a[1]); } return L; };
function drawOn(p, k, closed) { if (k >= 1) return; const L = plen(p, closed); X.setLineDash([L * Math.max(0, k), L + 1]); }

/* ================= ПРИМИТИВЫ ================= */
export const bg = (c = C.bg) => { X.fillStyle = c; X.fillRect(0, 0, W, H); };
export function line(a, b, o = {}, k = 1) { if (k <= 0) return; X.save(); st(o); drawOn([a, b], k); X.beginPath(); X.moveTo(...a); X.lineTo(...b); X.stroke(); X.restore(); }
export function path(p, o = {}, k = 1, closed = false) { if (k <= 0 || p.length < 2) return; X.save(); st(o); X.beginPath(); X.moveTo(...p[0]); for (let i = 1; i < p.length; i++) X.lineTo(...p[i]); if (closed) X.closePath();
  if (o.fill) { X.save(); X.globalAlpha *= o.fa ?? 1; X.shadowBlur = 0; X.fillStyle = o.fill; X.fill(); X.restore(); } if (o.w !== 0) { drawOn(p, k, closed); X.stroke(); } X.restore(); }
export const poly = (p, o = {}, k = 1) => path(p, o, k, true);
export function circ(x, y, r, o = {}, k = 1, a0 = -Math.PI / 2) { if (k <= 0) return; X.save(); st(o); X.beginPath(); X.arc(x, y, Math.max(0.1, r), a0, a0 + TAU * Math.min(1, k));
  if (o.fill) { X.save(); X.globalAlpha *= o.fa ?? 1; X.shadowBlur = 0; X.fillStyle = o.fill; X.fill(); X.restore(); } if (o.w !== 0) X.stroke(); X.restore(); }
export const dot = (x, y, r = 8, c = C.ink, glow = 0) => circ(x, y, r, { fill: c, w: 0, glow, c });
export function box(x, y, w, h, o = {}, k = 1) { poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], o, k); }
export function rbox(x, y, w, h, r, o = {}) { X.save(); st(o); X.beginPath(); X.roundRect(x, y, w, h, r); if (o.fill) { X.fillStyle = o.fill; X.fill(); } if (o.w !== 0) X.stroke(); X.restore(); }
export function arrow(a, b, o = {}, k = 1, head = 22) { if (k <= 0) return; const e = [lerp(a[0], b[0], k), lerp(a[1], b[1], k)]; line(a, e, o); const an = Math.atan2(e[1] - a[1], e[0] - a[0]);
  path([[e[0] - head * Math.cos(an - 0.45), e[1] - head * Math.sin(an - 0.45)], e, [e[0] - head * Math.cos(an + 0.45), e[1] - head * Math.sin(an + 0.45)]], o); }
export function curve(f, x0, x1, map, o = {}, k = 1, n = 120) { const p = []; for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n); p.push(map(x, f(x))); } path(p, o, k); }
// оси: axes(cx, cy, w, h) возвращает map(x,y) для curve; ux/uy — пикселей на единицу
export function axes(cx, cy, w, h, ux = 60, uy = 60, o = { c: C.dim, w: 2 }, k = 1) { arrow([cx - w / 2, cy], [cx + w / 2, cy], o, k, 14); arrow([cx, cy + h / 2], [cx, cy - h / 2], o, k, 14); return (x, y) => [cx + x * ux, cy - y * uy]; }
export function grid(x, y, w, h, s = 60, o = { c: '#1A1A1A', w: 1 }) { for (let i = 0; i <= w / s; i++) line([x + i * s, y], [x + i * s, y + h], o); for (let j = 0; j <= h / s; j++) line([x, y + j * s], [x + w, y + j * s], o); }
export function wave(x0, x1, y, amp, n, t, o = {}, speed = 1) { const p = []; for (let x = x0; x <= x1; x += 6) p.push([x, y + amp * Math.sin(TAU * (n * (x - x0) / (x1 - x0) - ph(t, speed)))]); path(p, o); }
// линия пола, гаснущая к краям (как в референсах)
export function ground(y, o = {}) { X.save(); const g = X.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, o.c || 'rgba(255,255,255,0.85)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  X.strokeStyle = g; X.lineWidth = o.w ?? 3; if (o.glow) { X.shadowColor = '#fff'; X.shadowBlur = o.glow; } X.beginPath(); X.moveTo(0, y); X.lineTo(W, y); X.stroke(); X.restore(); }

/* ================= ГЕОМЕТРИЯ ================= */
export const mv = (p, dx, dy) => p.map(([x, y]) => [x + dx, y + dy]);
export const rot = (p, cx, cy, a) => p.map(([x, y]) => [cx + (x - cx) * Math.cos(a) - (y - cy) * Math.sin(a), cy + (x - cx) * Math.sin(a) + (y - cy) * Math.cos(a)]);
export const scl = (p, cx, cy, s) => p.map(([x, y]) => [cx + (x - cx) * s, cy + (y - cy) * s]);
export const ctr = p => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
export const lerpP = (A, B, k) => A.map((a, i) => [lerp(a[0], B[i][0], k), lerp(a[1], B[i][1], k)]);   // морф по вершинам
// жёсткое перемещение фигуры A → положение B (сдвиг + поворот вокруг центра), без искажения
export function rigid(p, dx, dy, ang, k) { const c = ctr(p); return mv(rot(p, c[0], c[1], ang * k), dx * k, dy * k); }
export const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
export const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
export const regular = (cx, cy, r, n, a0 = -Math.PI / 2) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(a0 + TAU * i / n), cy + r * Math.sin(a0 + TAU * i / n)]);
export const rectP = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
// прямоугольный треугольник: R — прямой угол, катет a под углом th, катет b повёрнут на +90°
export const rtri = (R, a, b, th = 0) => { const c = Math.cos(th), s = Math.sin(th); return [R, [R[0] + a * c, R[1] + a * s], [R[0] - b * s, R[1] + b * c]]; };
// отметки: прямой угол, дуга угла, черточки равенства, размер со стрелками
export function rightMark(R, A, B, s = 26, o = { c: C.ink, w: 2 }) { const u = [(A[0] - R[0]) / dist(R, A) * s, (A[1] - R[1]) / dist(R, A) * s], v = [(B[0] - R[0]) / dist(R, B) * s, (B[1] - R[1]) / dist(R, B) * s];
  path([[R[0] + u[0], R[1] + u[1]], [R[0] + u[0] + v[0], R[1] + u[1] + v[1]], [R[0] + v[0], R[1] + v[1]]], o); }
export function angleArc(P, A, B, r = 50, o = { c: C.yel, w: 3 }, k = 1) { const a0 = Math.atan2(A[1] - P[1], A[0] - P[0]); let a1 = Math.atan2(B[1] - P[1], B[0] - P[0]); let d = a1 - a0; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
  X.save(); st(o); X.beginPath(); X.arc(P[0], P[1], r, a0, a0 + d * k, d < 0); X.stroke(); X.restore(); }
// сектор угла (кусочек «пиццы»): вершина P, углы a0→a1 (рад, по часовой в экранных коорд.)
export function sector(x, y, r, a0, a1, o = {}) { const p = [[x, y]], n = 40; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([x + r * Math.cos(a), y + r * Math.sin(a)]); } poly(p, o); }
export const ang = (P, Q) => Math.atan2(Q[1] - P[1], Q[0] - P[0]);   // направление P→Q
export function tick(a, b, n = 1, o = { c: C.ink, w: 2 }) { const m = mid(a, b), an = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2; for (let i = 0; i < n; i++) { const off = (i - (n - 1) / 2) * 9, cx = m[0] + off * Math.cos(an - Math.PI / 2), cy = m[1] + off * Math.sin(an - Math.PI / 2);
  line([cx - 12 * Math.cos(an), cy - 12 * Math.sin(an)], [cx + 12 * Math.cos(an), cy + 12 * Math.sin(an)], o); } }
export function sideLabel(s, a, b, inside, d = 40, o = {}) { const m = mid(a, b), dx = m[0] - inside[0], dy = m[1] - inside[1], n = Math.hypot(dx, dy) || 1; M(s, m[0] + dx / n * d, m[1] + dy / n * d, o); }

/* ================= ТЕКСТ ================= */
const T0 = { size: 56, align: 'center', base: 'middle', shadow: false };
export const T = (s, x, y, o = {}) => txt(s, x, y, Object.assign({}, T0, { font: 'head', weight: 600, color: C.ink }, o));             // заголовки, подписи
export const M = (s, x, y, o = {}) => txt(s, x, y, Object.assign({}, T0, { font: 'serif', italic: true, weight: 400, color: C.ink }, o));   // математика: a² + b² = c²
export const S = (s, x, y, o = {}) => txt(s, x, y, Object.assign({}, T0, { font: 'serif', weight: 400, color: C.ink }, o));             // обычный текст с засечками (цитаты)
export const mono = (s, x, y, o = {}) => txt(s, x, y, Object.assign({}, T0, { font: 'mono', weight: 600, color: C.ink }, o));
// печатная машинка: появляется по буквам начиная с t0, cps букв/с
export const type = (s, x, y, t, t0, cps = 22, o = {}, f = S) => f(s.slice(0, Math.max(0, Math.floor((t - t0) * cps))), x, y, o);
// формула, растущая по частям: parts = [['c²', 1, C.blue], [' = ', 3], ['a²', 3, C.violet], ...]
export function formula(parts, x, y, t, o = {}) { const size = o.size || 76; X.save(); X.font = `italic 400 ${size}px "PTSerif"`; const ws = parts.map(([s]) => X.measureText(s).width); X.restore();
  const on = parts.map(([, t0]) => t >= t0), tw = ws.reduce((s, w, i) => s + (on[i] ? w : 0), 0); let cx = x - tw / 2;
  parts.forEach(([s, t0, c], i) => { if (!on[i]) return; M(s, cx + ws[i] / 2, y, { size, color: c || o.color || C.ink, alpha: clamp((t - t0) / 0.4) * (o.a ?? 1) }); cx += ws[i]; }); }
// степень с любым показателем (шрифт не знает ⁶⁵ и т.п.): pow_('1,01', '365', ' ≈ 37,8', x, y, {size, color})
export function pow_(base, exp, rest, x, y, o = {}) { const size = o.size || 64; X.save(); X.font = `italic 400 ${size}px "PTSerif"`; const wb = X.measureText(base).width, wr = X.measureText(rest).width; X.font = `italic 400 ${size * 0.55}px "PTSerif"`; const we = X.measureText(exp).width; X.restore();
  let cx = x - (wb + we + wr) / 2; const oo = Object.assign({}, o, { align: 'left' }); M(base, cx, y, oo); M(exp, cx + wb + 2, y - size * 0.38, Object.assign({}, oo, { size: size * 0.55 })); M(rest, cx + wb + we + 4, y, oo); }
export function frameBox(x, y, w, h, k = 1, o = { c: C.ink, w: 2 }) { box(x - w / 2 * k, y - h / 2, w * k, h, o); }   // рамка итога, раскрывается из центра
export function wrapLines(s, maxW, size = 60, font = 'PTSerif') { X.save(); X.font = `400 ${size}px "${font}"`; const out = []; let cur = '';
  for (const w of s.split(' ')) { const tr = cur ? cur + ' ' + w : w; if (X.measureText(tr).width > maxW && cur) { out.push(cur); cur = w; } else cur = tr; } if (cur) out.push(cur); X.restore(); return out; }

/* ================= ИНДИКАТОРЫ ================= */
// светящаяся полоска-уровень (как «Discipline / Motivation» в референсе): label сверху
export function bar(x, y, w, level, c = C.green, label = '', o = {}) { const h = o.h || 10; X.save(); X.globalAlpha *= o.a ?? 1;
  if (label) T(label, x, y - 34, { size: o.size || 40, weight: 600, color: C.ink });
  X.shadowColor = c; X.shadowBlur = 24; X.fillStyle = c; X.beginPath(); X.roundRect(x - w / 2, y - h / 2, Math.max(h, w * clamp(level)), h, h / 2); X.fill(); X.restore(); }
export const levelColor = v => v > 0.66 ? C.green : v > 0.33 ? C.yel : C.red;                     // цвет по уровню
export function ring(x, y, r, k, c = C.green, o = {}) { circ(x, y, r, { c: C.faint, w: o.w || 14 }); circ(x, y, r, { c, w: o.w || 14, glow: 20 }, k); if (o.label !== false) T(Math.round(k * 100) + '%', x, y, { size: r * 0.55, color: C.ink }); }
export function counter(v, x, y, o = {}) { T((o.pre || '') + Math.round(v).toLocaleString('ru-RU').replace(/ /g, ' ') + (o.post || ''), x, y, Object.assign({ size: 140, weight: 700, color: C.ink }, o)); }
export function bars(x, y, w, h, vals, k = 1, cols = [C.blue], labels = []) { const bw = w / vals.length * 0.62, mx = Math.max(...vals);
  vals.forEach((v, i) => { const bx = x + (i + 0.5) * w / vals.length - bw / 2, bh = h * v / mx * clamp(k * vals.length - i); box(bx, y - bh, bw, bh, { fill: cols[i % cols.length], w: 0 }); if (labels[i]) T(labels[i], bx + bw / 2, y + 40, { size: 34, color: C.dim }); });
  line([x, y], [x + w, y], { c: C.dim, w: 2 }); }
export function checkbox(x, y, s, k, c = C.green) { rbox(x - s / 2, y - s / 2, s, s, s * 0.18, { c: C.dim, w: 4 }); path([[x - s * 0.28, y], [x - s * 0.06, y + s * 0.22], [x + s * 0.3, y - s * 0.24]], { c, w: 8, glow: 14 }, k); }
export function chain(x, y, n, done, s = 54, gap = 18, c = C.green) { const w = n * s + (n - 1) * gap; for (let i = 0; i < n; i++) { const cx = x - w / 2 + s / 2 + i * (s + gap), on = i < done;   // серия дней (привычка)
  rbox(cx - s / 2, y - s / 2, s, s, 10, { fill: on ? c : 'transparent', c: on ? c : C.faint, w: 3, glow: on ? 14 : 0 }); } }

/* ================= ЭФФЕКТЫ (петлевые) ================= */
function blob(x, y, r, c, a) { if (r <= 0 || a <= 0) return; const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); X.fillStyle = g; X.fillRect(x - r, y - r, 2 * r, 2 * r); }
export const halo = (x, y, r, c = C.ink, a = 0.35) => { X.save(); X.globalCompositeOperation = 'lighter'; blob(x, y, r, c, a); X.restore(); };
// огонь из частиц: s — размер (высота пламени ≈ 2.4 s), k — сила 0..1 (0 = угли), seed — разные костры. Петлевой.
export function flame(x, y, s, t, k = 1, seed = 1, pal = ['#FFF6D0', '#FFC24A', '#FF7A1A', '#E8361A']) {
  if (k <= 0.01) { embers(x, y, s, t, 0.4, seed); return; } X.save(); X.globalCompositeOperation = 'lighter';
  blob(x, y - s * 0.6 * k, s * 1.6 * k, pal[2], 0.22 * k);
  const N = 64; for (let i = 0; i < N; i++) { const q = (ph(t, 7 + (i % 4)) + hash2(i, seed)) % 1, sx = (hash2(i, seed + 7) - 0.5) * s * 0.8, lick = Math.sin(TAU * (q * 1.2 + ph(t, 5) + hash2(i, 3))) * s * 0.18 * q;
    const yy = y - Math.pow(q, 0.8) * s * 2.6 * k, xx = x + sx * (1 - q) * (1 - q) + lick, r = s * (0.42 - 0.34 * q) * (0.6 + 0.4 * k);
    const c = q < 0.18 ? pal[0] : q < 0.4 ? pal[1] : q < 0.7 ? pal[2] : pal[3]; X.save(); X.translate(xx, yy); X.scale(1, 1.9); blob(0, 0, r, c, 0.42 * Math.pow(1 - q, 0.9) * (0.5 + 0.5 * k)); X.restore(); }
  X.restore(); if (k < 0.6) embers(x, y, s, t, 1 - k, seed); }
export function embers(x, y, s, t, a = 1, seed = 1) { X.save(); X.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { const q = (ph(t, 3) + hash2(i, seed + 2)) % 1;
  blob(x + (hash2(i, seed) - 0.5) * s * 1.2 + Math.sin(TAU * q + i) * 20, y - q * s * 3, 6 * (1 - q) + 2, C.orange, a * (1 - q)); } blob(x, y, s * 0.5, '#FF5A1A', 0.25 * a); X.restore(); }
// искры/звёзды: всплеск в момент t0 (длительность dur), не обязаны петлиться — ставь до конца петли
export function burst(x, y, t, t0, dur = 0.8, n = 18, c = C.gold, R = 180) { const q = (t - t0) / dur; if (q <= 0 || q >= 1) return; X.save(); X.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) { const a = TAU * i / n + hash2(i, 5), r = R * eOut(q) * (0.6 + 0.4 * hash2(i, 6)); blob(x + Math.cos(a) * r, y + Math.sin(a) * r, 10 * (1 - q) + 2, c, 1 - q); } X.restore(); }
export function ripple(x, y, t, n = 3, R = 260, c = C.ink, speed = 2) { for (let i = 0; i < n; i++) { const q = (ph(t, speed) + i / n) % 1; circ(x, y, R * q, { c, w: 3, a: (1 - q) * 0.6 }); } }
export function dust(t, n = 50, c = '#FFFFFF', a = 0.35) { X.save(); X.globalCompositeOperation = 'lighter'; for (let i = 0; i < n; i++) { const q = (ph(t, 1) + hash2(i, 1)) % 1;
  blob(hash2(i, 2) * W + Math.sin(TAU * (q + hash2(i, 3))) * 30, H - q * H, 3 + 4 * hash2(i, 4), c, a * Math.sin(Math.PI * q)); } X.restore(); }
export function drops(x0, y0, x1, y1, t, n = 6, c = C.blue, speed = 4) { for (let i = 0; i < n; i++) { const q = (ph(t, speed) + i / n) % 1; dot(lerp(x0, x1, q), lerp(y0, y1, q * q), 7, c, 10); } }   // струя капель
export function spotlight(x, y, r = 520, a = 0.18) { X.save(); const g = X.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(1, 'rgba(255,255,255,0)'); X.fillStyle = g; X.fillRect(0, 0, W, H); X.restore(); }

/* ================= ЧЕЛОВЕЧЕК-СИЛУЭТ ================= */
// fig(x, groundY, h, pose, o): белый силуэт из «капсул», ноги стоят на земле автоматически.
// pose: { lean, nod, sh:[перед,зад], el:[..], hip:[..], kn:[..], up } углы в радианах от вертикали: 0 = вниз, + = вперёд (π/2 — вперёд горизонтально, π — вверх); lean — наклон корпуса вперёд. o: { dir: 1|-1, c, head:'#fff', glow, w }
export function fig(x, gy, h, P, o = {}) { const d = o.dir || 1, L = { th: 0.25 * h, sh: 0.25 * h, to: 0.3 * h, ua: 0.17 * h, fa: 0.17 * h, hr: 0.075 * h };
  const v = (a, l) => [Math.sin(a) * l * d, Math.cos(a) * l], add = (p, q) => [p[0] + q[0], p[1] + q[1]];
  const hip = [0, 0], lean = P.lean || 0, neck = add(hip, v(Math.PI - lean, L.to)), head = add(neck, v(Math.PI - lean - (P.nod || 0) * 0.7, L.hr * 1.5));
  const leg = i => { const k = add(hip, v((P.hip || [0, 0])[i], L.th)); return [k, add(k, v((P.hip || [0, 0])[i] - (P.kn || [0, 0])[i], L.sh))]; };
  const arm = i => { const sh = add(neck, v(-lean, 0.03 * h)), a = (P.sh || [0, 0])[i], e = add(sh, v(a, L.ua)); return [sh, e, add(e, v(a + (P.el || [0, 0])[i], L.fa))]; };   // руки — углы от вертикали
  const lg = [leg(0), leg(1)], ar = [arm(0), arm(1)], low = Math.max(lg[0][1][1], lg[1][1][1]);
  const ox = x, oy = gy - low - (P.up || 0) * h, T_ = p => [ox + p[0], oy + p[1]], w = o.w || 0.075 * h;
  X.save(); X.lineCap = 'round'; X.lineJoin = 'round'; if (o.glow) { X.shadowColor = o.gc || o.c || '#fff'; X.shadowBlur = o.glow; } X.globalAlpha *= o.a ?? 1;
  const limb = (pts, back) => { X.strokeStyle = back ? (o.back || shade(o.c || '#FFFFFF')) : (o.c || '#FFFFFF'); X.lineWidth = w; X.beginPath(); X.moveTo(...T_(pts[0])); for (const p of pts.slice(1)) X.lineTo(...T_(p)); X.stroke(); };
  limb([hip, ...lg[1]], 1); limb(ar[1], 1);                                                   // дальние конечности чуть темнее
  X.strokeStyle = o.c || '#FFFFFF'; X.lineWidth = w * 1.5; X.beginPath(); X.moveTo(...T_(hip)); X.lineTo(...T_(neck)); X.stroke();
  limb([hip, ...lg[0]], 0); limb(ar[0], 0);
  X.fillStyle = o.head || o.c || '#FFFFFF'; X.beginPath(); X.arc(...T_(head), L.hr, 0, TAU); X.fill(); X.restore();
  return { hand: T_(ar[0][2]), hand2: T_(ar[1][2]), head: T_(head), hip: T_(hip), top: oy + head[1] - L.hr }; }   // точки для реквизита
const shade = c => c === '#FFFFFF' || c === '#fff' ? '#B8B8B8' : c;
// готовые позы; p — фаза шага 0..1 (для петли бери ph(t, n))
export const POSE = {
  stand: () => ({ sh: [0.08, -0.08], el: [0.15, 0.15], hip: [0.04, -0.04] }),
  walk: p => { const a = Math.sin(TAU * p); return { lean: 0.05, sh: [-0.45 * a, 0.45 * a], el: [0.35, 0.35], hip: [0.42 * a, -0.42 * a], kn: [0.5 * Math.max(0, -Math.cos(TAU * p)) + 0.08, 0.5 * Math.max(0, Math.cos(TAU * p)) + 0.08] }; },
  run: p => { const a = Math.sin(TAU * p); return { lean: 0.22, sh: [-0.9 * a, 0.9 * a], el: [1.4, 1.4], hip: [0.85 * a, -0.85 * a], kn: [0.3 + 1.1 * Math.max(0, -Math.cos(TAU * p)), 0.3 + 1.1 * Math.max(0, Math.cos(TAU * p))], up: 0.03 * Math.abs(Math.cos(TAU * p)) }; },
  sit: () => ({ sh: [0.35, 0.3], el: [0.9, 0.9], hip: [1.5, 1.45], kn: [1.5, 1.45] }),
  pour: (k = 1) => ({ lean: 0.05, sh: [lerp(0.1, 1.15, k), -0.05], el: [lerp(0.2, 0.25, k), 0.15], hip: [0.05, -0.05] }),
  lift: k => ({ sh: [lerp(0.2, 3.0, k), lerp(0.2, 3.0, k)], el: [lerp(2.3, 0.15, k), lerp(2.3, 0.15, k)], hip: [0.12, -0.12], kn: [0.15 * (1 - k), 0.15 * (1 - k)] }),   // штанга/гантели
  think: () => ({ nod: 0.25, sh: [0.55, 0.05], el: [2.45, 0.2], hip: [0.04, -0.04] }),
  cheer: (lt = 0) => ({ sh: [2.7 + 0.15 * Math.sin(lt * 8), 2.7 - 0.15 * Math.sin(lt * 8)], el: [0.25, 0.25], hip: [0.06, -0.06] }),
  slump: () => ({ lean: 0.45, nod: 0.6, sh: [0.35, 0.25], el: [0.1, 0.1], hip: [0.1, -0.05], kn: [0.25, 0.2] }),
  push: p => { const a = Math.sin(TAU * p); return { lean: 0.75, sh: [1.75, 1.85], el: [0.2, 0.2], hip: [0.5 + 0.25 * a, -0.4 - 0.25 * a], kn: [0.6, 0.15] }; },   // толкает камень
  phone: () => ({ nod: 0.55, sh: [0.45, 0.05], el: [1.9, 0.15], hip: [0.04, -0.04] }),
  read: () => ({ nod: 0.4, sh: [0.6, 0.55], el: [1.6, 1.6], hip: [0.04, -0.04] }),
  climb: p => { const a = Math.sin(TAU * p); return { lean: 0.15, sh: [2.7 + 0.3 * a, 2.7 - 0.3 * a], el: [0.3, 0.3], hip: [0.6 + 0.6 * a, 0.6 - 0.6 * a], kn: [1.0 + 0.5 * a, 1.0 - 0.5 * a] }; },   // по лестнице
  sleep: () => ({ lean: -1.55, sh: [1.5, 1.45], el: [0.1, 0.1], hip: [1.55, 1.5], kn: [0, 0] }),   // лёжа
  wave: (lt = 0) => ({ sh: [2.6, -0.05], el: [0.5 + 0.35 * Math.sin(lt * 9), 0.15], hip: [0.04, -0.04] }),
  bow: k => ({ lean: 0.9 * k, nod: 0.3 * k, sh: [0.6 * k, 0.5 * k], el: [0.1, 0.1] }),
};
export const mixPose = (A, B, k) => { const r = {}; for (const key of new Set([...Object.keys(A), ...Object.keys(B)])) { const a = A[key] ?? (Array.isArray(B[key]) ? [0, 0] : 0), b = B[key] ?? (Array.isArray(A[key]) ? [0, 0] : 0);
  r[key] = Array.isArray(a) ? a.map((v, i) => lerp(v, b[i], k)) : lerp(a, b, k); } return r; };

/* ================= РЕКВИЗИТ И ЗНАЧКИ ================= */
// реквизит: prop.can(x,y,s,a) лейка, cup, book, phone, dumbbell, rock, plant(k), seed, candle(t), clock(t), hourglass(k), stairs(n), mountain, flag, trophy, coin, bulb(on)
export const prop = {
  can(x, y, s = 60, a = 0, c = C.blue) { const p = rot([[x - s * 0.5, y - s * 0.4], [x + s * 0.4, y - s * 0.4], [x + s * 0.4, y + s * 0.4], [x - s * 0.5, y + s * 0.4]], x, y, a); poly(p, { fill: c, c, w: 2 });
    const sp = rot([[x + s * 0.4, y - s * 0.1], [x + s * 1.1, y - s * 0.5]], x, y, a); line(sp[0], sp[1], { c, w: s * 0.12 }); return sp[1]; },   // возвращает носик
  cup(x, y, s = 50, c = C.ink) { poly([[x - s * 0.4, y - s * 0.5], [x + s * 0.4, y - s * 0.5], [x + s * 0.3, y + s * 0.5], [x - s * 0.3, y + s * 0.5]], { c, w: 4 }); circ(x + s * 0.48, y - s * 0.05, s * 0.2, { c, w: 4 }); },
  book(x, y, s = 60, open = 1, c = C.ink) { const w = s * open; poly([[x, y], [x - w, y - s * 0.15], [x - w, y - s * 0.85], [x, y - s * 0.7]], { c, w: 3, fill: '#111' }); poly([[x, y], [x + w, y - s * 0.15], [x + w, y - s * 0.85], [x, y - s * 0.7]], { c, w: 3, fill: '#111' }); },
  phone(x, y, s = 60, glow = true) { rbox(x - s * 0.28, y - s * 0.5, s * 0.56, s, s * 0.1, { c: C.ink, w: 3, fill: glow ? '#8FD3FF' : '#111' }); if (glow) halo(x, y, s * 1.2, '#8FD3FF', 0.25); },
  dumbbell(x, y, s = 80, c = C.ink) { line([x - s * 0.5, y], [x + s * 0.5, y], { c, w: 6 }); for (const sx of [-1, 1]) box(x + sx * s * 0.5 - 9, y - s * 0.22, 18, s * 0.44, { fill: c, w: 0 }); },
  rock(x, y, s = 140, c = '#5A5A5A') { poly([[x - s * 0.5, y], [x - s * 0.55, y - s * 0.45], [x - s * 0.2, y - s * 0.8], [x + s * 0.3, y - s * 0.75], [x + s * 0.55, y - s * 0.35], [x + s * 0.5, y]], { fill: c, c: '#8A8A8A', w: 3 }); },
  plant(x, y, s = 160, k = 1, c = C.green) { if (k <= 0) return; const h = s * k; line([x, y], [x, y - h], { c, w: 6 }); for (let i = 1; i <= 3; i++) { const lk = clamp(k * 3 - i + 1); if (lk <= 0) continue; const yy = y - h * i / 4, sd = i % 2 ? 1 : -1;
    poly([[x, yy], [x + sd * s * 0.25 * lk, yy - s * 0.12 * lk], [x + sd * s * 0.35 * lk, yy - s * 0.02 * lk], [x + sd * s * 0.15 * lk, yy + s * 0.04 * lk]], { fill: c, c, w: 2 }); } },
  candle(x, y, s = 120, t = 0, k = 1) { box(x - s * 0.12, y - s, s * 0.24, s, { fill: '#DDD', w: 0 }); flame(x, y - s - 4, s * 0.12, t, k, 7); },
  clock(x, y, r = 90, t = 0, n = 1, c = C.ink) { circ(x, y, r, { c, w: 5 }); const a = TAU * ph(t, n), b = TAU * ph(t, n * 12) ; line([x, y], [x + Math.sin(a) * r * 0.5, y - Math.cos(a) * r * 0.5], { c, w: 7 }); line([x, y], [x + Math.sin(b) * r * 0.8, y - Math.cos(b) * r * 0.8], { c, w: 4 }); },
  hourglass(x, y, s = 160, k = 0, c = C.ink, sand = C.gold) { const w = s * 0.35, h = s / 2; poly([[x - w, y - h], [x + w, y - h], [x, y], [x + w, y + h], [x - w, y + h], [x, y]], { c, w: 4 });
    const top = 1 - k; if (top > 0) poly([[x - w * top, y - h * top], [x + w * top, y - h * top], [x, y]], { fill: sand, w: 0 }); if (k > 0) poly([[x - w * k, y + h], [x + w * k, y + h], [x, y + h * (1 - k)]], { fill: sand, w: 0 }); if (k > 0 && k < 1) line([x, y], [x, y + h], { c: sand, w: 3 }); },
  stairs(x, y, n = 5, sw = 110, sh = 70, c = C.ink, k = 1) { const p = [[x, y]]; for (let i = 0; i < n; i++) p.push([x + i * sw, y - (i + 1) * sh], [x + (i + 1) * sw, y - (i + 1) * sh]); path(p, { c, w: 4 }, k); return i => [x + (i + 0.5) * sw, y - (i + 1) * sh]; },   // точка i-й ступени
  mountain(x, y, w = 700, h = 600, c = '#2A2A2A') { poly([[x - w / 2, y], [x - w * 0.1, y - h * 0.7], [x, y - h], [x + w * 0.12, y - h * 0.75], [x + w / 2, y]], { fill: c, c: '#555', w: 3 }); return [x, y - h]; },
  flag(x, y, s = 90, t = 0, c = C.red) { line([x, y], [x, y - s * 1.6], { c: C.ink, w: 4 }); const p = []; for (let i = 0; i <= 10; i++) p.push([x + i * s / 10, y - s * 1.6 + Math.sin(TAU * (i / 10 - ph(t, 4))) * 6 * i / 10]);
    for (let i = 10; i >= 0; i--) p.push([x + i * s / 10, y - s + Math.sin(TAU * (i / 10 - ph(t, 4))) * 6 * i / 10]); poly(p, { fill: c, w: 0 }); },
  trophy(x, y, s = 120, c = C.gold) { poly([[x - s * 0.4, y - s], [x + s * 0.4, y - s], [x + s * 0.25, y - s * 0.45], [x - s * 0.25, y - s * 0.45]], { fill: c, c, w: 3, glow: 20 }); box(x - s * 0.06, y - s * 0.45, s * 0.12, s * 0.3, { fill: c, w: 0 }); box(x - s * 0.3, y - s * 0.15, s * 0.6, s * 0.15, { fill: c, w: 0 }); },
  coin(x, y, r = 40, c = C.gold) { circ(x, y, r, { fill: c, c: '#FFE9A8', w: 3, glow: 16 }); T('$', x, y + 2, { size: r * 1.1, color: '#6A4A00', weight: 700 }); },
  bulb(x, y, s = 90, on = 1) { if (on > 0) halo(x, y, s * 2.4, C.gold, 0.35 * on); circ(x, y, s * 0.5, { c: C.ink, w: 4, fill: on > 0.5 ? '#FFE39A' : 'transparent' }); box(x - s * 0.2, y + s * 0.45, s * 0.4, s * 0.3, { c: C.ink, w: 4 }); },
  seed(x, y, s = 20, c = '#B08A5A') { X.save(); X.fillStyle = c; X.beginPath(); X.ellipse(x, y, s, s * 0.65, 0.3, 0, TAU); X.fill(); X.restore(); },
};
// значки 2–3 линии: icon('heart', x, y, s, {c})
export function icon(n, x, y, s = 60, o = {}) { const c = o.c || C.ink, w = o.w || 5, st_ = { c, w, glow: o.glow };
  switch (n) {
    case 'check': return path([[x - s * 0.4, y], [x - s * 0.1, y + s * 0.3], [x + s * 0.45, y - s * 0.35]], st_, o.k ?? 1);
    case 'cross': line([x - s * 0.35, y - s * 0.35], [x + s * 0.35, y + s * 0.35], st_); return line([x + s * 0.35, y - s * 0.35], [x - s * 0.35, y + s * 0.35], st_);
    case 'heart': { const p = []; for (let i = 0; i <= 60; i++) { const a = TAU * i / 60; p.push([x + s * 0.03 * 16 * Math.sin(a) ** 3, y - s * 0.03 * (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))]); } return poly(p, { ...st_, fill: o.fill }); }
    case 'star': { const p = []; for (let i = 0; i < 10; i++) { const r = i % 2 ? s * 0.22 : s * 0.5, a = -Math.PI / 2 + Math.PI * i / 5; p.push([x + r * Math.cos(a), y + r * Math.sin(a)]); } return poly(p, { ...st_, fill: o.fill }); }
    case 'bolt': return poly([[x + s * 0.1, y - s * 0.5], [x - s * 0.3, y + s * 0.05], [x, y + s * 0.05], [x - s * 0.1, y + s * 0.5], [x + s * 0.3, y - s * 0.05], [x, y - s * 0.05]], { ...st_, fill: o.fill });
    case 'target': for (const r of [0.5, 0.33, 0.15]) circ(x, y, s * r, st_); return;
    case 'lock': rbox(x - s * 0.35, y - s * 0.05, s * 0.7, s * 0.5, 8, st_); X.save(); st(st_); X.beginPath(); X.arc(x, y - s * 0.05, s * 0.22, Math.PI, 0); X.stroke(); X.restore(); return;
    case 'sun': circ(x, y, s * 0.25, st_); for (let i = 0; i < 8; i++) { const a = TAU * i / 8; line([x + Math.cos(a) * s * 0.36, y + Math.sin(a) * s * 0.36], [x + Math.cos(a) * s * 0.5, y + Math.sin(a) * s * 0.5], st_); } return;
    case 'moon': X.save(); st(st_); X.beginPath(); X.arc(x, y, s * 0.4, 0.6, TAU - 0.6 + 0.0001, false); X.arc(x + s * 0.18, y - s * 0.05, s * 0.32, TAU - 0.9, 0.9, true); X.closePath(); X.stroke(); X.restore(); return;
    case 'plus': line([x - s * 0.4, y], [x + s * 0.4, y], st_); return line([x, y - s * 0.4], [x, y + s * 0.4], st_);
    case 'minus': return line([x - s * 0.4, y], [x + s * 0.4, y], st_);
    case 'eq': line([x - s * 0.4, y - s * 0.12], [x + s * 0.4, y - s * 0.12], st_); return line([x - s * 0.4, y + s * 0.12], [x + s * 0.4, y + s * 0.12], st_);
    case 'arrowR': return arrow([x - s * 0.45, y], [x + s * 0.45, y], st_, 1, s * 0.25);
    case 'loop': X.save(); st(st_); X.beginPath(); X.arc(x, y, s * 0.38, -0.3, TAU - 1.2); X.stroke(); X.restore(); return arrow([x + s * 0.38 * Math.cos(TAU - 1.2), y + s * 0.38 * Math.sin(TAU - 1.2)], [x + s * 0.38 * Math.cos(-0.3) + 1, y + s * 0.38 * Math.sin(-0.3)], st_, 1, s * 0.18);
  } }

/* ================= ЗАПУСК ================= */
// film({ d, draw(t), sfx:[[t,'pop',громкость,длит]], bloom, title, narr })
// звуки (без музыки): pop snap slide draw click ding crackle drip thud rise whoosh tick beep hit swoosh_in heartbeat
export function film(o) { D = o.d;
  run({ title: o.title || 'loop', fps: o.fps || 30, bg: '#000', accent: o.accent || C.green, fx: { bloom: o.bloom ?? 0, vignette: o.vignette ?? 0, grain: o.grain ?? 0 },
    shots: [{ d: o.d, cam: false, pop: false, draw: (p, t) => { X.save(); bg(o.bg); o.draw(t); X.restore(); }, sfx: o.sfx || [] }],
    narr: o.narr || [], audio: { music: 0, loop: true, sfx: o.sfxGain ?? 1, lufs: o.lufs ?? -16 } }); }
