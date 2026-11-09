# loopcheck.py <video.mp4> — виден ли шов петли: разница последний→первый кадр против обычной разницы между соседними кадрами.
import sys, subprocess, numpy as np
f = sys.argv[1]; w, h = 108, 192
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', f, '-vf', f'scale={w}:{h},format=gray', '-f', 'rawvideo', '-'], capture_output=True).stdout
v = np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)
steps = np.abs(np.diff(v, axis=0)).mean(axis=(1, 2)); seam = np.abs(v[0] - v[-1]).mean()
typ = float(np.percentile(steps, 90)) + 0.3
print(f'петля: {len(v)} кадров, шов {seam:.2f}, обычный шаг ≤ {typ:.2f} -> ' + ('ОК, шов не виден' if seam <= typ * 1.5 else 'ШОВ ВИДЕН: конец не совпадает с началом'))
sys.exit(0 if seam <= typ * 1.5 else 1)
