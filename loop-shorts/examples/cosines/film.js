// Петля без подписей: теорема косинусов из Пифагора. Треугольник → высота → квадраты → c² = (a − b cos θ)² + (b sin θ)² → a² + b² − 2ab cos θ → θ = 90° даёт Пифагора.
import * as K from '../../kit.js';
const { C, M, seg, bump } = K, D = 34, P = [210, 1180], A_ = 540, B_ = 290, deg = Math.PI / 180, FY = 380, FS = { size: 62 };
const TH = [[0, 55], [21.6, 55], [23.0, 90], [26.0, 90], [27.2, 55], [D, 55]];
const S = ['c^{2@s0} = (a − b cos θ)^{2@s1} + (b sin θ)^{2@s2}', 'c^{2@s0} = a^{2} − 2ab cos θ + b^{2} cos^{2} θ + b^{2} sin^{2} θ', 'c^{2@s0} = a^{2} − 2ab cos θ + b^{2}(cos^{2} θ + sin^{2} θ)',
  'c^{2@s0} = a^{2} − 2ab cos θ + b^{2} · 1@one', 'c^{2@s0} = a^{2} + b^{2} − 2ab cos@z θ', 'c^{2@s0} = a^{2} + b^{2} − 2ab · 0@z', 'c^{2@s0} = a^{2} + b^{2}', 'c^{2@s0} = a^{2} + b^{2} − 2ab cos@z θ'];
