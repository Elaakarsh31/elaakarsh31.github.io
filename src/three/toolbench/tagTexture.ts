import { CanvasTexture, SRGBColorSpace } from 'three';
import { createRng } from '../../lib/rng';

/** Engraved label for a metal tag: brushed face, dark engraved text with a light lower edge. */
export function tagTexture(name: string, widthUnits: number, depthUnits: number, seed: number) {
  const pxPerUnit = 900;
  const w = Math.round(widthUnits * pxPerUnit);
  const h = Math.round(depthUnits * pxPerUnit);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const rng = createRng(seed);
  const grad = g.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#c9ced6');
  grad.addColorStop(1, '#9ea4ad');
  g.fillStyle = grad;
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < 220; i++) {
    const v = 150 + rng() * 80;
    g.strokeStyle = `rgba(${v | 0},${v | 0},${(v + 6) | 0},0.35)`;
    g.lineWidth = 0.8;
    const y = rng() * h;
    g.beginPath();
    g.moveTo(rng() * w * 0.3, y);
    g.lineTo(w * (0.5 + rng() * 0.5), y);
    g.stroke();
  }
  // Hole at the left end, like a key tag.
  const hx = h * 0.42;
  g.fillStyle = '#2a2d33';
  g.beginPath();
  g.arc(hx, h / 2, h * 0.13, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.45)';
  g.lineWidth = 2;
  g.beginPath();
  g.arc(hx, h / 2, h * 0.17, 0, Math.PI * 2);
  g.stroke();
  // Engraved text.
  const size = Math.round(h * 0.36);
  g.font = `500 ${size}px "IBM Plex Mono", ui-monospace, monospace`;
  g.textBaseline = 'middle';
  const tx = hx + h * 0.36;
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.fillText(name, tx, h / 2 + 2);
  g.fillStyle = '#23262b';
  g.fillText(name, tx, h / 2);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
