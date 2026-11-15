// Procedural head-and-shoulders bust: smoothly blended ellipsoids (a signed distance field),
// a coarse marching-cubes shell, area-weighted sampling, then each sample is projected back
// onto the exact SDF so features finer than the grid (lips, lids, nostrils) still read.
//
// Model space: y up, face toward +z, bust from y = 0 (chest) to about y = 2.25 (crown).

import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js';
import { HERO } from './config';
import { createRng, type Rng } from './rng';

export type PointCloud = {
  count: number;
  /** Portrait positions, xyz per point. */
  positions: Float32Array;
  normals: Float32Array;
  /** Per-point luminance: drives size and brightness so eyes, brows, lips and hairline read. */
  lum: Float32Array;
  /** Bounding box of the positions. */
  min: [number, number, number];
  max: [number, number, number];
  /** Diagnostics. */
  info: string;
};

// ---------------------------------------------------------------------------
// SDF primitives (inlined math, no allocations).

function ellipsoid(px: number, py: number, pz: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) {
  const qx = px - cx;
  const qy = py - cy;
  const qz = pz - cz;
  const k0 = Math.sqrt((qx / rx) ** 2 + (qy / ry) ** 2 + (qz / rz) ** 2);
  const k1 = Math.sqrt((qx / (rx * rx)) ** 2 + (qy / (ry * ry)) ** 2 + (qz / (rz * rz)) ** 2);
  return k1 < 1e-9 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

function capsule(px: number, py: number, pz: number, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number) {
  const pax = px - ax;
  const pay = py - ay;
  const paz = pz - az;
  const bax = bx - ax;
  const bay = by - ay;
  const baz = bz - az;
  const h = Math.min(1, Math.max(0, (pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz)));
  return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}

function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/** Smooth subtraction of b from a. */
function ssub(a: number, b: number, k: number) {
  return -smin(-a, b, k);
}

// Head center and a bound used to skip facial detail far from the head.
const HC_Y = 1.66;
const HEAD_BOUND = 0.6;

function headSdf(x: number, y: number, z: number) {
  const ax = Math.abs(x); // bilateral symmetry

  // Skull and face masses.
  let d = ellipsoid(x, y, z, 0, 1.76, -0.04, 0.37, 0.4, 0.45);
  d = smin(d, ellipsoid(x, y, z, 0, 1.58, 0.06, 0.33, 0.42, 0.36), 0.08);
  d = smin(d, ellipsoid(x, y, z, 0, 1.82, 0.12, 0.31, 0.22, 0.3), 0.06);
  // Hair volume sits just outside the skull.
  d = smin(d, ellipsoid(x, y, z, 0, 1.87, -0.07, 0.395, 0.36, 0.47), 0.05);
  d = smin(d, ellipsoid(x, y, z, 0, 1.94, 0.02, 0.35, 0.26, 0.4), 0.06);

  // Tapered jaw, jaw angles and chin.
  d = smin(d, ellipsoid(x, y, z, 0, 1.33, 0.06, 0.27, 0.19, 0.3), 0.12);
  d = smin(d, ellipsoid(ax, y, z, 0.235, 1.33, -0.02, 0.07, 0.1, 0.12), 0.08);
  d = smin(d, ellipsoid(x, y, z, 0, 1.195, 0.245, 0.1, 0.08, 0.09), 0.07);

  // Cheekbones and brow ridge.
  d = smin(d, ellipsoid(ax, y, z, 0.205, 1.55, 0.245, 0.11, 0.065, 0.09), 0.05);
  d = smin(d, ellipsoid(x, y, z, 0, 1.715, 0.33, 0.27, 0.05, 0.08), 0.05);
  d = smin(d, ellipsoid(ax, y, z, 0.135, 1.705, 0.36, 0.085, 0.018, 0.03), 0.02);

  // Eye sockets, then eyeballs and upper lids inside them.
  d = ssub(d, ellipsoid(ax, y, z, 0.135, 1.635, 0.37, 0.085, 0.05, 0.07), 0.04);
  d = smin(d, ellipsoid(ax, y, z, 0.135, 1.633, 0.305, 0.058, 0.058, 0.058), 0.01);
  d = smin(d, ellipsoid(ax, y, z, 0.135, 1.66, 0.325, 0.064, 0.022, 0.05), 0.012);

  // Nose ridge, tip and nostrils.
  d = smin(d, capsule(x, y, z, 0, 1.69, 0.37, 0, 1.505, 0.465, 0.03), 0.04);
  d = smin(d, ellipsoid(x, y, z, 0, 1.485, 0.452, 0.048, 0.044, 0.048), 0.03);
  d = smin(d, ellipsoid(ax, y, z, 0.046, 1.474, 0.412, 0.038, 0.03, 0.038), 0.025);

  // Lips with a mouth line.
  d = smin(d, ellipsoid(x, y, z, 0, 1.405, 0.37, 0.1, 0.028, 0.05), 0.03);
  d = smin(d, ellipsoid(x, y, z, 0, 1.362, 0.36, 0.09, 0.03, 0.05), 0.03);
  d = ssub(d, ellipsoid(x, y, z, 0, 1.384, 0.42, 0.098, 0.006, 0.06), 0.012);

  // Ears.
  d = smin(d, ellipsoid(ax, y, z, 0.372, 1.6, -0.03, 0.045, 0.11, 0.075), 0.04);
  return d;
}

function bodySdf(x: number, y: number, z: number) {
  const ax = Math.abs(x);
  let d = capsule(x, y, z, 0, 1.3, -0.06, 0, 0.7, -0.04, 0.165); // neck
  d = smin(d, capsule(ax, y, z, 0.1, 0.98, -0.08, 0.62, 0.72, -0.08, 0.13), 0.14); // trapezius
  d = smin(d, ellipsoid(ax, y, z, 0.7, 0.55, -0.04, 0.26, 0.22, 0.24), 0.16); // shoulders
  d = smin(d, ellipsoid(x, y, z, 0, 0.3, -0.02, 0.78, 0.48, 0.3), 0.16); // torso
  d = smin(d, ellipsoid(ax, y, z, 0.25, 0.42, 0.11, 0.28, 0.2, 0.2), 0.12); // chest
  return d;
}

export function bustSdf(x: number, y: number, z: number) {
  const body = bodySdf(x, y, z);
  const r = Math.hypot(x, y - HC_Y, z);
  const headBound = r - HEAD_BOUND;
  if (headBound > body + 0.15) return body; // far from the head: detail cannot matter
  return smin(body, headSdf(x, y, z), 0.12);
}

// ---------------------------------------------------------------------------
// Feature masks used for luminance.

function hairMask(x: number, y: number, z: number) {
  const ax = Math.abs(x);
  const front = 1.9 - 0.2 * smooth(0.1, 0.33, ax);
  const back = 1.44;
  const hairY = back + (front - back) * smooth(-0.22, 0.24, z);
  // Keep the ears and sideburn area as skin.
  const nearEar = Math.hypot((ax - 0.372) / 0.09, (y - 1.6) / 0.15, (z + 0.03) / 0.12) < 1;
  return nearEar ? 0 : smooth(hairY - 0.02, hairY + 0.04, y);
}

function smooth(a: number, b: number, v: number) {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// ---------------------------------------------------------------------------
// Marching cubes over the SDF.

type Shell = { tris: Float32Array; triCount: number; ms: number; cells: number };

// Corner offsets in the Bourke ordering used by three's edge/tri tables.
const CORNERS = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const EDGES = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 0],
  [4, 5],
  [5, 6],
  [6, 7],
  [7, 4],
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
];

