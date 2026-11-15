// Render mode for the whole page, re-evaluated when the media queries change.
//   live:   desktop or tablet with WebGL and motion allowed (pinned stage, physics, cursor)
//   phone:  narrow screens: live hero canvas, still frames for the acts, tag chips
//   static: reduced motion, no WebGL, or a lost WebGL context: still frames everywhere
import { useSyncExternalStore } from 'react';

export type Mode = 'live' | 'phone' | 'static';

const mq = (q: string) => window.matchMedia(q);
const reducedMq = mq('(prefers-reduced-motion: reduce)');
const phoneMq = mq('(max-width: 767px)');
const finePointerMq = mq('(hover: hover) and (pointer: fine)');

let webgl: boolean | null = null;
/** WebGL2 (or WebGL) can be created. Checked once. */
export function hasWebGL() {
  if (webgl !== null) return webgl;
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    webgl = !!gl;
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    webgl = false;
  }
  return webgl;
}

const params = new URLSearchParams(location.search);
/** ?static forces the static layout, for checks and screenshots. */
const forceStatic = params.has('static');

let contextLost = false;
const listeners = new Set<() => void>();
const emit = () => {
  current = compute();
  apply();
  listeners.forEach((l) => l());
};

function compute(): Mode {
  if (forceStatic || reducedMq.matches || contextLost || !hasWebGL()) return 'static';
  return phoneMq.matches ? 'phone' : 'live';
}

let current: Mode = compute();

function apply() {
  const html = document.documentElement;
  html.dataset.mode = current;
  html.dataset.motion = reducedMq.matches ? 'reduce' : 'ok';
}
apply();

reducedMq.addEventListener('change', emit);
phoneMq.addEventListener('change', emit);

export function getMode() {
  return current;
}

export function subscribeMode(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useMode() {
  return useSyncExternalStore(subscribeMode, getMode);
}

/** Called when the WebGL context is lost: the page switches to still frames for good. */
export function markContextLost() {
  if (contextLost) return;
  contextLost = true;
  emit();
}

export const prefersReducedMotion = () => reducedMq.matches;
export const hasFinePointer = () => finePointerMq.matches;
export const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
