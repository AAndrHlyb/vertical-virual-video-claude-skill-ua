// cast3d.js — стилизованные 3D-люди из примитивов. Один и тот же объект снимается анфас, в 3/4, в профиль и сзади:
// голова, лицо и причёска поворачиваются вместе с черепом, поэтому «уезжающих» волос и плоских профилей не бывает по построению.
import { THREE, clamp, lerp, TAU } from './core.js';

export const SKIN = { light: '#EBC2A6', fair: '#E2A98A', tan: '#C98E6C', brown: '#8A5A40', dark: '#5E3B2A' };
export const HAIRC = { black: '#16120F', dark: '#2B1D16', brown: '#5A3524', auburn: '#7A3A22', blond: '#B8834A', grey: '#8C8A86', white: '#D8D4CC' };
export const HAIR_STYLES = ['buzz', 'crop', 'sidepart', 'slick', 'curly', 'bald', 'bob', 'long', 'pony', 'bun'];
export const TOPS = ['sweater', 'suit', 'labcoat', 'hoodie', 'uniform', 'shirt'];

// person({sex:'m'|'f', skin, hair, hairStyle, top, topColor, pants, shoes, glasses, beard, hat:'fedora'|'cap'|'helmet', tie})
export function person(o = {}) {
  const O = Object.assign({ sex: 'm', skin: SKIN.fair, hair: HAIRC.dark, hairStyle: o.sex === 'f' ? 'long' : 'crop', top: 'sweater', topColor: '#3B5B7A', pants: '#262B36', shoes: '#18181C', eyes: '#2A1E18' }, o);
  const M = (c, r = 0.55, ex = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: 0 }, ex));
  const mSkin = M(O.skin, 0.6), mHair = M(O.hair, 0.72, { side: THREE.DoubleSide }), mTop = M(O.top === 'labcoat' ? '#E8EAEC' : O.topColor, 0.8);
  const mPants = M(O.pants, 0.85), mShoe = M(O.shoes, 0.45), mWhite = M('#F4F1EC', 0.3), mPupil = M(O.eyes, 0.2), mLip = M(shade(O.skin, -0.3), 0.6);
  const Wd = O.sex === 'f' ? 0.9 : 1;
  const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };
  const sph = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = cast(new THREE.Mesh(new THREE.SphereGeometry(r, 40, 28), mat)); m.scale.set(sx, sy, sz); return m; };
  const cap = (r, len, mat) => cast(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 8, 20), mat));
  const G = () => new THREE.Group();

  const root = G(), hips = G(); root.add(hips); hips.position.y = 0.8;
  hips.add(sph(0.17, mPants, 1.05 * Wd, 0.7, 0.75));
  const spine = G(); hips.add(spine); spine.position.y = 0.05;
  const prof = O.sex === 'f' ? [[0.001, -0.02], [0.15, 0], [0.16, 0.08], [0.135, 0.2], [0.155, 0.33], [0.17, 0.42], [0.14, 0.5], [0.06, 0.55], [0.001, 0.555]]
                             : [[0.001, -0.02], [0.16, 0], [0.165, 0.1], [0.16, 0.22], [0.185, 0.36], [0.2, 0.44], [0.17, 0.51], [0.07, 0.555], [0.001, 0.56]];
  const torso = cast(new THREE.Mesh(new THREE.LatheGeometry(prof.map(p => new THREE.Vector2(p[0] * Wd, p[1])), 40), mTop)); torso.scale.set(1, 1, 0.66); spine.add(torso);
  // одежда-надстройки
  if (O.top === 'suit' || O.top === 'shirt') { const v = cast(new THREE.Mesh(new THREE.CircleGeometry(0.07, 3), M('#EDEDED', 0.6))); v.rotation.z = -Math.PI / 2; v.position.set(0, 0.47, 0.128); v.scale.set(1, 0.9, 1); if (O.top === 'suit') spine.add(v); }
  if (O.tie || O.top === 'suit') { const t = cap(0.014, 0.16, M(O.tie || '#7A1F2B', 0.5)); t.position.set(0, 0.38, 0.13); t.rotation.x = 0.12; spine.add(t); }
  if (O.top === 'labcoat') { const sk = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.2 * Wd, 0.24 * Wd, 0.36, 36, 1, true, 0.25, TAU - 0.5), M('#E8EAEC', 0.8, { side: THREE.DoubleSide }))); sk.scale.z = 0.72; sk.position.y = -0.12; spine.add(sk);
    const sh = cast(new THREE.Mesh(new THREE.CircleGeometry(0.06, 3), M(O.topColor, 0.7))); sh.rotation.z = -Math.PI / 2; sh.position.set(0, 0.47, 0.128); spine.add(sh); }
  if (O.top === 'hoodie') { const hd = cast(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.045, 12, 28), mTop)); hd.rotation.x = Math.PI / 2 - 0.4; hd.position.set(0, 0.55, -0.05); spine.add(hd); }
  if (O.top === 'uniform') { const belt = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.168 * Wd, 0.168 * Wd, 0.04, 36), M('#1A1612', 0.5))); belt.scale.z = 0.7; belt.position.y = 0.02; spine.add(belt); }
  if (O.badge) { const b = cast(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.005), M(O.badge, 0.4))); b.position.set(0.09, 0.4, 0.125); spine.add(b); }

  const chest = G(); spine.add(chest); chest.position.y = 0.52;
  const neck = cap(0.055, 0.08, mSkin); neck.position.y = 0.06; chest.add(neck);
  const head = G(); chest.add(head); head.position.y = 0.11; head.scale.setScalar(1.32);
  const skull = sph(0.135, mSkin, 0.92, 1.06, 1.0); skull.position.y = 0.11; head.add(skull);
  const jaw = sph(0.11, mSkin, O.sex === 'f' ? 0.86 : 0.95, 0.85, 0.9); jaw.position.set(0, 0.035, 0.02); head.add(jaw);
  const chin = sph(0.045, mSkin, 1.1, 0.8, 0.9); chin.position.set(0, -0.025, O.sex === 'f' ? 0.075 : 0.085); head.add(chin);
  const nose = sph(0.026, mSkin, 0.8, 1.15, 1.1); nose.position.set(0, 0.085, 0.13); nose.rotation.x = -0.35; head.add(nose);
  const eyes = [], pupils = [], brows = [];
  for (const s of [-1, 1]) {
    const ear = sph(0.03, mSkin, 0.5, 1.0, 0.75); ear.position.set(s * 0.122, 0.095, -0.005); head.add(ear);
    const ew = sph(0.026, mWhite, 1.15, 0.85, 0.6); ew.position.set(s * 0.045, 0.125, 0.112); head.add(ew); eyes.push(ew);
    const pu = sph(0.0145, mPupil); pu.position.set(s * 0.045, 0.123, 0.128); head.add(pu); pupils.push(pu);
    const br = cap(0.008, 0.035, M(O.hair, 0.9)); br.rotation.z = Math.PI / 2 + s * 0.12; br.position.set(s * 0.047, 0.158, 0.118); head.add(br); brows.push(br);
  }
  // рот: три формы, включается нужная
  const mouth = { flat: cap(0.007, 0.03, mLip), smile: cast(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 16, Math.PI), mLip)), o: sph(0.013, M('#2A1414', 0.7), 1, 1.2, 0.5) };
  mouth.flat.rotation.z = Math.PI / 2; mouth.flat.position.set(0, 0.022, 0.118);
  mouth.smile.position.set(0, 0.034, 0.116); mouth.o.position.set(0, 0.02, 0.118);
  Object.values(mouth).forEach(m => head.add(m));
  if (O.beard) { const b = sph(0.095, M(O.hair, 0.9), 1.0, 0.7, 0.9); b.position.set(0, 0.0, 0.035); head.add(b); }
  if (O.glasses) { const gm = M('#111', 0.3);
    for (const s of [-1, 1]) { const ring = cast(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 8, 24), gm)); ring.position.set(s * 0.046, 0.125, 0.13); head.add(ring); }
    const br = cap(0.004, 0.02, gm); br.rotation.z = Math.PI / 2; br.position.set(0, 0.128, 0.134); head.add(br); }
  if (O.hat) buildHat(head, O.hat, M(O.hatColor || '#1C1C20', 0.6), cast); else buildHair(head, O.hairStyle, mHair, cast);

  const arms = [];
  for (const s of [-1, 1]) {
    const sh = G(); chest.add(sh); sh.position.set(s * 0.2 * Wd, -0.04, 0);
    const up = cap(0.055, 0.17, mTop); up.position.y = -0.11; sh.add(up);
    const el = G(); sh.add(el); el.position.y = -0.23;
    const lo = cap(0.048, 0.15, mTop); lo.position.y = -0.1; el.add(lo);
    const hand = sph(0.045, mSkin, 0.85, 1.1, 0.7); hand.position.y = -0.22; el.add(hand);
    const grip = G(); grip.position.y = -0.24; el.add(grip);            // сюда цепляется предмет в руке
    arms.push({ sh, el, grip });
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const hp = G(); hips.add(hp); hp.position.set(s * 0.09 * Wd, -0.04, 0);
    const th = cap(0.08, 0.22, mPants); th.position.y = -0.17; hp.add(th);
    const kn = G(); hp.add(kn); kn.position.y = -0.35;
    const sn = cap(0.068, 0.22, mPants); sn.position.y = -0.16; kn.add(sn);
    const ft = sph(0.06, mShoe, 0.9, 0.55, 1.7); ft.position.set(0, -0.37, 0.05); kn.add(ft);
    legs.push({ hp, kn });
  }
  const THIGH = 0.35, SHIN = 0.403;
  // поза. Знаков у сгибов нет: el/kn — величина сгиба (>=0), направление задаёт риг (локоть вперёд, колено назад).
  // {lFwd,lOut,lEl, rFwd,rOut,rEl, lHip,lKn, rHip,rKn, lean,twist, yaw,nod,tilt, lookX,lookY, blink, brow, mouth, sit}
  function pose(q = {}) {
    arms.forEach((a, i) => { const s = i ? 1 : -1, k = i ? 'r' : 'l';
      a.sh.rotation.set(-(q[k + 'Fwd'] || 0), 0, s * (0.08 + (q[k + 'Out'] || 0)));
      a.el.rotation.set(-clamp(q[k + 'El'] ?? 0.12, 0, 2.6), 0, 0); });
    let lowest = 0;
    legs.forEach((l, i) => { const k = i ? 'r' : 'l', h = q[k + 'Hip'] || 0, kn = clamp(q[k + 'Kn'] || 0, 0, 2.4);
      l.hp.rotation.set(-h, 0, 0); l.kn.rotation.set(kn, 0, 0);
      lowest = Math.max(lowest, THIGH * Math.cos(h) + SHIN * Math.cos(h - kn)); });
    spine.rotation.set(q.lean || 0, q.twist || 0, 0);
    head.rotation.set(q.nod || 0, q.yaw || 0, q.tilt || 0);
    hips.position.y = q.sit ? q.sit : 0.04 + lowest;                  // стопа всегда на полу (или сидим на высоте sit)
    pupils.forEach((p, i) => { const s = i ? 1 : -1; p.position.set(s * 0.045 + (q.lookX || 0) * 0.01, 0.123 + (q.lookY || 0) * 0.008, 0.128); });
    const bl = 1 - clamp(q.blink || 0) * 0.9; eyes.forEach(e => e.scale.y = 0.85 * bl); pupils.forEach(p => p.scale.y = bl);
    brows.forEach((b, i) => { const s = i ? 1 : -1, br = q.brow || 0; b.rotation.z = Math.PI / 2 + s * (0.12 - br * 0.25); b.position.y = 0.158 + br * 0.008; });
    const mo = q.mouth || 'flat'; for (const k in mouth) mouth[k].visible = k === mo || (mo === 'frown' && k === 'smile');
    if (mo === 'frown') { mouth.smile.rotation.z = Math.PI; mouth.smile.position.y = 0.012; } else { mouth.smile.rotation.z = 0; mouth.smile.position.y = 0.034; }
  }
  pose({});
  return { root, rig: { hips, spine, chest, head, arms, legs }, pose, opts: O };
}

