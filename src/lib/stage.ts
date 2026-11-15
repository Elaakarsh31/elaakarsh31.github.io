// Shared, mutable state for the build. The master timeline writes `p`; the scene, the HUD,
// the rail and the readouts read it every frame. Nothing here triggers a React render.

export const BUILD_LENGTH = 400; // vh of scroll for the hero exit and the three acts

export const stage = {
  /** Timeline position in vh of scroll inside the build, 0..BUILD_LENGTH. */
  p: 0,
  /** Which project sheet is hovered, for lighting the machine. */
  highlight: null as null | { chips: string[]; plates: string[] },
  /** Drag-to-orbit offset in radians, eased back to zero on release. */
  orbit: { yaw: 0, pitch: 0 },
};

/**
 * A section that lives inside the pinned stage. Both values are window.scrollY positions:
 * `range` is when the section is current, `landing` is where links to it should scroll.
 */
export type SectionReg = { range: () => [number, number]; landing: () => number };

const sections = new Map<string, SectionReg>();

export function registerSection(id: string, reg: SectionReg) {
  sections.set(id, reg);
  return () => {
    if (sections.get(id) === reg) sections.delete(id);
  };
}

export const getSection = (id: string) => sections.get(id);

/** Range of a normal section in document pixels. */
export function elementRange(id: string): [number, number] | null {
  const el = document.getElementById(id);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  return [top, top + rect.height];
}

export const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