const BOUNDS = { min: [-1.08, HERO.cutoffY, -0.62], max: [1.08, 2.32, 0.62] } as const;

/** Returns null when the projected time exceeds the budget, so the caller can retry coarser. */
function extractShell(cellsY: number, budgetMs: number): Shell | null {
  const t0 = performance.now();
  const [x0, y0, z0] = BOUNDS.min;
  const [x1, y1, z1] = BOUNDS.max;
  const h = (y1 - y0) / cellsY;
  const nx = Math.ceil((x1 - x0) / h) + 1;
  const ny = cellsY + 1;
  const nz = Math.ceil((z1 - z0) / h) + 1;
  const field = new Float32Array(nx * ny * nz);
  const idx = (i: number, j: number, k: number) => (j * nz + k) * nx + i;

  for (let j = 0; j < ny; j++) {
    const y = y0 + j * h;
    for (let k = 0; k < nz; k++) {
      const z = z0 + k * h;
      for (let i = 0; i < nx; i++) field[idx(i, j, k)] = bustSdf(x0 + i * h, y, z);
    }
    // Extrapolate after ~15% of the slices; bail out early if this resolution is too slow.
    if (j === Math.floor(ny * 0.15) && budgetMs < Infinity) {
      const projected = ((performance.now() - t0) / (j + 1)) * ny * 1.35;
      if (projected > budgetMs) return null;
    }
  }

  const out: number[] = [];
  const vals = new Float32Array(8);
  const vert = new Float32Array(36);
  for (let j = 0; j < ny - 1; j++) {
    for (let k = 0; k < nz - 1; k++) {
      for (let i = 0; i < nx - 1; i++) {
        let cube = 0;
        for (let c = 0; c < 8; c++) {
          const o = CORNERS[c];
          vals[c] = field[idx(i + o[0], j + o[1], k + o[2])];
          if (vals[c] < 0) cube |= 1 << c;
        }
        const bits = edgeTable[cube];
        if (!bits) continue;
        for (let e = 0; e < 12; e++) {
          if (!(bits & (1 << e))) continue;
          const [a, b] = EDGES[e];
          const va = vals[a];
          const vb = vals[b];
          const t = Math.abs(va - vb) < 1e-9 ? 0.5 : va / (va - vb);
          const oa = CORNERS[a];
          const ob = CORNERS[b];
          vert[e * 3] = x0 + (i + oa[0] + (ob[0] - oa[0]) * t) * h;
          vert[e * 3 + 1] = y0 + (j + oa[1] + (ob[1] - oa[1]) * t) * h;
          vert[e * 3 + 2] = z0 + (k + oa[2] + (ob[2] - oa[2]) * t) * h;
        }
        const base = cube << 4;
        for (let n = 0; triTable[base + n] !== -1; n += 3) {
          for (let m = 0; m < 3; m++) {
            const e = triTable[base + n + m];
            out.push(vert[e * 3], vert[e * 3 + 1], vert[e * 3 + 2]);
          }
        }
      }
    }
  }
  return { tris: new Float32Array(out), triCount: out.length / 9, ms: performance.now() - t0, cells: cellsY };
}