/* ---------- готовые позы и движения (все — функции времени) ---------- */
export const POSE = {
  stand: () => ({}),
  // ходьба: phase в циклах (1 цикл = 2 шага ≈ 1.3 м). Руки против ног, колено сгибается в переносе.
  walk(phase, a = 1) { const th = phase * TAU, s = Math.sin(th), c = Math.cos(th);
    return { lHip: 0.42 * a * s, rHip: -0.42 * a * s, lKn: 0.12 + 0.85 * a * Math.max(0, c) ** 1.4, rKn: 0.12 + 0.85 * a * Math.max(0, -c) ** 1.4,
             lFwd: -0.38 * a * s, rFwd: 0.38 * a * s, lEl: 0.3 + 0.2 * Math.max(0, -s), rEl: 0.3 + 0.2 * Math.max(0, s), lean: 0.05 * a, nod: 0.03 * Math.sin(th * 2) }; },
  run(phase) { const q = POSE.walk(phase, 1.5); q.lEl = q.rEl = 1.5; q.lean = 0.18; return q; },
  sit: (h = 0.47) => ({ sit: h, lHip: 1.5, rHip: 1.5, lKn: 1.5, rKn: 1.5 }),
  type(lt, h = 0.47) { const q = POSE.sit(h); const tl = Math.max(0, Math.sin(lt * 17)), tr = Math.max(0, Math.sin(lt * 15 + 1.3));
    return Object.assign(q, { lFwd: 0.95 + 0.06 * tl, rFwd: 0.95 + 0.06 * tr, lEl: 1.05, rEl: 1.05, lOut: -0.12, rOut: -0.12, lean: 0.12, nod: 0.18, lookY: -0.6 }); },
  point: k => ({ rFwd: lerp(0, 1.45, k), rEl: lerp(0.12, 0.08, k), rOut: lerp(0, -0.1, k) }),
  hold: (k = 1) => ({ rFwd: 0.9 * k, rEl: 1.1 * k, rOut: -0.15 * k }),           // предмет перед грудью — в arms[1].grip
  phone: () => ({ rFwd: 0.35, rEl: 2.35, rOut: -0.35, tilt: 0.12 }),
  shrug: k => ({ lOut: 0.35 * k, rOut: 0.35 * k, lEl: 1.4 * k, rEl: 1.4 * k, brow: 0.6 * k }),
  handsUp: k => ({ lFwd: 2.6 * k, rFwd: 2.6 * k, lEl: 0.3, rEl: 0.3, brow: 0.8 * k, mouth: 'o' }),
  facepalm: k => ({ rFwd: 1.2 * k, rEl: 2.3 * k, rOut: -0.4 * k, nod: 0.3 * k }),
  cheer: (k, lt) => ({ lFwd: 2.7 * k, rFwd: 2.7 * k, lOut: 0.3, rOut: 0.3, lEl: 0.2 + 0.2 * Math.sin(lt * 9), rEl: 0.2 + 0.2 * Math.sin(lt * 9 + 1), mouth: 'smile' }),
};
// моргание раз в ~3.5 с, сдвиг по персонажу
export const blinkAt = (lt, seed = 0) => { const ph = (lt + seed * 1.37) % 3.6; return ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : 0; };
// смешать позы: mix(POSE.walk(ph), {yaw:0.3}) — правая перекрывает левую
export const mix = (...qs) => Object.assign({}, ...qs);
// идти по прямой: возвращает позу и ставит root. from/to — [x,z]; скорость м/с.
export function walkTo(p, lt, from, to, speed = 1.3, t0 = 0) {
  const dx = to[0] - from[0], dz = to[1] - from[1], L = Math.hypot(dx, dz), dist = clamp((lt - t0) * speed, 0, L), k = L ? dist / L : 1;
  p.root.position.set(from[0] + dx * k, 0, from[1] + dz * k); p.root.rotation.y = Math.atan2(dx, dz);
  const moving = dist > 0 && dist < L; const a = moving ? clamp(Math.min(dist, L - dist) / 0.4) : 0;
  return POSE.walk(dist / 1.3, a);
}

