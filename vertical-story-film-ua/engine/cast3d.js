// cast3d.js — 3D-люди, животные и толпа из примитивов. Голова, лицо и причёска поворачиваются вместе с черепом,
// поэтому любой ракурс (анфас, 3/4, профиль, сзади) получается камерой, а не перерисовкой.
import { THREE, clamp, lerp, TAU, hash2 } from './core.js';

export const SKIN = { pale: '#F2D3C2', light: '#EBC2A6', fair: '#E2A98A', tan: '#C98E6C', olive: '#B98A62', brown: '#8A5A40', dark: '#5E3B2A', deep: '#3F2A20' };
export const HAIRC = { black: '#16120F', dark: '#2B1D16', brown: '#5A3524', auburn: '#7A3A22', red: '#A8461E', blond: '#B8834A', platinum: '#D9CBA8', grey: '#8C8A86', white: '#D8D4CC', blue: '#2F5DA8', pink: '#C2548E', green: '#3E8E5A' };
export const HAIR_STYLES = ['buzz', 'crop', 'sidepart', 'slick', 'curly', 'afro', 'mohawk', 'spiky', 'bald', 'long_m', 'bob', 'bangs', 'long', 'pony', 'bun', 'pigtails', 'braids'];
export const TOPS = ['sweater', 'tshirt', 'shirt', 'suit', 'jacket', 'coat', 'labcoat', 'hoodie', 'uniform', 'vest', 'dress'];

