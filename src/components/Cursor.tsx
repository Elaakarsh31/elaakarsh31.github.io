import { useEffect, useRef } from 'react';

/** Interactive things the glow warms up over. */
const HOT = 'a[href], button, summary, [role="option"], .sheet, .callout';
const TRAIL = 6;

/**
 * A clean arrow cursor (drawn in CSS, see chrome.css) with a soft Holo glow that follows a beat
 * behind it, plus a short comet trail while it moves. Over links and controls the glow warms to
 * Molten and swells; it pulses on press. Fine pointers only, never with reduced motion.
 */
export function Cursor() {
  const glow = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('has-cursor');
    const g = glow.current!;
    const dots = [...trail.current!.children] as HTMLElement[];
    // Offset from the arrow's tip to its visual centre, so the glow sits behind the arrow.
    const OX = 7;
    const OY = 9;
    let x = -200;
    let y = -200;
    let gx = x;
    let gy = y;
    const pts = dots.map(() => ({ x, y }));
    let visible = false;
    let hot = false;
    let raf = 0;

    const setState = (key: string, on: boolean) => {
      if (on) g.dataset[key] = '1';
      else delete g.dataset[key];
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        gx = x;
        gy = y;
        pts.forEach((p) => {
          p.x = x;
          p.y = y;
        });
        html.dataset.cursorOn = '1';
      }
      const el = e.target instanceof Element ? e.target.closest(HOT) : null;
      if (!!el !== hot) {
        hot = !!el;
        setState('hot', hot);
      }
    };
    const onLeave = () => {
      visible = false;
      delete html.dataset.cursorOn;
    };
    const onDown = () => setState('press', true);
    const onUp = () => setState('press', false);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      // The glow lags behind, then settles onto the arrow.
      const px = gx;
      const py = gy;
      gx += (x + OX - gx) * 0.16;
      gy += (y + OY - gy) * 0.16;
      const vx = gx - px;
      const vy = gy - py;
      const speed = Math.min(1, Math.hypot(vx, vy) / 24);
      const angle = Math.atan2(vy, vx);
      g.style.transform = `translate3d(${gx}px, ${gy}px, 0) rotate(${angle}rad) scale(${1 + speed * 0.45}, ${1 - speed * 0.25})`;
      // Comet trail: each dot chases the one before it, fading out when still.
      let lx = x + OX * 0.4;
      let ly = y + OY * 0.4;
      pts.forEach((p, i) => {
        p.x += (lx - p.x) * 0.42;
        p.y += (ly - p.y) * 0.42;
        const d = dots[i];
        const gap = Math.hypot(lx - p.x, ly - p.y);
        d.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
        d.style.opacity = String(Math.min(1, gap / 6) * (1 - i / TRAIL) * 0.9);
        lx = p.x;
        ly = p.y;
      });
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
      <div ref={trail} className="cursor-trail" aria-hidden="true">
        {Array.from({ length: TRAIL }, (_, i) => (
          <i key={i} style={{ ['--i' as string]: i }} />
        ))}
      </div>
      <div ref={glow} className="cursor-glow" aria-hidden="true" />
    </>
  );
}
