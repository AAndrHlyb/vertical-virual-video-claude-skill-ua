// Петля: золотой угол в подсолнухе — понятно и красиво. Крупно правило (поворот на 137,5°) → ускорение до 520 семечек →
// сравнение с 120° и 135° (пустоты) → 137,5° = 360°/φ² → одна спираль, потом 21 и 34 (Фибоначчи) → φ. В конце семечки втягиваются в центр.
import * as K from '../../kit.js';
const { C, M, T, seg, bump } = K, D = 32, N = 520, O = [540, 1110], R = 420, GA = 360 / ((1 + Math.sqrt(5)) / 2) ** 2;
const MOV = [[8.0, 9.0, GA, 120], [10.6, 11.6, 120, 135.2], [13.2, 14.2, 135.2, GA]];
const angNow = t => { for (const [t0, t1, a0, a1] of MOV) { if (t < t0) return [a0, a0, 0]; if (t < t1) return [a0, a1, K.eIO((t - t0) / (t1 - t0))]; } return [GA, GA, 0]; };
const born = i => i <= 6 ? (i === 1 ? -1 : 0.3 + (i - 1) * 0.55) : 3.6 + 2.6 * Math.sqrt((i - 6) / (N - 6));   // 6 семечек медленно, потом лавина
const count = t => t < 3.6 ? Math.min(6, 1 + Math.max(0, Math.floor((t - 0.3) / 0.55))) : 6 + (N - 6) * K.clamp((t - 3.6) / 2.6) ** 2;
const say = (s, t, t0, t1, y = 300, c = C.ink, size = 50) => T(s, K.W / 2, y, { size, weight: 500, color: c, alpha: seg(t, t0, t0 + 0.35) * (1 - seg(t, t1 - 0.35, t1)) });
K.film({ d: D, xfade: 0.8, bloom: 0.3, title: 'Золотой угол',
  sfx: [...[1, 2, 3, 4, 5, 6].map(i => [born(i), 'pop', 0.6]), [3.6, 'rise', 0.5, 2.6], [6.2, 'whoosh', 0.4], [8.0, 'slide', 0.5, 1.0], [9.0, 'thud', 0.6], [10.6, 'slide', 0.5, 1.0], [11.6, 'thud', 0.5], [13.2, 'slide', 0.5, 1.0], [14.2, 'ding', 0.6],
    [15.0, 'draw', 0.4, 1.0], [19.2, 'pop', 0.6], [20.6, 'whoosh', 0.4], [22.4, 'whoosh', 0.4], [24.2, 'click', 0.6], [25.6, 'slide', 0.5], [26.4, 'ding', 0.7], [29.0, 'whoosh', 0.5], [30.6, 'snap', 0.5]],
  draw(t) {
    const [a0, a1, mk] = angNow(t), a = K.lerp(a0, a1, mk), A0 = a0 * Math.PI / 180, A1 = a1 * Math.PI / 180, n = count(t);
    const z = K.lerp(5.5, 1, seg(t, 3.4, 6.4, K.eIO)) + 4.5 * seg(t, 30.0, 31.6, K.eIO), implode = seg(t, 29.0, 30.8, K.eIn), spin = 0.05 * Math.max(0, t - 6.5);
    const one = seg(t, 19.2, 19.6) * (1 - seg(t, 20.6, 21.0)), c21 = seg(t, 20.6, 21.0) * (1 - seg(t, 22.4, 22.8)), c34 = seg(t, 22.4, 22.8) * (1 - seg(t, 25.4, 26.0)), bad = K.clamp(Math.abs(a - GA) / 4);
    const pos = i => { const r = R * Math.sqrt(i / N) * (1 - implode * 0.985), tw = spin - implode * 3; return [O[0] + r * K.lerp(Math.cos(i * A0 + tw), Math.cos(i * A1 + tw), mk), O[1] + r * K.lerp(Math.sin(i * A0 + tw), Math.sin(i * A1 + tw), mk)]; };
    K.X.save(); K.X.translate(O[0], O[1]); K.X.scale(z, z); K.X.translate(-O[0], -O[1]);
    K.halo(O[0], O[1], (90 + 60 * z) / z, C.gold, 0.3);
    for (let i = 1; i <= n; i++) { const k = K.clamp((t - born(i)) / 0.25), [x, y] = pos(i), q = Math.sqrt(i / N), sz = (2.2 + 9 * q + (i <= 6 ? 2.2 * (1 - seg(t, 4.0, 6.4)) : 0)) * (0.3 + 0.7 * K.eOut(k)) * (1 - implode * 0.6) * (1 + 0.6 * one * (i % 21 === 8 ? 1 : 0));
      let col = K.hue(0.12 + 0.04 * q, 85, 60 + 12 * (1 - q)); if (bad > 0.3) col = K.hue(0.02, 70, 58);
      K.dot(x, y, sz, col);                                                                            // цвета перетекают плавно — поверх базового цвета
      if (one > 0.01) K.circ(x, y, sz, { fill: i % 21 === 8 ? '#FFE27A' : '#2A2418', fa: one * (i % 21 === 8 ? 1 : 0.8), w: 0 });
      if (c21 > 0.01) K.circ(x, y, sz, { fill: K.hue((i % 21) / 21, 75, 62), fa: c21, w: 0 }); if (c34 > 0.01) K.circ(x, y, sz, { fill: K.hue((i % 34) / 34, 75, 62), fa: c34, w: 0 }); }
    // рычаг и дуга поворота — видно правило «каждое новое семечко повёрнуто на 137,5°»
    const arm = seg(t, 0.8, 1.1) * (1 - seg(t, 3.6, 4.2)), ni = Math.min(6, Math.floor(n));
    if (arm > 0 && ni >= 2) { const p = pos(ni), pp = pos(ni - 1), ang0 = Math.atan2(pp[1] - O[1], pp[0] - O[0]), turn = K.clamp((t - born(ni)) / 0.35);
      K.line(O, p, { c: C.ink, w: 3 / z, a: arm }); K.line(O, pp, { c: C.ink, w: 2.5 / z, a: arm * 0.6, dash: [8 / z, 6 / z] });
      K.X.save(); K.X.globalAlpha = arm; K.X.strokeStyle = C.yel; K.X.lineWidth = 5 / z; K.X.beginPath(); K.X.arc(O[0], O[1], 34, ang0, ang0 + GA * Math.PI / 180 * turn); K.X.stroke(); K.X.restore(); }
    if (one > 0) { const sp = []; for (let i = 8; i <= N; i += 21) sp.push(pos(i)); K.path(sp, { c: C.gold, w: 4, glow: 16, a: one }, seg(t, 19.3, 20.2)); }   // линия через одну спираль
    K.X.restore();
    // подписи — одна строка о том, что происходит
    say('Каждое новое семечко — поворот на 137,5°', t, 0.0, 4.0, 300, C.ink, 52); M('137,5°', K.W / 2, 410, { size: 90, italic: false, color: C.yel, alpha: seg(t, 0.8, 1.2) * (1 - seg(t, 3.6, 4.0)) });
    say('…и чуть дальше от центра. Так растёт подсолнух', t, 4.0, 7.8, 300, C.ink, 48);
    M(a.toFixed(1).replace('.', ',') + '°', K.W / 2, 330, { size: 120, italic: false, color: bad > 0.3 ? C.red : C.green, alpha: seg(t, 7.8, 8.2) * (1 - seg(t, 14.6, 15.0)) });
    say('120° — 3 луча, между ними пустота', t, 9.0, 10.6, 460, C.red); say('135° — снова лучи и пустоты', t, 11.6, 13.2, 460, C.red); say('137,5° — пустот нет, семечки плотнее всего', t, 14.2, 15.4, 460, C.green, 44);
    if (t > 15.0 && t < 19.2) K.drawEx(K.ex('137,5° = frac{360°}{φ^{2}}', K.W / 2, 330, { size: 92 }), { write: seg(t, 15.0, 16.0), a: 1 - seg(t, 18.8, 19.2) });
    say('φ ≈ 1,618 — золотое сечение', t, 16.2, 19.2, 480, C.gold);
    say('Это одна спираль из семечек', t, 19.2, 20.6, 330, C.gold); say('Всего таких спиралей — 21', t, 20.6, 22.4, 330); say('В другую сторону — 34', t, 22.4, 24.2, 330);
    say('21 и 34 — соседние числа Фибоначчи', t, 24.2, 25.6, 330, C.ink, 46); M('34 : 21 ≈ 1,619 ≈ φ', K.W / 2, 430, { size: 64, italic: false, color: C.gold, alpha: seg(t, 24.4, 24.8) * (1 - seg(t, 25.2, 25.6)) });
    if (t > 25.4) { const E = K.ex('φ = frac{1 + √5}{2} ≈ 1,618', K.W / 2, 340, { size: 92 }), fa = seg(t, 25.6, 26.2) * (1 - seg(t, 28.8, 29.4));
      K.drawEx(E, { write: seg(t, 25.6, 26.4), a: fa }); K.exBox(E, 'ALL', C.gold, seg(t, 26.4, 27.0) * fa, 16); }
    say('золотое сечение', t, 26.6, 29.4, 480, C.gold);
  } });
