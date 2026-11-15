import { Vector3 } from 'three';

const d = new Vector3();
const dir = new Vector3();
const bend = new Vector3();

/**
 * Two-bone analytic IK. Returns the elbow position for a shoulder S reaching for target T, with
 * the elbow bending toward the pole direction. The reachable target is written back to `tOut`.
 */
export function solveTwoBone(S: Vector3, T: Vector3, l1: number, l2: number, pole: Vector3, elbowOut: Vector3, tOut: Vector3) {
  d.subVectors(T, S);
  let dist = d.length();
  dist = Math.min(Math.max(dist, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
  dir.copy(d).normalize();
  if (!Number.isFinite(dir.x)) dir.set(0, -1, 0);
  tOut.copy(S).addScaledVector(dir, dist);
  const cosA = (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  bend.copy(pole).addScaledVector(dir, -pole.dot(dir));
  if (bend.lengthSq() < 1e-8) bend.set(0, -1, 0);
  bend.normalize();
  elbowOut.copy(S).addScaledVector(dir, cosA * l1).addScaledVector(bend, sinA * l1);
  return elbowOut;
}
