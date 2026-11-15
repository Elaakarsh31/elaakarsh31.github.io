import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { portfolio } from '../content/portfolio';
import { BUILD_LENGTH, stage } from '../lib/stage';
import { fragWindow, loss, platesLocked } from '../three/timing';

const R = 15;
const CIRC = 2 * Math.PI * R;

/** Readouts at the stage edge: current act, build progress gauge, and a live value per act. */
export function StageReadouts() {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = root.current!;
    const gauge = el.querySelector<SVGCircleElement>('.ro-gauge-fill')!;
    const pct = el.querySelector<HTMLElement>('[data-ro="pct"]')!;
    const act = el.querySelector<HTMLElement>('[data-ro="act"]')!;
    const label = el.querySelector<HTMLElement>('[data-ro="label"]')!;
    const value = el.querySelector<HTMLElement>('[data-ro="value"]')!;
    let last = -1;

    const tick = () => {
      const p = stage.p;
      if (p === last) return;
      last = p;
      const k = p / BUILD_LENGTH;
      gauge.style.strokeDashoffset = (CIRC * (1 - k)).toFixed(2);
      pct.textContent = `${Math.round(k * 100)}%`;
      const current = p < 40 ? null : portfolio.acts.find((a) => p < a.to) ?? portfolio.acts[2];
      act.textContent = current ? `Act ${current.index}, ${current.id[0].toUpperCase()}${current.id.slice(1)}` : 'Blueprint';
      if (!current) {
        label.textContent = 'parts';
        value.textContent = 'exploded';
      } else if (current.id === 'data') {
        const refined = Array.from({ length: 12 }, (_, j) => (p >= fragWindow(j)[0] + 7.5 ? 1 : 0)).reduce<number>((a, b) => a + b, 0);
        label.textContent = 'refined';
        value.textContent = `${refined}/12`;
      } else if (current.id === 'model') {
        label.textContent = 'loss';
        value.textContent = loss(p).toFixed(3);
      } else {
        label.textContent = 'plates locked';
        value.textContent = `${platesLocked(p)}/5`;
      }
      el.dataset.act = current?.id ?? 'hero';
    };
    gsap.ticker.add(tick);
    tick();
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <div className="readouts" ref={root}>
      <svg className="ro-gauge" viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
        <circle cx="20" cy="20" r={R} className="ro-gauge-track" />
        <circle cx="20" cy="20" r={R} className="ro-gauge-fill" strokeDasharray={CIRC.toFixed(2)} strokeDashoffset={CIRC.toFixed(2)} />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="20" y1="1.5" x2="20" y2={i % 3 ? 3.2 : 4.6} transform={`rotate(${i * 30} 20 20)`} className="ro-tick" />
        ))}
      </svg>
      <div className="ro-text">
        <p className="ro-act">
          <span data-ro="act">Blueprint</span>
          <span className="ro-pct" data-ro="pct">
            0%
          </span>
        </p>
        <p className="ro-metric">
          <span data-ro="label">parts</span> <span className="ro-value" data-ro="value">exploded</span>
        </p>
      </div>
    </div>
  );
}
