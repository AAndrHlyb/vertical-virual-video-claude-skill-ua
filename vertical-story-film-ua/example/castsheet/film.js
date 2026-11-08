// Лист персонажей: все архетипы CAST, животные, толпа и стили картинки.
// node engine/render.mjs example/castsheet --stills 1,4,7,10,13,16,19   — посмотреть, кого взять в ролик.
import { run, THREE, W, H, X, txt, GL, camPath } from '../../engine/core.js';
import { stage, mat, floor, place } from '../../engine/stage3d.js';
import { CAST, cast, POSE, mix, blinkAt, crowd, animal } from '../../engine/cast3d.js';

const ALL = [['СКРЫТНЫЕ', ['shadow', 'watcher', 'hacker_hood', 'hacker_girl', 'masked', 'faceless', 'spy', 'agent', 'stranger']],
  ['ОБЫЧНЫЕ', ['guy', 'girl', 'student', 'student_f', 'gamer', 'office', 'office_f', 'dad', 'mom', 'hipster', 'curly_f']],
  ['ДЕТИ, ВОЗРАСТ, ЖИВОТНЫЕ', ['kid_boy', 'kid_girl', 'schoolkid', 'kid_hood', 'grandpa', 'grandma', '@dog', '@cat']],
  ['ПРОФЕССИИ', ['detective', 'cop', 'soldier', 'scientist', 'doctor', 'nurse', 'worker', 'courier', 'chef', 'boss', 'ceo_f', 'athlete', 'artist', 'rocker', 'astronaut']]];
const SMALL = n => /^kid|^@/.test(n) ? 1 : 0;   // дети и животные — в первый ряд, иначе их закроют взрослые
const GROUPS = []; ALL.forEach(([t, n]) => { for (let i = 0; i < n.length; i += 6) GROUPS.push([t, n.slice(i, i + 6).sort((a, b) => SMALL(a) - SMALL(b))]); });
const worlds = {};
GROUPS.forEach(([title, names], g) => {
  worlds['g' + g] = GL => {
    const S = stage(GL, 'office', { fov: 40, shadowBox: 5 }); S.scene.background = new THREE.Color('#141A22');
    floor(S.scene, mat('#20262E', 0.9)); const items = [];
    const back = names.length > 3 ? Math.ceil(names.length / 2) : 0;            // два ряда: задний на подиуме
    if (back) { const pod = new THREE.Mesh(new THREE.BoxGeometry(6, 0.45, 1.4), mat('#2A313B', 0.8)); pod.position.set(0, 0.225, -1.5); pod.receiveShadow = true; S.scene.add(pod); }
    names.forEach((n, i) => { const row = back && i < back ? 1 : 0, k = row ? i : i - back, cnt = row ? back : names.length - back;
      const x = (k - (cnt - 1) / 2) * 0.72, z = row ? -1.3 : 0, y = row ? 0.45 : 0;
      const p = n[0] === '@' ? animal(n.slice(1)) : cast(n); p.root.position.set(x, y, z); S.scene.add(p.root); items.push({ n: n.replace('@', ''), p, x, y, z, i }); });
    return { scene: S.scene, camera: S.camera, items, title };
  };
});
worlds.street = GL => { const S = stage(GL, 'warm', { fov: 36, shadowBox: 7 }); S.scene.background = new THREE.Color('#2A2420'); floor(S.scene, mat('#4A4038', 0.9));
  const c = crowd(S.scene, { n: 28, area: [-4, 4, -7, -1.2], seed: 3, mode: 'mixed' }); const hero = cast('watcher'); hero.root.position.set(-0.3, 0, 0.5); S.scene.add(hero.root);
  const dog = animal('dog'); dog.root.position.set(0.4, 0, 0.7); S.scene.add(dog.root); return { scene: S.scene, camera: S.camera, c, hero, dog }; };

const label = w => { const v = new THREE.Vector3(); for (const it of w.items) { v.set(it.x, it.z < 0 ? it.y + 2.05 : it.y - 0.08, it.z + 0.3).project(w.camera); const sx = (v.x + 1) / 2 * W, sy = (1 - v.y) / 2 * H - (it.z < 0 ? 50 : 0);
  txt(it.n, sx, sy + 30, { size: 26, font: 'mono', weight: 700, align: 'center', color: '#F2EFE8' }); } };
const shots = GROUPS.map(([title], g) => ({ d: 3, cam: false, bar: title, gl: { world: 'g' + g, update(w, lt) {
    w.items.forEach(it => { if (it.p.kind) it.p.pose({ t: lt, wag: true, walk: undefined }); else it.p.pose(mix(it.i % 3 === 0 ? POSE.wave(1, lt) : POSE.stand(), { blink: blinkAt(lt, it.i), yaw: 0.3 * Math.sin(lt + it.i) }));
      it.p.root.rotation.y = 0.35 * Math.sin(lt * 0.6); });
    camPath(w.camera, lt, [[0, { pos: [0, 1.7, 5.0], at: [0, 1.05, -0.6] }], [3, { pos: [0.3, 1.7, 4.9], at: [0, 1.05, -0.6] }]]); } },
  draw() { label(GL.worlds['g' + g]); }, hud(p, lt) { txt(title, W / 2, 1700, { size: 80, weight: 700, align: 'center', color: '#5FD3F0' }); } }));
// толпа + стили: один и тот же кадр в разных стилях (toon — только на весь ролик, его проверяют флагом --style toon)
['default', 'noir', 'film', 'neon', 'cold', 'pastel'].forEach(st => shots.push({ d: 1.5, cam: false, style: st, bar: 'СТИЛЬ: ' + st, gl: { world: 'street', update(w, lt) {
  w.c.update(lt); w.hero.pose({ blink: blinkAt(lt) }); w.dog.root.rotation.y = -0.6; w.dog.pose({ t: lt, wag: true });
  camPath(w.camera, lt, [[0, { pos: [1.0, 2.0, 6.2], at: [0, 1.0, -1.8] }], [1.5, { pos: [1.1, 2.0, 6.1], at: [0, 1.0, -1.8] }]]); } },
  hud() { txt(st.toUpperCase(), W / 2, 1700, { size: 90, weight: 700, align: 'center', color: '#FFFFFF' }); } }));

run({ title: 'castsheet', fps: 30, shots, worlds, bar: { tag: 'ПЕРСОНАЖИ' }, narr: [], audio: { mood: 'warm' } });
