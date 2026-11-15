// Optional sound, synthesized with Web Audio: a soft click when a plate locks, a faint crackle
// while the bot welds. Off by default; the choice is remembered per browser.
const KEY = 'workshop-sound';

let enabled = false;
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let crackleGain: GainNode | null = null;
const listeners = new Set<(on: boolean) => void>();

try {
  enabled = localStorage.getItem(KEY) === 'on';
} catch {
  enabled = false;
}

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
  return ctx;
}

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch {
    /* storage may be unavailable; the toggle still works for this visit */
  }
  if (on) void ensure()?.resume();
  else void ctx?.suspend();
  listeners.forEach((l) => l(on));
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

/** Crackle level while welding, 0..1. Called every frame by the scene. */
export function setCrackle(level: number) {
  if (!crackleGain || !ctx) return;
  const target = enabled ? Math.min(1, level) * 0.22 : 0;
  crackleGain.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
}