// ---------------------------------------------------------------------------
// Sampling.

function gradient(x: number, y: number, z: number, out: Float32Array) {
  const e = 0.0025;
  const a = bustSdf(x + e, y - e, z - e);
  const b = bustSdf(x - e, y - e, z + e);
  const c = bustSdf(x - e, y + e, z - e);
  const d = bustSdf(x + e, y + e, z + e);
  let nx = a - b - c + d;
  let ny = -a - b + c + d;
  let nz = -a + b - c + d;
  const l = Math.hypot(nx, ny, nz) || 1;
  nx /= l;
  ny /= l;
  nz /= l;
  out[0] = nx;
  out[1] = ny;
  out[2] = nz;
}

/**
 * Area-weighted samples from a triangle soup. An optional weight (by triangle centroid height)
 * concentrates points where detail matters. Returns positions (count*3).
 */
export function sampleTriangles(tris: Float32Array, count: number, rng: Rng, weightByY?: (y: number) => number) {
  const triCount = tris.length / 9;
  const cum = new Float64Array(triCount);
  let total = 0;
  for (let t = 0; t < triCount; t++) {
    const o = t * 9;
    const ux = tris[o + 3] - tris[o];
    const uy = tris[o + 4] - tris[o + 1];
    const uz = tris[o + 5] - tris[o + 2];
    const vx = tris[o + 6] - tris[o];
    const vy = tris[o + 7] - tris[o + 1];
    const vz = tris[o + 8] - tris[o + 2];
    const w = weightByY ? weightByY((tris[o + 1] + tris[o + 4] + tris[o + 7]) / 3) : 1;
    total += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) * w;
    cum[t] = total;
  }
  const picks = new Uint32Array(count);
  const bary = new Float32Array(count * 3);
  const positions = new Float32Array(count * 3);
  for (let p = 0; p < count; p++) {
    // Stratified along the cumulative area. Triangles come out of the grid in spatial order,
    // so this spreads points far more evenly than independent draws (less clumping and grain).
    const r = ((p + rng()) / count) * total;
    let lo = 0;
    let hi = triCount - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] < r) lo = mid + 1;
      else hi = mid;
    }
    const su = Math.sqrt(rng());
    const r2 = rng();
    const b0 = 1 - su;
    const b1 = su * (1 - r2);
    const b2 = su * r2;
    const o = lo * 9;
    positions[p * 3] = b0 * tris[o] + b1 * tris[o + 3] + b2 * tris[o + 6];
    positions[p * 3 + 1] = b0 * tris[o + 1] + b1 * tris[o + 4] + b2 * tris[o + 7];
    positions[p * 3 + 2] = b0 * tris[o + 2] + b1 * tris[o + 5] + b2 * tris[o + 8];
    picks[p] = lo;
    bary[p * 3] = b0;
    bary[p * 3 + 1] = b1;
    bary[p * 3 + 2] = b2;
  }
  return { positions, picks, bary };
}

