# vertical-story-film

Скіл для Claude: вертикальні 9:16 ролики кодом — 3D-сцени й персонажі (three.js), 2D-інфографіка, монтаж, партитура й шуми, окремі субтитри.

- `SKILL.md` — інструкція для Claude (режисура, монтаж, жанри, звук, QA).
- `engine/` — готовий рушій: рендер, 3D-люди, світло, реквізит, переходи, звук, субтитри, перевірки.
- `example/` — робочий приклад усіх прийомів (≈12 с).

```bash
cp -r example projects/my-film     # редагуєш лише projects/my-film/film.js
node engine/render.mjs projects/my-film --sheet 1.5 --draft
node engine/render.mjs projects/my-film
python3 engine/audio.py projects/my-film && python3 engine/subs.py projects/my-film
```

Ліцензії: three.js — MIT (`engine/three/LICENSES`), шрифти Oswald / JetBrains Mono / PT Serif — SIL OFL (`engine/fonts/OFL-*.txt`).