// person({ age:'kid'|'teen'|'adult'|'old', build:'slim'|'avg'|'heavy', sex, skin, hair, hairStyle, top, topColor, shirt, pants, shoes,
//          hood, face:'hidden', eyesGlow, mask:'medical'|'balaclava'|'plain'|'shades', hat:'fedora'|'cap'|'helmet'|'beanie'|'beret'|'hardhat', hatColor,
//          glasses, beard, mustache, tie, badge, backpack, scarf, headphones, lod })
export function person(o = {}) {
  const O = Object.assign({ sex: 'm', age: 'adult', build: 'avg', skin: SKIN.fair, hair: HAIRC.dark, top: 'sweater', topColor: '#3B5B7A', pants: '#262B36', shoes: '#18181C', eyes: '#2A1E18' }, o);
  if (!O.hairStyle) O.hairStyle = O.sex === 'f' ? (O.age === 'kid' ? 'pigtails' : 'long') : (O.age === 'old' ? 'sidepart' : 'crop');
  const SEG = O.lod ? [14, 10] : [36, 24];
  const M = (c, r = 0.55, ex = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: 0 }, ex));
  const hidden = O.face === 'hidden';
  const mSkin = M(O.skin, 0.6), mFace = hidden ? M('#0A0A0C', 0.9) : mSkin, mHair = M(O.hair, 0.72, { side: THREE.DoubleSide });
  const topC = O.top === 'labcoat' ? '#E8EAEC' : O.top === 'vest' ? '#F2771E' : O.topColor;
  const mTop = M(topC, 0.8), mPants = M(O.top === 'dress' ? O.skin : O.pants, 0.85), mShoe = M(O.shoes, 0.45);
  const mLow = O.top === 'tshirt' || O.top === 'dress' || O.top === 'vest' ? mSkin : mTop;      // короткий рукав — предплечье кожа
  const mWhite = M('#F4F1EC', 0.3), mPupil = O.eyesGlow ? new THREE.MeshStandardMaterial({ color: '#000', emissive: O.eyesGlow, emissiveIntensity: 3 }) : M(O.eyes, 0.2), mLip = M(shade(O.skin, -0.3), 0.6);
  const Wd = (O.sex === 'f' ? 0.9 : 1) * ({ slim: 0.88, avg: 1, heavy: 1.28 }[O.build] || 1), Th = ({ slim: 0.9, avg: 1, heavy: 1.2 }[O.build] || 1);
  const cast = m => { m.castShadow = !O.lod; m.receiveShadow = !O.lod; return m; };
  const sph = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = cast(new THREE.Mesh(new THREE.SphereGeometry(r, SEG[0], SEG[1]), mat)); m.scale.set(sx, sy, sz); return m; };
  const cap = (r, len, mat) => cast(new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 6, O.lod ? 10 : 18), mat));
  const G = () => new THREE.Group();

  const root = G(), body = G(); root.add(body);
  const AGE = { kid: [0.6, 1.32], teen: [0.88, 1.08], adult: [1, 1], old: [0.96, 1] }[O.age] || [1, 1];
  body.scale.setScalar(AGE[0]);
  const hips = G(); body.add(hips); hips.position.y = 0.8;
  hips.add(sph(0.17, mPants, 1.05 * Wd, 0.7, 0.75 * Th));
  const spine = G(); hips.add(spine); spine.position.y = 0.05;
  const prof = O.sex === 'f' ? [[0.001, -0.02], [0.15, 0], [0.16, 0.08], [0.135, 0.2], [0.155, 0.33], [0.17, 0.42], [0.14, 0.5], [0.06, 0.55], [0.001, 0.555]]
                             : [[0.001, -0.02], [0.16, 0], [0.165, 0.1], [0.16, 0.22], [0.185, 0.36], [0.2, 0.44], [0.17, 0.51], [0.07, 0.555], [0.001, 0.56]];
  const belly = O.build === 'heavy' ? [1, 1.12, 1.16, 1.1, 1, 1, 1, 1, 1] : prof.map(() => 1);
  const torso = cast(new THREE.Mesh(new THREE.LatheGeometry(prof.map((p, i) => new THREE.Vector2(p[0] * Wd * belly[i], p[1])), O.lod ? 16 : 36), mTop)); torso.scale.set(1, 1, 0.66 * Th); spine.add(torso);
  const tri = (c, y, z, s = 0.07) => { const v = cast(new THREE.Mesh(new THREE.CircleGeometry(s, 3), M(c, 0.6))); v.rotation.z = -Math.PI / 2; v.position.set(0, y, z * Th); spine.add(v); return v; };
  if (O.top === 'suit' || O.top === 'jacket') tri(O.shirt || '#EDEDED', 0.47, 0.128);
  if (O.top === 'jacket') { for (const s of [-1, 1]) { const l = cast(new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.01), M(shade(topC, -0.25), 0.7))); l.position.set(s * 0.05, 0.3, 0.13 * Th); l.rotation.z = s * 0.12; spine.add(l); } }
  if (O.tie || O.top === 'suit') { const t = cap(0.014, 0.16, M(O.tie || '#7A1F2B', 0.5)); t.position.set(0, 0.38, 0.13 * Th); t.rotation.x = 0.12; spine.add(t); }
  if (O.top === 'labcoat' || O.top === 'coat') { const sk = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.2 * Wd, 0.25 * Wd, O.top === 'coat' ? 0.5 : 0.36, O.lod ? 14 : 32, 1, true, 0.25, TAU - 0.5), M(topC, 0.8, { side: THREE.DoubleSide }))); sk.scale.z = 0.72 * Th; sk.position.y = O.top === 'coat' ? -0.19 : -0.12; spine.add(sk);
    tri(O.shirt || (O.top === 'coat' ? '#2A2A2E' : '#5C7FA8'), 0.47, 0.128, 0.06); }
  if (O.top === 'dress') { const sk = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.17 * Wd, 0.3 * Wd, 0.42, O.lod ? 14 : 32, 1, true), M(topC, 0.8, { side: THREE.DoubleSide }))); sk.scale.z = 0.8; sk.position.y = -0.18; spine.add(sk); }
  if (O.top === 'vest') { for (const y of [0.2, 0.34]) { const b = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.18 * Wd, 0.18 * Wd, 0.03, 28, 1, true), M('#E8ECEF', 0.3, { emissive: '#666', emissiveIntensity: 0.4 }))); b.scale.z = 0.68 * Th; b.position.y = y; spine.add(b); } }
  if (O.top === 'hoodie' && !O.hood) { const hd = cast(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.045, 10, 24), mTop)); hd.rotation.x = Math.PI / 2 - 0.4; hd.position.set(0, 0.55, -0.05); spine.add(hd); }
  if (O.top === 'uniform') { const belt = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.168 * Wd, 0.168 * Wd, 0.04, 28), M('#1A1612', 0.5))); belt.scale.z = 0.7 * Th; belt.position.y = 0.02; spine.add(belt); }
  if (O.badge) { const b = cast(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 0.005), M(O.badge, 0.4))); b.position.set(0.09, 0.4, 0.125 * Th); spine.add(b); }
  if (O.scarf) { const sc = cast(new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.035, 10, 24), M(O.scarf, 0.9))); sc.rotation.x = Math.PI / 2; sc.position.y = 0.55; spine.add(sc); }
  if (O.backpack) { const bp = cast(new THREE.Mesh(new THREE.BoxGeometry(0.26 * Wd, 0.32, 0.12), M(O.backpack, 0.7))); bp.position.set(0, 0.32, -0.16 * Th); spine.add(bp); }

  const chest = G(); spine.add(chest); chest.position.y = 0.52;
  const neck = cap(0.055, 0.08, mSkin); neck.position.y = 0.06; chest.add(neck);
  const head = G(); chest.add(head); head.position.y = 0.11; head.scale.setScalar(1.32 * AGE[1]);
  const skull = sph(0.135, mFace, 0.92, 1.06, 1.0); skull.position.y = 0.11; head.add(skull);
  const kid = O.age === 'kid';
  const jaw = sph(0.11, mFace, O.sex === 'f' || kid ? 0.86 : 0.95, kid ? 0.78 : 0.85, 0.9); jaw.position.set(0, 0.035, 0.02); head.add(jaw);
  const chin = sph(0.045, mFace, 1.1, 0.8, 0.9); chin.position.set(0, -0.025, O.sex === 'f' || kid ? 0.075 : 0.085); head.add(chin);
  const eyes = [], pupils = [], brows = [];
  if (!hidden) { const nose = sph(kid ? 0.02 : 0.026, mSkin, 0.8, 1.15, 1.1); nose.position.set(0, 0.085, 0.13); nose.rotation.x = -0.35; head.add(nose); }
  for (const s of [-1, 1]) {
    const ear = sph(0.03, mFace, 0.5, 1.0, 0.75); ear.position.set(s * 0.122, 0.095, -0.005); head.add(ear);
    if (hidden && !O.eyesGlow) continue;
    if (!hidden) { const ew = sph(kid ? 0.03 : 0.026, mWhite, 1.15, 0.85, 0.6); ew.position.set(s * 0.045, 0.125, 0.112); head.add(ew); eyes.push(ew); }
    const pu = sph(hidden ? 0.012 : 0.0145, mPupil); pu.position.set(s * 0.045, 0.123, 0.128); head.add(pu); pupils.push(pu);
    if (!hidden) { const br = cap(0.008, 0.035, M(O.age === 'old' ? HAIRC.grey : O.hair, 0.9)); br.rotation.z = Math.PI / 2 + s * 0.12; br.position.set(s * 0.047, 0.158, 0.118); head.add(br); brows.push(br); }
  }
  const mouth = { flat: cap(0.007, 0.03, mLip), smile: cast(new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.006, 8, 16, Math.PI), mLip)), o: sph(0.013, M('#2A1414', 0.7), 1, 1.2, 0.5) };
  mouth.flat.rotation.z = Math.PI / 2; mouth.flat.position.set(0, 0.022, 0.118); mouth.smile.position.set(0, 0.034, 0.116); mouth.o.position.set(0, 0.02, 0.118);
  if (!hidden) Object.values(mouth).forEach(m => head.add(m));
  if (O.age === 'old' && !hidden) { const wr = cap(0.004, 0.05, M(shade(O.skin, -0.2), 0.8)); wr.rotation.z = Math.PI / 2; wr.position.set(0, 0.18, 0.125); head.add(wr); }
  if (O.beard) { const b = sph(0.095, M(O.age === 'old' ? HAIRC.grey : O.hair, 0.9), 1.0, 0.7, 0.9); b.position.set(0, 0.0, 0.035); head.add(b); }
  if (O.mustache) { const m = cap(0.012, 0.04, M(O.age === 'old' ? HAIRC.grey : O.hair, 0.9)); m.rotation.z = Math.PI / 2; m.position.set(0, 0.045, 0.125); head.add(m); }
  if (O.glasses) { const gm = M('#111', 0.3);
    for (const s of [-1, 1]) { const ring = cast(new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.005, 8, 20), gm)); ring.position.set(s * 0.046, 0.125, 0.13); head.add(ring); }
    const br = cap(0.004, 0.02, gm); br.rotation.z = Math.PI / 2; br.position.set(0, 0.128, 0.134); head.add(br); }
  if (O.mask) buildMask(head, O.mask, M, cast, sph);
  if (O.headphones) { const hm = M(O.headphones === true ? '#1A1A1E' : O.headphones, 0.4); const band = cast(new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 8, 24, Math.PI), hm)); band.position.y = 0.11; head.add(band);
    for (const s of [-1, 1]) { const cup = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.035, 18), hm)); cup.rotation.z = Math.PI / 2; cup.position.set(s * 0.14, 0.1, 0); head.add(cup); } }
  if (O.hood) buildHood(head, mTop, cast);
  else if (O.hat) buildHat(head, O.hat, M(O.hatColor || ({ hardhat: '#F2C230', beanie: '#7A2E2E', beret: '#2A2A40' }[O.hat] || '#1C1C20'), 0.6), cast);
  if (!O.hood && O.mask !== 'balaclava' && (!O.hat || ['cap', 'beret', 'hardhat'].includes(O.hat))) buildHair(head, O.hat ? 'buzz' : O.hairStyle, mHair, cast);

  const arms = [];
  for (const s of [-1, 1]) {
    const sh = G(); chest.add(sh); sh.position.set(s * 0.2 * Wd, -0.04, 0);
    const up = cap(0.055 * Th, 0.17, mTop); up.position.y = -0.11; sh.add(up);
    const el = G(); sh.add(el); el.position.y = -0.23;
    const lo = cap(0.048 * Th, 0.15, mLow); lo.position.y = -0.1; el.add(lo);
    const hand = sph(0.045, mSkin, 0.85, 1.1, 0.7); hand.position.y = -0.22; el.add(hand);
    const grip = G(); grip.position.y = -0.24; el.add(grip);
    arms.push({ sh, el, grip });
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const hp = G(); hips.add(hp); hp.position.set(s * 0.09 * Wd, -0.04, 0);
    const th = cap(0.08 * Th, 0.22, mPants); th.position.y = -0.17; hp.add(th);
    const kn = G(); hp.add(kn); kn.position.y = -0.35;
    const sn = cap(0.068 * Th, 0.22, mPants); sn.position.y = -0.16; kn.add(sn);
    const ft = sph(0.06, mShoe, 0.9, 0.55, 1.7); ft.position.set(0, -0.37, 0.05); kn.add(ft);
    legs.push({ hp, kn });
  }
  const THIGH = 0.35, SHIN = 0.403, BASE = O.age === 'old' ? { lean: 0.1, nod: 0.08 } : {};
  function pose(q = {}) {
    q = Object.assign({}, BASE, q);
    arms.forEach((a, i) => { const s = i ? 1 : -1, k = i ? 'r' : 'l';
      a.sh.rotation.set(-(q[k + 'Fwd'] || 0), 0, s * (0.08 + (O.build === 'heavy' ? 0.08 : 0) + (q[k + 'Out'] || 0)));
      a.el.rotation.set(-clamp(q[k + 'El'] ?? 0.12, 0, 2.6), 0, 0); });
    let lowest = 0;
    legs.forEach((l, i) => { const k = i ? 'r' : 'l', h = q[k + 'Hip'] || 0, kn = clamp(q[k + 'Kn'] || 0, 0, 2.4);
      l.hp.rotation.set(-h, 0, 0); l.kn.rotation.set(kn, 0, 0); lowest = Math.max(lowest, THIGH * Math.cos(h) + SHIN * Math.cos(h - kn)); });
    spine.rotation.set(q.lean || 0, q.twist || 0, 0);
    head.rotation.set(q.nod || 0, q.yaw || 0, q.tilt || 0);
    hips.position.y = (q.sit ? q.sit / AGE[0] : 0.04 + lowest) + (q._lift || 0);
    pupils.forEach((p, i) => { const s = i ? 1 : -1; p.position.set(s * 0.045 + (q.lookX || 0) * 0.01, 0.123 + (q.lookY || 0) * 0.008, 0.128); });
    const bl = 1 - clamp(q.blink || 0) * 0.9; eyes.forEach(e => e.scale.y = 0.85 * bl); if (!hidden) pupils.forEach(p => p.scale.y = bl);
    brows.forEach((b, i) => { const s = i ? 1 : -1, br = q.brow || 0; b.rotation.z = Math.PI / 2 + s * (0.12 - br * 0.25); b.position.y = 0.158 + br * 0.008; });
    if (!hidden) { const mo = q.mouth || 'flat'; for (const k in mouth) mouth[k].visible = k === mo || (mo === 'frown' && k === 'smile');
      if (mo === 'frown') { mouth.smile.rotation.z = Math.PI; mouth.smile.position.y = 0.012; } else { mouth.smile.rotation.z = 0; mouth.smile.position.y = 0.034; } }
  }
  pose({});
  return { root, rig: { hips, spine, chest, head, arms, legs }, pose, opts: O, height: 1.75 * AGE[0] };
}

