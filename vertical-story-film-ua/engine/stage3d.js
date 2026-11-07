// stage3d.js — свет, материалы, процедурные текстуры, комнаты и реквизит. Всё строится один раз в world(GL).
import { THREE, hash2, W, H } from './core.js';
import { RoomEnvironment } from './three/RoomEnvironment.js';

/* ---------- сцена и свет ---------- */
// LOOK: готовые схемы света. key — тёплый/холодный ключ с тенью, rim — контровой, fill — небо/пол.
export const LOOK = {
  noir:   { bg: '#0B0D12', fog: ['#0B0D12', 6, 22], hemi: ['#5C6B85', '#140F0C', 0.35], key: ['#FFD9A8', 3.2, [-2.5, 6, 3]], rim: ['#7FB8FF', 2.0, [3, 3, -4]], env: 0.25 },
  office: { bg: '#151A22', fog: ['#151A22', 8, 26], hemi: ['#C9D6EA', '#2A2622', 0.7], key: ['#FFF1DE', 2.6, [-3, 6, 4]], rim: ['#9FD0FF', 1.4, [3, 4, -4]], env: 0.45 },
  lab:    { bg: '#0A1416', fog: ['#0A1416', 7, 30], hemi: ['#9FE3E0', '#101414', 0.5], key: ['#E6FBFF', 2.4, [0, 8, 2]], rim: ['#3FE0C8', 1.8, [-4, 3, -4]], env: 0.35 },
  alarm:  { bg: '#140707', fog: ['#140707', 6, 22], hemi: ['#FF8A7A', '#100606', 0.45], key: ['#FF6A50', 3.0, [-2, 6, 3]], rim: ['#FFC0A0', 1.6, [3, 3, -4]], env: 0.2 },
  night:  { bg: '#080B14', fog: ['#080B14', 10, 45], hemi: ['#6F86C0', '#0A0A10', 0.4], key: ['#BFD4FF', 1.6, [-4, 8, 2]], rim: ['#FFB870', 1.6, [4, 3, -3]], env: 0.25 },
  warm:   { bg: '#1A120C', fog: ['#1A120C', 6, 20], hemi: ['#FFD9B0', '#1A100A', 0.6], key: ['#FFC88A', 3.0, [-3, 5, 3]], rim: ['#FFE2B8', 1.2, [3, 4, -4]], env: 0.4 },
};
// stage(GL, 'noir', {shadowBox:4}) -> {scene, camera, key, rim, hemi}
export function stage(GL, look = 'noir', o = {}) {
  const L = typeof look === 'string' ? LOOK[look] : look, sc = new THREE.Scene();
  if (o.transparent !== true) sc.background = new THREE.Color(L.bg);
  if (L.fog) sc.fog = new THREE.Fog(...L.fog);
  if (L.env && !(GL.opts && GL.opts.env === false)) { const pm = new THREE.PMREMGenerator(GL.renderer); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; sc.environmentIntensity = L.env; }
  const hemi = new THREE.HemisphereLight(...L.hemi); sc.add(hemi);
  const key = new THREE.DirectionalLight(L.key[0], L.key[1]); key.position.set(...L.key[2]); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); const b = o.shadowBox || 4; Object.assign(key.shadow.camera, { left: -b, right: b, top: b, bottom: -b, near: 0.5, far: 30 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4; sc.add(key); sc.add(key.target);
  const rim = new THREE.DirectionalLight(L.rim[0], L.rim[1]); rim.position.set(...L.rim[2]); sc.add(rim);
  const camera = new THREE.PerspectiveCamera(o.fov || 32, W / H, 0.05, 200);
  return { scene: sc, camera, key, rim, hemi };
}
// точечный прожектор с видимым конусом (для «допроса», витрины, ангара)
export function spot(sc, pos, at, color = '#FFE6C0', I = 20, angle = 0.42, cone = 0.10, shadow = false) {
  const s = new THREE.SpotLight(color, I, 30, angle, 0.55, 1.6); s.position.set(...pos); s.target.position.set(...at); s.castShadow = shadow; s.shadow.mapSize.set(1024, 1024);
  sc.add(s); sc.add(s.target);
  if (cone) { const h = new THREE.Vector3(...pos).distanceTo(new THREE.Vector3(...at)); const r = Math.tan(angle) * h;
    const g = new THREE.ConeGeometry(r, h, 48, 1, true); g.translate(0, -h / 2, 0);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: cone, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    m.position.set(...pos); m.lookAt(...at); m.rotateX(-Math.PI / 2); sc.add(m); s.userData.cone = m; }
  return s;
}

// 9:16: горизонтальный угол — всего 0.56 вертикального. Ширина кадра на расстоянии d: frameW(cam, d).
// Двое людей рядом (1.4 м) влезают в кадр только с ~4.5 м при fov 32. Ставь людей ближе друг к другу или камеру дальше/шире.
export const frameH = (cam, d) => 2 * d * Math.tan(cam.fov * Math.PI / 360);
export const frameW = (cam, d) => frameH(cam, d) * cam.aspect;

/* ---------- материалы и текстуры ---------- */
export const mat = (c, r = 0.6, m = 0, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, o));
export const glow = (c, I = 2) => new THREE.MeshStandardMaterial({ color: '#000', emissive: c, emissiveIntensity: I });
// холст-текстура: tex(512,512,(q,w,h)=>{...рисуем 2D...})
export function tex(w, h, fn, repeat) { const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); } t.userData.canvas = c; return t; }
const speck = (q, w, h, n, c, a, s = 1, seed = 1) => { q.fillStyle = c; for (let i = 0; i < n; i++) { q.globalAlpha = a * hash2(i, seed); q.fillRect(hash2(i, seed + 1) * w, hash2(i, seed + 2) * h, s + hash2(i, seed + 3) * s * 2, s); } q.globalAlpha = 1; };
export const TEX = {
  wood: (c = '#6B4A31') => tex(512, 512, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); for (let i = 0; i < 90; i++) { q.strokeStyle = `rgba(0,0,0,${0.05 + 0.1 * hash2(i, 4)})`; q.lineWidth = 1 + 3 * hash2(i, 5); q.beginPath(); const y = hash2(i, 6) * h; q.moveTo(0, y); q.bezierCurveTo(w * 0.3, y + 8 * Math.sin(i), w * 0.7, y - 8, w, y + 4); q.stroke(); } }, [2, 2]),
  concrete: (c = '#5A5E63') => tex(512, 512, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); speck(q, w, h, 9000, '#000', 0.18, 1, 2); speck(q, w, h, 5000, '#fff', 0.08, 1, 7); }, [3, 3]),
  paper: (lines = 18, c = '#ECE6D8', stamp) => tex(512, 700, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); speck(q, w, h, 3000, '#7A6A50', 0.08, 1, 3);
    q.fillStyle = 'rgba(40,36,30,0.65)'; for (let i = 0; i < lines; i++) { const lw = (0.55 + 0.4 * hash2(i, 9)) * (w - 90); q.fillRect(45, 90 + i * 30, lw, 9); }
    if (stamp) { q.save(); q.translate(w * 0.62, h * 0.8); q.rotate(-0.25); q.strokeStyle = 'rgba(190,40,40,0.8)'; q.lineWidth = 6; q.strokeRect(-110, -40, 220, 80); q.fillStyle = 'rgba(190,40,40,0.8)'; q.font = 'bold 44px Oswald'; q.textAlign = 'center'; q.fillText(stamp, 0, 16); q.restore(); } }),
  grid: (c = '#0E1A1C', l = '#2A5A58') => tex(512, 512, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); q.strokeStyle = l; q.lineWidth = 2; for (let i = 0; i <= 8; i++) { q.beginPath(); q.moveTo(i * 64, 0); q.lineTo(i * 64, h); q.moveTo(0, i * 64); q.lineTo(w, i * 64); q.stroke(); } }, [8, 8]),
  tiles: (c = '#2B3138') => tex(512, 512, (q, w, h) => { q.fillStyle = c; q.fillRect(0, 0, w, h); q.strokeStyle = 'rgba(0,0,0,0.35)'; q.lineWidth = 4; for (let i = 0; i <= 4; i++) { q.beginPath(); q.moveTo(i * 128, 0); q.lineTo(i * 128, h); q.moveTo(0, i * 128); q.lineTo(w, i * 128); q.stroke(); } speck(q, w, h, 3000, '#fff', 0.05, 1, 5); }, [6, 6]),
};
// живой экран: screen(640,400,(q,w,h,lt)=>{...}) ; в update: scr.draw(lt)
export function screen(w, h, painter) { const t = tex(w, h, () => {}); const q = t.userData.canvas.getContext('2d');
  const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false }); return { tex: t, mat: m, draw(lt) { painter(q, w, h, lt); t.needsUpdate = true; } }; }

