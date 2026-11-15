// Machine layout in scene units. No three.js imports, so the DOM side (readouts, timeline)
// can use it without pulling the 3D bundle into the main chunk.

// The machine stands on the bench at the origin.
export const CORE_R = 0.56;
export const HOLE_R = 0.13;
export const LAYER_H = 0.32;
export const LAYER_GAP = 0.04;
export const LAYER_Y0 = 0.3;
export const LAYERS = 4;
export const layerY = (i: number) => LAYER_Y0 + i * (LAYER_H + LAYER_GAP);
export const CROWN_Y = layerY(LAYERS);
export const SPINE_TOP = CROWN_Y + 0.42;

export type PlateSpec = {
  name: string;
  slug: string;
  /** Angle around the machine, from +Z (facing the camera), positive toward +X. Degrees. */
  angle: number;
  span: number;
  y0: number;
  y1: number;
};

export const PLATES: PlateSpec[] = [
  { name: 'Gates', slug: 'gates', angle: -48, span: 62, y0: 0.34, y1: 0.84 },
  { name: 'Retrieval', slug: 'retrieval', angle: 50, span: 60, y0: 0.4, y1: 0.9 },
  { name: 'Human review', slug: 'human-review', angle: 0, span: 56, y0: 0.94, y1: 1.42 },
  { name: 'API', slug: 'api', angle: -58, span: 58, y0: 1.06, y1: 1.52 },
  { name: 'Interface', slug: 'interface', angle: 58, span: 58, y0: 1.12, y1: 1.62 },
];

export const PLATE_R0 = 0.615;
export const PLATE_R1 = 0.655;

