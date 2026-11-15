import { useEffect, useRef, useState } from 'react';
import { BOOT_STEPS, bootReady, isBooted, onBoot, setPowered, type BootStep } from '../lib/boot';
import { getLenis } from '../lib/scroll';
import { powerOn } from '../lib/sound';
import { stage } from '../lib/stage';

/** How far along the bar each finished step takes it. */
const CAP: Record<BootStep, number> = { fonts: 12, scene: 55, materials: 85, bot: 100 };
const SHOWN: { step: BootStep; label: string }[] = [
  { step: 'scene', label: 'scene' },
  { step: 'materials', label: 'materials' },
  { step: 'bot', label: 'bot' },
];
const MIN_FILL_MS = 900;
const FALLBACK_MS = 7000;
const SEGMENTS = 24;

/** Studio lights while powering on: two fluorescent flickers, then full. */
function flicker(ms: number) {
  const keys: [number, number][] = [[0, 0], [70, 0.9], [130, 0.2], [210, 1], [270, 0.45], [340, 1], [9e9, 1]];
  for (let i = 0; i < keys.length - 1; i++) {
    const [t0, v0] = keys[i];
    const [t1, v1] = keys[i + 1];
    if (ms < t1) return v0 + (v1 - v0) * Math.min(1, (ms - t0) / Math.min(60, t1 - t0));
  }
  return 1;
}

/**
 * The power-on gate: a systems check while the workshop loads, then one Power on button. The
 * click is what lets the browser play sound, so every visitor hears the workshop.
 */
export function PowerGate() {
  const [phase, setPhase] = useState<'boot' | 'ready' | 'leaving' | 'gone'>('boot');
  const [pct, setPct] = useState(0);
  const [, setTick] = useState(0);
  const button = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);

  // While the gate is up: no scrolling, and the page behind can't be focused or clicked. Released
  // once the gate has gone (or if it unmounts, say when the page falls back to static mode).
  const up = phase !== 'gone';
  useEffect(() => {
    if (!up) return;
    const html = document.documentElement;
    html.dataset.gate = '1';
    const app = document.getElementById('root')!;
    const lock = () => {
      for (const el of app.children) if (el !== root.current && !el.hasAttribute('inert')) el.setAttribute('inert', '');
    };
    lock();
    // Later arrivals (the lazy canvas, the bot's speech tag) are locked too.
    const mo = new MutationObserver(lock);
    mo.observe(app, { childList: true });
    getLenis()?.stop();
    box.current?.focus();
    return () => {
      mo.disconnect();
      delete html.dataset.gate;
      for (const el of app.children) el.removeAttribute('inert');
      getLenis()?.start();
    };
  }, [up]);

  // Progress: eases toward the last finished step and creeps toward the next, never faster than
  // MIN_FILL_MS overall; ready once every step has reported (or after FALLBACK_MS).
  useEffect(() => {
    const t0 = performance.now();
    let lastStepAt = t0;
    let shown = 0;
    let raf = 0;
    const off = onBoot(() => {
      lastStepAt = performance.now();
      setTick((n) => n + 1);
    });
    const frame = () => {
      const now = performance.now();
      const doneCap = BOOT_STEPS.reduce((m, s) => (isBooted(s) ? Math.max(m, CAP[s]) : m), 0);
      const next = BOOT_STEPS.find((s) => !isBooted(s));
      const creep = next ? (CAP[next] - doneCap) * 0.6 * (1 - Math.exp(-(now - lastStepAt) / 1500)) : 0;
      const forced = now - t0 > FALLBACK_MS;
      const goal = forced ? 100 : Math.min(doneCap + creep, ((now - t0) / MIN_FILL_MS) * 100);
      shown += (goal - shown) * 0.12;
      if (goal - shown < 0.4) shown = goal;
      setPct(Math.round(shown));
      if ((bootReady() || forced) && shown >= 99.5) {
        setPhase('ready');
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      off();
    };
  }, []);

  useEffect(() => {
    if (phase === 'ready') button.current?.focus();
  }, [phase]);

  const power = () => {
    if (phase !== 'ready') return;
    void powerOn();
    setPowered();
    setPhase('leaving');
    const t0 = performance.now();
    const lights = () => {
      const ms = performance.now() - t0;
      stage.power = flicker(ms);
      if (ms < 400) requestAnimationFrame(lights);
      else stage.power = 1;
    };
    requestAnimationFrame(lights);
  };

  if (phase === 'gone') return null;
  const lit = Math.round((pct / 100) * SEGMENTS);
  return (
    <div
      ref={root}
      className="gate"
      data-phase={phase}
      onAnimationEnd={(e) => {
        if (e.animationName === 'gate-crt' && phase === 'leaving') {
          (document.activeElement as HTMLElement | null)?.blur();
          setPhase('gone');
        }
      }}
    >
      <div ref={box} className="gate-box" role="dialog" aria-modal="true" aria-labelledby="gate-title" tabIndex={-1}>
        <p id="gate-title" className="gate-title">
          Workshop <span aria-hidden="true">·</span> systems check
        </p>
        <div className="gate-bar" role="progressbar" aria-label="Loading the workshop" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
          <span className="gate-segs" aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <i key={i} data-on={i < lit || undefined} />
            ))}
          </span>
          <span className="gate-pct">{pct}%</span>
        </div>
        <ul className="gate-checks">
          {SHOWN.map(({ step, label }) => (
            <li key={step} data-done={isBooted(step) || phase !== 'boot' || undefined}>
              <span className="gate-tick" aria-hidden="true">
                {isBooted(step) || phase !== 'boot' ? '✓' : '…'}
              </span>
              {label}
            </li>
          ))}
        </ul>
        <button ref={button} type="button" className="btn btn-hot gate-power" disabled={phase === 'boot'} onClick={power}>
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path d="M12 3v8" />
            <path d="M6.3 6.8a8 8 0 1 0 11.4 0" />
          </svg>
          {phase === 'boot' ? 'Loading…' : 'Power on'}
        </button>
      </div>
    </div>
  );
}
