// Keeps the nav's current item and the pipeline rail's fills in sync with the scroll position.
// Writes straight to the DOM once per frame, and only when the scroll position or size changed.
import { gsap } from 'gsap';
import { clamp01, elementRange, getSection } from './stage';

const ORDER = ['top', 'data', 'model', 'system', 'projects', 'career', 'resume', 'toolbench', 'contact'];
const ACTS = ['data', 'model', 'system'];

export function startSpy() {
  let lastY = -1;
  let lastH = -1;
  let current = '';
  let force = true;

  const tick = () => {
    const y = window.scrollY;
    const h = window.innerHeight;
    if (!force && y === lastY && h === lastH) return;
    lastY = y;
    lastH = h;
    force = false;

    const probe = y + h * 0.4;
    let now = 'top';
    for (const id of ORDER) {
      const reg = getSection(id);
      if (reg) {
        if (reg.range()[0] <= y) now = id;
        continue;
      }
      const r = elementRange(id);
      if (r && r[0] <= probe) now = id;
    }
    if (now !== current) {
      current = now;
      document.querySelectorAll<HTMLAnchorElement>('[data-spy] a[href^="#"]').forEach((a) => {
        if (a.getAttribute('href') === `#${now}`) a.setAttribute('aria-current', 'true');
        else a.removeAttribute('aria-current');
      });
      document.documentElement.dataset.section = now;
      window.dispatchEvent(new CustomEvent('section', { detail: now }));
    }

    for (const id of ACTS) {
      const seg = document.querySelector<HTMLElement>(`.rail-seg[data-seg="${id}"]`);
      if (!seg) continue;
      const reg = getSection(id);
      let fill = 0;
      if (reg) {
        const [a, b] = reg.range();
        fill = clamp01((y - a) / Math.max(1, b - a));
      } else {
        const r = elementRange(id);
        if (!r) continue;
        fill = clamp01((y + h * 0.5 - r[0]) / Math.max(1, r[1] - r[0]));
      }
      seg.style.setProperty('--fill', fill.toFixed(3));
    }
  };

  const onResize = () => {
    force = true;
  };
  window.addEventListener('resize', onResize);
  gsap.ticker.add(tick);
  return () => {
    gsap.ticker.remove(tick);
    window.removeEventListener('resize', onResize);
  };
}

/** Lets other code ask for a recompute, for example after a layout change. */
export function refreshSpy() {
  window.dispatchEvent(new Event('resize'));
}

/** The section currently in view (set by the spy). */
export const currentSection = () => document.documentElement.dataset.section ?? 'top';
