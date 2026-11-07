// Пример-проверка движка (≈11 с): 3D-стол с делом под лампой, зал с идущим человеком в профиль,
// 2D-счётчик, двое за мониторами. Копируй папку в projects/<slug>/ и меняй только этот файл.
import { run, THREE, W, H, txt, rich, rglow, bokeh, dust, spotCone, vgrad, camPath, keys, ease, eOut, back, clamp, lerp, inv } from '../engine/core.js';
import { stage, spot, mat, TEX, PROP, place, screen, room, cityWindow, motes, floor } from '../engine/stage3d.js';
import { person, POSE, mix, walkTo, blinkAt, SKIN, HAIRC } from '../engine/cast3d.js';

const P = { bg: '#07090D', ink: '#F2EFE8', acc: '#FF8A1F', cyan: '#5FE3D0', red: '#E5484D' };

// ---------- миры: строятся один раз ----------
const worlds = {
  desk(GL) {           // стол следователя, лампа, папка, бумаги
    const S = stage(GL, 'noir', { fov: 30, shadowBox: 1.5 });
    room(S.scene, 6, 6, 3.2, mat('#2A2E36', 0.9), mat('#1E1C1A', 0.8, 0, { map: TEX.wood('#3A2A1E') }));
    const desk = place(PROP.desk(1.8, 0.9), [0, 0, 0]); S.scene.add(desk);
    const folder = place(PROP.folder('ДЕЛО 07', '#A8824E'), [0.05, 0.78, 0.05], 0.12); S.scene.add(folder);
    const p1 = place(PROP.paper(18, 'СЕКРЕТНО'), [-0.32, 0.781, 0.12], -0.3); S.scene.add(p1);
    const p2 = place(PROP.paper(12), [0.38, 0.781, -0.1], 0.4); S.scene.add(p2);
    S.scene.add(place(PROP.mug(), [0.62, 0.775, 0.2])); S.scene.add(place(PROP.usb(), [0.25, 0.783, 0.22], 0.7));
    spot(S.scene, [0, 2.6, 0.2], [0, 0.78, 0], '#FFD7A0', 16, 0.34, 0.05); S.key.intensity = 0.6; S.hemi.intensity = 0.15;
    const m = motes(S.scene, 220, [1.6, 2.4, 1.2]);
    return { scene: S.scene, camera: S.camera, folder, m };
  },
  hall(GL) {           // зал с центрифугами, человек идёт поперёк кадра
    const S = stage(GL, 'lab', { fov: 34, shadowBox: 6 });
    floor(S.scene, mat('#2A3236', 0.7, 0.1, { map: TEX.tiles('#262E33') }));
    for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) S.scene.add(place(PROP.centrifuge(), [-4 + c * 1.0, 0, -1.5 - r * 1.2]));
    spot(S.scene, [0, 6, 1], [0, 0, -1], '#E6FBFF', 30, 0.6, 0.04);
    const man = person({ sex: 'm', hairStyle: 'sidepart', top: 'labcoat', topColor: '#3A6B8A', skin: SKIN.tan, hair: HAIRC.dark, glasses: true });
    S.scene.add(man.root);
    return { scene: S.scene, camera: S.camera, man };
  },
  ops(GL) {            // двое за мониторами, окно на ночной город
    const S = stage(GL, 'office', { fov: 36, shadowBox: 3 });
    room(S.scene, 7, 7, 3.2, mat('#262C36', 0.9), mat('#20242B', 0.8));
    cityWindow(S.scene, [0, 1.7, -3.45], 4.2, 1.9);
    const mk = c => screen(640, 400, (q, w, h, lt) => { q.fillStyle = '#071512'; q.fillRect(0, 0, w, h); q.fillStyle = c; q.font = '600 30px JBMono';
      for (let i = 0; i < 10; i++) q.fillText(('0x' + ((i * 7919 + Math.floor(lt * 6) * 131) % 65535).toString(16)).padEnd(9, ' ') + '  load ' + ((i * 37 + Math.floor(lt * 3)) % 97), 24, 46 + i * 36); });
    const s1 = mk('#4BE3B0'), s2 = mk('#FFB347');
    const people = [];
    [[-0.42, s1, { sex: 'm', hairStyle: 'crop', topColor: '#2F4A6B', glasses: true }], [0.45, s2, { sex: 'f', hairStyle: 'bob', topColor: '#7A3B4B', hair: HAIRC.black, skin: SKIN.light }]].forEach(([x, scr, o]) => {
      const d = place(PROP.desk(0.8, 0.7), [x, 0, -0.6]); S.scene.add(d); S.scene.add(place(PROP.monitor(scr), [x, 0.775, -0.85]));
      S.scene.add(place(PROP.keyboard(), [x, 0.78, -0.45])); S.scene.add(place(PROP.chair(), [x, 0, 0.1], Math.PI));
      const p = person(o); p.root.position.set(x, 0, 0.05); p.root.rotation.y = Math.PI; S.scene.add(p.root); people.push(p);
    });
    S.scene.add(place(PROP.lamp(), [-1.2, 0.775, -0.75]));
    return { scene: S.scene, camera: S.camera, people, scr: [s1, s2] };
  },
};