/* ---------- готовые позы (все — функции времени) ---------- */
export const POSE = {
  stand: () => ({}),
  walk(phase, a = 1) { const th = phase * TAU, s = Math.sin(th), c = Math.cos(th);
    return { lHip: 0.42 * a * s, rHip: -0.42 * a * s, lKn: 0.12 + 0.85 * a * Math.max(0, c) ** 1.4, rKn: 0.12 + 0.85 * a * Math.max(0, -c) ** 1.4,
             lFwd: -0.38 * a * s, rFwd: 0.38 * a * s, lEl: 0.3 + 0.2 * Math.max(0, -s), rEl: 0.3 + 0.2 * Math.max(0, s), lean: 0.05 * a, nod: 0.03 * Math.sin(th * 2) }; },
  run(phase) { const q = POSE.walk(phase, 1.5); q.lEl = q.rEl = 1.5; q.lean = 0.18; return q; },
  sneak(phase) { const q = POSE.walk(phase, 0.6); return Object.assign(q, { lean: 0.35, nod: -0.25, lKn: q.lKn + 0.4, rKn: q.rKn + 0.4, lFwd: 0.3, rFwd: 0.3, lEl: 1.2, rEl: 1.2 }); },
  sit: (h = 0.47) => ({ sit: h, lHip: 1.5, rHip: 1.5, lKn: 1.5, rKn: 1.5 }),
  type(lt, h = 0.47) { const q = POSE.sit(h); const tl = Math.max(0, Math.sin(lt * 17)), tr = Math.max(0, Math.sin(lt * 15 + 1.3));
    return Object.assign(q, { lFwd: 0.95 + 0.06 * tl, rFwd: 0.95 + 0.06 * tr, lEl: 1.05, rEl: 1.05, lOut: -0.12, rOut: -0.12, lean: 0.12, nod: 0.18, lookY: -0.6 }); },
  point: k => ({ rFwd: lerp(0, 1.45, k), rEl: lerp(0.12, 0.08, k), rOut: lerp(0, -0.1, k) }),
  hold: (k = 1) => ({ rFwd: 0.9 * k, rEl: 1.1 * k, rOut: -0.15 * k }),
  phone: () => ({ rFwd: 0.35, rEl: 2.35, rOut: -0.35, tilt: 0.12 }),
  wave: (k, lt) => ({ rOut: 2.4 * k, rEl: 0.6 + 0.4 * Math.sin(lt * 9) * k, mouth: 'smile' }),
  armsCrossed: () => ({ lFwd: 0.55, rFwd: 0.6, lEl: 2.0, rEl: 2.0, lOut: -0.25, rOut: -0.25 }),
  handsPockets: () => ({ lOut: 0.18, rOut: 0.18, lEl: 0.5, rEl: 0.5, lFwd: -0.15, rFwd: -0.15 }),
  think: k => ({ rFwd: 0.55 * k, rEl: 2.4 * k, rOut: -0.3 * k, lFwd: 0.4 * k, lEl: 1.6 * k, nod: 0.15 * k, lookX: 0.5 * k }),
  cry: k => ({ lFwd: 1.1 * k, rFwd: 1.1 * k, lEl: 2.3 * k, rEl: 2.3 * k, nod: 0.35 * k, lean: 0.15 * k, mouth: 'frown' }),
  shrug: k => ({ lOut: 0.35 * k, rOut: 0.35 * k, lEl: 1.4 * k, rEl: 1.4 * k, brow: 0.6 * k }),
  handsUp: k => ({ lFwd: 2.6 * k, rFwd: 2.6 * k, lEl: 0.3, rEl: 0.3, brow: 0.8 * k, mouth: 'o' }),
  facepalm: k => ({ rFwd: 1.2 * k, rEl: 2.3 * k, rOut: -0.4 * k, nod: 0.3 * k }),
  cheer: (k, lt) => ({ lFwd: 2.7 * k, rFwd: 2.7 * k, lOut: 0.3, rOut: 0.3, lEl: 0.2 + 0.2 * Math.sin(lt * 9), rEl: 0.2 + 0.2 * Math.sin(lt * 9 + 1), mouth: 'smile' }),
  jump: lt => { const u = (lt * 1.6) % 1, h = Math.sin(u * Math.PI); return { lKn: 0.9 * (1 - h), rKn: 0.9 * (1 - h), lHip: 0.5 * (1 - h), rHip: 0.5 * (1 - h), lFwd: 2.4 * h, rFwd: 2.4 * h, mouth: 'smile', _lift: 0.35 * h }; },
};
export const blinkAt = (lt, seed = 0) => { const ph = (lt + seed * 1.37) % 3.6; return ph < 0.12 ? Math.sin(ph / 0.12 * Math.PI) : 0; };
export const mix = (...qs) => Object.assign({}, ...qs);
export function walkTo(p, lt, from, to, speed = 1.3, t0 = 0) {
  const dx = to[0] - from[0], dz = to[1] - from[1], L = Math.hypot(dx, dz), dist = clamp((lt - t0) * speed, 0, L), k = L ? dist / L : 1;
  p.root.position.set(from[0] + dx * k, 0, from[1] + dz * k); p.root.rotation.y = Math.atan2(dx, dz);
  const moving = dist > 0 && dist < L; const a = moving ? clamp(Math.min(dist, L - dist) / 0.4) : 0;
  return POSE.walk(dist / (1.3 * (p.height || 1.75) / 1.75), a);
}

