// render.mjs — headless Chromium -> кадры -> ffmpeg. Запуск из корня репозитория:
//   node engine/render.mjs projects/<slug>                      полный рендер в projects/<slug>/out/silent.mp4
//   node engine/render.mjs projects/<slug> --stills 0.5,3,7.2   отдельные кадры + лист (out/stills.jpg)  — QA, секунды
//   node engine/render.mjs projects/<slug> --sheet 1.5          лист: кадр каждые 1.5 с
//   node engine/render.mjs projects/<slug> --from 10 --to 18    кусок (для правки одной сцены)
//   --draft  3D в низком разрешении без теней: листы в 3–4 раза быстрее (только для проверки кадрирования)
//   --workers N (по умолчанию = число ядер, максимум 4), --crf 18
// Скорость в облаке (2 ядра, программный WebGL): 3D-план ≈0.6 с/кадр, 2D ≈0.1 с/кадр -> 2 мин ролика ≈ 25–40 мин. Запускай в фоне.
import { createRequire } from 'module'; import http from 'http'; import fs from 'fs'; import path from 'path'; import { spawn, execFileSync } from 'child_process'; import os from 'os';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2); const proj = path.resolve(args[0] || '.');
const opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const OUT = path.join(proj, 'out'); fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.ttf': 'font/ttf', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  fs.readFile(f, (e, d) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('Content-Type', TYPES[path.extname(f)] || 'application/octet-stream'); r.end(d); }); });
await new Promise(ok => srv.listen(0, ok)); const PORT = srv.address().port;
const URL0 = `http://127.0.0.1:${PORT}/${path.relative(ROOT, proj).split(path.sep).join('/')}/scene.html` + (opt('draft') ? '?gl=0.35&shadow=0' : '');
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });
async function page() { const p = await browser.newPage({ viewport: { width: 540, height: 960 } }); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/status of 404/.test(m.text())) errs.push(m.text()); });
  p.on('response', r => { if (r.status() >= 400 && !/timing\.json$/.test(r.url())) errs.push(r.status() + ' ' + r.url()); });
  await p.goto(URL0); try { await p.waitForFunction('window.READY === true', null, { timeout: 120000 }); } catch (e) { console.error('страница не поднялась:', errs.join('\n')); process.exit(2); }
  p._errs = errs; return p; }
const grab = (p, t, q = 0.93) => p.evaluate(([t, q]) => { window.film.frame(t); return document.getElementById('c').toDataURL('image/jpeg', q); }, [t, q]).then(u => Buffer.from(u.split(',')[1], 'base64'));

const p0 = await page(); const meta = await p0.evaluate(() => ({ duration: film.duration, fps: film.fps, shots: film.shots, events: film.events, narr: film.narr, audio: film.audio, title: film.title }));
fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify(meta, null, 1));
console.log(`фильм: ${meta.duration.toFixed(2)} с, ${meta.shots.length} планов, ${meta.events.length} звуковых событий`);

const stills = opt('stills'), sheet = opt('sheet');
if (stills || sheet) {
  const ts = stills ? String(stills).split(',').map(Number) : Array.from({ length: Math.floor(meta.duration / Number(sheet)) + 1 }, (_, k) => +(k * Number(sheet)).toFixed(2));
  const files = []; const dir = path.join(OUT, 'stills'); fs.mkdirSync(dir, { recursive: true });
  for (const t of ts) { const f = path.join(dir, `t${t.toFixed(2).padStart(7, '0')}.jpg`); fs.writeFileSync(f, await grab(p0, Math.min(t, meta.duration - 1e-3), 0.85)); files.push(f); }
  const cols = Math.min(files.length, stills ? Math.min(files.length, 5) : 8);
  execFileSync('montage', [...files, '-tile', `${cols}x`, '-geometry', '216x384+3+3', '-background', '#111', '-fill', '#ddd', '-pointsize', '14', path.join(OUT, stills ? 'stills.jpg' : 'sheet.jpg')]);
  console.log('лист:', path.join(OUT, stills ? 'stills.jpg' : 'sheet.jpg'), p0._errs.length ? '\nОШИБКИ:\n' + p0._errs.join('\n') : '');
  await browser.close(); srv.close(); process.exit(p0._errs.length ? 1 : 0);
}

const fps = meta.fps, f0 = Math.round((Number(opt('from')) || 0) * fps), f1 = Math.round((opt('to') ? Number(opt('to')) : meta.duration) * fps);
const N = f1 - f0, WK = Math.max(1, Math.min(Number(opt('workers')) || os.cpus().length, 4)), crf = String(opt('crf') || 18);
const chunk = Math.ceil(N / WK), parts = []; const T = Date.now(); let done = 0;
await Promise.all(Array.from({ length: WK }, async (_, w) => {
  const a = f0 + w * chunk, b = Math.min(f1, a + chunk); if (a >= b) return; const p = w === 0 ? p0 : await page();
  const seg = path.join(OUT, `part${w}.mp4`); parts[w] = seg;
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', crf, '-pix_fmt', 'yuv420p', '-r', String(fps), seg], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let f = a; f < b; f++) { const buf = await grab(p, f / fps); if (!ff.stdin.write(buf)) await new Promise(ok => ff.stdin.once('drain', ok)); done++;
    if (done % (fps * 5) === 0) { const el = (Date.now() - T) / 1000; console.log(`  ${done}/${N} кадров, ${(done / el).toFixed(1)} к/с, осталось ~${Math.round((N - done) / (done / el))} с`); } }
  ff.stdin.end(); await new Promise(ok => ff.on('close', ok));
  if (p._errs.length) console.error('ОШИБКИ страницы:\n' + p._errs.join('\n'));
}));
const list = path.join(OUT, 'parts.txt'); fs.writeFileSync(list, parts.filter(Boolean).map(f => `file '${f}'`).join('\n'));
const outName = opt('out') || (f0 || opt('to') ? `piece_${f0}_${f1}.mp4` : 'silent.mp4');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', path.join(OUT, outName)]);
parts.filter(Boolean).forEach(f => fs.unlinkSync(f)); fs.unlinkSync(list);
console.log(`готово: out/${outName}, ${N} кадров за ${((Date.now() - T) / 1000).toFixed(0)} с`);
await browser.close(); srv.close();
