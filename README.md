# יהודי AI — סרטוני Shorts

## פרק 1: סם אלטמן — „הכיסא שהתפנה — וחזר”
סרטון אנכי (1080×1920, 30fps, 90 שניות) בגרפיקה נעה, בנוי כולו ב-JavaScript:

- `video/scenes.js` — כל הסצנות מצוירות על Canvas; `renderFrame(t)` מצייר כל רגע בזמן.
- `video/index.html` — תצוגה חיה בדפדפן (`index.html?t=45` מתחיל משנייה 45).
- `video/music.mjs` — מסנתז את פס הקול (ביט, וושים ואפקטים) ל-`out/music.wav`.
- `video/render.mjs` — Playwright מרנדר פריים-פריים ו-ffmpeg מקודד ל-MP4.

```bash
cd video
pip install imageio-ffmpeg     # מספק ffmpeg
node music.mjs
node render.mjs                # → out/episode01.mp4
node render.mjs --stills 5,30  # תמונות בדיקה
```

הכתוביות על המסך הן טקסט הקריינות; את הקריינות עצמה צריך להקליט ולהוסיף מעל המוזיקה.
פונטים: Rubik ו-Secular One (רישיון OFL).

## הזמנה: שמחת בית השואבה — פתחי עולם
סרטון אנכי (1080×1920, 30fps, 22 שניות) שבו המודעה נפתחת כמו ספר חגיגי. כל הרכיבים — שיש, עלים, סמל הספר והגלובוס, מסגרות וטקסט — נבנו מחדש כשכבות נפרדות (לא מונפש צילום המסך).

```bash
cd invite
node music.mjs      # דפי ספר, צליל אור, מוזיקה חגיגית → out/music.wav
node render.mjs     # → out/invite.mp4
```
