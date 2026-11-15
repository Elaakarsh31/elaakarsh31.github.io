#!/usr/bin/env node
// Captures still frames of the real scene for the compact, reduced-motion and no-WebGL layouts,
// plus the Open Graph image. Serves the production build with `vite preview`.
//
//   npm run build && npm run frames     # public/frames/{hero,data,model,system}.png and public/og.png
//   npm run frames -- --sw              # force SwiftShader if the GPU path renders blank
//
// Rebuild afterwards so the frames are picked up (vite.config.ts lists public/frames/).

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4181;
const URL = `http://localhost:${PORT}/`;
const OUT = resolve(root, 'public/frames');
const sw = process.argv.includes('--sw');

if (!existsSync(resolve(root, 'dist/index.html'))) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const GPU = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'];
const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

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
    proc.stderr.on('data', (d) => process.stderr.write(d));
  });
}

const jobs = [
  { frame: 'hero', size: { width: 1200, height: 900 }, out: resolve(OUT, 'hero.png') },
  { frame: 'data', size: { width: 1200, height: 900 }, out: resolve(OUT, 'data.png') },
  { frame: 'model', size: { width: 1200, height: 900 }, out: resolve(OUT, 'model.png') },
  { frame: 'system', size: { width: 1200, height: 900 }, out: resolve(OUT, 'system.png') },
  { frame: 'og', size: { width: 1200, height: 630 }, out: resolve(root, 'public/og.png') },
];

const server = await startPreview();
const errors = [];
let browser;
try {
  browser = await chromium.launch({ args: sw ? SWIFTSHADER : process.platform === 'darwin' ? GPU : SWIFTSHADER });
  for (const job of jobs) {
    const page = await browser.newPage({ viewport: job.size, deviceScaleFactor: 1 });
    page.on('pageerror', (e) => errors.push(`[${job.frame}] ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`[${job.frame}] ${m.text()}`));
    await page.goto(`${URL}?frame=${job.frame}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => window.__frameReady === true, null, { timeout: 60000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: job.out });
    console.log(`${job.frame.padEnd(7)} ${job.out}  ${(statSync(job.out).size / 1024).toFixed(0)} KB`);
    await page.close();
  }
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}
if (errors.length) {
  console.error(`\nFAILED:\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