export function buildBust(count: number, isDesktop: boolean): PointCloud {
  const rng = createRng(HERO.seed);
  const budget = isDesktop ? HERO.extractBudgetMs : Infinity;
  const shell =
    extractShell(HERO.gridCells, budget) ?? (extractShell(HERO.gridCellsFallback, Infinity) as Shell);

  const t1 = performance.now();
  // More points on the face and head, fewer down the chest.
  const { positions } = sampleTriangles(shell.tris, count, rng, (y) => 0.22 + 0.5 * smooth(0.1, 0.9, y) + 2.8 * smooth(1.1, 1.3, y));
  const normals = new Float32Array(count * 3);
  const lum = new Float32Array(count);
  const g = new Float32Array(3);
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];

  for (let p = 0; p < count; p++) {
    let x = positions[p * 3];
    let y = positions[p * 3 + 1];
    let z = positions[p * 3 + 2];

    // Project onto the exact surface: two steps along one gradient, which also serves as the
    // normal (the shell is within half a cell of the surface, so the gradient barely changes).
    gradient(x, y, z, g);
    for (let it = 0; it < 2; it++) {
      const d = bustSdf(x, y, z);
      x -= g[0] * d;
      y -= g[1] * d;
      z -= g[2] * d;
    }

    // Cavity shading from the SDF: concave areas (sockets, under the nose, mouth corners) darken.
    const ao1 = bustSdf(x + g[0] * 0.025, y + g[1] * 0.025, z + g[2] * 0.025) / 0.025;
    const ao2 = bustSdf(x + g[0] * 0.07, y + g[1] * 0.07, z + g[2] * 0.07) / 0.07;
    const ao = Math.min(1, Math.max(0.32, 0.34 + 0.36 * ao1 + 0.36 * ao2));

    const hair = hairMask(x, y, z);
    const ax = Math.abs(x);
    // Brows read as a darker band; the iris and pupil as a dark disc on the eyeball.
    const brow = Math.hypot((ax - 0.135) / 0.09, (y - 1.708) / 0.024, (z - 0.37) / 0.06) < 1 ? 1 : 0;
    const iris = Math.hypot(ax - 0.135, y - 1.63) < 0.03 && z > 0.33 ? 1 : 0;
    const lip = Math.hypot(x / 0.1, (y - 1.384) / 0.05, (z - 0.38) / 0.08) < 1 ? 1 : 0;

    let l = ao;
    l *= 1 - 0.5 * hair * (0.6 + 0.4 * rng());
    l *= brow ? 0.5 : 1;
    l *= iris ? 0.25 : 1;
    l *= lip ? 0.82 : 1;

    // Seeded depth jitter; hair gets a little more for texture.
    const j = (rng() - 0.5) * (0.008 + hair * 0.02);
    x += g[0] * j;
    y += g[1] * j;
    z += g[2] * j;

    positions[p * 3] = x;
    positions[p * 3 + 1] = y;
    positions[p * 3 + 2] = z;
    normals[p * 3] = g[0];
    normals[p * 3 + 1] = g[1];
    normals[p * 3 + 2] = g[2];
    lum[p] = l;
    if (x < min[0]) min[0] = x;
    if (y < min[1]) min[1] = y;
    if (z < min[2]) min[2] = z;
    if (x > max[0]) max[0] = x;
    if (y > max[1]) max[1] = y;
    if (z > max[2]) max[2] = z;
  }

  const info =
    `procedural bust: ${shell.cells} cells, ${shell.triCount} triangles, ` +
    `shell ${shell.ms.toFixed(0)} ms, sampling ${(performance.now() - t1).toFixed(0)} ms, ${count} points`;
  return { count, positions, normals, lum, min, max, info };
}
