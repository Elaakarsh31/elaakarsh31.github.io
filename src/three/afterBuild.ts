// After the build, the camera and the bot move with the scroll from section to section, the same
// way the build does: each section has a framing (a "spot"), and between spots both glide with an
// eased blend tied to the scroll position, so scrolling back plays the move in reverse.
import type { Vector3 } from 'three';
import { easeInOut } from './timing';

export type Spot = 'exit' | 'projects' | 'career' | 'toolbench' | 'contact';
type Stop = { y: number; spot: Spot };

let stops: Stop[] = [];
let frame = 0;

const docTop = (id: string) => {
  const el = document.getElementById(id);
  return el ? el.getBoundingClientRect().top + window.scrollY : 0;
};

function measure() {
  const vh = window.innerHeight;
  const build = document.getElementById('build');
  const end = build ? build.offsetTop + build.offsetHeight - vh : 0;
  const career = docTop('career');
  const bench = docTop('toolbench');
  const contact = docTop('contact');
  const raw: Stop[] = [
    { y: end, spot: 'exit' },
    { y: end + 0.95 * vh, spot: 'projects' },
    { y: career - 1.0 * vh, spot: 'projects' },
    { y: career - 0.12 * vh, spot: 'career' },
    { y: bench - 0.9 * vh, spot: 'career' },
    { y: bench + 0.04 * vh, spot: 'toolbench' },
    { y: contact - 0.95 * vh, spot: 'toolbench' },
    { y: contact - 0.12 * vh, spot: 'contact' },
  ];
  // Keep the stops in order even on short viewports.
  for (let i = 1; i < raw.length; i++) raw[i].y = Math.max(raw[i].y, raw[i - 1].y + 1);
  stops = raw;
}

/** Which two spots the scroll position sits between, and how far along (eased, 0..1). */
export function blendAt(y: number): { a: Spot; b: Spot; k: number } {
  if (frame++ % 30 === 0 || !stops.length) measure();
  if (y <= stops[0].y) return { a: 'exit', b: 'exit', k: 0 };
  for (let i = 0; i < stops.length - 1; i++) {
    const s0 = stops[i];
    const s1 = stops[i + 1];
    if (y < s1.y) return { a: s0.spot, b: s1.spot, k: s0.spot === s1.spot ? 0 : easeInOut((y - s0.y) / (s1.y - s0.y)) };
  }
  const last = stops[stops.length - 1].spot;
  return { a: last, b: last, k: 0 };
}

if (typeof window !== 'undefined') window.addEventListener('resize', () => (frame = 0));

/** The Contact camera: looking straight down -z, so screen points map simply to the scene. */
export const CONTACT_CAM = { x: 3.7, y: 1.5, z: 5.6, fov: 30 };
const CONTACT_DEPTH = 2.9;
let range: Range | null = null;

/**
 * Where the bot stands at Contact: just right of the "Let's build something." line, level with it,
 * worked out from where the title sits on screen so it holds at any window size.
 */
export function contactBotPoint(out: Vector3) {
  const halfH = CONTACT_DEPTH * Math.tan((CONTACT_CAM.fov * Math.PI) / 360);
  const halfW = halfH * (window.innerWidth / window.innerHeight);
  let nx = 0.5;
  let ny = -0.1;
  const title = document.getElementById('contact-title');
  if (title) {
    range ??= document.createRange();
    range.selectNodeContents(title);
    const r = range.getBoundingClientRect();
    if (r.width > 0) {
      nx = (r.right / window.innerWidth) * 2 - 1;
      ny = -(((r.top + r.height * 0.5) / window.innerHeight) * 2 - 1);
    }
  }
  // A body-width right of the text, kept on screen; lowered a touch so the head lines up with it.
  const x = Math.min(nx * halfW + 0.34, halfW - 0.3);
  return out.set(CONTACT_CAM.x + x, CONTACT_CAM.y + ny * halfH - 0.08, CONTACT_CAM.z - CONTACT_DEPTH);
}
