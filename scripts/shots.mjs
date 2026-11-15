#!/usr/bin/env node
// Serves the production build with `vite preview` and captures screenshots with Playwright.
// Any console error or page error fails the run.
//
//   npm run build && npm run shots          # all captures into screenshots/
//   npm run shots -- --og                   # also write public/og.png (1200x630 hero)
//   npm run shots -- --only=desktop-p0      # just captures whose name contains this

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'screenshots');
const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const wantOg = args.includes('--og');

if (!existsSync(resolve(root, 'dist/index.html'))) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const resumeData = JSON.parse(readFileSync(resolve(root, 'src/content/resume.generated.json'), 'utf8'));
const errors = [];
const saved = [];

// ---------------------------------------------------------------------------

function startPreview() {
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
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

function watch(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${label}] console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${label}] pageerror: ${err.message}`));
  page.on('requestfailed', (req) => errors.push(`[${label}] request failed: ${req.url()}`));
  page.on('request', (req) => {
    const u = req.url();
    if (!u.startsWith(URL) && !u.startsWith('data:') && !u.startsWith('blob:')) {
      errors.push(`[${label}] request to another origin: ${u}`);
    }
  });
}

async function openPage(browser, label, { viewport, reducedMotion = 'no-preference', hasTouch = false } = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion,
    hasTouch,
    isMobile: hasTouch,
  });
  const page = await context.newPage();
  watch(page, label);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.documentElement.dataset.hero, null, { timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  const info = await page.evaluate(() => document.querySelector('.hero-canvas')?.dataset.info);
  if (info) console.log(`[${label}] ${info}`);
  return page;
}

/** Scroll so the hero's sticky progress equals p (0..1). */
async function scrollToProgress(page, p) {
  await page.evaluate((p) => {
    const hero = document.getElementById('top');
    const travel = Math.max(0, hero.offsetHeight - window.innerHeight);
    window.scrollTo({ top: hero.offsetTop + travel * p, behavior: 'instant' });
  }, p);
  await page.waitForTimeout(900); // let the scene ease to the new progress
}

async function shot(page, name, opts = {}) {
  if (only && !name.includes(only)) return;
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, ...opts });
  saved.push(path);
}

function want(name) {
  return !only || name.includes(only);
}

// ---------------------------------------------------------------------------

async function captureSize(browser, size, viewport, hasTouch) {
  if (!['p0', 'p05', 'p1', 'work', 'reverse-p0', 'pointer'].some((t) => want(`${size}-${t}`))) return;
  const page = await openPage(browser, size, { viewport, hasTouch });
  for (const [p, tag] of [
    [0, 'p0'],
    [0.5, 'p05'],
    [1, 'p1'],
  ]) {
    await scrollToProgress(page, p);
    await shot(page, `${size}-${tag}`);
  }
  await page.evaluate(() => document.getElementById('work').scrollIntoView({ behavior: 'instant' }));
  await page.waitForTimeout(400);
  await shot(page, `${size}-work`);
  if (!hasTouch && (want(`${size}-pointer`))) {
    // Sweep the pointer across the face, capture the disturbance, then confirm it settles.
    await scrollToProgress(page, 0);
    const { width, height } = viewport;
    await page.mouse.move(width * 0.36, height * 0.3);
    for (let k = 0; k <= 24; k++) {
      await page.mouse.move(width * (0.36 + 0.22 * (k / 24)), height * (0.3 + 0.18 * Math.sin(k / 4)));
      await page.waitForTimeout(16);
    }
    await page.waitForTimeout(120);
    await shot(page, `${size}-pointer`);
    await page.mouse.move(width * 0.95, height * 0.95);
    await page.waitForTimeout(2200);
    await shot(page, `${size}-pointer-settled`);
  }
  // Reverse scroll: the bust must reassemble.
  await scrollToProgress(page, 0.5);
  await scrollToProgress(page, 0);
  await page.waitForTimeout(800);
  await shot(page, `${size}-reverse-p0`);
  await page.context().close();
}

async function checkContent(browser) {
  const page = await openPage(browser, 'content', { viewport: DESKTOP });
  const r = await page.evaluate(() => ({
    skills: document.querySelectorAll('[data-skill]').length,
    projects: document.querySelectorAll('#work .project').length,
    projectDetails: document.querySelectorAll('#work .project details').length,
    expDetails: document.querySelectorAll('#experience details').length,
    blank: [...document.querySelectorAll('a[target="_blank"]')].filter((a) => a.rel !== 'noopener noreferrer').length,
    phone: /857\D?351/.test(document.body.innerText),
  }));
  const expect = resumeData.counts.skills;
  if (r.skills !== expect) errors.push(`[content] ${r.skills} skills on the page, ${expect} in the .tex`);
  if (r.projects !== 9) errors.push(`[content] expected 9 projects, found ${r.projects}`);
  if (r.projectDetails !== r.projects) errors.push(`[content] ${r.projects - r.projectDetails} projects without Details`);
  if (r.blank) errors.push(`[content] ${r.blank} new-tab links without rel="noopener noreferrer"`);
  if (r.phone) errors.push('[content] phone number visible on page');

  // Anchors land on their sections.
  for (const id of ['work', 'about', 'contact']) {
    await page.click(`.nav a[href="#${id}"]`);
    // Wait for smooth scrolling to settle.
    await page.evaluate(
      () =>
        new Promise((res) => {
          let last = -1;
          let still = 0;
          const tick = () => {
            still = window.scrollY === last ? still + 1 : 0;
            last = window.scrollY;
            if (still >= 6) res();
            else setTimeout(tick, 100);
          };
          setTimeout(tick, 300);
        }),
    );
    const { top, atEnd } = await page.evaluate((id) => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      return { top: document.getElementById(id).getBoundingClientRect().top, atEnd: window.scrollY >= max - 2 };
    }, id);
    // Sections near the end of the page cannot reach the top; landing at the end with the section in view is correct.
    const ok = (top >= -2 && top <= 120) || (atEnd && top < 900);
    if (!ok) errors.push(`[content] #${id} landed at ${Math.round(top)}px`);
  }

  // Tab reaches every link and summary, and focus is visible.
  await page.evaluate(() => window.scrollTo(0, 0));
  const focusables = await page.evaluate(() => document.querySelectorAll('a[href], summary').length);
  const seen = new Set();
  let noRing = 0;
  for (let k = 0; k < focusables + 5; k++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const cs = getComputedStyle(el);
      const idx = [...document.querySelectorAll('a[href], summary')].indexOf(el);
      return { idx, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 };
    });
    if (info && info.idx >= 0) {
      seen.add(info.idx);
      if (!info.ring) noRing++;
    }
  }
  if (seen.size < focusables) errors.push(`[content] Tab reached ${seen.size} of ${focusables} links/summaries`);
  if (noRing) errors.push(`[content] ${noRing} focused elements without a visible outline`);

  console.log(
    `[content] ${r.skills}/${expect} skills, ${r.projects} projects with ${r.projectDetails} Details, ` +
      `${r.expDetails} experience Details, Tab reached ${seen.size}/${focusables}`,
  );
  await page.context().close();
}

