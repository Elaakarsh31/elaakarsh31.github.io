import { CanvasTexture, SRGBColorSpace } from 'three';
import { createRng } from '../../lib/rng';

// Faces for the raw data fragments, drawn in code. Text is placeholder bars or generic labels:
// nothing that resembles real people, customers or records.
export type CardKind = 'post' | 'form' | 'frame' | 'listing';
export const CARD_KINDS: CardKind[] = ['post', 'form', 'frame', 'listing'];

const W = 256;
const H = 168;

function rounded(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}

function bars(g: CanvasRenderingContext2D, x: number, y: number, widths: number[], h: number, gap: number, color: string) {
  g.fillStyle = color;
  widths.forEach((w, i) => {
    rounded(g, x, y + i * (h + gap), w, h, h / 2);
    g.fill();
  });
}

export function drawCard(kind: CardKind, seed: number) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const rng = createRng(seed);
  const jitter = (n: number) => n * (0.75 + rng() * 0.5);

  g.clearRect(0, 0, W, H);
  if (kind === 'post') {
    g.fillStyle = '#e9edf2';
    rounded(g, 0, 0, W, H, 14);
    g.fill();
    g.fillStyle = '#9aa6b4';
    g.beginPath();
    g.arc(30, 30, 15, 0, Math.PI * 2);
    g.fill();
    bars(g, 54, 19, [jitter(80), jitter(52)], 8, 6, '#6d7988');
    bars(g, 16, 60, [jitter(210), jitter(222), jitter(160), jitter(190)], 9, 8, '#b3bdc8');
    // Reactions row: generic glyphs.
    g.strokeStyle = '#7c8896';
    g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.arc(26 + i * 40, 146, 7, 0, Math.PI * 2);
      g.stroke();
    }
  } else if (kind === 'form') {
    g.fillStyle = '#d9d4c7';
    rounded(g, 0, 0, W, H, 6);
    g.fill();
    // Scan noise.
    for (let i = 0; i < 900; i++) {
      g.fillStyle = `rgba(60,55,45,${rng() * 0.08})`;
      g.fillRect(rng() * W, rng() * H, 1.5, 1.5);
    }
    g.fillStyle = '#7d776a';
    g.font = '600 13px "IBM Plex Mono", monospace';
    g.fillText('FORM', 16, 26);
    g.strokeStyle = '#8f897b';
    g.lineWidth = 1.5;
    for (let r = 0; r < 4; r++) {
      const y = 46 + r * 26;
      g.strokeRect(16, y, 12, 12);
      g.beginPath();
      g.moveTo(38, y + 12);
      g.lineTo(38 + jitter(170), y + 12);
      g.stroke();
      if (rng() > 0.5) {
        g.beginPath();
        g.moveTo(18, y + 6);
        g.lineTo(22, y + 10);
        g.lineTo(27, y + 2);
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(120,90,80,0.55)';
    g.lineWidth = 2;
    g.beginPath();
    g.arc(214, 132, 20, 0, Math.PI * 2);
    g.stroke();
  } else if (kind === 'frame') {
    const grad = g.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#2a3a4a');
    grad.addColorStop(1, '#141c25');
    g.fillStyle = grad;
    rounded(g, 0, 0, W, H, 8);
    g.fill();
    g.fillStyle = '#3e5266';
    g.fillRect(30, 70, 60, 70);
    g.fillRect(120, 50, 90, 90);
    g.fillStyle = '#56708a';
    g.beginPath();
    g.arc(160, 40, 14, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.fillRect(0, H - 26, W, 26);
    g.fillStyle = '#cfe3f2';
    g.font = '500 13px "IBM Plex Mono", monospace';
    g.fillText('00:14:32', 12, H - 9);
    g.fillStyle = '#8da0b3';
    g.fillRect(90, H - 15, 150, 3);
    g.fillStyle = '#cfe3f2';
    g.fillRect(90, H - 15, 60, 3);
  } else {
    g.fillStyle = '#f1f3f5';
    rounded(g, 0, 0, W, H, 10);
    g.fill();
    g.fillStyle = '#c3cad3';
    rounded(g, 14, 18, 70, 70, 8);
    g.fill();
    bars(g, 98, 22, [jitter(130), jitter(90)], 10, 8, '#7a8592');
    // Star dots and a price-shaped bar with no number.
    g.fillStyle = '#a4adb8';
    for (let i = 0; i < 5; i++) {
      g.beginPath();
      g.arc(104 + i * 14, 72, 4.5, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#5c6875';
    rounded(g, 98, 90, 60, 14, 4);
    g.fill();
    bars(g, 14, 114, [jitter(220), jitter(180)], 9, 8, '#c9d0d8');
  }
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
