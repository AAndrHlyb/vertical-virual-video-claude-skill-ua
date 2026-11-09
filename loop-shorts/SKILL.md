---
name: loop-shorts
description: Простые зацикленные вертикальные ролики 9:16 на чёрном фоне — доказательства теорем без слов, мотивационные сценки с белыми человечками, огнём, полосками, графиками. Без музыки, только звуки движения. Минимум токенов.
---

# Зацикленные простые ролики

Движок и набор элементов готовы. **Пиши только `film.js` на 20–60 строк.** Код `kit.js` не читай — ниже вся шпаргалка.

## Старт
```bash
cd ~ && git clone --depth 1 https://github.com/AAndrHlyb/vertical-virual-video-claude-skill-ua vsf 2>/dev/null || (cd vsf && git pull -q)
cd ~/vsf/loop-shorts && mkdir -p projects/<slug> && cp scene.html projects/<slug>/
```
Если clone не прошёл — подключи репозиторий `add_repo` (owner `AAndrHlyb`, repo `vertical-virual-video-claude-skill-ua`).

## film.js
```js
import * as K from '../../kit.js';
const { C, T, M, seg, ph } = K;
K.film({ d: 10, bloom: 0, sfx: [[0.2, 'draw'], [3, 'snap'], [5, 'ding']], draw(t) {
  // всё — функции от t (0..d). В t = d кадр обязан совпасть с t = 0.
} });
```
`film({ d, draw, sfx, bloom=0, vignette=0, grain=0, title, narr })`. Холст 1080×1920, фон чёрный. Ключевое держи в y 300–1650 (сверху и снизу интерфейс соцсети).

## Петля — правила
- Повторяющееся движение — только через `ph(t, n)` / `osc(t, n)` с **целым** n: тогда шва нет.
- Сюжет «туда-обратно»: `k = seg(t, 1, 2.4) * (1 - seg(t, 8, 9.2))` — к концу всё вернулось в начальное состояние.
- Ключи `tl(t, [[0,v0],[2,v1],…,[d,v0]])` — последний ключ равен первому.
- Не замыкается само (счётчик, текст) — `fadeIO(t)` как прозрачность или сбрасывай невидимо.
- После рендера `loopcheck.py` обязан сказать «ОК».

