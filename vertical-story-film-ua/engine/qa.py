#!/usr/bin/env python3
"""qa.py — объективная проверка готового ролика (картинка + звук). python3 engine/qa.py projects/<slug>/out/final.mp4 [ref.mp4]
Печатает: длительность, склейки в минуту, медиану покадровой разницы (живость), самые длинные «мёртвые» куски,
чёрные кадры, звук. С эталоном — те же цифры для эталона рядом."""
import subprocess, sys, json, math, os
import numpy as np

def frames(f, w=90, h=160, fps=10):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'fps={fps},scale={w}:{h}:flags=area,format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32), fps

def stats(f):
    a, fps = frames(f); d = np.abs(np.diff(a, axis=0)).mean((1, 2)); dur = len(a) / fps
    cuts = int((d > 18).sum()); dead, run = [], 0
    for i, v in enumerate(d):
        if v < 0.35: run += 1
        else:
            if run / fps >= 1.2: dead.append(((i - run) / fps, run / fps))
            run = 0
    black = int((a.mean((1, 2)) < 6).sum())
    return dict(dur=dur, cuts_per_min=cuts / dur * 60, median_diff=float(np.median(d)), mean_luma=float(a.mean()), dead=dead, black_frames=black)

def show(name, s):
    print(f'{name}: {s["dur"]:.1f} с | склеек/мин {s["cuts_per_min"]:.0f} | живость (медиана разницы) {s["median_diff"]:.2f} | яркость {s["mean_luma"]:.0f} | чёрных кадров {s["black_frames"]}')
    for t, L in s['dead'][:6]: print(f'   мёртвый кусок: {t:.1f}–{t + L:.1f} с ({L:.1f} с без движения)')

if __name__ == '__main__':
    s = stats(sys.argv[1]); show('ролик', s)
    if len(sys.argv) > 2: show('эталон', stats(sys.argv[2]))
    subprocess.run([sys.executable, os.path.join(os.path.dirname(__file__), 'audio.py'), '--check-file', sys.argv[1]])
    if s['dead']: print('! есть куски без движения дольше 1.2 с — добавь проезд камеры, раскрытие или действие');