/* ---------- пол, стены, комнаты ---------- */
const cast = m => { m.castShadow = true; m.receiveShadow = true; return m; };
export function floor(sc, m = mat('#2B3342', 0.85), size = 60) { const f = new THREE.Mesh(new THREE.PlaneGeometry(size, size), m); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; sc.add(f); return f; }
export function room(sc, w = 8, d = 8, h = 3.2, wallM = mat('#3A4250', 0.9), floorM = mat('#2A2F38', 0.8)) {
  const g = new THREE.Group(); const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), floorM); f.rotation.x = -Math.PI / 2; f.receiveShadow = true; g.add(f);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallM); back.position.set(0, h / 2, -d / 2); back.receiveShadow = true; g.add(back);
  for (const s of [-1, 1]) { const wl = new THREE.Mesh(new THREE.PlaneGeometry(d, h), wallM); wl.rotation.y = -s * Math.PI / 2; wl.position.set(s * w / 2, h / 2, 0); wl.receiveShadow = true; g.add(wl); }
  sc.add(g); return g;
}
// окно с городом ночью (светящиеся окна домов) — плоскость на стене
export function cityWindow(sc, pos, w = 2.4, h = 1.6, seed = 4) {
  const t = tex(768, 512, (q, W2, H2) => { const g = q.createLinearGradient(0, 0, 0, H2); g.addColorStop(0, '#0B1430'); g.addColorStop(1, '#1D2A4E'); q.fillStyle = g; q.fillRect(0, 0, W2, H2);
    for (let b = 0; b < 26; b++) { const x = hash2(b, seed) * W2, bw = 30 + hash2(b, seed + 1) * 70, bh = 120 + hash2(b, seed + 2) * 330; q.fillStyle = '#0A0F1E'; q.fillRect(x, H2 - bh, bw, bh);
      for (let yy = H2 - bh + 10; yy < H2 - 10; yy += 16) for (let xx = x + 6; xx < x + bw - 6; xx += 12) if (hash2(xx * 3 + yy, b) > 0.62) { q.fillStyle = hash2(xx, yy) > 0.5 ? '#FFD38A' : '#FFF1C9'; q.fillRect(xx, yy, 6, 8); } } });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, toneMapped: false })); m.position.set(...pos); sc.add(m);
  const fr = new THREE.Mesh(new THREE.BoxGeometry(w + 0.12, h + 0.12, 0.05), mat('#15181E', 0.6)); fr.position.set(pos[0], pos[1], pos[2] - 0.03); sc.add(fr); return m;
}
// облако частиц (пыль в свете), позиции считаются из t
export function motes(sc, n = 300, box = [6, 3, 6], color = '#FFE9C8', size = 0.012) {
  const g = new THREE.BufferGeometry(), a = new Float32Array(n * 3); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const dot = tex(64, 64, (q) => { const g2 = q.createRadialGradient(32, 32, 0, 32, 32, 32); g2.addColorStop(0, 'rgba(255,255,255,1)'); g2.addColorStop(1, 'rgba(255,255,255,0)'); q.fillStyle = g2; q.fillRect(0, 0, 64, 64); });
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color, size, map: dot, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending })); sc.add(p);
  p.userData.at = lt => { for (let i = 0; i < n; i++) { a[i * 3] = (hash2(i, 1) - 0.5) * box[0] + Math.sin(lt * 0.3 + i) * 0.08; a[i * 3 + 1] = ((hash2(i, 2) * box[1] + lt * 0.05 * (0.5 + hash2(i, 3))) % box[1]); a[i * 3 + 2] = (hash2(i, 4) - 0.5) * box[2]; } g.attributes.position.needsUpdate = true; };
  return p;
}

