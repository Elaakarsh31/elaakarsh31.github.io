import { useFrame, useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { PerspectiveCamera, Vector3 } from 'three';
import { easeInOut, seg } from './choreo';
import { BENCH } from './toolbench/layout';
import { CONTACT_CAM } from './afterBuild';
import { fitFov } from './lens';

type Shot = { pos: [number, number, number]; target: [number, number, number]; shift: number; lift?: number; fov?: number };

// Camera framings. `shift` moves the scene right (fraction of the viewport width) so the copy on
// the left never sits over the machine; `lift` moves it down.
export const SHOTS: Record<string, Shot> = {
  hero: { pos: [0.55, 1.8, 8.0], target: [0.12, 1.06, 0], shift: 0.19 },
  data: { pos: [-1.95, 1.85, 7.1], target: [-2.25, 0.64, 0.3], shift: 0.14 },
  model: { pos: [0.95, 1.9, 6.7], target: [0.12, 1.1, 0], shift: 0.15 },
  system: { pos: [0.75, 1.75, 7.4], target: [0.1, 1.06, 0], shift: 0.15 },
  projects: { pos: [0.1, 1.7, 9.6], target: [0.08, 1.08, 0], shift: 0.31 },
  // Career: the bot on its own, close and large on the right, beside the timeline. It sits in the
  // open floor between the machine and the bench, so no later move sweeps across the machine.
  career: { pos: [5.05, 1.64, 5.75], target: [5.0, 1.54, 3.35], shift: 0.27 },
  // Toolbench: centred and a touch further back, so all three trays fit at any window shape.
  toolbench: { pos: [BENCH.x, 3.75, BENCH.z + 4.15], target: [BENCH.x, 0, BENCH.z + 0.02], shift: 0, lift: 0.12 },
  // Contact: straight on, in the gap between the machine and the bench; the bot stands beside the
  // title (afterBuild.contactBotPoint places it from the title's position on screen).
  contact: { pos: [CONTACT_CAM.x, CONTACT_CAM.y, CONTACT_CAM.z], target: [CONTACT_CAM.x, CONTACT_CAM.y, CONTACT_CAM.z - 3], shift: 0, lift: 0 },
  // Still frames: centred, for the compact, reduced-motion and no-WebGL layouts.
  frameHero: { pos: [0.4, 1.75, 7.4], target: [0.12, 1.02, 0], shift: 0 },
  frameData: { pos: [-1.75, 1.5, 5.0], target: [-2.05, 0.6, 0.25], shift: 0 },
  frameModel: { pos: [0.95, 1.9, 6.3], target: [0.12, 1.1, 0], shift: 0 },
  frameSystem: { pos: [0.55, 1.75, 6.9], target: [-0.1, 1.06, 0], shift: 0 },
  frameOg: { pos: [0.7, 1.68, 6.9], target: [0.02, 1.08, 0], shift: 0.16 },
};

/** Camera keyframes along the build: [p, shot]. */
const KEYS: [number, keyof typeof SHOTS][] = [
  [0, 'hero'],
  [8, 'hero'],
  [46, 'data'],
  [150, 'data'],
  [172, 'model'],
  [270, 'model'],
  [292, 'system'],
  [400, 'system'],
];

const a = new Vector3();

let snapNext = false;
/** Puts the camera straight on its next shot, for a cut hidden behind a fade. */
export function snapCamera() {
  snapNext = true;
}
const b = new Vector3();

/** Interpolated shot at timeline position p. */
export function shotAt(p: number, out: { pos: Vector3; target: Vector3; shift: number; lift: number; fov: number }) {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1][0]) i++;
  const [p0, s0] = KEYS[i];
  const [p1, s1] = KEYS[i + 1];
  const k = easeInOut(seg(p, p0, p1));
  const A = SHOTS[s0];
  const B = SHOTS[s1];
  out.pos.copy(a.fromArray(A.pos)).lerp(b.fromArray(B.pos), k);
  out.target.copy(a.fromArray(A.target)).lerp(b.fromArray(B.target), k);
  out.shift = A.shift + (B.shift - A.shift) * k;
  out.lift = (A.lift ?? 0) + ((B.lift ?? 0) - (A.lift ?? 0)) * k;
  out.fov = (A.fov ?? 30) + ((B.fov ?? 30) - (A.fov ?? 30)) * k;
  return out;
}

export type ShotState = ReturnType<typeof newShot>;
export const newShot = () => ({ pos: new Vector3(), target: new Vector3(), shift: 0, lift: 0, fov: 30, rate: 7 });

/**
 * Places the camera. `resolve` returns the shot for this frame (the build timeline, or a section
 * shot after the build); the camera eases toward it so section changes glide.
 */
export function CameraRig({ resolve, immediate }: { resolve: (out: ShotState) => ShotState; immediate: boolean }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  const size = useThree((s) => s.size);
  const cur = useThree(() => newShot());
  const want = useThree(() => newShot());

  useEffect(() => () => camera.clearViewOffset(), [camera]);

  useFrame((_, dt) => {
    resolve(want);
    const k = immediate || snapNext ? 1 : 1 - Math.exp(-Math.min(dt, 0.05) * want.rate);
    snapNext = false;
    if (!Number.isFinite(cur.pos.x) || cur.pos.lengthSq() === 0) {
      cur.pos.copy(want.pos);
      cur.target.copy(want.target);
      cur.shift = want.shift;
      cur.lift = want.lift;
      cur.fov = want.fov;
    }
    cur.pos.lerp(want.pos, k);
    cur.target.lerp(want.target, k);
    cur.shift += (want.shift - cur.shift) * k;
    cur.lift += (want.lift - cur.lift) * k;
    cur.fov += (want.fov - cur.fov) * k;
    camera.position.copy(cur.pos);
    camera.lookAt(cur.target);
    const w = size.width;
    const h = size.height;
    const fov = fitFov(cur.fov, w / h);
    if (Math.abs(camera.fov - fov) > 1e-3) camera.fov = fov;
    camera.setViewOffset(w, h, -cur.shift * w, -cur.lift * h, w, h);
    camera.updateProjectionMatrix();
  }, -2);

  return null;
}