/* ---------- причёски: объём поверх черепа. Каждая закрывает лоб линией роста и затылок ---------- */
function buildHair(head, style, mat, cast) {
  if (style === 'bald') return;
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = cast(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); head.add(m); return m; };
  const capG = (r, th) => new THREE.SphereGeometry(r, 40, 24, 0, TAU, 0, th);
  const base = (r, th, tilt) => add(capG(r, th), 0, 0.115, -0.004, -tilt, 0, 0, 0.95, 1.07, 1.04);
  if (style === 'buzz') { base(0.141, 1.45, 0.42); return; }
  if (style === 'crop') { base(0.145, 1.5, 0.45); add(new THREE.SphereGeometry(0.05, 24, 16), 0, 0.226, 0.08, 0.3, 0, 0, 1.9, 0.5, 0.9); return; }
  if (style === 'sidepart') { base(0.146, 1.52, 0.45); add(new THREE.SphereGeometry(0.065, 24, 16), 0.035, 0.235, 0.07, 0.35, 0, -0.35, 1.6, 0.6, 1.0); return; }
  if (style === 'slick') { base(0.147, 1.5, 0.5); add(new THREE.SphereGeometry(0.07, 24, 16), 0, 0.235, 0.04, 0.2, 0, 0, 1.6, 0.6, 1.5); return; }
  if (style === 'curly') { base(0.145, 1.55, 0.45);
    for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; add(new THREE.SphereGeometry(0.045, 16, 12), Math.cos(a) * 0.115, 0.2 + 0.035 * Math.sin(i * 1.7), Math.sin(a) * 0.125 - 0.01); } return; }
  base(0.148, 1.6, 0.4);
  add(new THREE.SphereGeometry(0.065, 24, 16), -0.03, 0.225, 0.08, 0.3, 0, 0.3, 1.8, 0.55, 0.9);
  if (style === 'bob') { add(new THREE.CylinderGeometry(0.15, 0.165, 0.17, 40, 1, true, 1.05, TAU - 2.1), 0, 0.07, -0.01, 0, 0, 0, 0.95, 1, 1.02); return; }
  if (style === 'long') { add(new THREE.CylinderGeometry(0.15, 0.17, 0.2, 40, 1, true, 1.0, TAU - 2.0), 0, 0.06, -0.012, 0, 0, 0, 0.95, 1, 1.02);
    add(new THREE.CapsuleGeometry(0.12, 0.14, 8, 20), 0, -0.06, -0.085, 0.1, 0, 0, 1.15, 1, 0.42); return; }
  if (style === 'pony') { add(new THREE.SphereGeometry(0.04, 16, 12), 0, 0.16, -0.15); add(new THREE.CapsuleGeometry(0.042, 0.17, 8, 16), 0, 0.04, -0.175, -0.25); return; }
  if (style === 'bun') { add(new THREE.SphereGeometry(0.065, 24, 16), 0, 0.235, -0.1); return; }
}
function buildHat(head, kind, mat, cast) {
  const add = (geo, y, z = 0, rx = 0) => { const m = cast(new THREE.Mesh(geo, mat)); m.position.set(0, y, z); m.rotation.x = rx; head.add(m); return m; };
  if (kind === 'fedora') { add(new THREE.CylinderGeometry(0.24, 0.24, 0.012, 40), 0.2, 0, -0.08); add(new THREE.CylinderGeometry(0.12, 0.145, 0.12, 32), 0.26, -0.005, -0.08); return; }
  if (kind === 'cap') { add(new THREE.SphereGeometry(0.15, 32, 16, 0, TAU, 0, 1.55), 0.12, -0.005, -0.3).scale.set(0.95, 1.05, 1.05);
    const v = add(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 32, 1, false, -0.9, 1.8), 0.17, 0.11, 0.1); v.scale.set(1, 1, 0.9); return; }
  if (kind === 'helmet') { add(new THREE.SphereGeometry(0.16, 32, 16, 0, TAU, 0, 1.6), 0.115, -0.005, -0.25); return; }
}
function shade(h, k) { const n = parseInt(h.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + ((f(n >> 16) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0'); }