/* ---------- архетипы: cast('shadow'), cast('kid_girl', {topColor:'#3A6'}) ---------- */
export const CAST = {
  // скрытные
  shadow:      { sex: 'm', top: 'hoodie', topColor: '#141519', hood: true, face: 'hidden', pants: '#111216' },
  watcher:     { sex: 'm', top: 'hoodie', topColor: '#1B1D24', hood: true, face: 'hidden', eyesGlow: '#FF3B2E', pants: '#111216' },
  hacker_hood: { sex: 'm', top: 'hoodie', topColor: '#22252C', hood: true, glasses: true, pants: '#15171C' },
  hacker_girl: { sex: 'f', top: 'hoodie', topColor: '#2A1F3A', hood: true, skin: SKIN.light, glasses: true },
  masked:      { sex: 'm', top: 'jacket', topColor: '#1C1C20', mask: 'balaclava', pants: '#141418' },
  faceless:    { sex: 'm', top: 'suit', topColor: '#1A1A1E', mask: 'plain', hairStyle: 'slick', hair: HAIRC.black },
  spy:         { sex: 'm', top: 'coat', topColor: '#3A3530', hat: 'fedora', mask: 'shades', scarf: '#5A1E1E' },
  agent:       { sex: 'f', top: 'suit', topColor: '#16181D', hairStyle: 'slick', mask: 'shades', hair: HAIRC.black },
  stranger:    { sex: 'm', top: 'coat', topColor: '#2A2C30', hat: 'fedora', face: 'hidden' },
  // обычные люди
  guy:         { sex: 'm', top: 'tshirt', topColor: '#3B6EA8', hairStyle: 'crop', pants: '#2E3A52' },
  girl:        { sex: 'f', top: 'sweater', topColor: '#C9A27A', hairStyle: 'long', hair: HAIRC.brown },
  student:     { sex: 'm', age: 'teen', top: 'hoodie', topColor: '#4A6B3A', hairStyle: 'spiky', backpack: '#2A3B5C' },
  student_f:   { sex: 'f', age: 'teen', top: 'jacket', topColor: '#7A4A8C', hairStyle: 'pony', backpack: '#C24A3A' },
  gamer:       { sex: 'm', age: 'teen', top: 'tshirt', topColor: '#1C1C24', headphones: '#E5484D', hairStyle: 'curly' },
  office:      { sex: 'm', top: 'shirt', topColor: '#DCE3EC', tie: '#2B4A7A', hairStyle: 'sidepart' },
  office_f:    { sex: 'f', top: 'jacket', topColor: '#3A3F4A', shirt: '#F2F2F2', hairStyle: 'bun' },
  dad:         { sex: 'm', build: 'heavy', top: 'sweater', topColor: '#5C6B4A', hairStyle: 'buzz', beard: true },
  mom:         { sex: 'f', top: 'sweater', topColor: '#B5546A', hairStyle: 'bob' },
  hipster:     { sex: 'm', build: 'slim', top: 'shirt', topColor: '#8C5A3A', hairStyle: 'long_m', beard: true, glasses: true },
  curly_f:     { sex: 'f', top: 'tshirt', topColor: '#F2C230', hairStyle: 'afro', skin: SKIN.brown, hair: HAIRC.black },
  // дети и возрасты
  kid_boy:     { sex: 'm', age: 'kid', top: 'tshirt', topColor: '#F2B233', hairStyle: 'curly', pants: '#3A5C8C' },
  kid_girl:    { sex: 'f', age: 'kid', top: 'dress', topColor: '#E06A8C', hairStyle: 'pigtails', hair: HAIRC.blond },
  schoolkid:   { sex: 'm', age: 'kid', top: 'shirt', topColor: '#F2F2F2', pants: '#2A2E3A', hairStyle: 'sidepart', backpack: '#2F6BC2' },
  kid_hood:    { sex: 'm', age: 'kid', top: 'hoodie', topColor: '#3A6B8C', hood: true },
  grandpa:     { sex: 'm', age: 'old', top: 'sweater', topColor: '#7A6A52', hair: HAIRC.white, hairStyle: 'sidepart', glasses: true, mustache: true },
  grandma:     { sex: 'f', age: 'old', top: 'sweater', topColor: '#8C5A7A', hair: HAIRC.grey, hairStyle: 'bun', glasses: true, scarf: '#C9A27A' },
  // профессии
  detective:   { sex: 'm', top: 'coat', topColor: '#5A4A3A', hat: 'fedora', hairStyle: 'crop' },
  cop:         { sex: 'm', top: 'uniform', topColor: '#1F2C4A', hat: 'cap', hatColor: '#1F2C4A', badge: '#D8B04A', pants: '#1F2C4A' },
  soldier:     { sex: 'm', top: 'uniform', topColor: '#4A5A3A', hat: 'helmet', hatColor: '#3E4A30', pants: '#4A5A3A', shoes: '#2A2418' },
  scientist:   { sex: 'f', top: 'labcoat', topColor: '#5C7FA8', hairStyle: 'bun', glasses: true },
  doctor:      { sex: 'm', top: 'labcoat', topColor: '#3A8C7A', mask: 'medical', hairStyle: 'buzz' },
  nurse:       { sex: 'f', top: 'shirt', topColor: '#3FA8A0', pants: '#3FA8A0', hairStyle: 'pony', mask: 'medical' },
  worker:      { sex: 'm', build: 'heavy', top: 'vest', hat: 'hardhat', pants: '#2A3A5C', beard: true },
  courier:     { sex: 'm', top: 'jacket', topColor: '#E0562A', hat: 'cap', hatColor: '#E0562A', backpack: '#E0562A' },
  chef:        { sex: 'm', build: 'heavy', top: 'labcoat', topColor: '#EDEDED', hat: 'beanie', hatColor: '#F2F2F2', mustache: true },
  boss:        { sex: 'm', build: 'heavy', top: 'suit', topColor: '#1E222B', hairStyle: 'slick', hair: HAIRC.grey },
  ceo_f:       { sex: 'f', top: 'suit', topColor: '#7A1F2B', hairStyle: 'bob', hair: HAIRC.black },
  athlete:     { sex: 'f', top: 'tshirt', topColor: '#1F8C7E', hairStyle: 'pony', pants: '#20252E', shoes: '#EDEDED' },
  artist:      { sex: 'm', top: 'sweater', topColor: '#C24A3A', hat: 'beret', beard: true, scarf: '#2A6B8C' },
  rocker:      { sex: 'm', top: 'jacket', topColor: '#141418', hairStyle: 'mohawk', hair: HAIRC.red, mask: 'shades' },
  astronaut:   { sex: 'm', top: 'uniform', topColor: '#E8EAEC', pants: '#E8EAEC', hat: 'helmet', hatColor: '#F2F2F2', badge: '#2F6BC2', shoes: '#C8CCD2' },
};
export function cast(name, over = {}) { const b = CAST[name]; if (!b) throw new Error('нет архетипа ' + name + '; есть: ' + Object.keys(CAST).join(' ')); return person(Object.assign({}, b, over)); }
// случайная, но воспроизводимая внешность: person(vary(7, {age:'adult'}))
const TOPCOL = ['#3B5B7A', '#7A3B4B', '#4C6B4A', '#B07A3A', '#2F4A6B', '#5C5C66', '#8C3A3A', '#3A6B6B', '#C9A27A', '#1E222B', '#6B4A8C', '#D0D4DA'];
export function vary(seed, base = {}) { const h = k => hash2(seed, k), pick = (a, k) => a[Math.floor(h(k) * a.length) % a.length];
  const sex = base.sex || (h(1) > 0.5 ? 'f' : 'm'), age = base.age || pick(['adult', 'adult', 'adult', 'teen', 'old', 'kid'], 2);
  const hs = sex === 'f' ? ['bob', 'long', 'pony', 'bun', 'bangs', 'braids', 'curly'] : ['buzz', 'crop', 'sidepart', 'slick', 'curly', 'afro', 'bald', 'spiky'];
  return Object.assign({ sex, age, build: pick(['slim', 'avg', 'avg', 'heavy'], 3), skin: pick(Object.values(SKIN), 4), hair: age === 'old' ? pick([HAIRC.grey, HAIRC.white], 5) : pick([HAIRC.black, HAIRC.dark, HAIRC.brown, HAIRC.blond, HAIRC.auburn], 5),
    hairStyle: pick(hs, 6), top: pick(['sweater', 'tshirt', 'shirt', 'jacket', 'coat', 'hoodie'], 7), topColor: pick(TOPCOL, 8), pants: pick(['#262B36', '#2E3A52', '#3A3530', '#1A1A1E', '#5A5248'], 9),
    glasses: h(10) > 0.8, backpack: h(11) > 0.85 ? pick(TOPCOL, 12) : false, headphones: age === 'teen' && h(13) > 0.6 }, base);
}