// ---------- планы ----------
const shots = [
  { d: 3.0, bar: 'АРХИВ', clock: '02:14:08', gl: { world: 'desk', update(w, lt, p) {
      camPath(w.camera, lt, [[0, { pos: [0, 2.7, 1.3], at: [0, 0.78, 0.0] }], [3.2, { pos: [0.2, 1.6, 1.05], at: [0, 0.8, 0] }]]);
      w.folder.userData.front.rotation.z = 2.9 * ease(inv(1.0, 2.2, lt)); w.m.userData.at(lt); } },
    sfx: [[0, 'hit'], [1.0, 'paper']], see: 'хук: дело под лампой открывается' },
  { d: 3.2, tin: 'whip', bar: 'ЦЕХ А', clock: '09:41:00', gl: { world: 'hall', update(w, lt) {
      const q = walkTo(w.man, lt, [-2.2, 0.6], [2.2, 0.6], 1.3); w.man.pose(mix(q, { blink: blinkAt(lt, 1) }));
      camPath(w.camera, lt, [[0, { pos: [-0.8, 1.4, 4.6], at: [-0.6, 1.1, 0] }], [3.4, { pos: [0.8, 1.5, 4.3], at: [0.7, 1.1, 0] }]]); } },
    sfx: [[0.3, 'spin', 0.5, 2.6]], see: 'человек идёт мимо рядов центрифуг — профиль' },
  { d: 2.4, tin: 'push', bar: 'ЦЕХ А · РОТОР 14', clock: '09:41:04', hit: true,
    draw(p, lt) { vgrad('#0A1214', '#05080A'); bokeh(lt, 18, ['#5FE3D0', '#FFB347'], 4, 0.22);
      const f = Math.round(lerp(1064, 1410, eOut(inv(0.2, 2.0, lt))));
      txt(f + ' Гц', W / 2, 1000, { size: 230, weight: 700, align: 'center', color: f > 1300 ? P.red : P.ink, glow: f > 1300 ? P.red : '#2FA898', glowR: 60 });
      txt('ЧАСТОТА РОТОРА', W / 2, 1100, { size: 40, font: 'mono', weight: 600, align: 'center', color: '#9FB3B6', ls: 4 }); },
    sfx: [[0.2, 'spin', 0.7, 2.0], [1.9, 'alarm', 0.6]], see: 'частота растёт до красной' },
  { d: 3.0, tin: 'match', bar: 'ПУЛЬТ', clock: '23:12:00', gl: { world: 'ops', update(w, lt) {
      w.people.forEach((p, i) => p.pose(mix(POSE.type(lt + i * 0.7), { blink: blinkAt(lt, i), yaw: i ? 0.25 * ease(inv(1.6, 2.1, lt)) : 0 })));
      w.scr.forEach(s => s.draw(lt));
      camPath(w.camera, lt, [[0, { pos: [-0.2, 1.75, 2.9], at: [0, 1.0, -0.4] }], [3, { pos: [0.25, 1.55, 2.4], at: [0.1, 1.0, -0.5] }]]); } },
    sfx: [[0.1, 'type', 1, 2.5]], see: 'двое за пультом, она оборачивается' },
];

run({
  title: 'engine-test', fps: 30, bg: P.bg, accent: P.acc, shots, worlds,
  bar: { tag: 'ДЕЛО #07' },
  narr: [[0, 'Представь: тебе на стол кладут *дело*, которого нет ни в одном архиве.'], [2, 'И первая строчка в нём — *частота* одного ротора.']],
  audio: { mood: 'tense', key: 'A', acts: [[0, 1], [3, 2], [6, 3], [9, 2]] },
});
