// Bridge between the toolbench section (DOM) and the physics bench (3D).
let sorted = false;

export const isBenchSorted = () => sorted;

export function setBenchSorted(v: boolean) {
  if (v === sorted) return;
  sorted = v;
  window.dispatchEvent(new CustomEvent('bench:sort', { detail: v }));
}
