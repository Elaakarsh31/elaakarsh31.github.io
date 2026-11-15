import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  ExtrudeGeometry,
  LatheGeometry,
  Shape,
  Vector2,
  mergeGeometries,
  mergeVertices,
} from './geom';

import { CORE_R, HOLE_R, LAYER_H, PLATE_R0, PLATE_R1, SPINE_TOP, type PlateSpec } from './layout';

export * from './layout';

/** A closed lathe profile: (radius, height) pairs, revolved around Y. */
function lathe(points: [number, number][], segments = 72) {
  return new LatheGeometry(
    points.map(([r, y]) => new Vector2(r, y)),
    segments,
  );
}

export const BASE_PROFILE: [number, number][] = [
    [0.0, 0.0],
    [0.86, 0.0],
    [0.9, 0.025],
    [0.9, 0.08],
    [0.885, 0.09],
    [0.885, 0.1],
    [0.9, 0.11],
    [0.9, 0.15],
    [0.86, 0.185],
    [0.72, 0.2],
    [0.7, 0.215],
    [0.7, 0.24],
    [0.2, 0.24],
    [0.2, 0.25],
    [0.0, 0.25],
];
export const baseGeometry = () => lathe(BASE_PROFILE);

/** One core layer, chamfered, with a shallow groove at mid height and a bore for the spine. */
const h = LAYER_H;
const r = CORE_R;
export const LAYER_PROFILE: [number, number][] = [
    [HOLE_R, 0],
    [r - 0.045, 0],
    [r, 0.035],
    [r, h * 0.5 - 0.022],
    [r - 0.012, h * 0.5 - 0.012],
    [r - 0.012, h * 0.5 + 0.012],
    [r, h * 0.5 + 0.022],
    [r, h - 0.035],
    [r - 0.045, h],
    [HOLE_R, h],
    [HOLE_R, 0],
];

/** One core layer with radial fins, merged into one mesh so the fabrication wipe covers both. */
export function layerGeometry(fins: number) {
  const parts: BufferGeometry[] = [lathe(LAYER_PROFILE).toNonIndexed()];
  for (let f = 0; f < fins; f++) {
    const a = (f / fins) * Math.PI * 2 + Math.PI / fins;
    const fin = new BoxGeometry(0.014, h * 0.62, 0.06).toNonIndexed();
    fin.translate(0, h / 2, CORE_R + 0.022);
    fin.rotateY(a);
    parts.push(fin);
  }
  const g = mergeGeometries(parts)!;
  g.computeBoundingBox();
  return g;
}

export const CROWN_PROFILE: [number, number][] = [
    [HOLE_R, 0],
    [0.47, 0],
    [0.5, 0.03],
    [0.5, 0.13],
    [0.44, 0.2],
    [0.26, 0.29],
    [0.16, 0.32],
    [HOLE_R, 0.32],
    [HOLE_R, 0],
];
export const crownGeometry = () => lathe(CROWN_PROFILE);

export function spineGeometry() {
  return new CylinderGeometry(0.11, 0.11, SPINE_TOP - 0.22, 48, 1).translate(0, (SPINE_TOP + 0.22) / 2, 0);
}

/**
 * A curved housing plate: an annular sector extruded upward with a small bevel. Built centered on
 * angle 0 (facing +Z) with its own height from 0 to (y1 - y0), so the group sets angle and height.
 */
export function plateGeometry(spec: PlateSpec) {
  const half = ((spec.span / 2) * Math.PI) / 180;
  const s = new Shape();
  const steps = 24;
  // Shape lives in the XZ plane (x, -z) and is extruded along +Y after the rotation below.
  for (let i = 0; i <= steps; i++) {
    const a = -half + (2 * half * i) / steps;
    const x = Math.sin(a) * PLATE_R1;
    const z = Math.cos(a) * PLATE_R1;
    if (i === 0) s.moveTo(x, -z);
    else s.lineTo(x, -z);
  }
  for (let i = steps; i >= 0; i--) {
    const a = -half + (2 * half * i) / steps;
    s.lineTo(Math.sin(a) * PLATE_R0, -Math.cos(a) * PLATE_R0);
  }
  s.closePath();
  const h = spec.y1 - spec.y0;
  const g = new ExtrudeGeometry(s, {
    depth: h - 0.016,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 24,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, 0.008, 0);
  g.computeVertexNormals();
  return g;
}

/** Thin ring used for seams and collars. */
export function ringGeometry(radius: number, tube: number, segments = 96): BufferGeometry {
  return mergeVertices(new CylinderGeometry(radius, radius, tube, segments, 1, true));
}
