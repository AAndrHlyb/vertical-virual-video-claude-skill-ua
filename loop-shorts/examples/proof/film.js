// Петля: сумма углов треугольника = 180°. Углы при A и B «переезжают» к вершине C и складываются в развёрнутый угол.
import * as K from '../../kit.js';
const { C, M, seg, ang } = K;
const A = [230, 1480], B = [850, 1480], Cc = [590, 980], r = 120;
const W_ = [   // [вершина, угол от, угол до, цвет, подпись, когда едет туда, когда обратно]
  [A, ang(A, B), ang(A, Cc), C.blue, 'α', [1.0, 2.4], [8.0, 9.2]],
  [B, ang(B, Cc), ang(B, A) - K.TAU, C.pink, 'β', [2.2, 3.6], [8.6, 9.8]],
];
K.film({ d: 12, title: 'Сумма углов треугольника', sfx: [[0.1, 'draw', 0.5, 0.8], [1.0, 'slide'], [2.4, 'snap'], [2.2, 'slide'], [3.6, 'snap'], [3.9, 'ding', 0.6], [4.6, 'pop', 0.5], [5.2, 'pop', 0.5], [8.0, 'slide'], [8.6, 'slide'], [9.8, 'snap', 0.6], [10.2, 'draw', 0.4, 0.6]],
  draw(t) {
    const par = seg(t, 0.1, 0.9) * (1 - seg(t, 10.2, 10.9));                      // прямая через C параллельно AB
    K.line([Cc[0] - 420 * par, Cc[1]], [Cc[0] + 420 * par, Cc[1]], { c: C.dim, w: 2, dash: [14, 10] });
    K.sector(Cc[0], Cc[1], r, ang(Cc, B), ang(Cc, A), { fill: C.yel, w: 0 }); M('γ', Cc[0], Cc[1] + r * 0.62, { size: 54, color: '#3A2E00' });
    W_.forEach(([P, a0, a1, c, lab, go, back]) => {                                  // угол едет в C и поворачивается на 180° (накрест лежащие углы)
      const k = seg(t, ...go) * (1 - seg(t, ...back)), x = K.lerp(P[0], Cc[0], k), y = K.lerp(P[1], Cc[1], k), turn = Math.PI * k;
      if (k > 0) K.sector(P[0], P[1], r, a0, a1, { fill: c, fa: 0.25, w: 0 });         // след на старом месте
      K.sector(x, y, r, a0 + turn, a1 + turn, { fill: c, w: 0 }); const am = (a0 + a1) / 2 + turn; M(lab, x + Math.cos(am) * r * 0.62, y + Math.sin(am) * r * 0.62, { size: 54, color: '#111' }); });
    K.poly([A, B, Cc], { c: C.ink, w: 3 });
    const st = seg(t, 3.7, 4.3) * (1 - seg(t, 7.8, 8.2));                             // развёрнутый угол
    K.circ(Cc[0], Cc[1], r + 26, { c: C.ink, w: 3, glow: 12 }, st * 0.5, 0);
    M('180°', Cc[0], Cc[1] - r - 80, { size: 70, alpha: st });
    K.formula([['α', 4.6, C.blue], [' + ', 4.9], ['β', 4.9, C.pink], [' + ', 5.2], ['γ', 5.2, C.yel], [' = 180°', 5.6]], K.W / 2, 560, t, { size: 92, a: 1 - seg(t, 9.6, 10.4) });
    K.T('сумма углов треугольника', K.W / 2, 1700, { size: 40, color: C.dim, weight: 400, font: 'serif' });
  } });
