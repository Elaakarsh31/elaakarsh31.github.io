import { BufferGeometry, EdgesGeometry, Float32BufferAttribute } from 'three';

/**
 * Wireframe for a revolved profile: a ring at every profile corner plus evenly spaced meridians,
 * the way a technical drawing shows a turned part.
 */
export function latheWire(points: [number, number][], meridians = 12, segments = 96) {
  const pos: number[] = [];
  for (const [r, y] of points) {
    if (r < 0.001) continue;
    for (let s = 0; s < segments; s++) {
      const a0 = (s / segments) * Math.PI * 2;
      const a1 = ((s + 1) / segments) * Math.PI * 2;
      pos.push(Math.sin(a0) * r, y, Math.cos(a0) * r, Math.sin(a1) * r, y, Math.cos(a1) * r);
    }
  }
  for (let m = 0; m < meridians; m++) {
    const a = (m / meridians) * Math.PI * 2;
    for (let k = 0; k < points.length - 1; k++) {
      const [r0, y0] = points[k];
      const [r1, y1] = points[k + 1];
      if (r0 < 0.001 && r1 < 0.001) continue;
      pos.push(Math.sin(a) * r0, y0, Math.cos(a) * r0, Math.sin(a) * r1, y1, Math.cos(a) * r1);
    }
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  return g;
}

/** Hard edges of any geometry. */
export const edgesOf = (g: BufferGeometry, angle = 24) => new EdgesGeometry(g, angle);
