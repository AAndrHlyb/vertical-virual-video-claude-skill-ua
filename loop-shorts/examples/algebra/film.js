// Петля в стиле Manim: √50 + √8 = ? Сначала неверный путь (√58, зачёркнуто), потом верный — до 7√2.
import * as K from '../../kit.js';
const { C, seg } = K, X0 = K.W / 2, Y0 = 900, o = { size: 112 };
const S = ['√{50@a} + √{8@b}', '√{25@a × 2} + √{8@b}', '√{5@a^{2@s} × 2} + √{8@b}', '5@a√2 + √{8@b}', '5@a√2 + √{4@b × 2}', '5@a√2 + 2@b√2', '(5@a + 2@b)√2', '7√2'];
const M0 = [8.0, 9.5, 11.0, 12.8, 14.3, 15.8, 17.3];                    // начало каждого верного перехода (длина 1 с)
const box = (E, keys, c, t0, t1) => { const k = seg(t, t0, t0 + 0.4) * (1 - seg(t, t1, t1 + 0.2)); if (k > 0) K.exBox(E, keys, c, k); };
let t = 0;
K.film({ d: 26, title: '√50 + √8',
  sfx: [[0.1, 'draw', 0.5, 1.4], [2.0, 'pop', 0.5], [2.8, 'slide'], [4.2, 'thud', 0.8], [4.3, 'click'], [5.2, 'slide', 0.5], [7.4, 'pop', 0.5],
    ...M0.map(m => [m, 'slide', 0.6]), [18.4, 'ding', 0.7], [24.2, 'whoosh', 0.3]],
  draw(tt) { t = tt; const a = 1 - seg(t, 23.8, 25.2);                     // в конце всё гаснет — петля начинается с пустого экрана
    // строка «= ?»
    K.drawEx(K.ex('= ?', X0, Y0 + 170, { size: 80 }), { write: seg(t, 0.8, 1.6, K.eOut), a: a * (1 - seg(t, 7.2, 7.8)), color: C.dim });
    if (t < 7.6) {                                                           // неверный путь: сложить под одним корнем
      const wrongK = seg(t, 2.8, 3.8) * (1 - seg(t, 5.2, 6.2));
      if (wrongK <= 0) { const E = K.ex(S[0], X0, Y0, o); K.drawEx(E, { write: seg(t, 0.1, 1.5, K.eOut), a }); box(E, '√#0', C.red, 2.0, 2.7); box(E, '√#1', C.red, 2.0, 2.7); box(E, 'a', C.green, 7.4, 8.0); return; }
      K.morphEx(S[0], '√{58@a}', wrongK, X0, Y0, o);
      if (wrongK >= 1) { const E = K.ex('√{58@a}', X0, Y0, o); K.exBox(E, 'ALL', C.red, seg(t, 3.8, 4.1)); K.exStrike(E, 'ALL', C.red, seg(t, 4.2, 4.7)); }
      return; }
    const E = K.exChain(S, M0, 1.0, t, X0, Y0, { ...o, a });
    box(E, 'a', C.green, 7.4, 8.0); box(E, 'a', C.green, 9.0, 9.5); box(E, 'b', C.green, 13.8, 14.3); box(E, ['a', 'b'], C.green, 15.3, 15.8);
    if (t > 18.3) K.frameBox(X0, Y0, E.w + 80, 200, seg(t, 18.3, 18.9) * a, { c: C.ink, w: 3 });
    K.drawEx(K.ex('√50 + √8', X0, Y0 - 300, { size: 64 }), { write: seg(t, 19.2, 20.2), a: a * 0.6, color: C.dim });
  } });
