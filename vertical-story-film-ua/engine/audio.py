#!/usr/bin/env python3
"""audio.py — партитура + шумовые эффекты + сведение + сборка ролика.

  python3 engine/audio.py projects/<slug>            -> out/mix.wav, out/final.mp4 (если есть out/silent.mp4)
  python3 engine/audio.py projects/<slug> --check    только проверка готового out/final.mp4

Берёт out/meta.json (его пишет render.mjs): длительность, события (склейки, sfx из планов), audio-настройки из film.js.
Голос: положи projects/<slug>/voice.(wav|mp3|m4a) — музыка будет приседать под него.

Главное правило: ТЕЛЕФОН НЕ ВОСПРОИЗВОДИТ НИЖЕ ~250 Гц. Всё, что должно быть слышно, обязано иметь энергию 300–4000 Гц.
Бас дублируется гармониками (насыщение), удары имеют щелчок-атаку, гул всегда с «телом» в середине.
"""
import json, sys, os, subprocess, math
import numpy as np
from scipy.signal import butter, sosfilt

SR = 48000
rng = np.random.default_rng(7)  # детерминированно

def bp(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], btype='band', output='sos'); return sosfilt(sos, x)
def lp(x, f, order=2): return sosfilt(butter(order, f / (SR / 2), btype='low', output='sos'), x)
def hp(x, f, order=2): return sosfilt(butter(order, f / (SR / 2), btype='high', output='sos'), x)
def env(n, a, d, curve=4.0):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) * curve / max(d, 1e-3)); return e
def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def sat(x, k=2.5): return np.tanh(k * x) / np.tanh(k)
def note(n):  # 'A2' -> Гц
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    nm, oc = n[:-1], int(n[-1]); return 440 * 2 ** ((names[nm] + 12 * (oc + 1) - 69) / 12)
def saw(f, t, det=0.0):
    ph = (f * (1 + det) * t) % 1.0; return 2 * ph - 1

# ---------------- эффекты (моно, ~-6 dBFS пик) ----------------
def sfx_hit(d=0.9):         # удар: суб + «тело» 180–400 Гц + щелчок
    t = tt(d); f = 150 * np.exp(-t * 18) + 48
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, 0.5)
    mid = bp(noise(d), 180, 900) * env(len(t), 0.001, 0.12) * 0.9
    click = hp(noise(d), 2500) * env(len(t), 0.0005, 0.015) * 0.6
    return sat(body * 0.8 + mid + click, 1.6) * 0.8
def sfx_boom(d=2.2):
    t = tt(d); f = 70 * np.exp(-t * 3) + 35
    b = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.005, 1.6)
    return sat(b + bp(noise(d), 120, 1200) * env(len(t), 0.002, 0.9) * 0.7, 2.0) * 0.8
def sfx_whoosh(d=0.45, up=True):  # шесть полос шума, вспыхивающих по очереди: свист без щелчков
    t = tt(d); out = np.zeros(len(t)); n = noise(d); bands = [(350, 700), (600, 1200), (1000, 2000), (1700, 3400), (2800, 5600), (4500, 9000)]
    if not up: bands = bands[::-1]
    for k, (lo, hi) in enumerate(bands):
        c = (k + 0.5) / len(bands); out += bp(n, lo, hi) * np.exp(-((t / d - c) / 0.2) ** 2)
    return out * np.sin(np.pi * np.clip(t / d, 0, 1)) * 1.2
def sfx_swoosh_in(d=0.6): return sfx_whoosh(d, True) * 0.9 + np.concatenate([np.zeros(int(0.42 * SR)), sfx_hit(0.6)[: int(0.18 * SR)] * 0.5])[: int(d * SR)]
def sfx_tick(d=0.06):
    t = tt(d); return (np.sin(2 * np.pi * 2400 * t) * 0.5 + hp(noise(d), 3000) * 0.5) * env(len(t), 0.0005, 0.02) * 0.6
def sfx_beep(d=0.18, f=1320): t = tt(d); return np.sin(2 * np.pi * f * t) * env(len(t), 0.003, d, 2) * 0.45
def sfx_type(d=1.2):
    out = np.zeros(int(d * SR))
    for k in range(int(d * 11)):
        i = int((k / 11 + rng.uniform(-0.02, 0.02)) * SR)
        if 0 <= i < len(out) - 2000: c = bp(noise(0.04), 1500, 6000) * env(int(0.04 * SR), 0.0005, 0.012); out[i:i + len(c)] += c * rng.uniform(0.5, 1)
    return out * 0.7