/* ---------- толпа: crowd(scene, {n, area:[x0,x1,z0,z1], seed, mode:'walk'|'stand'|'mixed', base}) -> {people, update(lt)} ---------- */
// Массовка дешёвая: низкая детализация и без теней. 20–40 человек на фоне; главные герои — обычный person().
export function crowd(scene, o = {}) {
  const O = Object.assign({ n: 20, area: [-6, 6, -6, -2], seed: 1, mode: 'mixed', base: {} }, o), people = [];
  for (let i = 0; i < O.n; i++) { const p = person(Object.assign({ lod: true }, vary(O.seed * 100 + i, O.base))), h = k => hash2(O.seed * 31 + i, k);
    p.cfg = { x: lerp(O.area[0], O.area[1], h(1)), z: lerp(O.area[2], O.area[3], h(2)), walk: O.mode === 'walk' || (O.mode === 'mixed' && h(3) > 0.45), dir: h(4) > 0.5 ? 1 : -1, v: 0.9 + 0.6 * h(5), ph: h(6) * 10, yaw: (h(7) - 0.5) * 2.4, idle: Math.floor(h(8) * 4) };
    scene.add(p.root); people.push(p); }
  const span = O.area[1] - O.area[0];
  return { people, update(lt) { for (const p of people) { const c = p.cfg;
    if (c.walk) { const d = ((c.x - O.area[0]) + c.dir * c.v * lt) % span; p.root.position.set(O.area[0] + (d + span) % span, 0, c.z); p.root.rotation.y = c.dir * Math.PI / 2; p.pose(POSE.walk(c.v * lt / 1.3 + c.ph)); }
    else { p.root.position.set(c.x, 0, c.z); p.root.rotation.y = c.yaw + 0.15 * Math.sin(lt * 0.4 + c.ph);
      p.pose(mix([POSE.stand(), POSE.phone(), POSE.armsCrossed(), POSE.handsPockets()][c.idle], { blink: blinkAt(lt, c.ph), yaw: 0.3 * Math.sin(lt * 0.5 + c.ph) })); } } } };
}

