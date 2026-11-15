// Optional real portrait: samples public/models/portrait.glb into the same point format as the
// procedural bust. Only uncompressed binary glTF is supported (no Draco, no meshopt).

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { PointCloud } from './bust';
import { HERO } from './config';
import { createRng } from './rng';
import { sampleTriangles } from './bust';

const COMPRESSION = ['KHR_draco_mesh_compression', 'EXT_meshopt_compression', 'KHR_meshopt_compression'];

/** Reads the JSON chunk of a .glb to check for compression extensions before parsing. */
function glbExtensions(buf: ArrayBuffer): string[] | null {
  const view = new DataView(buf);
  if (buf.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67) return null; // 'glTF'
  const jsonLength = view.getUint32(12, true);
  if (view.getUint32(16, true) !== 0x4e4f534a) return null; // 'JSON'
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 20, jsonLength)));
  return [...(json.extensionsUsed ?? []), ...(json.extensionsRequired ?? [])];
}

type Pixels = { data: Uint8ClampedArray; w: number; h: number };

function readTexture(tex: THREE.Texture | null | undefined, cache: Map<THREE.Texture, Pixels | null>): Pixels | null {
  if (!tex) return null;
  if (cache.has(tex)) return cache.get(tex)!;
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  let px: Pixels | null = null;
  if (img && img.width && img.height) {
    const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(img, 0, 0, w, h);
      px = { data: ctx.getImageData(0, 0, w, h).data, w, h };
    }
  }
  cache.set(tex, px);
  return px;
}

const luma = (r: number, g: number, b: number) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export async function loadGlbCloud(url: string, count: number): Promise<PointCloud | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();

  const ext = glbExtensions(buf);
  if (!ext) {
    console.warn(`[portrait] ${url} is not a binary glTF (.glb). Using the procedural bust.`);
    return null;
  }
  const compressed = ext.filter((e) => COMPRESSION.includes(e));
  if (compressed.length) {
    console.warn(
      `[portrait] ${url} uses ${compressed.join(', ')}. Compressed models are not supported; ` +
        're-export with compression off. Using the procedural bust.',
    );
    return null;
  }

  const gltf = await new GLTFLoader().parseAsync(buf, '');
  gltf.scene.updateMatrixWorld(true);

  // Collect world-space triangles with per-corner UVs and colors and a per-triangle texture.
  const tris: number[] = [];
  const uvs: number[] = [];
  const cols: number[] = [];
  const texOf: (Pixels | null)[] = [];
  const cache = new Map<THREE.Texture, Pixels | null>();
  const v = new THREE.Vector3();

  gltf.scene.traverseVisible((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    const geo = mesh.geometry as THREE.BufferGeometry;
    const pos = geo.getAttribute('position');
    if (!pos) return;
    const uv = geo.getAttribute('uv');
    const color = geo.getAttribute('color');
    const mat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const px = readTexture(mat?.map, cache);
    const index = geo.getIndex();
    const n = index ? index.count : pos.count;
    for (let k = 0; k < n; k += 3) {
      for (let m = 0; m < 3; m++) {
        const vi = index ? index.getX(k + m) : k + m;
        v.fromBufferAttribute(pos, vi).applyMatrix4(mesh.matrixWorld);
        tris.push(v.x, v.y, v.z);
        uvs.push(uv ? uv.getX(vi) : 0, uv ? uv.getY(vi) : 0);
        if (color) cols.push(color.getX(vi), color.getY(vi), color.getZ(vi));
        else cols.push(-1, -1, -1);
      }
      texOf.push(px);
    }
  });
  if (!tris.length) return null;

  // Crop to the top of the model, then sample the kept triangles by area.
  let minY = Infinity;
  let maxY = -Infinity;
  for (let k = 1; k < tris.length; k += 3) {
    minY = Math.min(minY, tris[k]);
    maxY = Math.max(maxY, tris[k]);
  }
  const cutY = maxY - (maxY - minY) * HERO.glbKeepTopFraction;
  const keep: number[] = [];
  for (let t = 0; t < tris.length / 9; t++) {
    if (Math.max(tris[t * 9 + 1], tris[t * 9 + 4], tris[t * 9 + 7]) >= cutY) keep.push(t);
  }
  const kept = new Float32Array(keep.length * 9);
  keep.forEach((t, k) => kept.set(tris.slice(t * 9, t * 9 + 9), k * 9));

  const rng = createRng(HERO.seed);
  const { positions, picks, bary } = sampleTriangles(kept, count, rng);

  const normals = new Float32Array(count * 3);
  const lum = new Float32Array(count);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  for (let p = 0; p < count; p++) {
    const t = keep[picks[p]];
    a.fromArray(tris, t * 9);
    b.fromArray(tris, t * 9 + 3);
    c.fromArray(tris, t * 9 + 6);
    const nrm = b.sub(a).cross(c.sub(a)).normalize();
    normals.set([nrm.x, nrm.y, nrm.z], p * 3);

    const [b0, b1, b2] = [bary[p * 3], bary[p * 3 + 1], bary[p * 3 + 2]];
    let l = 1;
    const px = texOf[t];
    if (px) {
      const u = b0 * uvs[t * 6] + b1 * uvs[t * 6 + 2] + b2 * uvs[t * 6 + 4];
      const w = b0 * uvs[t * 6 + 1] + b1 * uvs[t * 6 + 3] + b2 * uvs[t * 6 + 5];
      const x = Math.min(px.w - 1, Math.floor((u - Math.floor(u)) * px.w));
      const y = Math.min(px.h - 1, Math.floor((w - Math.floor(w)) * px.h)); // glTF textures are not flipped
      const o = (y * px.w + x) * 4;
      l = luma(px.data[o] / 255, px.data[o + 1] / 255, px.data[o + 2] / 255);
    } else if (cols[t * 9] >= 0) {
      const r = b0 * cols[t * 9] + b1 * cols[t * 9 + 3] + b2 * cols[t * 9 + 6];
      const g = b0 * cols[t * 9 + 1] + b1 * cols[t * 9 + 4] + b2 * cols[t * 9 + 7];
      const bl = b0 * cols[t * 9 + 2] + b1 * cols[t * 9 + 5] + b2 * cols[t * 9 + 8];
      l = luma(r, g, bl);
    }
    lum[p] = l;
  }

  // Normalize luminance so the median sits around 0.75, and frame the samples like the bust.
  const sorted = Float32Array.from(lum).sort();
  const median = sorted[Math.floor(count / 2)] || 1;
  for (let p = 0; p < count; p++) lum[p] = Math.min(1.25, Math.max(0.12, (lum[p] / median) * 0.75));

  const box = new THREE.Box3().setFromArray(positions);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const s = (HERO.bustHeight - HERO.cutoffY) / (size.y || 1);
  for (let p = 0; p < count; p++) {
    positions[p * 3] = (positions[p * 3] - center.x) * s;
    positions[p * 3 + 1] = (positions[p * 3 + 1] - box.min.y) * s + HERO.cutoffY;
    positions[p * 3 + 2] = (positions[p * 3 + 2] - center.z) * s;
  }
  const nb = new THREE.Box3().setFromArray(positions);

  return {
    count,
    positions,
    normals,
    lum,
    min: nb.min.toArray() as [number, number, number],
    max: nb.max.toArray() as [number, number, number],
    info: `glb portrait: ${keep.length} triangles kept, ${count} points`,
  };
}
