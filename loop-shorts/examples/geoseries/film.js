// Петля без слов: 1/2 + 1/4 + 1/8 + … = 1. Квадрат 1×1 делится пополам снова и снова, камера ныряет в угол — деление бесконечно.
import * as K from '../../kit.js';
const { C, seg, bump } = K, D = 26, S = 620, X0 = (K.W - S) / 2, Y0 = 760, N = 16;
const COL = [C.indigo, C.pink, C.blue, C.yel, C.teal, C.violet, C.orange, C.green], INK = ['#E8E4FF', '#2A0A12', '#0A2A40', '#2A2200', '#032420', '#140A3A', '#2A1200', '#032A1A'];
// куски: чётный — левая половина остатка, нечётный — верхняя половина; остаток сжимается к точке LIM
const P = []; { let x = 0, y = 0, w = S, h = S; for (let i = 0; i < N + 14; i++) { if (i % 2 === 0) { P.push([x, y, w / 2, h, 0]); x += w / 2; w /= 2; } else { P.push([x, y, w, h / 2, 1]); y += h / 2; h /= 2; } } }
const LIM = [X0 + P[N + 13][0], Y0 + P[N + 13][1]];
const T0 = i => i < 5 ? 1.2 + i * 1.3 : 7.7 + (i - 5) * 0.5 + (i > 9 ? (i - 9) * 0.1 : 0);    // когда появляется кусок i
const STEPS = ['frac{1}{2}', 'frac{1}{2} + frac{1}{4}', 'frac{1}{2} + frac{1}{4} + frac{1}{8}', 'frac{1}{2} + frac{1}{4} + frac{1}{8} + frac{1}{16}', 'frac{1}{2} + frac{1}{4} + frac{1}{8} + frac{1}{16} + …', 'frac{1}{2} + frac{1}{4} + frac{1}{8} + frac{1}{16} + … = 1'];
const MK = [T0(1), T0(2), T0(3), T0(5), 17.4];
K.film({ d: D, xfade: 1.4, title: '1/2 + 1/4 + … = 1',
  sfx: [[0.3, 'pop', 0.4], ...Array.from({ length: 12 }, (_, i) => [T0(i), i < 5 ? 'snap' : 'click', i < 5 ? 0.6 : 0.4]), [10.6, 'whoosh', 0.4], [11.2, 'rise', 0.4, 2.4], [14.6, 'whoosh', 0.4], [17.4, 'slide', 0.5], [18.4, 'ding', 0.7], [20.0, 'rise', 0.3, 1.6]],
  draw(t) {
    // камера: ныряем в угол, где деление продолжается
    const zk = seg(t, 10.6, 13.6, K.eIO) * (1 - seg(t, 14.6, 16.4, K.eIO)), z = 1 + 9 * zk;     // угол, куда сходятся куски, уезжает к краю кадра — экран заполнен
    K.X.save(); K.X.translate(K.lerp(LIM[0], 960, zk), K.lerp(LIM[1], 1640, zk)); K.X.scale(z, z); K.X.translate(-LIM[0], -LIM[1]);
    P.forEach(([x, y, w, h, dir], i) => { const t0 = i < N ? T0(i) : 11.2 + (i - N) * 0.18; const k = seg(t, t0, t0 + 0.55, K.eBack); if (k <= 0.001) return;
      const ww = dir ? w : w * k, hh = dir ? h * k : h, wave = bump(t, 19.6 + i * 0.08, 0.7);
      K.box(X0 + x, Y0 + y, ww, hh, { fill: COL[i % 8], fa: 0.92, c: wave > 0.05 ? C.yel : '#000', w: (wave > 0.05 ? 5 : 2.5) / z });
      if (i < 5) K.drawEx(K.ex(`frac{1}{${2 ** (i + 1)}}`, X0 + x + w / 2, Y0 + y + h / 2, { size: Math.min(w, h) * 0.34 }), { a: K.clamp(k * 2 - 1), color: INK[i % 8] }); });
    K.box(X0, Y0, S, S, { c: C.ink, w: 3 / z });                                                    // квадрат 1×1 стоит с первого кадра
    K.X.restore();
    // стороны квадрата = 1
    const br = 1 - seg(t, 10.4, 10.8) + seg(t, 16.0, 16.6);
    K.brace([X0, Y0 + S + 18], [X0 + S, Y0 + S + 18], '1', { c: C.dim, lc: C.ink }, br, -1);
    K.brace([X0 + S + 18, Y0], [X0 + S + 18, Y0 + S], '1', { c: C.dim, lc: C.ink }, br, 1);
    // формула сверху: каждый новый кусок добавляет слагаемое
    const fz = 1 - seg(t, 10.4, 11.0) + seg(t, 15.8, 16.6), E = K.exChain(STEPS, MK, 0.8, t, K.W / 2, 400, { size: 104, a: seg(t, T0(0) + 0.2, T0(0) + 0.8) * fz });
    const fin = seg(t, 18.2, 18.8); if (fin > 0) K.exBox(E, 'ALL', C.yel, fin, 16);
    K.M('S = 1 · 1 = 1', K.W / 2, Y0 + S + 140, { size: 56, color: C.yel, alpha: seg(t, 18.4, 19.0) });
  } });