/* ---------- животные: animal('dog'|'cat', {color, belly, ear, size}) -> {root, pose({walk, sit, wag, t, look, nod})} ---------- */
export function animal(kind = 'dog', o = {}) {
  const dog = kind === 'dog', O = Object.assign({ color: dog ? '#B07A3A' : '#5A5A62', belly: dog ? '#E8D2B0' : '#D8D4CC', size: dog ? 1 : 0.62 }, o);
  const M = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }), mc = M(O.color), mb = M(O.belly), dark = M('#141012');
  const c = m => { m.castShadow = true; m.receiveShadow = true; return m; }, sph = (r, m, sx = 1, sy = 1, sz = 1) => { const x = c(new THREE.Mesh(new THREE.SphereGeometry(r, 24, 16), m)); x.scale.set(sx, sy, sz); return x; };
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); root.scale.setScalar(O.size);
  const torso = sph(0.17, mc, 0.85, 0.8, dog ? 1.9 : 2.0); torso.position.y = 0.42; body.add(torso);
  const chest = sph(0.12, mb, 0.8, 0.8, 1.0); chest.position.set(0, 0.4, 0.2); body.add(chest);
  const head = new THREE.Group(); head.position.set(0, 0.58, 0.33); body.add(head);
  head.add(sph(0.11, mc, 1, 0.95, 1)); const snout = sph(dog ? 0.06 : 0.045, mb, 1, 0.8, dog ? 1.5 : 0.9); snout.position.set(0, -0.03, 0.1); head.add(snout);
  const nose = sph(0.018, dark); nose.position.set(0, -0.005, dog ? 0.19 : 0.14); head.add(nose);
  for (const s of [-1, 1]) { const e = sph(0.018, dark); e.position.set(s * 0.045, 0.03, 0.095); head.add(e);
    const ear = dog ? sph(0.05, M(O.ear || O.color), 0.5, 1.2, 0.8) : c(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.08, 12), mc));
    ear.position.set(s * 0.075, dog ? 0.02 : 0.1, dog ? -0.01 : 0); ear.rotation.z = dog ? s * 0.4 : s * -0.2; head.add(ear); }
  const legs = []; for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) { const g = new THREE.Group(); g.position.set(x * 0.08, 0.38, z * 0.2); body.add(g);
    const l = c(new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.26, 6, 10), mc)); l.position.y = -0.17; g.add(l); const p = sph(0.04, mb, 1, 0.6, 1.2); p.position.set(0, -0.33, 0.015); g.add(p); legs.push(g); }
  const tail = new THREE.Group(); tail.position.set(0, 0.48, -0.32); body.add(tail); const tl = c(new THREE.Mesh(new THREE.CapsuleGeometry(dog ? 0.025 : 0.02, dog ? 0.2 : 0.3, 6, 10), mc)); tl.position.y = dog ? 0.12 : 0.17; tail.add(tl);
  function pose(q = {}) { const th = (q.walk || 0) * TAU, a = q.walk !== undefined ? 0.5 : 0, t = q.t || 0;
    legs.forEach((g, i) => g.rotation.x = a * Math.sin(th + [0, Math.PI, Math.PI, 0][i]));
    body.position.y = a ? 0.015 * Math.abs(Math.sin(th * 2)) : 0; body.rotation.x = 0;
    if (q.sit) { body.rotation.x = -0.45; legs[2].rotation.x = legs[3].rotation.x = -1.2; body.position.y = -0.1; }
    tail.rotation.x = -0.6 + (dog ? 0.35 * Math.sin(t * (q.wag ? 14 : 3)) : 0.15 * Math.sin(t * 2)); tail.rotation.z = dog && q.wag ? 0.5 * Math.sin(t * 14) : 0;
    head.rotation.set(q.nod || 0, q.look || 0, 0); }
  pose({}); return { root, pose, kind };
}

