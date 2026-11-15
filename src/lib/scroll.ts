// Smooth scrolling (Lenis) synced to GSAP's ScrollTrigger, plus the one function every in-page
// link, the rail and the command palette use to move around.
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { elementRange, getSection } from './stage';

gsap.registerPlugin(ScrollTrigger);

let lenis: Lenis | null = null;

export function getLenis() {
  return lenis;
}

/** Starts Lenis and drives it from GSAP's ticker so ScrollTrigger sees every frame. */
export function startSmoothScroll() {
  if (lenis) return stopSmoothScroll;
  lenis = new Lenis({ autoRaf: false, lerp: 0.11, wheelMultiplier: 1, anchors: false });
  lenis.on('scroll', ScrollTrigger.update);
  // The power-on gate holds the page still until the visitor powers on.
  if (document.documentElement.dataset.gate) lenis.stop();
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);
  ScrollTrigger.refresh();
  return stopSmoothScroll;
}

function raf(time: number) {
  lenis?.raf(time * 1000);
}

export function stopSmoothScroll() {
  gsap.ticker.remove(raf);
  lenis?.destroy();
  lenis = null;
}

const navH = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 60;

/** Where a target lands: registered act positions, the top, or the element under the nav. */
export function targetY(id: string): number | null {
  if (id === 'top' || id === '') return 0;
  // Pinned acts register their own landing point; sections land just under the nav.
  const reg = getSection(id);
  if (reg) return Math.max(0, reg.landing());
  const r = elementRange(id);
  if (!r) return null;
  const el = document.getElementById(id);
  const offset = navH() + (el?.classList.contains('log-entry') ? 24 : 0);
  return Math.max(0, r[0] - offset);
}

let veilTimer = 0;

/**
 * Scrolls to a section. Long jumps cut instantly behind a short veil so the nav goes
 * straight to Projects without scrubbing the whole build; short jumps glide.
 * Focus moves to the target so keyboard users continue from there.
 */
export function scrollToTarget(id: string, { focus = true, instant = false } = {}) {
  const y = targetY(id);
  if (y === null) return false;
  const reduce = document.documentElement.dataset.motion === 'reduce';
  const far = Math.abs(y - window.scrollY) > window.innerHeight * 1.5;
  const html = document.documentElement;

  const jump = () => {
    if (lenis) lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo({ top: y, behavior: 'instant' });
    ScrollTrigger.update();
  };

  if (instant || reduce || !lenis) {
    jump();
  } else if (far) {
    clearTimeout(veilTimer);
    html.classList.add('veil-on');
    veilTimer = window.setTimeout(() => {
      jump();
      requestAnimationFrame(() => html.classList.remove('veil-on'));
    }, 140);
  } else {
    lenis.scrollTo(y, { duration: 0.9, force: true });
  }

  if (focus) focusTarget(id);
  history.replaceState(null, '', id === 'top' ? location.pathname + location.search : `#${id}`);
  return true;
}

function focusTarget(id: string) {
  const el = id === 'top' ? document.getElementById('hero-title') : document.getElementById(id);
  if (!el) return;
  const target =
    (el.matches('[tabindex="-1"]') ? el : el.querySelector<HTMLElement>('[tabindex="-1"]')) ??
    (() => {
      el.setAttribute('tabindex', '-1');
      return el;
    })();
  target.focus({ preventScroll: true });
}

/** Routes every same-page link through scrollToTarget. */
export function interceptHashLinks() {
  const onClick = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element).closest?.('a[href^="#"]');
    if (!a) return;
    const id = decodeURIComponent(a.getAttribute('href')!.slice(1));
    if (scrollToTarget(id || 'top')) e.preventDefault();
  };
  document.addEventListener('click', onClick);
  return () => document.removeEventListener('click', onClick);
}
