// Петля без слов: золотое сечение в подсолнухе. Хук — взрыв 500 семечек по золотому углу. «А если угол другой?» → лучи и дыры.
// 137,5° = 360°/φ² → проявляются 21 и 34 спирали (Фибоначчи) → φ = (1 + √5)/2. В конце семечки втягиваются в центр.
import * as K from '../../kit.js';
const { C, M, T, seg, bump } = K, D = 27, N = 520, O = [540, 1080], GA = 360 / ((1 + Math.sqrt(5)) / 2) ** 2;   // 137,507…°
const MOV = [[2.8, 3.9, GA, 120], [4.8, 5.9, 120, 135.2], [6.7, 7.9, 135.2, GA]];   // смена узора: семечки переезжают из узора в узор (без мерцания промежуточных углов)
const angNow = t => { for (const [t0, t1, a0, a1] of MOV) { if (t < t0) return [a0, a0, 0]; if (t < t1) { const k = K.eIO((t - t0) / (t1 - t0)); return [a0, a1, k]; } } return [GA, GA, 0]; };
K.film({ d: D, bloom: 0.35, title: 'Золотой угол',
  sfx: [[0.0, 'boom', 0.8], [0.05, 'whoosh', 0.6], [0.3, 'rise', 0.5, 1.6], [2.8, 'slide', 0.5, 1.1], [4.0, 'thud', 0.6], [5.0, 'slide', 0.5, 0.9], [6.0, 'thud', 0.5], [6.8, 'slide', 0.5, 1.1],
    [8.0, 'ding', 0.7], [9.0, 'draw', 0.4, 1.0], [11.6, 'whoosh', 0.4], [12.0, 'pop', 0.6], [14.4, 'whoosh', 0.4], [14.8, 'pop', 0.6], [16.6, 'slide', 0.5], [19.4, 'slide', 0.5], [20.4, 'ding', 0.7], [24.4, 'whoosh', 0.5], [25.6, 'snap', 0.5]],
  draw(t) {
    const [a0, a1, mk] = angNow(t), a = K.lerp(a0, a1, mk), A0 = a0 * Math.PI / 180, A1 = a1 * Math.PI / 180, spin = K.TAU * K.ph(t, 1) * 0.25 + 0.6 * (1 - K.eOut(K.clamp(t / 2.2)));      // вращение + закрутка при взрыве
    const grow = K.eOut(K.clamp(t / 1.3)), implode = seg(t, 24.4, 26.2, K.eIn), R = 420 * (1 - implode * 0.98);
    const c21 = seg(t, 11.6, 12.2) * (1 - seg(t, 14.4, 15.0)), c34 = seg(t, 14.4, 15.0) * (1 - seg(t, 17.0, 17.8));
    const bad = K.clamp(Math.abs(a - GA) / 4);                                                         // насколько угол «не тот»
    K.halo(O[0], O[1], 120 + 60 * bump(t, 0, 0.8), C.gold, 0.35 + 0.4 * implode);
    for (let i = 1; i <= N; i++) { const born = i / N * 1.2; if (t < born) break;
      const k = K.clamp((t - born) / 0.25), r = R * Math.sqrt(i / N) * grow, tw = spin - implode * 3.0;
      const x = O[0] + r * K.lerp(Math.cos(i * A0 + tw), Math.cos(i * A1 + tw), mk), y = O[1] + r * K.lerp(Math.sin(i * A0 + tw), Math.sin(i * A1 + tw), mk), sz = (3.5 + 9 * Math.sqrt(i / N)) * (0.4 + 0.6 * k) * (1 - implode * 0.6);
      let col = K.hue(0.11 + 0.05 * Math.sqrt(i / N), 85, 58 + 14 * (1 - i / N));                       // золото → оранжевый к краю
      if (bad > 0.3) col = K.hue(0.02, 70, 55 + 10 * (1 - i / N));
      if (c21 > 0.01) col = c21 > 0.5 ? K.hue((i % 21) / 21, 75, 62) : col; if (c34 > 0.01) col = c34 > 0.5 ? K.hue((i % 34) / 34, 75, 62) : col;
      K.dot(x, y, sz, col); }
    // большое число угла сверху — хук без звука
    const big = 1 + 0.18 * bump(t, 0.1, 0.7) + 0.1 * bump(t, 7.9, 0.8), angA = 1 - seg(t, 8.8, 9.2) + seg(t, 21.6, 22.2);
    M(a.toFixed(1).replace('.', ',') + '°', K.W / 2, 330, { size: 150 * big, italic: false, color: bad > 0.3 ? C.red : C.gold, alpha: angA });
    K.X.save(); K.X.globalAlpha = seg(t, 3.9, 4.2) * (1 - seg(t, 7.6, 8.0)); K.icon(bad > 0.3 ? 'cross' : 'check', K.W / 2 + 300, 330, 90, { c: bad > 0.3 ? C.red : C.green, w: 9 }); K.X.restore();
    // формулы: откуда угол → спирали Фибоначчи → φ
    const E1 = K.exChain(['frac{360°}{φ^{2}} ≈ 137,5°', 'frac{34}{21} ≈ 1,619', 'φ = frac{1 + √5}{2} ≈ 1,618'], [16.6, 19.4], 0.9, t, K.W / 2, 400, { size: 92, a: seg(t, 9.0, 9.8) * (1 - seg(t, 23.6, 24.4)) });
    if (t > 20.2) K.exBox(E1, 'ALL', C.gold, seg(t, 20.4, 21.0) * (1 - seg(t, 23.4, 23.8)), 16);
    M('21', O[0] - 300, O[1] - 470, { size: 110, italic: false, color: K.hue(0.55, 75, 65), alpha: seg(t, 12.0, 12.4) * (1 - seg(t, 17.0, 17.6)) });
    M('34', O[0] + 300, O[1] - 470, { size: 110, italic: false, color: K.hue(0.85, 75, 65), alpha: seg(t, 14.8, 15.2) * (1 - seg(t, 17.0, 17.6)) });
    M('спирали', K.W / 2, O[1] - 470, { size: 46, italic: false, color: C.dim, alpha: seg(t, 12.0, 12.4) * (1 - seg(t, 17.0, 17.6)) });
  } });
