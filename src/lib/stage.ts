// Shared, mutable state for the build. The master timeline writes `p`; the scene, the HUD,
// the rail and the readouts read it every frame. Nothing here triggers a React render.

export const BUILD_LENGTH = 400; // vh of scroll for the hero exit and the three acts

export const stage = {
  /** Timeline position in vh of scroll inside the build, 0..BUILD_LENGTH. */
  p: 0,
  /** Which project sheet is hovered, for lighting the machine. */
  highlight: null as null | { chips: string[]; plates: string[] },
};

type Range = () => [number, number];
const ranges = new Map<string, Range>();

/**
 * Overrides where a section starts and ends in page scroll pixels. The live stage registers
 * its acts here, because they sit inside one pinned element.
 */
export function registerRange(id: string, range: Range) {
  ranges.set(id, range);
  return () => {
    if (ranges.get(id) === range) ranges.delete(id);
  };
}

export const hasRegisteredRange = (id: string) => ranges.has(id);

/** Section range in document pixels: a registered override or the element's own box. */
export function rangeOf(id: string): [number, number] | null {
  const r = ranges.get(id);
  if (r) return r();
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  return [top, top + rect.height];
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