// ---------------------------------------------------------------------------

const server = await startPreview();
let browser;
try {
  browser = await chromium.launch({ args: SWIFTSHADER });

  await captureSize(browser, 'desktop', DESKTOP, false);
  await captureSize(browser, 'mobile', MOBILE, true);

  if (want('reduced-motion')) {
    const page = await openPage(browser, 'reduced-motion', { viewport: DESKTOP, reducedMotion: 'reduce' });
    await shot(page, 'reduced-motion');
    await page.context().close();
  }

  if (!only) await checkContent(browser);

  if (wantOg) {
    const page = await openPage(browser, 'og', { viewport: { width: 1200, height: 630 } });
    await page.waitForTimeout(800);
    const path = resolve(root, 'public/og.png');
    await page.screenshot({ path });
    saved.push(path);
    await page.context().close();
  }

  await browser.close();

  if (want('no-webgl')) {
    browser = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
    const page = await openPage(browser, 'no-webgl', { viewport: DESKTOP });
    await shot(page, 'no-webgl');
    await browser.close();
  }
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}

console.log(`\nSaved ${saved.length} screenshots:\n  ${saved.join('\n  ')}`);
if (errors.length) {
  console.error(`\nFAILED with ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('\nNo console errors, page errors or cross-origin requests.');
