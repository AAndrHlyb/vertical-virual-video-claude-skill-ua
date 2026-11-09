// Каталог элементов: node ../vertical-story-film-ua/engine/render.mjs examples/kit --stills 1,3
import * as K from '../../kit.js';
const { C, T, M, fig, POSE, prop, icon } = K;
K.film({ d: 4, bloom: 0.25, draw(t) {
  // ряд 1: люди
  const g1 = 330, names = ['stand', 'walk', 'run', 'sit', 'pour', 'lift', 'think', 'cheer'];
  names.forEach((n, i) => { const x = 70 + i * 130, P = n === 'walk' || n === 'run' ? POSE[n](K.ph(t, 2)) : n === 'lift' ? POSE.lift(0.5 + 0.5 * K.osc(t, 2)) : POSE[n](t);
    fig(x, g1, 170, P); T(n, x, g1 + 30, { size: 24, color: C.dim }); });
  const g2 = 610, n2 = ['slump', 'push', 'phone', 'read', 'climb', 'sleep', 'wave', 'bow'];
  n2.forEach((n, i) => { const x = 70 + i * 130, P = ['push', 'climb'].includes(n) ? POSE[n](K.ph(t, 2)) : n === 'bow' ? POSE.bow(0.7) : POSE[n](t);
    fig(x, g2, 170, P, { dir: n === 'sleep' ? 1 : 1 }); T(n, x, g2 + 30, { size: 24, color: C.dim }); });
  K.ground(g2 + 4, { w: 2 });
  // ряд 3: огонь, индикаторы
  K.flame(140, 900, 50, t, 1); K.flame(300, 900, 50, t, 0.4, 2); K.flame(440, 900, 50, t, 0, 3);
  K.bar(700, 760, 260, 0.8, C.green, 'Discipline'); K.bar(700, 880, 260, 0.25, C.red, 'Motivation');
  K.ring(960, 820, 70, 0.5 + 0.5 * K.osc(t), C.green);
  // ряд 4: реквизит
  const y4 = 1150; prop.can(80, y4, 50, -0.4); prop.cup(200, y4); prop.book(320, y4 + 30); prop.phone(430, y4); prop.dumbbell(540, y4); prop.rock(680, y4 + 50, 110);
  prop.plant(820, y4 + 70, 150, 0.5 + 0.5 * K.osc(t)); prop.candle(930, y4 + 70, 100, t); prop.clock(1020, y4, 45, t);
  const y5 = 1360; prop.hourglass(90, y5, 140, K.ph(t)); prop.stairs(180, y5 + 70, 4, 50, 35); prop.mountain(520, y5 + 70, 220, 160); prop.flag(660, y5 + 70, 70, t); prop.trophy(800, y5 + 70, 110); prop.coin(910, y5); prop.bulb(1010, y5, 60, 1);
  // ряд 5: значки
  ['check', 'cross', 'heart', 'star', 'bolt', 'target', 'lock', 'sun', 'moon', 'plus', 'eq', 'arrowR', 'loop'].forEach((n, i) => icon(n, 60 + i * 80, 1560, 56, { c: i % 3 ? C.ink : C.gold }));
  // ряд 6: геометрия и текст
  const tri = K.rtri([80, 1820], 160, 120, -Math.PI / 2); K.poly(tri, { fill: C.pink, c: C.ink, w: 3 }); K.rightMark(...tri);
  K.formula([['a²', 0, C.violet], [' + ', 0], ['b²', 0, C.blue], [' = ', 0], ['c²', 0, C.yel]], 480, 1720, t, { size: 64 });
  K.chain(480, 1820, 7, 1 + Math.floor(K.ph(t) * 7)); K.checkbox(900, 1760, 70, K.seg(t, 0.5, 1.2)); K.ripple(1000, 1760, t, 3, 70);
  K.counter(1234567 * K.seg(t, 0, 3), 840, 1870, { size: 50 });
} });
