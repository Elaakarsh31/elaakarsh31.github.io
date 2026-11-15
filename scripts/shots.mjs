#!/usr/bin/env node
// Verifies the production build with Playwright and captures screenshots into screenshots/.
// Any console error, page error, failed request or request to another origin fails the run.
//
//   npm run build && npm run shots              # everything
//   npm run shots -- --only=desktop             # captures and checks whose name contains this
//   npm run shots -- --sw                       # force SwiftShader (default on non-macOS)

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'screenshots');
const PORT = 4179;
const URL = `http://localhost:${PORT}/`;
const args = process.argv.slice(2);
const only = args.find((a) => a.startsWith('--only='))?.slice(7);
const forceSw = args.includes('--sw');

if (!existsSync(resolve(root, 'dist/index.html'))) {
  console.error('dist/ not found. Run `npm run build` first.');
  process.exit(1);
}
mkdirSync(OUT, { recursive: true });

const GPU = ['--use-angle=metal', '--ignore-gpu-blocklist', '--enable-gpu'];
const SWIFTSHADER = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const LAUNCH = forceSw || process.platform !== 'darwin' ? SWIFTSHADER : GPU;
const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

const resumeData = JSON.parse(readFileSync(resolve(root, 'src/content/resume.generated.json'), 'utf8'));
const portfolioSrc = readFileSync(resolve(root, 'src/content/portfolio.ts'), 'utf8');
const EMAIL = portfolioSrc.match(/email: '([^']+)'/)[1];
const errors = [];
const notes = [];
const saved = [];
const want = (name) => !only || name.includes(only);

// ---------------------------------------------------------------------------------------------

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

