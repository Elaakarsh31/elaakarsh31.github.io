import { CanvasTexture, RepeatWrapping, SRGBColorSpace, NoColorSpace, type Texture } from 'three';
import { createRng } from '../../lib/rng';

/**
 * Brushed-metal roughness map: fine streaks along U. Lathe UVs run around the part, so the
 * brushing reads as circular machining marks; flat parts get straight brushing.
 */
export function brushedRoughness(seed = 7, base = 150, spread = 20): Texture {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const rng = createRng(seed);
  g.fillStyle = `rgb(${base},${base},${base})`;
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 2600; i++) {
    const y = rng() * size;
    const v = base + (rng() - 0.5) * spread * 2;
    g.strokeStyle = `rgba(${v | 0},${v | 0},${v | 0},${0.25 + rng() * 0.5})`;
    g.lineWidth = rng() < 0.9 ? 0.5 : 1.1;
    g.beginPath();
    const x0 = rng() * size;
    g.moveTo(x0 - 40, y);
    g.lineTo(x0 + 60 + rng() * 200, y + (rng() - 0.5) * 0.6);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = NoColorSpace;
  t.anisotropy = 8;
  return t;
}

/** Radial brushing for round caps (shoulder hubs, bolt faces). */
export function radialBrushed(seed = 3): Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  const rng = createRng(seed);
  g.fillStyle = '#8a8a8a';
  g.fillRect(0, 0, size, size);
  for (let i = 0; i < 260; i++) {
    const r = 4 + rng() * 60;
    const v = 110 + rng() * 60;
    g.strokeStyle = `rgba(${v | 0},${v | 0},${v | 0},0.5)`;
    g.lineWidth = 0.7;
    g.beginPath();
    const a = rng() * Math.PI * 2;
    g.arc(64, 64, r, a, a + 0.6 + rng() * 2.4);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}
