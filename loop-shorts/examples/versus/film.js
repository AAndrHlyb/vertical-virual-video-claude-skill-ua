// Петля: «1% каждый день» — человечек идёт по бесконечной лестнице, внизу 1,01³⁶⁵ против 0,99³⁶⁵.
import * as K from '../../kit.js';
const { C, T, M, seg } = K, D = 10, N = 10;                       // 10 ступеней за петлю
const sw = 120, sh = 66, h = 300, FX = 470, FY = 1200;               // ступень: ширина, высота; где на экране стоит человек
const ground = x => -Math.floor(x / sw) * sh;                          // лестница в мире: ступень i на высоте −i·sh
K.film({ d: D, bloom: 0.3, title: '1% каждый день',
  sfx: [...Array.from({ length: N }, (_, i) => [i * D / N, 'click', 0.6]), [0.6, 'draw', 0.35, 6], [7.0, 'ding', 0.5], [8.8, 'slide', 0.4]],
  draw(t) {
    T('1% КАЖДЫЙ ДЕНЬ', K.W / 2, 300, { size: 92, weight: 700 });
    const u = t / D * N * sw, map = (x, y) => [FX + x - u, FY + y + u * sh / sw];   // камера едет за человеком: за петлю ровно N ступеней
    const p = [], i0 = Math.floor(u / sw) - 7; for (let i = i0; i < i0 + 15; i++) p.push(map(i * sw, -i * sh), map((i + 1) * sw, -i * sh));
    K.path(p, { c: C.ink, w: 4, glow: 10, a: 0.9 });
    const g = K.gait(u, sw, ground, h, { map, lean: 0.16 });
    K.fig(0, 0, h, g.pose, { feet: g.feet, hip: g.hip, glow: 16 });
    // внизу: два графика за год (шаг ноги = щелчок: ступня встаёт при целом c, т.е. каждые D/N с)
    const x0 = 150, x1 = 930, y0 = 1800, cm = (d, v) => [K.lerp(x0, x1, d / 365), y0 - v * 7.2], k = seg(t, 0.6, 6.6) * (1 - seg(t, 8.8, 9.7));
    K.line([x0, y0], [x1, y0], { c: C.faint, w: 2 });
    K.curve(d => Math.pow(1.01, d), 0, 365, cm, { c: C.green, w: 6, glow: 18 }, k);
    K.curve(d => Math.pow(0.99, d), 0, 365, cm, { c: C.red, w: 6, glow: 18 }, k);
    const a = seg(t, 6.4, 7.0) * (1 - seg(t, 8.6, 9.2));
    K.pow_('1,01', '365', ' ≈ 37,8', 690, 1440, { size: 64, color: C.green, alpha: a }); K.pow_('0,99', '365', ' ≈ 0,03', 330, 1700, { size: 52, color: C.red, alpha: a });
    T('год', x1, y0 + 40, { size: 32, color: C.dim, weight: 400 });
  } });