def sfx_paper(d=0.5):
    n = bp(noise(d), 1200, 7000); g = (rng.random(len(n)) > 0.985).astype(float); g = lp(g, 60) * 30
    return n * np.clip(g, 0, 1) * np.sin(np.pi * tt(d) / d) * 0.8
def sfx_stamp(d=0.5): return sfx_hit(d) * 0.6 + np.concatenate([np.zeros(200), bp(noise(d), 300, 2500)[: int(d * SR) - 200]]) * env(int(d * SR), 0.001, 0.05) * 0.8
def sfx_glitch(d=0.25):
    x = np.sign(np.sin(2 * np.pi * rng.choice([180, 330, 740, 1210]) * tt(d))) * 0.4 + bp(noise(d), 800, 6000) * 0.5
    gate = (np.floor(tt(d) * 40) % 2).astype(float); return x * gate * 0.6
def sfx_alarm(d=1.2):
    t = tt(d); f = 880 + 220 * np.sign(np.sin(2 * np.pi * 3 * t)); return sat(np.sin(2 * np.pi * np.cumsum(f) / SR), 1.5) * env(len(t), 0.01, d, 1.5) * 0.35
def sfx_riser(d=2.0):
    t = tt(d); f = 200 * (8 ** (t / d)); tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.25
    nz = hp(noise(d), 800) * (t / d) ** 2 * 0.5; return (tone + nz) * (t / d) ** 1.5
def sfx_shatter(d=1.4):
    out = np.zeros(int(d * SR))
    for k in range(40):
        i = int(rng.uniform(0, 0.5) * SR); f = rng.uniform(2500, 7000); dd = rng.uniform(0.05, 0.4); t = tt(dd)
        c = np.sin(2 * np.pi * f * t) * env(len(t), 0.0005, dd, 6) * rng.uniform(0.1, 0.4); out[i:i + len(c)] += c[: len(out) - i]
    return out + sfx_hit(d) * 0.5 + hp(noise(d), 2000) * env(int(d * SR), 0.001, 0.25) * 0.5
def sfx_heartbeat(d=0.8):
    a = sfx_hit(0.3) * 0.5; out = np.zeros(int(d * SR)); out[: len(a)] += a; j = int(0.22 * SR); out[j:j + len(a)] += a[: len(out) - j] * 0.7; return lp(out, 900) * 1.6
def sfx_rumble(d=2.5): t = tt(d); return sat(lp(noise(d), 300) * 2 + bp(noise(d), 300, 1200) * 0.25, 1.5) * np.sin(np.pi * t / d) * 0.6
def sfx_spin(d=2.0, f0=180, f1=1400):  # раскрутка (ротор, мотор): тон с гармониками, слышен на телефоне
    t = tt(d); f = f0 * (f1 / f0) ** (t / d); ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * 0.5 + np.sin(2 * ph) * 0.25 + np.sin(3 * ph) * 0.12) * np.minimum(1, t / 0.2) * 0.5
def sfx_crowd(d=2.0): return bp(noise(d), 300, 2500) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.7 * tt(d))) * 0.35
def sfx_door(d=0.7): return sfx_hit(d) * 0.5 + bp(noise(d), 200, 1500) * env(int(d * SR), 0.01, 0.3) * 0.6
def sfx_keys(d=0.4): return sfx_type(d) * 1.2
def sfx_pop(d=0.12):         # лёгкий «поп»: появление элемента
    t = tt(d); f = 900 * np.exp(-t * 18) + 500; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, d, 3) * 0.55
def sfx_snap(d=0.16):        # стыковка: сухой щелчок + короткий тон
    t = tt(d); return (bp(noise(d), 1500, 5000) * env(len(t), 0.001, 0.025) * 0.9 + np.sin(2 * np.pi * 740 * t) * env(len(t), 0.001, 0.09, 3) * 0.35)
def sfx_slide(d=0.5):        # скольжение/передвижение: мягкий шум с подъёмом и спадом
    t = tt(d); return bp(noise(d), 500, 3000) * np.sin(np.pi * t / d) ** 2 * 0.28
