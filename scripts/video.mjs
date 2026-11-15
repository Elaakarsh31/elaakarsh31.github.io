#!/usr/bin/env node
// Records one full scroll of the production build on desktop with Playwright's recordVideo, then
// extracts a frame every 0.5 s with ffmpeg into screenshots/video/ for review.
//
//   npm run build && npm run video

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'screenshots/video');
const PORT = 4180;
const URL = `http://localhost:${PORT}/`;
const SIZE = { width: 1440, height: 900 };
const sw = process.argv.includes('--sw') || process.platform !== 'darwin';

if (!existsSync(resolve(root, 'dist/index.html'))) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}
if (spawnSync('ffmpeg', ['-version']).status !== 0) {
  console.error('ffmpeg not found on PATH.');
  process.exit(1);
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

function startPreview() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
  return new Promise((res, rej) => {
    const timer = setTimeout(() => rej(new Error('vite preview did not start')), 20000);
    proc.stdout.on('data', (d) => {
      if (String(d).includes(String(PORT))) {
        clearTimeout(timer);
        res(proc);
      }
    });
  });
}

const server = await startPreview();
const errors = [];
let browser;
try {
  browser = await chromium.launch({
    args: sw ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] : ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'],
  });
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, recordVideo: { dir: OUT, size: SIZE } });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(URL, { waitUntil: 'networkidle' });
  // Power on, as a visitor would.
  await page.waitForSelector('.gate-power:not([disabled])', { timeout: 12000 });
  await page.click('.gate-power');
  await page.waitForSelector('.gate', { state: 'detached', timeout: 5000 });
  await page.waitForTimeout(2500);
  await page.mouse.move(SIZE.width * 0.55, SIZE.height * 0.5);
  // Scroll the whole page with the wheel, so Lenis and the scrubbed timeline behave as for a visitor.
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  let y = 0;
  while (y < total - 2) {
    await page.mouse.wheel(0, 70);
    await page.waitForTimeout(90);
    y = await page.evaluate(() => scrollY);
    // Linger at the end of the build and at the toolbench so the frames catch power-on and sorting.
    const section = await page.evaluate(() => document.documentElement.dataset.section);
    if (section === 'toolbench') await page.waitForTimeout(60);
  }
  await page.waitForTimeout(2500);
  await context.close(); // flushes the video
  const file = readdirSync(OUT).find((f) => f.endsWith('.webm'));
  renameSync(resolve(OUT, file), resolve(OUT, 'full-scroll.webm'));
  const ff = spawnSync('ffmpeg', ['-loglevel', 'error', '-i', resolve(OUT, 'full-scroll.webm'), '-vf', 'fps=2', resolve(OUT, 'frame-%03d.png')]);
  if (ff.status !== 0) errors.push(`ffmpeg: ${ff.stderr}`);
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}

const frames = readdirSync(OUT).filter((f) => f.startsWith('frame-'));
console.log(`Video: ${resolve(OUT, 'full-scroll.webm')}\n${frames.length} frames in ${OUT} (every 0.5 s)`);
if (errors.length) {
  console.error(`\nFAILED:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
