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