def sfx_draw(d=0.8):         # рисование линии: шорох карандаша
    t = tt(d); return bp(noise(d), 1800, 6000) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t)) * env(len(t), 0.03, d, 1.2) * 0.22
def sfx_click(d=0.05): t = tt(d); return bp(noise(d), 2000, 7000) * env(len(t), 0.0005, 0.012) * 0.8
def sfx_ding(d=1.0, f=1568):  # мягкий колокольчик: итог, «готово»
    t = tt(d); return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6)) * env(len(t), 0.002, d, 5) * 0.35
def sfx_crackle(d=1.5):      # треск огня
    t = tt(d); x = np.zeros(len(t)); k = rng.integers(0, len(t), int(d * 40))
    for i in k: n = min(200, len(t) - i); x[i:i + n] += rng.standard_normal(n) * np.exp(-np.arange(n) / 30)
    return bp(x, 800, 5000) * np.sin(np.pi * t / d) * 0.35
def sfx_drip(d=0.25): t = tt(d); f = 600 + 900 * t / d; return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, d, 4) * 0.4
def sfx_thud(d=0.35): return lp(sfx_hit(d), 900) * 0.8 + bp(noise(d), 300, 900) * env(int(d * SR), 0.002, 0.05) * 0.3
def sfx_rise(d=0.6, f0=500, f1=1400):  # короткий восходящий тон: рост, заполнение
    t = tt(d); f = f0 + (f1 - f0) * (t / d) ** 2; return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / d) * 0.25
SFX = {k[4:]: v for k, v in globals().items() if k.startswith('sfx_')}