/* ---------- причёски, капюшон, маски, шапки ---------- */
function buildHair(head, style, mat, cast) {
  if (style === 'bald') return;
  const add = (geo, x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) => { const m = cast(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); m.scale.set(sx, sy, sz); head.add(m); return m; };
  const capG = (r, th) => new THREE.SphereGeometry(r, 36, 20, 0, TAU, 0, th), S = (r, a = 18, b = 12) => new THREE.SphereGeometry(r, a, b);
  const base = (r, th, tilt) => add(capG(r, th), 0, 0.115, -0.004, -tilt, 0, 0, 0.95, 1.07, 1.04);
  if (style === 'buzz') { base(0.141, 1.45, 0.42); return; }
  if (style === 'crop') { base(0.145, 1.5, 0.45); add(S(0.05), 0, 0.226, 0.08, 0.3, 0, 0, 1.9, 0.5, 0.9); return; }
  if (style === 'sidepart') { base(0.146, 1.52, 0.45); add(S(0.065), 0.035, 0.235, 0.07, 0.35, 0, -0.35, 1.6, 0.6, 1.0); return; }
  if (style === 'slick') { base(0.147, 1.5, 0.5); add(S(0.07), 0, 0.235, 0.04, 0.2, 0, 0, 1.6, 0.6, 1.5); return; }
  if (style === 'curly') { base(0.145, 1.55, 0.45); for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; add(S(0.045, 12, 8), Math.cos(a) * 0.115, 0.2 + 0.035 * Math.sin(i * 1.7), Math.sin(a) * 0.125 - 0.01); } return; }
  if (style === 'afro') { base(0.146, 1.55, 0.45); add(S(0.2, 24, 16), 0, 0.2, -0.03, 0, 0, 0, 1.05, 0.9, 1); return; }
  if (style === 'mohawk') { base(0.139, 1.35, 0.45); for (let i = 0; i < 6; i++) add(new THREE.ConeGeometry(0.03, 0.12, 8), 0, 0.27 - Math.abs(i - 2.5) * 0.012, 0.08 - i * 0.045, -0.3 + i * 0.12); return; }
  if (style === 'spiky') { base(0.145, 1.5, 0.45); for (let i = 0; i < 9; i++) { const a = i / 9 * TAU; add(new THREE.ConeGeometry(0.035, 0.09, 8), Math.cos(a) * 0.07, 0.27, Math.sin(a) * 0.07 + 0.01, Math.sin(a) * 0.6, 0, -Math.cos(a) * 0.6); } return; }
  base(0.148, 1.6, 0.4);
  if (style !== 'long_m') add(S(0.065), -0.03, 0.225, 0.08, 0.3, 0, 0.3, 1.8, 0.55, 0.9);
  const shell = (top, bot, h, y) => add(new THREE.CylinderGeometry(top, bot, h, 36, 1, true, 1.05, TAU - 2.1), 0, y, -0.01, 0, 0, 0, 0.95, 1, 1.02);
  if (style === 'bob') { shell(0.15, 0.165, 0.17, 0.07); return; }
  if (style === 'bangs') { shell(0.15, 0.165, 0.17, 0.07); add(S(0.07), 0, 0.2, 0.09, 0.5, 0, 0, 2.0, 0.5, 0.8); return; }
  if (style === 'long' || style === 'long_m') { shell(0.15, 0.17, 0.2, 0.06); add(new THREE.CapsuleGeometry(0.12, 0.14, 6, 16), 0, -0.06, -0.085, 0.1, 0, 0, 1.15, 1, 0.42); return; }
  if (style === 'pony') { add(S(0.04), 0, 0.16, -0.15); add(new THREE.CapsuleGeometry(0.042, 0.17, 6, 12), 0, 0.04, -0.175, -0.25); return; }
  if (style === 'bun') { add(S(0.065), 0, 0.235, -0.1); return; }
  if (style === 'pigtails') { for (const s of [-1, 1]) { add(S(0.035), s * 0.13, 0.15, -0.04); add(new THREE.CapsuleGeometry(0.038, 0.1, 6, 12), s * 0.16, 0.06, -0.04, 0, 0, s * 0.3); } return; }
  if (style === 'braids') { for (const s of [-1, 1]) for (let k = 0; k < 4; k++) add(S(0.032), s * 0.11, 0.05 - k * 0.055, -0.05 + k * 0.01); return; }
}
function buildHood(head, mat, cast) {          // капюшон: оболочка с вырезом под лицо + тень на лбу
  const m = cast(new THREE.Mesh(new THREE.SphereGeometry(0.175, 32, 20, Math.PI / 2 + 0.85, TAU - 1.7, 0, 2.25), mat.clone()));
  m.material.side = THREE.DoubleSide; m.position.set(0, 0.12, -0.01); m.scale.set(1, 1.08, 1.05); head.add(m);
  const rim = cast(new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.02, 8, 28), mat)); rim.position.set(0, 0.115, 0.11); rim.rotation.x = -0.15; rim.scale.set(1, 1.15, 1); head.add(rim);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(0.13, 24), new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.35, depthWrite: false }));
  sh.position.set(0, 0.2, 0.13); sh.rotation.x = -0.6; sh.scale.set(1, 0.6, 1); head.add(sh);
}
function buildMask(head, kind, M, cast, sph) {
  if (kind === 'medical') { const m = cast(new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16, Math.PI / 2 - 0.9, 1.8, 1.25, 0.75), M('#DDE8F0', 0.8, { side: THREE.DoubleSide }))); m.position.set(0, 0.11, 0); m.scale.set(1, 1.1, 1.18); head.add(m); return; }
  if (kind === 'balaclava') { const b = sph(0.15, M('#121214', 0.9), 0.95, 1.08, 1.03); b.position.y = 0.105; head.add(b);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.035, 0.02), M('#000', 1)); slit.position.set(0, 0.125, 0.14); head.add(slit);
    for (const s of [-1, 1]) { const e = sph(0.012, M('#EDEDED', 0.3)); e.position.set(s * 0.04, 0.125, 0.152); head.add(e); } return; }
  if (kind === 'plain') { const p = sph(0.12, M('#F2F0EA', 0.35), 0.85, 1.05, 0.55); p.position.set(0, 0.1, 0.07); head.add(p);
    for (const s of [-1, 1]) { const e = sph(0.016, M('#050505', 1), 1.3, 0.6, 0.6); e.position.set(s * 0.042, 0.125, 0.135); head.add(e); } return; }
  if (kind === 'shades') { const gm = M('#0A0A0C', 0.15, { metalness: 0.3 }); for (const s of [-1, 1]) { const l = sph(0.03, gm, 1.15, 0.75, 0.35); l.position.set(s * 0.046, 0.125, 0.133); head.add(l); }
    const br = cast(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.006, 0.006), gm)); br.position.set(0, 0.13, 0.138); head.add(br); }
}
function buildHat(head, kind, mat, cast) {
  const add = (geo, y, z = 0, rx = 0) => { const m = cast(new THREE.Mesh(geo, mat)); m.position.set(0, y, z); m.rotation.x = rx; head.add(m); return m; };
  if (kind === 'fedora') { add(new THREE.CylinderGeometry(0.24, 0.24, 0.012, 36), 0.2, 0, -0.08); add(new THREE.CylinderGeometry(0.12, 0.145, 0.12, 28), 0.26, -0.005, -0.08); return; }
  if (kind === 'cap') { add(new THREE.SphereGeometry(0.15, 28, 14, 0, TAU, 0, 1.55), 0.12, -0.005, -0.3).scale.set(0.95, 1.05, 1.05); add(new THREE.CylinderGeometry(0.1, 0.1, 0.01, 28, 1, false, -0.9, 1.8), 0.17, 0.11, 0.1).scale.set(1, 1, 0.9); return; }
  if (kind === 'helmet') { add(new THREE.SphereGeometry(0.16, 28, 14, 0, TAU, 0, 1.6), 0.115, -0.005, -0.25); return; }
  if (kind === 'hardhat') { add(new THREE.SphereGeometry(0.155, 28, 14, 0, TAU, 0, 1.5), 0.13, -0.005, -0.15); add(new THREE.CylinderGeometry(0.19, 0.19, 0.012, 28), 0.15, 0.02, -0.15); return; }
  if (kind === 'beanie') { add(new THREE.SphereGeometry(0.152, 28, 14, 0, TAU, 0, 1.75), 0.12, -0.01, -0.35).scale.set(0.96, 1.15, 1.05); add(new THREE.SphereGeometry(0.035, 12, 8), 0.3, -0.05); return; }
  if (kind === 'beret') { const b = add(new THREE.SphereGeometry(0.16, 28, 12, 0, TAU, 0, 1.1), 0.17, 0, -0.1); b.scale.set(1.1, 0.55, 1.1); b.rotation.z = 0.25; return; }
}
function shade(h, k) { const n = parseInt(h.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + ((f(n >> 16) << 16) | (f(n >> 8 & 255) << 8) | f(n & 255)).toString(16).padStart(6, '0'); }
