#!/usr/bin/env python3
"""subs.py — субтитры и текст для озвучки из того же источника, что и картинка.

  python3 engine/subs.py projects/<slug>          -> out/subtitles.srt, out/ozvuchka.txt (+ предупреждения о спешке)
  python3 engine/subs.py projects/<slug> --align  есть voice.*: находит паузы в голосе, пишет timing.json
                                                  (начало каждого блока озвучки). Потом перерендер — планы
                                                  растянутся/сожмутся под реальный голос.
Акценты в тексте озвучки (*слово*) в .srt снимаются.
"""
import json, os, re, subprocess, sys

def ts(t):
    t = max(0, t); h = int(t // 3600); m = int(t // 60) % 60; s = int(t) % 60; ms = int(round((t - int(t)) * 1000))
    if ms == 1000: s += 1; ms = 0
    return f'{h:02d}:{m:02d}:{s:02d},{ms:03d}'

def split_lines(text, maxc=42):  # .srt: не больше двух строк по ~42 знака, режем по паузам
    parts = re.split(r'(?<=[.!?…])\s+', text); out = []
    for p in parts:
        while len(p) > maxc * 2:
            cut = p.rfind(',', 0, maxc * 2);  cut = cut if cut > maxc * 0.6 else p.rfind(' ', 0, maxc * 2)
            out.append(p[:cut + 1].strip()); p = p[cut + 1:].strip()
        out.append(p)
    return [x for x in out if x]

def main():
    proj = os.path.abspath(sys.argv[1]); out = os.path.join(proj, 'out'); meta = json.load(open(os.path.join(out, 'meta.json')))
    if '--align' in sys.argv: return align(proj, meta)
    srt, oz, n = [], [], 1
    for b in meta['narr']:
        text = b['text'].replace('*', ''); t0, t1 = b['t0'], b['t1']; win = t1 - t0
        words = len(text.split()); need = words / 2.6 + 0.4    # ~2.6 слова/с — спокойный темп диктора
        flag = '' if need <= win else f'   <-- НЕ УМЕЩАЕТСЯ: нужно ~{need:.1f} с, есть {win:.1f} с'
        oz.append(f'[{ts(t0)[:-4]} – {ts(t1)[:-4]}]  {win:4.1f} с  {words:2d} сл.{flag}\n{text}\n')
        chunks = split_lines(text); L = sum(len(c) for c in chunks) or 1; tc = t0
        for c in chunks:
            d = win * len(c) / L; srt.append(f'{n}\n{ts(tc + 0.05)} --> {ts(tc + d - 0.05)}\n{wrap2(c)}\n'); n += 1; tc += d
        if flag: print(f'! блок {ts(t0)[:-4]}: {flag.strip()}')
    open(os.path.join(out, 'subtitles.srt'), 'w').write('\n'.join(srt))
    open(os.path.join(out, 'ozvuchka.txt'), 'w').write(f'{meta["title"]} — текст для озвучки, {meta["duration"]:.1f} с\n'
        'Каждый блок читать в своё окно. Паузы между блоками — 0.3–0.6 с.\n\n' + '\n'.join(oz))
    print(f'субтитры: {n - 1} карточек, {len(meta["narr"])} блоков озвучки')

def wrap2(c, maxc=42):
    if len(c) <= maxc: return c
    mid = len(c) // 2; l = c.rfind(' ', 0, mid + 6); return c[:l] + '\n' + c[l + 1:]

def align(proj, meta):
    v = next((os.path.join(proj, 'voice.' + e) for e in ('wav', 'mp3', 'm4a', 'ogg') if os.path.exists(os.path.join(proj, 'voice.' + e))), None)
    if not v: print('нет voice.* в папке проекта'); sys.exit(1)
    r = subprocess.run(['ffmpeg', '-nostdin', '-i', v, '-af', 'silencedetect=n=-38dB:d=0.28', '-f', 'null', '-'], capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]; ends = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', v], capture_output=True, text=True).stdout)
    speech0 = starts[0] if ends and ends[0] < 0.05 and starts else 0.0
    pauses = [(e, s) for e, s in zip(ends, starts if not (ends and ends[0] < 0.05) else starts[1:]) if s > e]
    texts = [b['text'].replace('*', '') for b in meta['narr']]; L = sum(len(t) for t in texts); acc = 0; want = []
    for t in texts[:-1]: acc += len(t); want.append(speech0 + (dur - speech0) * acc / L)
    cand = [(e + s) / 2 for e, s in pauses]; picks = []
    for w in want:  # ближайшая ещё не занятая пауза
        best = min((c for c in cand if c not in picks and (not picks or c > picks[-1])), key=lambda c: abs(c - w), default=w); picks.append(best)
    blocks = [speech0 - 0.2] + [p for p in picks]
    json.dump({'blocks': [max(0, b) for b in blocks], 'end': dur + 0.8}, open(os.path.join(proj, 'timing.json'), 'w'), indent=1)
    print('timing.json:', ', '.join(f'{b:.2f}' for b in blocks), f'| конец {dur + 0.8:.2f}')
    for b, w in zip(picks, want):
        if abs(b - w) > 2.5: print(f'  ! пауза {b:.1f} далеко от ожидаемой {w:.1f} — проверь, совпадают ли блоки озвучки с текстом')

if __name__ == '__main__': main()