# ---------------- партитура ----------------
MOODS = {  # аккорды в ступенях минора (0=i) и характер
    'tense':   dict(prog=[0, 8, 3, 10], bpm=96, tick=True, arp=False),
    'mystery': dict(prog=[0, 5, 8, 7], bpm=84, tick=False, arp=True),
    'epic':    dict(prog=[0, 8, 3, 10], bpm=104, tick=False, arp=True),
    'dark':    dict(prog=[0, 1, 0, 8], bpm=78, tick=True, arp=False),
    'warm':    dict(prog=[0, 5, 3, 7], bpm=88, tick=False, arp=True),
}
def score(D, cfg):
    mood = MOODS.get(cfg.get('mood', 'tense'), MOODS['tense']); bpm = cfg.get('bpm', mood['bpm']); beat = 60 / bpm; bar = beat * 4
    root = note(cfg.get('key', 'A') + '2'); minor = [0, 2, 3, 5, 7, 8, 10]
    acts = cfg.get('acts') or [[0, 1], [D * 0.25, 2], [D * 0.6, 3], [D * 0.88, 1]]   # [время, уровень 1..3]
    lvl = np.zeros(int(D * SR) + 1)
    for k, (t0, L) in enumerate(acts):
        t1 = acts[k + 1][0] if k + 1 < len(acts) else D; lvl[int(t0 * SR):int(t1 * SR)] = L
    lvl = lp(lvl, 1.5)  # плавные переходы уровней
    L, R = np.zeros(int(D * SR) + SR), np.zeros(int(D * SR) + SR); t = tt(D + 1)
    nb = int(D / bar) + 1
    for b in range(nb):  # pad: три голоса 220–660 Гц, медленная атака, стерео-разнос
        deg = mood['prog'][b % len(mood['prog'])]; i0, i1 = int(b * bar * SR), int((b + 1) * bar * SR + 0.3 * SR)
        tb = t[: i1 - i0]; e = np.minimum(1, tb / 0.6) * np.minimum(1, np.maximum(0, (bar + 0.3 - tb)) / 0.4)
        for j, iv in enumerate([0, 3 if deg not in (3, 8, 10) else 4, 7]):
            f = root * 2 * 2 ** ((deg + iv) / 12) * (2 if j == 2 else 1)
            v = (saw(f, tb, 0.003) + saw(f, tb, -0.003)) * 0.5
            v = lp(v, 1600) * e * 0.06
            pan = (j - 1) * 0.5; m = min(i1, len(L)) - i0; L[i0:i0 + m] += v[:m] * (1 - pan); R[i0:i0 + m] += v[:m] * (1 + pan)
    # пульс: корень на восьмых, с насыщением -> гармоники 2–4 слышны на телефоне
    for k in range(int(D / (beat / 2))):
        t0 = k * beat / 2; b = int(t0 / bar); deg = mood['prog'][b % len(mood['prog'])]; f = root * 2 ** (deg / 12)
        d = beat * 0.45; n = int(d * SR); x = sat(np.sin(2 * np.pi * f * tt(d)) * 1.0, 3.0) * env(n, 0.004, d, 3)
        x = x + lp(sat(np.sin(2 * np.pi * f * 2 * tt(d)), 2) * env(n, 0.003, d * 0.5, 4), 2500) * 0.35
        i = int(t0 * SR); g = 0.13 * np.clip(lvl[i] - 0.4, 0, 2) / 1.6 * (1.15 if k % 2 == 0 else 0.8)
        L[i:i + n] += x * g; R[i:i + n] += x * g
    if mood['tick']:
        for k in range(int(D / beat)):
            i = int(k * beat * SR); x = sfx_tick() * 0.25 * (1 if k % 4 else 1.6); L[i:i + len(x)] += x * 0.8; R[i:i + len(x)] += x
    if mood['arp']:
        for k in range(int(D / (beat / 4))):
            t0 = k * beat / 4; i = int(t0 * SR)
            if lvl[i] < 1.6: continue
            b = int(t0 / bar); deg = mood['prog'][b % len(mood['prog'])]; iv = [0, 3, 7, 12, 7, 3][k % 6]
            f = root * 8 * 2 ** ((deg + iv) / 12); d = 0.22; x = (np.sin(2 * np.pi * f * tt(d)) + 0.3 * np.sin(4 * np.pi * f * tt(d))) * env(int(d * SR), 0.002, d, 5) * 0.05 * min(1, lvl[i] - 1.5)
            pan = 0.35 * math.sin(k * 0.7); L[i:i + len(x)] += x * (1 - pan); R[i:i + len(x)] += x * (1 + pan)
    for k in range(int(D / beat)):  # барабаны на уровне 3
        t0 = k * beat; i = int(t0 * SR)
        if lvl[i] < 2.6: continue
        if k % 2 == 0: x = sfx_hit(0.35) * 0.35
        else: x = bp(noise(0.18), 900, 5000) * env(int(0.18 * SR), 0.001, 0.08) * 0.3
        L[i:i + len(x)] += x; R[i:i + len(x)] += x
        h = hp(noise(0.05), 6000) * env(int(0.05 * SR), 0.0005, 0.02) * 0.08; j = int((t0 + beat / 2) * SR); L[j:j + len(h)] += h; R[j:j + len(h)] += h * 0.7
    for (t0, L1), (t1, L2) in zip(acts, acts[1:]):  # райзер перед подъёмом уровня
        if L2 > L1 and t1 > 2.2:
            x = sfx_riser(2.0) * 0.35; i = int((t1 - 2.0) * SR); L[i:i + len(x)] += x; R[i:i + len(x)] += x
    for h0, hd in cfg.get('holes', []):  # дыры тишины: срез без фейда, вход с ударом
        i0, i1 = int(h0 * SR), int((h0 + hd) * SR); L[i0:i1] *= 0.0; R[i0:i1] *= 0.0
    return np.stack([L, R])[:, : int(D * SR)]

def place(buf, x, t, g=1.0, pan=0.0, wrap=False):  # wrap: хвост звука уходит в начало (петля без шва)
    N = buf.shape[1]; i = int(t * SR) % N if wrap else int(t * SR)
    if i < 0 or i >= N: return
    n = min(len(x), N - i); buf[0, i:i + n] += x[:n] * g * (1 - pan * 0.6); buf[1, i:i + n] += x[:n] * g * (1 + pan * 0.6)
    if wrap and len(x) > n: place(buf, x[n:], 0, g, pan, True)

def load_voice(proj, D):
    for ext in ('wav', 'mp3', 'm4a', 'ogg'):
        f = os.path.join(proj, 'voice.' + ext)
        if os.path.exists(f):
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
            v = np.frombuffer(raw, dtype=np.float32).astype(np.float64); out = np.zeros(int(D * SR)); out[: min(len(v), len(out))] = v[: len(out)]; return out
    return None

def band_report(x):
    X = np.abs(np.fft.rfft(x[: SR * 60] if len(x) > SR * 60 else x)) ** 2; f = np.fft.rfftfreq(min(len(x), SR * 60), 1 / SR)
    tot = X.sum() + 1e-12; hi = X[f >= 300].sum(); return 10 * math.log10(hi / tot)

