// Render mode for the whole page, re-evaluated when the media queries change.
//   live:   a wide, landscape window with WebGL and motion allowed: the pinned stage, the 3D
//           scene, physics, the cursor and sound.
//   static: everything else: phones, portrait tablets, short or narrow windows, reduced motion,
//           no WebGL or a lost WebGL context. Still frames, normal flow, native scrolling.
// html[data-size] is 'compact' on the small or squarish screens, for layout (no floating dock).
import { useSyncExternalStore } from 'react';

export type Mode = 'live' | 'static';

const mq = (q: string) => window.matchMedia(q);
const reducedMq = mq('(prefers-reduced-motion: reduce)');
/** Too small or too square for the scroll-driven scene beside the copy. */
const compactMq = mq('(max-width: 999px), (max-height: 559px), (max-aspect-ratio: 23/20)');
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
  if (forceStatic || reducedMq.matches || contextLost || compactMq.matches || !hasWebGL()) return 'static';
  return 'live';
}

let current: Mode = compute();

function apply() {
  const html = document.documentElement;
  html.dataset.mode = current;
  html.dataset.motion = reducedMq.matches ? 'reduce' : 'ok';
  html.dataset.size = compactMq.matches ? 'compact' : 'wide';
}
apply();

reducedMq.addEventListener('change', emit);
compactMq.addEventListener('change', emit);

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
