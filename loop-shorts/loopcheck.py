# loopcheck.py <video.mp4> — проверка зацикленного ролика. Код выхода 1, если есть проблема.
#  шов петли · чёрные кадры · «пропало всё» (резкий провал и возврат картинки) · фризы (кадр стоит в середине) · рывки
import sys, subprocess, numpy as np
f = sys.argv[1]; w, h = 216, 384
fps = eval(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=r_frame_rate', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout.strip() or '30')
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
v = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32); n = len(v)
m = v.mean(axis=(1, 2)); d = np.abs(np.diff(v, axis=0)).mean(axis=(1, 2)); ts = lambda i: f'{i / fps:.2f} с'
bad = []
typ = float(np.percentile(d, 90)) + 0.3; seam = float(np.abs(v[0] - v[-1]).mean())
print(f'кадров {n}, шов {seam:.2f} (норма ≤ {typ * 1.5:.2f})')
if seam > typ * 1.5: bad.append('ШОВ ВИДЕН: конец не совпадает с началом')
def runs(mask, minlen):
    out, i = [], 0
    while i < len(mask):
        if not mask[i]: i += 1; continue
        j = i
        while j < len(mask) and mask[j]: j += 1
        if j - i >= minlen: out.append((i, j))
        i = j
    return out
ref = np.median(m)
peak = np.percentile(v.reshape(n, -1), 99.8, axis=1)                    # чёрный = нет ни одной яркой точки (а не просто тёмный кадр)
for a, b in runs(peak < 25, max(2, int(fps * 0.1))): bad.append(f'ЧЁРНЫЙ ЭКРАН {ts(a)}–{ts(b)} — не гаси в чёрный, используй xfade')
for i in range(1, n - 1):                                             # «пропало всё»: картинка резко темнеет и вскоре возвращается
    nb = max(m[max(0, i - 3)], m[min(n - 1, i + 3)])
    back = m[i + 1:min(n, i + int(fps * 0.7))]                       # пропажа = провал и быстрый возврат (а не задуманное затемнение сцены)
    if m[i] < 0.6 * nb and nb > 4 and abs(m[i - 1] - m[i]) > 0.25 * nb and len(back) and back.max() > 0.85 * m[i - 1]: bad.append(f'ПРОПАЛО ИЗОБРАЖЕНИЕ около {ts(i)} — проверь условия по изингу с перелётом (eBack/back > 1)'); break
for a, b in runs(d < 0.012, int(fps * 0.6)):                          # стоп-кадр внутри ролика
    if 0 < a and b < len(d): bad.append(f'ФРИЗ {ts(a)}–{ts(b + 1)} — кадр стоит; добавь движение (drift, дыхание, живое число)')
for i in [i for i in range(1, len(d) - 1) if d[i] > max(3.0, 5 * max(d[i - 1], d[i + 1]))][:5]: bad.append(f'РЫВОК на {ts(i + 1)} — что-то появилось/исчезло скачком')
print('\n'.join(bad) if bad else 'ОК: шва нет, чёрных кадров, провалов и фризов нет')
sys.exit(1 if bad else 0)