/* ---------- реквизит (единицы — метры) ---------- */
const G = () => new THREE.Group();
const box = (w, h, d, m, r = 0) => cast(new THREE.Mesh(r ? roundBox(w, h, d, r) : new THREE.BoxGeometry(w, h, d), m));
export function roundBox(w, h, d, r = 0.02, s = 3) { const shape = new THREE.Shape(); const x = -w / 2 + r, y = -h / 2 + r, ww = w - 2 * r, hh = h - 2 * r;
  shape.absarc(x, y, r, Math.PI, 1.5 * Math.PI); shape.absarc(x + ww, y, r, 1.5 * Math.PI, 0); shape.absarc(x + ww, y + hh, r, 0, 0.5 * Math.PI); shape.absarc(x, y + hh, r, 0.5 * Math.PI, Math.PI);
  const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: 0, bevelSegments: s, curveSegments: 6 }); g.translate(0, 0, -(d - 2 * r) / 2); return g; }
export const PROP = {
  desk(w = 1.6, d = 0.8, m = mat('#4A3426', 0.55, 0, { map: TEX.wood('#5C3F2A') })) { const g = G(); const top = box(w, 0.05, d, m, 0.01); top.position.y = 0.75; g.add(top);
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(0.05, 0.75, 0.05, mat('#2A2420', 0.5)); l.position.set(x * (w / 2 - 0.06), 0.375, z * (d / 2 - 0.06)); g.add(l); } return g; },
  chair(m = mat('#22262E', 0.6)) { const g = G(); const s = box(0.46, 0.06, 0.46, m, 0.02); s.position.y = 0.47; g.add(s); const b = box(0.46, 0.5, 0.05, m, 0.02); b.position.set(0, 0.75, -0.21); g.add(b);
    const p = box(0.05, 0.44, 0.05, mat('#111', 0.4, 0.6)); p.position.y = 0.22; g.add(p); return g; },
  paper(lines = 16, stamp, w = 0.21, h = 0.297) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat('#fff', 0.85, 0, { map: TEX.paper(lines, '#ECE6D8', stamp), side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.castShadow = true; return m; },
  folder(label = 'ДЕЛО', c = '#C9A46A') { const g = G(); const m = mat(c, 0.75); const back = box(0.25, 0.006, 0.33, m); g.add(back);
    const hinge = G(); hinge.position.set(-0.125, 0.012, 0); g.add(hinge); g.userData.front = hinge;   // крышка откидывается на корешке: hinge.rotation.z = -угол
    const front = box(0.25, 0.006, 0.33, m); front.position.x = 0.125; hinge.add(front);
    const tab = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.05), mat('#fff', 0.8, 0, { map: tex(256, 100, (q) => { q.fillStyle = '#EFE8D6'; q.fillRect(0, 0, 256, 100); q.fillStyle = '#222'; q.font = '700 54px Oswald'; q.textAlign = 'center'; q.fillText(label, 128, 70); }) }));
    tab.rotation.x = -Math.PI / 2; tab.position.set(0, 0.016, -0.05); front.add(tab); tab.position.set(0, 0.004, -0.05); return g; },
  envelope(seal = '#9B1C1C') { const g = G(); g.add(box(0.24, 0.006, 0.15, mat('#D8C49A', 0.8))); const s = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.008, 24), mat(seal, 0.4))); s.position.y = 0.008; g.add(s); return g; },
  usb(body = '#1E7A4C') { const g = G(); g.add(box(0.06, 0.012, 0.022, mat(body, 0.35), 0.004)); const c = box(0.018, 0.008, 0.016, mat('#C8CCD2', 0.25, 0.9)); c.position.x = 0.038; g.add(c);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.002, 8, 8), glow('#3CFF9A', 4)); led.position.set(-0.02, 0.007, 0); g.add(led); return g; },
  laptop(scr) { const g = G(); const base = box(0.34, 0.018, 0.24, mat('#2A2E36', 0.35, 0.3), 0.006); base.position.y = 0.009; g.add(base);
    const lid = G(); lid.position.set(0, 0.018, -0.12); lid.rotation.x = -0.25; g.add(lid); const l = box(0.34, 0.012, 0.23, mat('#2A2E36', 0.35, 0.3), 0.006); l.rotation.x = Math.PI / 2; l.position.set(0, 0.115, 0); lid.add(l);
    if (scr) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.31, 0.2), scr.mat); s.position.set(0, 0.115, 0.007); lid.add(s); } return g; },
  monitor(scr, w = 0.6, h = 0.36) { const g = G(); const f = box(w + 0.03, h + 0.03, 0.03, mat('#15181E', 0.4), 0.008); f.position.y = 0.3 + h / 2; g.add(f);
    if (scr) { const s = new THREE.Mesh(new THREE.PlaneGeometry(w, h), scr.mat); s.position.set(0, 0.3 + h / 2, 0.017); g.add(s); }
    const st = box(0.05, 0.3, 0.05, mat('#15181E', 0.4)); st.position.y = 0.15; g.add(st); const ft = box(0.22, 0.015, 0.16, mat('#15181E', 0.4)); g.add(ft); return g; },
  keyboard() { const g = G(); g.add(box(0.44, 0.02, 0.14, mat('#1B1E24', 0.5), 0.005)); const km = mat('#2C313A', 0.5);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 14; c++) { const k = box(0.025, 0.01, 0.025, km); k.position.set(-0.2 + c * 0.0305, 0.014, -0.045 + r * 0.03); g.add(k); } return g; },
  mug(c = '#B23A3A') { const g = G(); const b = cast(new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.1, 28), mat(c, 0.35))); b.position.y = 0.05; g.add(b);
    const h = cast(new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.007, 8, 20, Math.PI), mat(c, 0.35))); h.position.set(0.045, 0.05, 0); h.rotation.z = -Math.PI / 2; g.add(h); return g; },
  lamp(c = '#FFE2B0') { const g = G(); const b = box(0.14, 0.02, 0.14, mat('#1A1A1A', 0.4)); g.add(b); const a = box(0.015, 0.4, 0.015, mat('#1A1A1A', 0.4)); a.position.y = 0.2; a.rotation.z = 0.25; g.add(a);
    const sh = cast(new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.12, 24, 1, true), mat('#1A1A1A', 0.4, 0, { side: THREE.DoubleSide }))); sh.position.set(-0.05, 0.4, 0); sh.rotation.z = 0.5; g.add(sh);
    const L = new THREE.PointLight(c, 3, 2.5, 1.6); L.position.set(-0.08, 0.34, 0); g.add(L); return g; },
  rack(n = 8, led = '#3CFF9A') { const g = G(); const body = box(0.6, 2.0, 0.8, mat('#1A1D23', 0.5, 0.3), 0.01); body.position.y = 1.0; g.add(body);
    for (let i = 0; i < n; i++) { const u = box(0.56, 0.16, 0.02, mat('#23272F', 0.45, 0.3)); u.position.set(0, 0.2 + i * 0.22, 0.405); g.add(u);
      for (let k = 0; k < 4; k++) { const l = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 8), glow(hash2(i, k) > 0.3 ? led : '#FFB020', 3)); l.position.set(0.2 - k * 0.03, 0.2 + i * 0.22, 0.42); g.add(l); } } return g; },
  centrifuge(h = 2.2, r = 0.14, m = mat('#A9B2BC', 0.35, 0.25)) { const g = G(); const c = cast(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40), m)); c.position.y = h / 2 + 0.1; g.add(c);
    const base = cast(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.5, r * 1.6, 0.1, 40), mat('#3A4048', 0.5, 0.2))); base.position.y = 0.05; g.add(base);
    const top = cast(new THREE.Mesh(new THREE.CylinderGeometry(r * 1.15, r * 1.15, 0.06, 40), mat('#C8CED6', 0.3, 0.3))); top.position.y = h + 0.13; g.add(top); g.userData.body = c; return g; },
  newspaper(head = 'ВЕСТНИК', title = 'ЗАГОЛОВОК') { const t = tex(600, 800, (q, w, h) => { q.fillStyle = '#E9E3D3'; q.fillRect(0, 0, w, h); q.fillStyle = '#1A1A1A'; q.textAlign = 'center';
      q.font = '700 72px PTSerif'; q.fillText(head, w / 2, 90); q.fillRect(30, 110, w - 60, 4); q.font = '700 46px PTSerif'; q.fillText(title, w / 2, 175);
      q.fillStyle = '#3A3A3A'; q.fillRect(40, 210, 250, 170); for (let i = 0; i < 22; i++) { q.fillStyle = 'rgba(30,30,30,0.55)'; q.fillRect(i < 8 ? 310 : 40, 215 + (i < 8 ? i : i - 8 + 7) * 24, i < 8 ? 250 : 520, 8); } });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.56), mat('#fff', 0.85, 0, { map: t, side: THREE.DoubleSide })); m.castShadow = true; m.receiveShadow = true; return m; },
  phone(scr) { const g = G(); g.add(box(0.075, 0.155, 0.008, mat('#111', 0.3, 0.4), 0.008)); if (scr) { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.068, 0.145), scr.mat); s.position.z = 0.0045; g.add(s); } return g; },
  globe(r = 1, land = '#1F6E6A', sea = '#0B1E2A') { const t = tex(1024, 512, (q, w, h) => { q.fillStyle = sea; q.fillRect(0, 0, w, h); q.fillStyle = land;
      for (let i = 0; i < 260; i++) { const x = hash2(i, 11) * w, y = h * (0.15 + 0.7 * hash2(i, 12)); q.beginPath(); q.ellipse(x, y, 20 + 60 * hash2(i, 13), 10 + 30 * hash2(i, 14), hash2(i, 15) * 3, 0, Math.PI * 2); q.fill(); } });
    return cast(new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), mat('#fff', 0.7, 0, { map: t }))); },
};
// утилита: поставить объект на стол/пол с поворотом
export function place(o, pos, rotY = 0, s = 1) { o.position.set(...pos); o.rotation.y = rotY; o.scale.setScalar(s); return o; }
