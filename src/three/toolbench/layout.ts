import type { Stage } from '../../content/portfolio';

// The toolbench lives in its own corner of the scene, far from the machine.
export const BENCH = { x: 30, z: 0 };
export const TRAY = { w: 1.12, d: 0.86, gap: 0.18, wall: 0.035, h: 0.07 };
export const TRAY_ORDER: Stage[] = ['data', 'model', 'system'];

/** Centre of a tray on the bench. */
export function trayCenter(tray: Stage): [number, number] {
  const i = TRAY_ORDER.indexOf(tray);
  return [BENCH.x + (i - 1) * (TRAY.w + TRAY.gap), BENCH.z - 0.55];
}

/** Slot k (0..5) inside a tray: two columns, three rows. */
export function traySlot(tray: Stage, k: number): [number, number, number] {
  const [cx, cz] = trayCenter(tray);
  const col = k % 2;
  const row = Math.floor(k / 2);
  return [cx + (col - 0.5) * 0.5, 0.06, cz + (row - 1) * 0.25];
}

export const TAG_DEPTH = 0.11;
export const TAG_THICK = 0.022;
export const tagWidth = (name: string) => Math.min(0.48, 0.17 + name.length * 0.021);
