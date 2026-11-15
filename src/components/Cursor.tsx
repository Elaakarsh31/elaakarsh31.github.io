import { useEffect, useRef } from 'react';

// What the follower does over different things. Order matters: the first match wins.
const LINKS = 'a[href], button, summary, [role="option"], .callout-face';
const BIG_TEXT = 'h1, h2, .contact-email, .resume-band-line';
const TEXT = 'h3, .sheet-title, .paper-title, .hero-tagline, .act-line, .log-title';

type Mode = 'rest' | 'link' | 'text' | 'big' | 'scene' | 'grab' | 'grabbing';

// [ring size, fill size] per mode, in px: it grows a little, never a lot.
const SIZES: Record<Mode, [number, number]> = {
  rest: [30, 0],
  link: [42, 38],
  text: [50, 46],
  big: [64, 60],
  scene: [40, 0],
  grab: [38, 0],
  grabbing: [26, 0],
};

/**
 * The pointer itself is a Figma-style arrow drawn in CSS (chrome.css), so it never lags. Behind
 * it, a neon Holo ring glides after the pointer with a soft spotlight around it, and over text and
 * links a small disc flips the colours under it (mix-blend difference). Fine pointers only, never
 * with reduced motion.
 */
export function Cursor() {
  const spot = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('has-cursor');
    let x = -300;
    let y = -300;
    let fx = x;
    let fy = y;
    let sx = x;
    let sy = y;
    let ringSize = SIZES.rest[0];
    let fillSize = 0;
    // At rest the ring sits behind the arrow's body; when it grows it centres on the tip.
    let ox = 7;
    let oy = 8;
    let mode: Mode = 'rest';
    let target: Element | null = null;
    let pressed = false;
    let visible = false;
    let raf = 0;

    const modeFor = (el: Element | null): Mode => {
      if (html.dataset.grabbing) return 'grabbing';
      if (html.dataset.grab) return 'grab';
      if (html.dataset.botHover || html.dataset.machineHover) return 'scene';
      if (!el) return 'rest';
      if (el.closest('dialog')) return 'rest';
      if (el.closest(LINKS)) return 'link';
      if (el.closest(BIG_TEXT)) return 'big';
      if (el.closest(TEXT)) return 'text';
      return 'rest';
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      target = e.target instanceof Element ? e.target : null;
      if (!visible) {
        visible = true;
        fx = sx = x;
        fy = sy = y;
        html.dataset.cursorOn = '1';
      }
    };
    const onLeave = () => {
      visible = false;
      delete html.dataset.cursorOn;
    };
    const onDown = () => (pressed = true);
    const onUp = () => (pressed = false);

    const r = ring.current!;
    const f = fill.current!;
    const s = spot.current!;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const next = modeFor(target);
      if (next !== mode) {
        mode = next;
        r.dataset.mode = mode;
      }
      const [rs, fs] = SIZES[mode];
      const press = pressed ? 0.82 : 1;
      ringSize += (rs * press - ringSize) * 0.2;
      fillSize += (fs * press - fillSize) * 0.2;
      const atRest = mode === 'rest' || mode === 'scene' || mode === 'grab' || mode === 'grabbing';
      ox += ((atRest ? 7 : 0) - ox) * 0.2;
      oy += ((atRest ? 8 : 0) - oy) * 0.2;
      const px = fx;
      const py = fy;
      fx += (x + ox - fx) * 0.2;
      fy += (y + oy - fy) * 0.2;
      sx += (x - sx) * 0.07;
      sy += (y - sy) * 0.07;
      const vx = fx - px;
      const vy = fy - py;
      const stretch = Math.min(0.28, Math.hypot(vx, vy) / 70);
      const angle = Math.atan2(vy, vx);
      r.style.width = r.style.height = `${ringSize}px`;
      r.style.transform = `translate3d(${fx}px, ${fy}px, 0) translate(-50%, -50%) rotate(${angle}rad) scale(${1 + stretch}, ${1 - stretch * 0.6})`;
      f.style.width = f.style.height = `${fillSize}px`;
      f.style.transform = `translate3d(${fx}px, ${fy}px, 0) translate(-50%, -50%)`;
      f.style.opacity = fillSize > 1 ? '1' : '0';
      s.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -50%)`;
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      html.classList.remove('has-cursor');
      delete html.dataset.cursorOn;
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <>
      <div ref={spot} className="cur cur-spot" aria-hidden="true" />
      <div ref={fill} className="cur cur-fill" aria-hidden="true" />
      <div ref={ring} className="cur cur-ring" data-mode="rest" aria-hidden="true" />
    </>
  );
}
