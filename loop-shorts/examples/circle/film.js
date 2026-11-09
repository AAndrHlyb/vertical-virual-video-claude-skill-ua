// Петля, подробно: площадь круга S = πr² (Архимед). 7 шагов с подписями: круг → длина окружности → 8 секторов → 16 → 32 → прямоугольник πr × r → вывод формулы.
import * as K from '../../kit.js';
const { C, M, seg } = K, D = 30, O = [540, 760], r = 230, x0 = K.W / 2 - Math.PI * r / 2, yT = 1080;
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
// сектор k из n: в круге (go=0) или в ряду (go=1); чётные — остриём вверх
function sec(n, k, go) { const Dl = K.TAU / n, s = Math.PI * r / (n / 2), up = k % 2 === 0, j = Math.floor(k / 2), p0 = -Math.PI / 2 + (k + 0.5) * Dl, p1 = up ? Math.PI / 2 : -Math.PI / 2;
  const a1 = up ? [x0 + s / 2 + j * s, yT] : [x0 + s + j * s, yT + r], phi = p0 + wrap(p1 - p0) * go;
  return [K.lerp(O[0], a1[0], go), K.lerp(O[1], a1[1], go), phi - Dl / 2, phi + Dl / 2, up ? C.blue : C.pink]; }
const row = (n, a, goF = () => 1) => { if (a > 0) for (let k = 0; k < n; k++) { const [x, y, a0, a1, c] = sec(n, k, goF(k)); K.sector(x, y, r, a0, a1, { fill: c, c: C.ink, w: n > 16 ? 1 : 2, a, fa: 0.92 }); } };
const STEPS = ['S = ?', 'S = frac{2@d π@p r@a}{2@e} · r@b', 'S = π@p r@a · r@b', 'S = π@p r@a ^{2@b}'];
K.film({ d: D, xfade: 1.2, title: 'Площадь круга',
  sfx: [[0.2, 'draw', 0.5, 1.4], [4.2, 'draw', 0.4, 1.2], [5.6, 'pop', 0.5], [7.4, 'draw', 0.4, 0.6], [8.2, 'slide', 0.5, 1.8], [10.2, 'snap', 0.7], [11.6, 'whoosh', 0.3], [13.4, 'whoosh', 0.3],
    [15.4, 'draw', 0.4, 0.8], [16.4, 'pop', 0.5], [17.2, 'pop', 0.5], [19.6, 'slide', 0.5], [21.2, 'slide', 0.5], [22.8, 'slide', 0.5], [24.0, 'ding', 0.7], [28.6, 'whoosh', 0.3]],
  draw(t) {
    const fade = 1;                                                             // в конце всё гаснет — петля с чистого листа
    K.X.save(); K.X.globalAlpha = fade;
    // формула сверху
    const E = K.exChain(STEPS, [19.4, 21.0, 22.6], 1.0, t, K.W / 2, 380, { size: 96 });
    if (t > 23.8) K.exBox(E, 'ALL', C.yel, seg(t, 23.9, 24.5), 18);
    // 1. круг рисуется, радиус
    const cut = seg(t, 7.4, 8.0);
    if (t < 10.2) { K.circ(O[0], O[1], r, { fill: cut < 1 ? C.blue : undefined, fa: (1 - cut) * seg(t, 1.2, 2.0), w: 0 }); row(8, cut, k => seg(t, 8.2 + k * 0.12, 9.2 + k * 0.12, K.eBack)); }
    K.circ(O[0], O[1], r, { c: C.ink, w: 3, a: 1 - seg(t, 8.2, 8.6) }, seg(t, 0.2, 1.4));
    const rr = seg(t, 1.6, 2.2) * (1 - seg(t, 7.0, 7.4));
    if (rr > 0) { K.line(O, [O[0] + r, O[1]], { c: C.ink, w: 4, a: rr }, rr); K.dot(O[0], O[1], 7, C.ink); M('r', O[0] + r / 2, O[1] - 32, { size: 58, alpha: rr }); }
    // 2. длина окружности 2πr
    const cl = seg(t, 4.2, 5.4) * (1 - seg(t, 7.0, 7.4));
    if (cl > 0) { K.circ(O[0], O[1], r + 14, { c: C.yel, w: 6, glow: 14, a: 1 - seg(t, 7.0, 7.4) }, seg(t, 4.2, 5.4)); M('C = 2πr', O[0], O[1] + r + 80, { size: 62, color: C.yel, alpha: seg(t, 5.4, 5.9) * (1 - seg(t, 7.0, 7.4)) }); }
    // 3–4. ряд из 8 → 16 → 32 секторов (края всё ровнее)
    const a8 = seg(t, 7.4, 8.0) * (1 - seg(t, 11.6, 12.2)), a16 = seg(t, 11.6, 12.2) * (1 - seg(t, 13.4, 14.0)), a32 = seg(t, 13.4, 14.0);
    if (t >= 10.2) row(8, a8); row(16, a16); row(32, a32);
    if (t > 11.4 && t < 15.5) K.T(['8', '16', '32'][t < 13.2 ? (t < 11.9 ? 0 : 1) : 2] + ' секторов', K.W / 2, yT + r + 90, { size: 52, color: C.dim });
    // 5. прямоугольник πr × r, скобки
    const rect = seg(t, 15.4, 16.2);
    if (rect > 0) { K.box(x0, yT, Math.PI * r, r, { c: C.yel, w: 4, dash: [16, 10] }, rect);
      K.brace([x0, yT - 14], [x0 + Math.PI * r, yT - 14], 'πr', { c: C.pink, lc: C.pink }, seg(t, 16.4, 17.0), 1);
      K.brace([x0 + Math.PI * r + 14, yT], [x0 + Math.PI * r + 14, yT + r], 'r', { c: C.ink }, seg(t, 17.2, 17.8), 1);
      M('= ½ · 2πr', K.W / 2 + 150, yT - 104, { size: 46, color: C.dim, alpha: seg(t, 17.6, 18.2) }); }
    K.X.restore();
    // подписи шагов
    K.caption(1, 'Возьмём круг радиуса r', t, 0.3, 3.9); K.caption(2, 'Длина его окружности — 2πr', t, 4.2, 7.2);
    K.caption(3, 'Разрежем круг на секторы и разложим их зубцами', t, 7.4, 11.4); K.caption(4, 'Чем больше секторов — тем ровнее края', t, 11.6, 15.2);
    K.caption(5, 'Получается прямоугольник: верх — половина окружности, высота — радиус', t, 15.4, 19.2);
    K.caption(6, 'Площадь прямоугольника = длина × высота', t, 19.4, 23.8); K.caption(0, 'Площадь круга = πr²', t, 24.0, 28.6, { tc: C.yel, size: 60 });
  } });
