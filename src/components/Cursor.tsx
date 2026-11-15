import { useEffect, useRef } from 'react';

const WRAP = 'a[href], button, summary, input, .sheet, .callout, [data-cursor="wrap"]';
const PAD = 6;

/**
 * Precision ring with four tick marks, for fine pointers only. Over a link or card it wraps the
 * element's bounds as a thin outline, then snaps back. Mounted only when motion is allowed.
 */
export function Cursor() {
  const ring = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('has-cursor');
    const r = ring.current!;
    const d = dot.current!;
    let x = -100;
    let y = -100;
    let rx = x;
    let ry = y;
    let w = 30;
    let h = 30;
    let target: Element | null = null;
    let visible = false;
    let raf = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX;
      y = e.clientY;
      if (!visible) {
        visible = true;
        rx = x;
        ry = y;
        r.dataset.on = d.dataset.on = '1';
      }
      const el = (e.target as Element | null)?.closest?.(WRAP) ?? null;
      // Large elements (whole sheets) wrap only when the pointer is not on a smaller control.
      if (el !== target) {
        target = el;
        r.dataset.wrap = el ? '1' : '';
      }
    };
    const onLeave = () => {
      visible = false;
      r.dataset.on = d.dataset.on = '';
    };
    const onDown = () => (r.dataset.press = '1');
    const onUp = () => (r.dataset.press = '');

    const frame = () => {
      raf = requestAnimationFrame(frame);
      d.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      let tx = x;
      let ty = y;
      let tw = 30;
      let th = 30;
      let radius = 999;
      if (target && target.isConnected) {
        const b = target.getBoundingClientRect();
        tx = b.left + b.width / 2;
        ty = b.top + b.height / 2;
        tw = b.width + PAD * 2;
        th = b.height + PAD * 2;
        radius = Math.min(parseFloat(getComputedStyle(target).borderTopLeftRadius) + PAD || PAD, 18);
      }
      const k = target ? 0.32 : 0.45;
      rx += (tx - rx) * k;
      ry += (ty - ry) * k;
      w += (tw - w) * 0.3;
      h += (th - h) * 0.3;
      r.style.transform = `translate3d(${rx - w / 2}px, ${ry - h / 2}px, 0)`;
      r.style.width = `${w}px`;
      r.style.height = `${h}px`;
      r.style.borderRadius = `${target ? radius : 999}px`;
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
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
    };
  }, []);

  return (
    <>
      <div ref={ring} className="cursor-ring" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </div>
      <div ref={dot} className="cursor-dot" aria-hidden="true" />
    </>
  );
}
