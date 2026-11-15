// Global input tracking for the bot: cursor position, idle time, and fast shakes.

export const input = {
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  hasPointer: false,
  lastInput: performance.now(),
  /** performance.now() of the last detected shake, or 0. */
  shakeAt: 0,
};

let lastX = 0;
let lastT = 0;
let lastDir = 0;
const reversals: number[] = [];

function touch() {
  input.lastInput = performance.now();
}

function onMove(e: PointerEvent) {
  const now = performance.now();
  input.x = e.clientX;
  input.y = e.clientY;
  input.hasPointer = true;
  touch();
  const dt = Math.max(1, now - lastT);
  const vx = ((e.clientX - lastX) / dt) * 1000;
  lastX = e.clientX;
  lastT = now;
  if (Math.abs(vx) > 1400) {
    const dir = Math.sign(vx);
    if (dir !== lastDir && lastDir !== 0) {
      reversals.push(now);
      while (reversals.length && now - reversals[0] > 650) reversals.shift();
      if (reversals.length >= 5) {
        input.shakeAt = now;
        reversals.length = 0;
      }
    }
    lastDir = dir;
  }
}

let started = false;
export function startInput() {
  if (started) return;
  started = true;
  if (import.meta.env.DEV) (window as unknown as { __input: typeof input }).__input = input;
  window.addEventListener('pointermove', onMove, { passive: true });
  for (const ev of ['pointerdown', 'keydown', 'wheel', 'scroll', 'touchstart'] as const) {
    window.addEventListener(ev, touch, { passive: true });
  }
}