## Шпаргалка kit.js
**Время:** `ph(t,n)` фаза 0..1 · `osc(t,n,amp)` · `seg(t,t0,t1,e?)` · `bump(t,t0,dur)` 0→1→0 · `fadeIO(t,f)` · `tl(t,keys)` · `step(t,[0,3,6])→[i,k]` · изинги `eIO eOut eIn back spring`, `lerp clamp inv`.
**Цвета `C`:** ink dim faint · pink blue indigo yel (как в референсе-доказательстве) · green red orange gold violet teal fire.
**Стиль линии `o`:** `{ c, w, fill, fa, a, glow, dash:[14,10] }`; последний аргумент `k` — «рисование на глазах» 0..1.
**Примитивы:** `line(a,b,o,k)` `path(pts,o,k)` `poly(pts,o,k)` `circ(x,y,r,o,k,a0)` `dot(x,y,r,c,glow)` `box(x,y,w,h,o,k)` `rbox(x,y,w,h,r,o)` `arrow(a,b,o,k)` `sector(x,y,r,a0,a1,o)` `curve(f,x0,x1,map,o,k)` `axes(cx,cy,w,h,ux,uy)→map` `grid` `wave(x0,x1,y,amp,n,t,o)` `ground(y,o)` пол, гаснущий к краям.
**Геометрия:** `mv rot scl ctr lerpP(A,B,k)` морф · `rigid(pts,dx,dy,ang,k)` · `mid dist ang(P,Q)` · `regular(cx,cy,r,n)` · `rectP` · `rtri(R,a,b,th)` прямоуг. треугольник · `rightMark(R,A,B)` `angleArc(P,A,B,r,o,k)` `tick(a,b,n)` `sideLabel(s,a,b,inside)`.
**Текст:** `T` заголовки (Oswald) · `M` математика курсивом · `S` текст с засечками · `mono` · `type(s,x,y,t,t0,cps)` печатная машинка · `formula([['c²',t0,цвет],[' = ',t1],…],x,y,t,{size,a})` растёт по частям · `pow_('1,01','365',' ≈ 37,8',x,y,o)` любая степень · `frameBox(x,y,w,h,k)` рамка итога · `wrapLines(s,maxW,size)`. Опции текста: `{ size, color, alpha, weight, align }`.
**Индикаторы:** `bar(x,y,w,level,c,label)` светящаяся полоска · `levelColor(v)` · `ring(x,y,r,k,c)` · `counter(v,x,y,{pre,post,size})` · `bars(x,y,w,h,vals,k,cols,labels)` · `checkbox(x,y,s,k)` · `chain(x,y,n,done)` серия дней.
**Эффекты (петлевые):** `flame(x,y,s,t,k,seed)` огонь, k 0..1 (0 — угли) · `embers` · `halo(x,y,r,c,a)` · `burst(x,y,t,t0,dur,n,c)` искры · `ripple(x,y,t,n,R)` · `dust(t,n)` · `drops(x0,y0,x1,y1,t,n,c)` струя · `spotlight(x,y,r,a)`.
**Человечек:** `fig(x, groundY, h, pose, {dir:±1, c, glow, a})` → `{hand, hand2, head, hip, top}` (точки для реквизита). Ноги сами встают на `groundY`.
Позы `POSE.`: `stand walk(p) run(p) sit pour(k) lift(k) think cheer(lt) slump push(p) phone read climb(p) sleep wave(lt) bow(k)`; `p` = `ph(t,n)`. Смесь: `mixPose(A,B,k)`. Своя поза: `{lean, nod, sh:[a,b], el, hip, kn, up}` — углы от вертикали, 0 вниз, π/2 вперёд, π вверх.
**Реквизит `prop.`:** `can(x,y,s,a)→носик` лейка · `cup book phone dumbbell rock plant(x,y,s,k) seed candle(x,y,s,t,k) clock(x,y,r,t) hourglass(x,y,s,k) stairs(x,y,n,sw,sh)→ступень(i) mountain→вершина flag(x,y,s,t) trophy coin bulb(x,y,s,on)`.
**Значки:** `icon(имя,x,y,s,{c,fill,glow,k})`: check cross heart star bolt target lock sun moon plus minus eq arrowR loop.

## Звук — без музыки
`sfx: [[время, вид, громкость?, длительность?]]`. Хвосты у конца петли сами переходят в начало.
рисование → `draw` · сдвиг/переезд → `slide` · стыковка → `snap` · появление → `pop` · итог → `ding` · шаг → `click` · огонь → `crackle` · вода → `drip` · тяжёлое → `thud` · рост → `rise` · смена → `whoosh` · пульс → `heartbeat`.

## Цикл работы (цель — ≤10 тыс. токенов на ролик)
1. Идея в 2–3 строки: что в петле, что повторяется, где «удар». Не спрашивай пользователя, если просьба ясна.
2. `film.js`.
3. `node ../vertical-story-film-ua/engine/render.mjs projects/<slug> --stills 0.5,4,8` — один лист, поправить, не больше двух раз.
4. Рендер: `node ../vertical-story-film-ua/engine/render.mjs projects/<slug>` (без свечения ≈ 0.1 с/кадр; `glow`/`bloom` ≈ 0.5 с/кадр).
5. `python3 ../vertical-story-film-ua/engine/audio.py projects/<slug>` → `out/final.mp4`.
6. `python3 loopcheck.py projects/<slug>/out/final.mp4` — «ОК».
7. Отдать `final.mp4` (лёгкая копия: `ffmpeg -i final.mp4 -c:v libx264 -preset veryfast -crf 23 -c:a aac -b:a 160k out.mp4`).
Если в ролике есть голосовой текст: `narr` + `python3 ../vertical-story-film-ua/engine/subs.py projects/<slug>` → `.srt` отдельным файлом. Без текста субтитров нет.

## Стили
- **Доказательство** (как 3Blue1Brown): `bloom: 0`, линии `w: 3`, заливки pink/blue/indigo/yel, формулы `M`/`formula`, движущаяся часть подсвечивается `C.yel`. 8–30 с.
- **Мотивация:** `bloom: 0.3`, белые `fig` с `glow`, `ground`, огонь, полоски green/red, заголовок `T` крупно. 6–15 с.

Примеры (читать, только если нужен образец): `examples/proof` — углы треугольника, `examples/versus` — «1% каждый день», `examples/kit` — все элементы на одном кадре.
