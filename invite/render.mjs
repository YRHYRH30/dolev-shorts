// Renders index.html frame-by-frame with Playwright and pipes JPEGs into ffmpeg.
// Usage: node render.mjs [--fps 30] [--from 0] [--to 22] [--out out/invite.mp4] [--stills 1,5,12]
import { chromium } from 'playwright';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const dir = path.dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const fps = +arg('fps', 30), from = +arg('from', 0), to = +arg('to', 22);
const out = path.resolve(dir, arg('out', 'out/invite.mp4'));
const audio = arg('audio', path.join(dir, 'out/music.wav'));
const ffmpeg = process.env.FFMPEG || execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
fs.mkdirSync(path.dirname(out), { recursive: true });

const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file://' + path.join(dir, 'index.html') + '?render');
await page.evaluate(() => window.ready);
const canvas = await page.$('#c');

const stills = arg('stills');
if (stills) {
  for (const t of stills.split(',').map(Number)) {
    await page.evaluate(t => renderFrame(t), t);
    await canvas.screenshot({ path: path.join(path.dirname(out), `still_${t}.jpg`), type: 'jpeg', quality: 80 });
  }
  await browser.close(); process.exit(0);
}

const hasAudio = fs.existsSync(audio);
const ff = spawn(ffmpeg, ['-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  ...(hasAudio ? ['-ss', String(from), '-t', String(to - from), '-i', audio] : []),
  '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart',
  ...(hasAudio ? ['-c:a', 'aac', '-b:a', '192k', '-shortest'] : []), out], { stdio: ['pipe', 'inherit', 'inherit'] });

const total = Math.round((to - from) * fps);
for (let i = 0; i < total; i++) {
  await page.evaluate(t => renderFrame(t), from + i / fps);
  const buf = await canvas.screenshot({ type: 'jpeg', quality: 93 });
  if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  if (i % 150 === 0) console.log(`frame ${i}/${total}`);
}
ff.stdin.end();
await new Promise(r => ff.on('close', r));
await browser.close();
console.log('wrote', out);