const MK = [16.0, 17.6, 19.0, 20.2, 23.2, 24.6, 26.6];
const term = (E, o, c, sup) => { const a = E.items.find(q => q.key === o), b = E.items.find(q => q.key === c); return a && b ? (q => (q.x >= a.x && q.x <= b.x && q.y === a.y) || q.key === sup) : null; };
K.film({ d: D, xfade: 1.2, title: 'Теорема косинусов',
  sfx: [ [3.0, 'draw', 0.4, 0.8], [5.2, 'pop', 0.5], [5.8, 'pop', 0.5], [8.6, 'rise', 0.4, 1.8], [10.4, 'snap', 0.6], [13.0, 'draw', 0.5, 1.2],
    [14.4, 'click'], [14.9, 'click'], [15.4, 'click'], ...MK.map(m => [m, 'slide', 0.5]), [20.2, 'pop', 0.5], [21.4, 'ding', 0.6], [21.8, 'rise', 0.4, 1.2], [23.2, 'snap', 0.6], [25.0, 'ding', 0.5], [27.2, 'slide', 0.4], [28.4, 'ding', 0.7]],
  draw(t) {
    const th = K.tl(t, TH) * deg, R = [P[0] + B_ * Math.cos(th), P[1] - B_ * Math.sin(th)], Q = [P[0] + A_, P[1]], H = [R[0], P[1]];
    // заливка двух прямоугольных треугольников (после высоты)
    const fill = seg(t, 5.0, 5.8);
    K.poly([P, H, R], { fill: C.yel, fa: 0.75 * fill, w: 0 }); K.poly([H, Q, R], { fill: C.blue, fa: 0.75 * fill, w: 0 });
    // квадраты на сторонах правого треугольника (Пифагор для HQR)
    const sq = (p1, p2, k, col, lab) => { if (k <= 0) return; const v = [p2[0] - p1[0], p2[1] - p1[1]], n = [v[1], -v[0]];
      const pts = [p1, p2, [p2[0] + n[0] * k, p2[1] + n[1] * k], [p1[0] + n[0] * k, p1[1] + n[1] * k]]; K.poly(pts, { fill: col, fa: 0.8, c: C.ink, w: 2 }); const m = K.ctr(pts); M(lab, m[0], m[1], { size: 40, alpha: K.clamp(k * 2 - 1), color: '#fff' }); };
    const sqA = 1 - 0.65 * seg(t, 15.8, 16.6), sqH = 1 - seg(t, 21.0, 21.6), pul = id => 1 + 0.12 * bump(t, { c: 14.4, a: 14.9, b: 15.4 }[id], 0.6);
    K.X.save(); K.X.globalAlpha = sqA * sqH;
    sq(R, Q, seg(t, 8.6, 9.4, K.eBack) * pul('c'), C.indigo, 'c²'); sq(Q, H, seg(t, 9.2, 10.0, K.eBack) * pul('a'), C.teal, '(a − b cos θ)²'); sq(H, R, seg(t, 9.8, 10.6, K.eBack) * pul('b'), C.pink, '(b sin θ)²');
    K.X.restore();
    // треугольник, высота, отметки
    K.poly([P, Q, R], { c: C.ink, w: 3 });                                        // треугольник стоит с первого кадра — стык петли без пустого кадра
    const hk = seg(t, 3.0, 3.8); K.line(R, H, { c: C.ink, w: 2.5, dash: [12, 9], a: hk }, hk); if (hk > 0.9 && th < 89 * deg) K.rightMark(H, Q, R, 22, { c: C.ink, w: 2 });
    K.angleArc(P, Q, R, 56, { c: C.yel, w: 3 }); M('θ', P[0] + 82 * Math.cos(th / 2), P[1] - 82 * Math.sin(th / 2), { size: 44, color: C.yel });
    const L1 = 1; M('b', (P[0] + R[0]) / 2 - 34, (P[1] + R[1]) / 2 - 10, { size: 50, alpha: L1 * (1 - seg(t, 9.6, 10.0)) + seg(t, 21.2, 21.8) }); M('c', (R[0] + Q[0]) / 2 + 30, (R[1] + Q[1]) / 2 - 24, { size: 50, alpha: L1 * (1 - seg(t, 8.6, 9.0)) });
    M('a', (P[0] + Q[0]) / 2, P[1] + 50, { size: 50, alpha: L1 * (1 - seg(t, 5.0, 5.4)) + seg(t, 21.2, 21.8) });
    const br = seg(t, 5.2, 5.8) * (1 - seg(t, 21.0, 21.4)), br2 = seg(t, 5.8, 6.4) * (1 - seg(t, 21.0, 21.4));
    K.brace([P[0], P[1] + 16], [H[0], H[1] + 16], 'b cos θ', { c: C.yel, lc: C.yel, size: 38 }, br, -1);
    K.brace([H[0], H[1] + 16 + 0], [Q[0], Q[1] + 16], 'a − b cos θ', { c: C.blue, lc: C.blue, size: 38 }, br2 * (1 - seg(t, 9.2, 9.6)), -1);
    M('b sin θ', H[0] + 78, (H[1] + R[1]) / 2, { size: 38, color: C.yel, alpha: seg(t, 6.0, 6.6) * (1 - seg(t, 9.8, 10.2)) });
    M('θ = 90°', P[0] + 150, P[1] - 120, { size: 46, color: C.yel, alpha: seg(t, 22.8, 23.2) * (1 - seg(t, 26.0, 26.4)) });
    // формула сверху: появляется, пульсирует с квадратами, преобразуется, проверка на 90°
    if (t > 13.0) { const E = K.exChain(S, MK, 1.0, t, K.W / 2, FY, FS); if (t < 14.2) K.drawEx(K.ex(S[0], K.W / 2, FY, FS), { write: 0 });
      if (t > 14.2 && t < 16) { for (const [id, f] of [['c', q => q.key === 's0' || q.key === 'c#0'], ['a', term(E, '(#0', ')#0', 's1')], ['b', term(E, '(#1', ')#1', 's2')]]) { const k = bump(t, { c: 14.4, a: 14.9, b: 15.4 }[id], 0.6); if (k > 0.05 && f) K.exBox(E, f, C.yel, 1, 6); } }
      if (t > 19.0 && t < 20.2) { const f = term(E, '(#0', ')#0', '__'); if (f) K.exBox(E, f, C.red, seg(t, 19.2, 19.6), 6); }
      if (t > 23.2 && t < 24.6) K.exBox(E, 'z', C.yel, seg(t, 23.4, 23.8), 6);
      const fin = seg(t, 21.4, 21.9) * (1 - seg(t, 22.2, 22.5)) + seg(t, 28.4, 29.0); if (fin > 0) K.exBox(E, 'ALL', C.yel, fin, 14); }
    if (t > 13.0 && t < 14.2) K.drawEx(K.ex(S[0], K.W / 2, FY, FS), { write: seg(t, 13.0, 14.2) });
  } });
