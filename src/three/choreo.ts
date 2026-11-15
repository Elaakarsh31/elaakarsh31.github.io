// The build, as pure functions of the timeline position p (vh of scroll inside #build, 0..400).
// Everything scroll-driven reads from here, so scrolling back plays the build in reverse and
// a capture can render any moment exactly.
import { Vector3 } from 'three';
import { clamp01 } from '../lib/stage';
import { CORE_R, LAYERS, LAYER_H, PLATES, layerY } from './machine/parts';

export const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeIn = (t: number) => t * t * t;
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** 0 → 1 → 0 bump: rises over [a, b], falls over [b, c]. */
export const bump = (p: number, a: number, b: number, c: number) => (p < b ? seg(p, a, b) : 1 - seg(p, b, c));

export const ACT = { heroEnd: 40, data: [40, 160], model: [160, 280], system: [280, 400] } as const;

// ---------------------------------------------------------------------------------------------
// Hero → assembled

/** 1 in the hero's exploded view, 0 once the parts have glided to their assembled positions. */
export const explode = (p: number) => 1 - easeInOut(seg(p, 4, 38));

/** Exploded offsets, scaled by explode(p). */
export const layerLift = (i: number) => 0.06 + i * 0.11;
export const crownLift = 0.58;
export const plateOut = (k: number) => 0.42 + (k % 2) * 0.1;

/** Brightness of hologram parts that are not built yet: full in the hero, a faint blueprint after. */
export const blueprint = (p: number) => lerp(1, 0.42, easeInOut(seg(p, 6, 40)));

// ---------------------------------------------------------------------------------------------
// Act 2: model

const M0 = 170; // first layer starts
const MSTEP = 20; // timeline units per layer

/** Fabricated fraction of core layer i. Layer 0 is half built in the hero. */
export function layerFab(i: number, p: number) {
  const start = i === 0 ? 0.45 : 0;
  const t0 = M0 + i * MSTEP + 7;
  return lerp(start, 1, easeInOut(seg(p, t0, t0 + 7)));
}

export const crownFab = (p: number) => easeInOut(seg(p, 252, 262));

/** Weld window for the seam on top of layer k (k = 0..3, 3 is the crown seam). */
export const weldWindow = (k: number): [number, number] => [M0 + k * MSTEP + 12, M0 + k * MSTEP + 20];

/** Heat of a layer seam: rises while welded, then cools. */
export function seamHeat(k: number, p: number) {
  const [w0] = weldWindow(k);
  return bump(p, w0, w0 + 5, w0 + 16);
}

/** The hero weld at the half-built layer's fabrication line. */
export const heroWeld = (p: number) => 1 - seg(p, 10, 22);

/** Filaments between built layers flicker on as the core spins up. */
export const filaments = (p: number) => seg(p, 196, 206) * (1 - seg(p, 292, 314));

/** Core rotation in radians: two full turns while spinning up, ending aligned for the plates. */
export const coreSpin = (p: number) => Math.PI * 4 * easeInOut(seg(p, 226, 286));

/** Loss readout: from ln(12.07) to ln(4.56), the cross-entropy the two perplexities imply. */
export const LOSS_FROM = Math.log(12.07);
export const LOSS_TO = Math.log(4.56);
export function loss(p: number) {
  const t = seg(p, 170, 250);
  // Training-curve shape: fast early drop, long tail.
  const shape = 1 - Math.exp(-3.2 * t);
  return lerp(LOSS_FROM, LOSS_TO, shape / (1 - Math.exp(-3.2)));
}

// ---------------------------------------------------------------------------------------------
// Act 3: system

const S0 = 290;
const SSTEP = 15;
export const plateStart = (k: number) => S0 + k * SSTEP;
export const plateLockAt = (k: number) => plateStart(k) + 11;

export function plateState(k: number, p: number) {
  const s = plateStart(k);
  const swing = easeOut(seg(p, s + 3, s + 11));
  return {
    ghost: seg(p, s, s + 3),
    swing,
    fab: seg(p, s + 2, s + 6), // metal appears as it swings in
    flash: bump(p, s + 10.6, s + 11.2, s + 13.5),
    locked: p >= s + 11,
  };
}

export const platesLocked = (p: number) => PLATES.reduce((n, _, k) => n + (p >= plateLockAt(k) ? 1 : 0), 0);

/** Power-on: the pulse runs base → crown once on scroll, then repeats on a timer. */
export const power = (p: number) => seg(p, 366, 378);
export const powered = (p: number) => p >= 378;

// ---------------------------------------------------------------------------------------------
// Act 1: data

export const REFINERY = new Vector3(-2.35, 0.64, 0.35);
export const RING_R = 0.36;
export const FRAGMENTS = 12;
export const BLOCK = 0.13;

/** Grid slot for block j: 3 rows × 4 columns on the bench between the ring and the machine. */
export function blockSlot(j: number, out = new Vector3()) {
  const col = j % 4;
  const row = Math.floor(j / 4);
  return out.set(-1.82 + col * 0.19, BLOCK / 2, 0.05 + row * 0.24);
}

/** Window in which fragment j crosses the refinery. */
export const fragWindow = (j: number): [number, number] => {
  const t0 = 70 + j * 4.6;
  return [t0, t0 + 12];
};

/** Fragments drift in during the hero exit. */
export const fragmentsIn = (p: number) => easeOut(seg(p, 14, 46));

/** Window in which block j lifts into its layer during Act 2. */
export function blockLiftWindow(j: number): [number, number] {
  const i = Math.floor(j / 3);
  const m = j % 3;
  const t0 = M0 + i * MSTEP + m * 2;
  return [t0, t0 + 7];
}

/** Where block j joins its layer: on the front of the layer, spread across three angles. */
export function blockJoinPoint(j: number, out = new Vector3()) {
  const i = Math.floor(j / 3);
  const m = j % 3;
  const a = ((-28 + m * 28) * Math.PI) / 180;
  return out.set(Math.sin(a) * (CORE_R - 0.08), layerY(i) + LAYER_H / 2, Math.cos(a) * (CORE_R - 0.08));
}

export const LAYER_COUNT = LAYERS;
