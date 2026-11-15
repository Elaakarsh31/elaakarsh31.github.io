// Boot progress for the power-on gate, and the moment the workshop powers on.
// The scene reports real milestones (its code loaded, the first frames drawn); the gate shows
// them as a systems check and waits for the visitor's click, which is also what lets audio play.

export type BootStep = 'fonts' | 'scene' | 'materials' | 'bot';
export const BOOT_STEPS: BootStep[] = ['fonts', 'scene', 'materials', 'bot'];

const done = new Set<BootStep>();
const listeners = new Set<() => void>();
let powered = false;

export function bootStep(step: BootStep) {
  if (done.has(step)) return;
  done.add(step);
  listeners.forEach((l) => l());
}

export const isBooted = (step: BootStep) => done.has(step);
export const bootReady = () => BOOT_STEPS.every((s) => done.has(s));

export function onBoot(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** True once the visitor has pressed Power on (or there is no gate, as in still-frame capture). */
export const isPowered = () => powered;

export function setPowered() {
  if (powered) return;
  powered = true;
  window.dispatchEvent(new Event('workshop:power'));
}