function watch(page, label) {
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`[${label}] console.error: ${msg.text()}`);
  });
  page.on('pageerror', (err) => errors.push(`[${label}] pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    if (req.url().startsWith(URL)) errors.push(`[${label}] request failed: ${req.url()}`);
  });
  page.on('request', (req) => {
    const u = req.url();
    if (!u.startsWith(URL) && !u.startsWith('data:') && !u.startsWith('blob:')) errors.push(`[${label}] request to another origin: ${u}`);
  });
}

async function newPage(browser, label, { viewport = DESKTOP, reducedMotion = 'no-preference', mobile = false, permissions = [] } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion, hasTouch: mobile, isMobile: mobile, permissions });
  // Popups from the palette (GitHub, LinkedIn…) must not load other origins during the test;
  // the URLs they tried to open are recorded instead.
  const blocked = [];
  await context.route(/^https?:\/\/(?!localhost)/, (route) => {
    blocked.push(route.request().url());
    return route.abort();
  });
  // Same-origin documents opened in a new tab (the resume PDF) are recorded too.
  context.on('request', (req) => {
    if (req.url().startsWith(URL) && /\.pdf$/.test(req.url())) blocked.push(req.url());
  });
  context.blocked = blocked;
  const page = await context.newPage();
  watch(page, label);
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);
  return page;
}

async function shot(page, name) {
  if (!want(name)) return;
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path });
  saved.push(path);
}

const settle = (page) =>
  page.evaluate(
    () =>
      new Promise((res) => {
        let last = -1;
        let still = 0;
        const tick = () => {
          still = Math.abs(scrollY - last) < 0.5 ? still + 1 : 0;
          last = scrollY;
          if (still >= 5) res();
          else setTimeout(tick, 80);
        };
        setTimeout(tick, 150);
      }),
  );

async function scrollToP(page, p) {
  await page.evaluate((p) => {
    const b = document.getElementById('build');
    window.scrollTo({ top: b.offsetTop + (p / 100) * innerHeight, behavior: 'instant' });
  }, p);
  await settle(page);
  await page.waitForTimeout(1100);
}

async function scrollToId(page, id, offset = 0) {
  await page.evaluate(
    ([id, offset]) => {
      const el = document.getElementById(id);
      window.scrollTo({ top: el.getBoundingClientRect().top + scrollY - offset, behavior: 'instant' });
    },
    [id, offset],
  );
  await settle(page);
  await page.waitForTimeout(900);
}

// ---------------------------------------------------------------------------------------------

async function desktop(browser) {
  if (!want('desktop')) return;
  const page = await newPage(browser, 'desktop');
  const mode = await page.evaluate(() => document.documentElement.dataset.mode);
  if (mode !== 'live') errors.push(`[desktop] expected live mode, got ${mode}`);
  await shot(page, 'desktop-hero');

  const acts = [
    ['data', [45, 100, 155]],
    ['model', [165, 220, 275]],
    ['system', [285, 340, 395]],
  ];
  for (const [act, ps] of acts) {
    for (const [k, p] of ps.entries()) {
      await scrollToP(page, p);
      await shot(page, `desktop-${act}-${['start', 'middle', 'end'][k]}`);
      // HUD panels must never cover the act copy.
      const overlap = await page.evaluate((act) => {
        const copy = document.querySelector(`.act[data-act="${act}"] .act-copy`).getBoundingClientRect();
        return [...document.querySelectorAll(`.act[data-act="${act}"] .callout[data-on]`)]
          .map((c) => c.getBoundingClientRect())
          .filter((r) => r.left < copy.right && r.right > copy.left && r.top < copy.bottom && r.bottom > copy.top).length;
      }, act);
      if (overlap) errors.push(`[desktop] ${overlap} callout panel(s) overlap the ${act} copy at p=${p}`);
    }
  }
  // Readouts show real values.
  await scrollToP(page, 220);
  const ro = await page.evaluate(() => [...document.querySelectorAll('.readouts [data-ro]')].map((e) => e.textContent).join(' | '));
  notes.push(`readouts at p=220: ${ro}`);

  await scrollToId(page, 'projects', 60);
  await shot(page, 'desktop-projects');
  await scrollToId(page, 'career-v0-3', 380);
  await shot(page, 'desktop-career');
  await scrollToId(page, 'toolbench', 0);
  await page.waitForTimeout(3000);
  await shot(page, 'desktop-toolbench-before');
  await page.evaluate(() => document.querySelector('.bench-sort').click());
  await page.waitForTimeout(3500);
  await shot(page, 'desktop-toolbench-after');
  await scrollToId(page, 'contact', 0);
  await page.waitForTimeout(2400);
  await shot(page, 'desktop-contact');

  // Reverse: back to the start of the build, the hero must be exploded again.
  await scrollToP(page, 200);
  await scrollToP(page, 0);
  await shot(page, 'desktop-reverse-hero');

  // Lifecycle: rendering in Career (the bot is on screen there), paused in a hidden tab, and
  // running again when the tab comes back.
  const running = () => page.evaluate(() => document.querySelector('.webgl canvas')?.dataset.running);
  await scrollToId(page, 'career-v0-2', 300);
  await page.waitForTimeout(900);
  const career = await running();
  if (career !== '1') errors.push(`[lifecycle] not rendering in Career, where the bot is on screen (${career})`);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hidden = await running();
  if (hidden !== '0') errors.push(`[lifecycle] still rendering in a hidden tab (${hidden})`);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const back = await running();
  if (back !== '1') errors.push(`[lifecycle] did not resume when the tab came back (${back})`);
  notes.push(`lifecycle: career ${career}, hidden tab ${hidden}, back ${back}`);
  await page.context().close();
}

async function mobile(browser) {
  if (!want('mobile')) return;
  const page = await newPage(browser, 'mobile', { viewport: MOBILE, mobile: true });
  const mode = await page.evaluate(() => document.documentElement.dataset.mode);
  if (mode !== 'phone') errors.push(`[mobile] expected phone mode, got ${mode}`);
  await shot(page, 'mobile-hero');
  for (const id of ['data', 'model', 'system', 'projects', 'career', 'toolbench', 'contact']) {
    await scrollToId(page, id, 60);
    await shot(page, `mobile-${id}`);
  }
  const r = await page.evaluate(() => ({
    frames: document.querySelectorAll('.act .frame img').length,
    rail: getComputedStyle(document.querySelector('.rail')).display,
    cursor: !!document.querySelector('.cur-ring'),
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
  }));
  if (r.frames !== 3) errors.push(`[mobile] ${r.frames} act frames shown, expected 3`);
  if (r.rail !== 'none') errors.push('[mobile] pipeline rail is visible');
  if (r.cursor) errors.push('[mobile] custom cursor is mounted');
  if (r.overflow) errors.push('[mobile] page scrolls horizontally');
  const phoneRunning = await page.evaluate(() => document.querySelector('.webgl canvas')?.dataset.running);
  if (phoneRunning !== '0') errors.push(`[mobile] still rendering below the hero (${phoneRunning})`);
  await page.context().close();
}

async function palette(browser) {
  if (!want('palette')) return;
  const page = await newPage(browser, 'palette', { permissions: ['clipboard-read', 'clipboard-write'] });
  const isOpen = () => page.evaluate(() => document.querySelector('dialog.palette').open);
  for (const combo of ['Meta+K', 'Control+K', '/']) {
    await page.keyboard.press(combo);
    await page.waitForTimeout(120);
    if (!(await isOpen())) errors.push(`[palette] ${combo} did not open the palette`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    if (await isOpen()) errors.push(`[palette] Escape did not close it after ${combo}`);
  }
  const run = async (query) => {
    await page.keyboard.press('Control+K');
    await page.waitForTimeout(100);
    await page.keyboard.type(query, { delay: 15 });
    await page.keyboard.press('Enter');
  };
  // Every "Go to" action, keyboard only.
  for (const [query, id, focusId] of [
    ['projects', 'projects', 'projects-title'],
    ['publications', 'publications', 'publications'],
    ['career', 'career', 'career-title'],
    ['toolbench', 'toolbench', 'toolbench-title'],
    ['contact', 'contact', 'contact-title'],
    ['data', 'data', 'act-data-title'],
    ['model', 'model', 'act-model-title'],
    ['system', 'system', 'act-system-title'],
    ['top', 'top', 'hero-title'],
  ]) {
    await run(query);
    await page.waitForTimeout(400);
    await settle(page);
    const r = await page.evaluate(
      ([id, focusId]) => {
        const reg = document.getElementById(id);
        return {
          focus: document.activeElement?.id,
          hash: location.hash,
          visible: id === 'top' ? scrollY < 5 : (() => {
            const t = reg.querySelector('h2, h3, .act-title') ?? reg;
            const b = t.getBoundingClientRect();
            return b.top >= 0 && b.bottom <= innerHeight && getComputedStyle(t.closest('.act-copy') ?? t).opacity !== '0';
          })(),
        };
      },
      [id, focusId],
    );
    if (r.focus !== focusId) errors.push(`[palette] "${query}" focused ${r.focus}, expected ${focusId}`);
    if (!r.visible) errors.push(`[palette] "${query}" did not bring its heading into view`);
  }
  // Copy email.
  await run('copy email');
  await page.waitForTimeout(250);
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  const status = await page.evaluate(() => document.querySelector('.palette-status')?.textContent);
  if (clip !== EMAIL) errors.push(`[palette] clipboard has "${clip}"`);
  if (status !== 'Copied') errors.push(`[palette] copy status is "${status}"`);
  await page.waitForTimeout(1300);
  // Links open in a new tab.
  for (const [query, expect] of [
    ['open resume', /\/resume\.pdf$/],
    ['github', /github\.com\/Elaakarsh31/],
    ['linkedin', /linkedin\.com\/in\/aakarsharora/],
    ['scholar', /scholar\.google\.com/],
  ]) {
    const ctx = page.context();
    const before = ctx.blocked.length;
    const popup = ctx.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    await run(query);
    const p = await popup;
    if (!p) {
      errors.push(`[palette] "${query}" did not open a tab`);
      continue;
    }
    await p.waitForLoadState('commit').catch(() => {});
    await page.waitForTimeout(300);
    const opened = ctx.blocked.slice(before).find((u) => expect.test(u)) ?? p.url();
    if (!expect.test(opened)) errors.push(`[palette] "${query}" opened ${opened || '(nothing)'}`);
    await p.close();
    await page.waitForTimeout(200);
  }
  // Talk to the bot.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(600);
  await run('bot');
  await page.waitForTimeout(400);
  const said = await page.evaluate(() => document.querySelector('.bot-speech')?.textContent);
  if (!said) errors.push('[palette] the bot said nothing');
  notes.push(`palette: shortcuts, ${9} jumps, copy (${clip}), 4 links, bot ("${said}")`);
  await page.context().close();
}

async function content(browser) {
  if (!want('content')) return;
  const page = await newPage(browser, 'content');
  const skillSet = new Set(resumeData.skills.flatMap((s) => s.items));
  const r = await page.evaluate(() => ({
    tags: [...document.querySelectorAll('.tag[data-tag]')].map((e) => e.dataset.tag),
    sheets: document.querySelectorAll('.sheet').length,
    papers: document.querySelectorAll('.paper').length,
    log: document.querySelectorAll('ol.log-list > li.log-entry').length,
    blank: [...document.querySelectorAll('a[target="_blank"]')].filter((a) => a.rel !== 'noopener noreferrer').length,
    phone: /857\D?351/.test(document.body.innerText),
    title: document.title,
  }));
  const notSkills = r.tags.filter((t) => !skillSet.has(t));
  if (r.tags.length !== 18) errors.push(`[content] ${r.tags.length} toolbench tags, expected 18`);
  if (notSkills.length) errors.push(`[content] tags not in the .tex: ${notSkills.join(', ')}`);
  if (r.sheets !== 4) errors.push(`[content] ${r.sheets} spec sheets, expected 4`);
  if (r.papers !== 3) errors.push(`[content] ${r.papers} publications, expected 3`);
  if (r.log !== 6) errors.push(`[content] ${r.log} career entries, expected 6`);
  if (r.blank) errors.push(`[content] ${r.blank} new-tab links without rel="noopener noreferrer"`);
  if (r.phone) errors.push('[content] phone number visible on the page');
  if (r.title !== 'Aakarsh Arora | Data Scientist, ML Researcher, AI Engineer') errors.push(`[content] title is "${r.title}"`);

  // Tab reaches every visible link, button and disclosure, each with a visible focus ring.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  const total = await page.evaluate(() => {
    const els = [...document.querySelectorAll('a[href], button, summary')].filter((el) => {
      if (el.closest('dialog') || el.closest('details:not([open])') && el.tagName !== 'SUMMARY') return false;
      if (el.closest('[hidden]')) return false;
      return el.getClientRects().length > 0;
    });
    els.forEach((el, i) => (el.dataset.tabIndexCheck = String(i)));
    return els.length;
  });
  const seen = new Set();
  let noRing = 0;
  for (let k = 0; k < total + 15; k++) {
    await page.keyboard.press('Tab');
    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || !el.dataset.tabIndexCheck) return null;
      const cs = getComputedStyle(el);
      return { i: el.dataset.tabIndexCheck, ring: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 };
    });
    if (info) {
      seen.add(info.i);
      if (!info.ring) noRing++;
    }
  }
  if (seen.size < total) errors.push(`[content] Tab reached ${seen.size} of ${total} links, buttons and disclosures`);
  if (noRing) errors.push(`[content] ${noRing} focused elements without a visible outline`);
  notes.push(`content: ${r.tags.length} tags, ${r.sheets} sheets, ${r.papers} publications, ${r.log} career entries, Tab ${seen.size}/${total}`);
  await page.context().close();
}

async function reducedMotion(browser) {
  if (!want('reduced')) return;
  const page = await newPage(browser, 'reduced-motion', { reducedMotion: 'reduce' });
  await shot(page, 'reduced-motion-hero');
  await scrollToId(page, 'model', 60);
  await shot(page, 'reduced-motion-model');
  const r = await page.evaluate(() => ({
    mode: document.documentElement.dataset.mode,
    canvas: !!document.querySelector('.webgl canvas'),
    sticky: getComputedStyle(document.querySelector('.stage')).position,
    lenis: document.documentElement.classList.contains('lenis'),
    cursor: !!document.querySelector('.cur-ring'),
    frames: document.querySelectorAll('.frame img').length,
    callouts: document.querySelectorAll('.callout').length,
  }));
  if (r.mode !== 'static') errors.push(`[reduced-motion] mode ${r.mode}`);
  if (r.canvas) errors.push('[reduced-motion] WebGL canvas is mounted');
  if (r.sticky === 'sticky') errors.push('[reduced-motion] stage is pinned');
  if (r.lenis) errors.push('[reduced-motion] smooth scrolling is on');
  if (r.cursor) errors.push('[reduced-motion] custom cursor is mounted');
  if (r.frames !== 4) errors.push(`[reduced-motion] ${r.frames} still frames, expected 4`);
  notes.push(`reduced motion: ${JSON.stringify(r)}`);
  await page.context().close();
}

async function contextLoss(browser) {
  if (!want('context')) return;
  const page = await newPage(browser, 'context-lost');
  await page.evaluate(() => {
    const c = document.querySelector('.webgl canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    gl.getExtension('WEBGL_lose_context').loseContext();
  });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({ mode: document.documentElement.dataset.mode, canvas: !!document.querySelector('.webgl canvas'), frames: document.querySelectorAll('.frame img').length }));
  if (r.mode !== 'static' || r.canvas || r.frames !== 4) errors.push(`[context-lost] did not fall back: ${JSON.stringify(r)}`);
  await shot(page, 'context-lost');
  await page.context().close();
}

// ---------------------------------------------------------------------------------------------

rmSync(resolve(OUT, 'video'), { recursive: true, force: true });
const server = await startPreview();
let browser;
try {
  browser = await chromium.launch({ args: LAUNCH });
  await desktop(browser);
  await mobile(browser);
  await palette(browser);
  await content(browser);
  await reducedMotion(browser);
  await contextLoss(browser);
  await browser.close();

  if (want('no-webgl')) {
    browser = await chromium.launch({ args: ['--disable-webgl', '--disable-webgl2', '--disable-3d-apis'] });
    const page = await newPage(browser, 'no-webgl');
    const r = await page.evaluate(() => ({ mode: document.documentElement.dataset.mode, frames: document.querySelectorAll('.frame img').length }));
    if (r.mode !== 'static' || r.frames !== 4) errors.push(`[no-webgl] ${JSON.stringify(r)}`);
    await shot(page, 'no-webgl');
    await browser.close();
  }
} finally {
  await browser?.close().catch(() => {});
  server.kill();
}

console.log(`\n${notes.join('\n')}`);
console.log(`\nSaved ${saved.length} screenshots in ${OUT}`);
if (errors.length) {
  console.error(`\nFAILED with ${errors.length} problem(s):\n  ${errors.join('\n  ')}`);
  process.exit(1);
}
console.log('\nAll checks passed. No console errors, page errors or requests to other origins.');