def lufs(path):
    r = subprocess.run(['ffmpeg', '-nostdin', '-i', path, '-filter_complex', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    for line in r.splitlines()[::-1]:
        if line.strip().startswith('I:'): return float(line.split()[1])
    return None

def main():
    if sys.argv[1] == '--check-file': return check(sys.argv[2])
    proj = os.path.abspath(sys.argv[1]); out = os.path.join(proj, 'out')
    if '--check' in sys.argv: return check(os.path.join(out, 'final.mp4'))
    meta = json.load(open(os.path.join(out, 'meta.json'))); D = meta['duration']; cfg = meta.get('audio') or {}
    mus = score(D, cfg) * cfg.get('music', 1.0) if cfg.get('music', 1.0) else np.zeros((2, int(D * SR)))   # music:0 — только эффекты
    fx = np.zeros((2, int(D * SR)))
    for e in meta['events']:
        k = e['kind']
        if k in ('none', None) or k not in SFX: continue
        x = SFX[k](e['d']) if e.get('d') else SFX[k](); place(fx, x, e['t'], e.get('g', 1) * cfg.get('sfx', 1.0), pan=math.sin(e['t'] * 1.7) * 0.25, wrap=bool(cfg.get('loop')))
    voice = load_voice(proj, D)
    if voice is not None:  # приседание музыки под голос (сайдчейн)
        envv = lp(np.abs(voice), 8); envv = envv / (envv.max() + 1e-9); duck = 1 - 0.62 * np.clip(envv * 3, 0, 1)
        mus *= duck; fx *= (1 - 0.3 * np.clip(envv * 3, 0, 1)); vv = hp(voice, 90) * 1.0
        mix = mus + fx + np.stack([vv, vv])
    else: mix = mus + fx
    mix = hp(mix, 35)                               # ниже 35 Гц — только грязь
    pk = np.abs(mix).max() + 1e-9; mix = np.tanh(mix / pk * 1.4) / np.tanh(1.4) * 0.89   # мягкий лимитер
    wav = os.path.join(out, 'mix_raw.wav'); write_wav(wav, mix)
    I = lufs(wav); target = cfg.get('lufs', -14.0); g = 10 ** ((target - I) / 20) if I else 1.0
    mix = np.clip(mix * g, -0.98, 0.98); final_wav = os.path.join(out, 'mix.wav'); write_wav(final_wav, mix); os.remove(wav)
    hi = band_report(mix.mean(0)); print(f'звук: {D:.1f} с, {lufs(final_wav):.1f} LUFS, доля энергии выше 300 Гц: {hi:.1f} dB ' + ('(ок)' if hi > -7 else '(МАЛО — на телефоне будет тихо!)'))
    silent = os.path.join(out, 'silent.mp4')
    if os.path.exists(silent):
        fin = os.path.join(out, 'final.mp4')
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', silent, '-i', final_wav, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ac', '2', '-shortest', '-movflags', '+faststart', fin], check=True)
        check(fin)

def write_wav(path, x):
    import wave
    x16 = (np.clip(x, -1, 1) * 32767).astype('<i2').T.copy()
    with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(x16.tobytes())

def check(f):  # итоговая проверка: есть ли звук, громкость, середина, длительность
    pr = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,channels:format=duration', '-of', 'json', f], capture_output=True, text=True)
    j = json.loads(pr.stdout); types = [s['codec_type'] for s in j['streams']]
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    ok = 'audio' in types and len(a) > 0 and np.abs(a).max() > 0.05
    hi = band_report(a) if len(a) else -99; I = lufs(f)
    rms = [20 * math.log10(np.sqrt(np.mean(a[i:i + SR] ** 2)) + 1e-9) for i in range(0, len(a) - SR, SR)]
    gaps = [i for i, v in enumerate(rms) if v < -45]
    print(f'ПРОВЕРКА {os.path.basename(f)}: дорожки {types}, {float(j["format"]["duration"]):.1f} с, {I} LUFS, выше 300 Гц {hi:.1f} dB, тихих секунд {len(gaps)}')
    if not ok or hi < -7 or (I and I < -18): print('  !!! ЗВУК НЕ ГОДЕН: ' + ('нет дорожки/тишина' if not ok else 'мало средних частот' if hi < -7 else 'слишком тихо')); sys.exit(1)

if __name__ == '__main__': main()
