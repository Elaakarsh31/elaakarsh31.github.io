// The build, as pure functions of the timeline position p. The scalar timing lives in timing.ts
// (no three.js, so the DOM can share it); this file adds the positions the scene needs.
import { Vector3 } from 'three';
import { CORE_R, LAYER_H, layerY } from './machine/layout';

export * from './timing';

export const REFINERY = new Vector3(-2.35, 0.64, 0.35);
export const RING_R = 0.36;
export const BLOCK = 0.13;

/** Grid slot for block j: 3 rows × 4 columns on the bench between the ring and the machine. */
export function blockSlot(j: number, out = new Vector3()) {
  const col = j % 4;
  const row = Math.floor(j / 4);
  return out.set(-1.82 + col * 0.19, BLOCK / 2, 0.05 + row * 0.24);
}

/** Where block j joins its layer: on the front of the layer, spread across three angles. */
export function blockJoinPoint(j: number, out = new Vector3()) {
  const i = Math.floor(j / 3);
  const m = j % 3;
  const a = ((-28 + m * 28) * Math.PI) / 180;
  return out.set(Math.sin(a) * (CORE_R - 0.08), layerY(i) + LAYER_H / 2, Math.cos(a) * (CORE_R - 0.08));
}

