// Sound, synthesized with Web Audio: a scan chirp as each data fragment passes the refinery ring
// and a soft knock as its block lands, a click when a plate locks, a faint crackle while the bot
// welds. On by default (the toggle turns it off, and the choice is remembered per browser).
// Browsers only allow audio after a click, tap or key press, so the power-on gate asks for one
// (powerOn), and any other first gesture unlocks it too; scrolling alone does not count.
const KEY = 'workshop-sound';

let enabled = true;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let crackleGain: GainNode | null = null;
let noise: AudioBuffer | null = null;
const listeners = new Set<(on: boolean) => void>();

try {
  enabled = localStorage.getItem(KEY) !== 'off';
} catch {
  enabled = true;
}

/** Start (or resume) audio inside the first user gesture, which Safari and Chrome both require. */
const GESTURES = ['pointerdown', 'mousedown', 'touchend', 'keydown', 'click'] as const;
function unlock() {
  // No sound where nothing moves (reduced motion, no WebGL).
  if (!enabled || document.documentElement.dataset.mode === 'static') return;
  const c = ensure();
  if (!c) return;
  if (c.state !== 'running') void c.resume();
  if (c.state === 'running') GESTURES.forEach((g) => window.removeEventListener(g, unlock, true));
}
GESTURES.forEach((g) => window.addEventListener(g, unlock, true));

export const isSoundOn = () => enabled;

export function onSoundChange(fn: (on: boolean) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function ensure() {
  if (ctx) return ctx;
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  // Crackle: looping noise through a band-pass, gated by the weld level.
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() < 0.012 ? (Math.random() * 2 - 1) : (Math.random() * 2 - 1) * 0.04;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 3200;
  band.Q.value = 0.8;
  crackleGain = ctx.createGain();
  crackleGain.gain.value = 0;
  src.connect(band).connect(crackleGain).connect(master);
  src.start();
  // A short white-noise buffer for the refinery scan.
  noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.3), ctx.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  return ctx;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage may be unavailable; the toggle still works for this visit */
  }
  if (on) {
    const c = ensure();
    if (c && c.state !== 'running') void c.resume();
  } else void ctx?.suspend();
  listeners.forEach((l) => l(on));
}

/**
 * The Power on button: start audio inside the click, turn sound on, and play the power-up: a
 * relay clunk, then a mains hum that swells as the lights come up and settles away.
 */
export async function powerOn() {
  const c = ensure();
  if (!c) return;
  setSoundOn(true);
  try {
    await c.resume();
  } catch {
    return;
  }
  if (!master || !noise) return;
  const t = c.currentTime + 0.02;
  // Relay clunk: a low thump with a short burst of filtered noise on top.
  const thump = c.createOscillator();
  const tg = c.createGain();
  thump.type = 'sine';
  thump.frequency.setValueAtTime(150, t);
  thump.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  tg.gain.setValueAtTime(0.0001, t);
  tg.gain.exponentialRampToValueAtTime(0.5, t + 0.006);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  thump.connect(tg).connect(master);
  thump.start(t);
  thump.stop(t + 0.22);
  const burst = c.createBufferSource();
  burst.buffer = noise;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1800;
  const bg = c.createGain();
  bg.gain.setValueAtTime(0.0001, t);
  bg.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
  bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  burst.connect(lp).connect(bg).connect(master);
  burst.start(t);
  burst.stop(t + 0.08);
  // Mains hum: two detuned saws through a low-pass that opens as the lights come up.
  const h0 = t + 0.08;
  const hf = c.createBiquadFilter();
  hf.type = 'lowpass';
  hf.Q.value = 3;
  hf.frequency.setValueAtTime(180, h0);
  hf.frequency.exponentialRampToValueAtTime(900, h0 + 0.45);
  hf.frequency.exponentialRampToValueAtTime(260, h0 + 1.1);
  const hg = c.createGain();
  hg.gain.setValueAtTime(0.0001, h0);
  hg.gain.exponentialRampToValueAtTime(0.16, h0 + 0.3);
  hg.gain.setValueAtTime(0.16, h0 + 0.5);
  hg.gain.exponentialRampToValueAtTime(0.0001, h0 + 1.25);
  hf.connect(hg).connect(master);
  for (const f of [55, 55.7, 110.4]) {
    const o = c.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(hf);
    o.start(h0);
    o.stop(h0 + 1.3);
  }
}

/** A soft mechanical click with a short ping, for a plate locking. */
export function playClick() {
  if (!enabled || !ctx || ctx.state !== 'running' || !master) return;
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(1900, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.06);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + 0.1);
}

const ready = () => enabled && !!ctx && ctx.state === 'running' && !!master;

/**
 * A fragment passing through the refinery ring: a rising band of noise (the scan) under a short
 * two-note chirp. `k` (0..1, the fragment's place in the queue) nudges the pitch so twelve in a
 * row do not sound identical.
 */
export function playScan(k = 0) {
  if (!ready() || !noise) return;
  const c = ctx!;
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  const band = c.createBiquadFilter();
  band.type = 'bandpass';
  band.Q.value = 6;
  band.frequency.setValueAtTime(700, t);
  band.frequency.exponentialRampToValueAtTime(4200, t + 0.16);
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.exponentialRampToValueAtTime(0.16, t + 0.03);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  src.connect(band).connect(ng).connect(master!);
  src.start(t);
  src.stop(t + 0.22);
  const base = 980 * Math.pow(2, (k * 5) / 12);
  const osc = c.createOscillator();
  const og = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(base, t + 0.05);
  osc.frequency.setValueAtTime(base * 1.5, t + 0.1);
  og.gain.setValueAtTime(0.0001, t + 0.05);
  og.gain.exponentialRampToValueAtTime(0.07, t + 0.06);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(og).connect(master!);
  osc.start(t + 0.05);
  osc.stop(t + 0.24);
}

/** A clean block setting down in its row: a soft low knock with a faint tick on top. */
export function playLand() {
  if (!ready()) return;
  const c = ctx!;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(240, t);
  osc.frequency.exponentialRampToValueAtTime(95, t + 0.09);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.22, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
  osc.connect(g).connect(master!);
  osc.start(t);
  osc.stop(t + 0.15);
  const tick = c.createOscillator();
  const tg = c.createGain();
  tick.type = 'triangle';
  tick.frequency.value = 2400;
  tg.gain.setValueAtTime(0.0001, t);
  tg.gain.exponentialRampToValueAtTime(0.05, t + 0.002);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
  tick.connect(tg).connect(master!);
  tick.start(t);
  tick.stop(t + 0.03);
}

/** Crackle level while welding, 0..1. Called every frame by the scene. */
export function setCrackle(level: number) {
  if (!crackleGain || !ctx) return;
  const target = enabled ? Math.min(1, level) * 0.22 : 0;
  crackleGain.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
}
