// After the build, the camera and the bot move with the scroll from section to section, the same
// way the build does: each section has a framing (a "spot"), and between spots both glide with an
// eased blend tied to the scroll position, so scrolling back plays the move in reverse.
import type { Vector3 } from 'three';
import { fitFov } from './lens';
import { easeInOut } from './timing';

export type Spot = 'exit' | 'projects' | 'career' | 'careerUp' | 'toolbench' | 'contact';
/** `linear`: the move into this stop keeps pace with the page instead of easing. */
type Stop = { y: number; spot: Spot; linear?: boolean };

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
  const careerEl = document.getElementById('career');
  const careerEnd = careerEl ? careerEl.getBoundingClientRect().bottom + window.scrollY : career;
  const bench = docTop('toolbench');
  const contact = docTop('contact');
  const raw: Stop[] = [
    { y: end, spot: 'exit' },
    { y: end + 0.95 * vh, spot: 'projects' },
    { y: career - 1.0 * vh, spot: 'projects' },
    { y: career - 0.12 * vh, spot: 'career' },
    // The bot rides up and out with the end of the timeline, at the page's pace…
    { y: careerEnd - 1.0 * vh, spot: 'career' },
    { y: careerEnd - 0.35 * vh, spot: 'careerUp', linear: true },
    // …then the camera glides over to the bench, settled by the time the section reaches the top
    // (so a jump from the nav lands on the finished framing).
    { y: bench - 0.02 * vh, spot: 'toolbench' },
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
    if (y < s1.y) {
      const u = (y - s0.y) / (s1.y - s0.y);
      return { a: s0.spot, b: s1.spot, k: s0.spot === s1.spot ? 0 : s1.linear ? u : easeInOut(u) };
    }
  }
  const last = stops[stops.length - 1].spot;
  return { a: last, b: last, k: 0 };
}

if (typeof window !== 'undefined') window.addEventListener('resize', () => (frame = 0));

/** The Contact camera: looking straight down -z, so screen points map simply to the scene. */
export const CONTACT_CAM = { x: 3.7, y: 1.5, z: 5.6, fov: 30 };
const CONTACT_DEPTH = 2.9;
let range: Range | null = null;

/** About half the bot's width (arms out) and its height above its centre, in scene units. */
const BOT_HALF_W = 0.32;
const BOT_HEAD = 0.42;

/**
 * Where the bot stands at Contact: just right of the "Let's build something." line and level with
 * it, worked out from where the title sits on screen so it holds at any window size. When the line
 * runs too close to the right edge for that, the bot stands on top of the end of the line instead.
 */
export function contactBotPoint(out: Vector3) {
  const aspect = window.innerWidth / window.innerHeight;
  const halfH = CONTACT_DEPTH * Math.tan((fitFov(CONTACT_CAM.fov, aspect) * Math.PI) / 360);
  const halfW = halfH * aspect;
  let right = 0.5;
  let mid = -0.1;
  let top = 0.1;
  const title = document.getElementById('contact-title');
  if (title) {
    range ??= document.createRange();
    range.selectNodeContents(title);
    const r = range.getBoundingClientRect();
    if (r.width > 0) {
      right = (r.right / window.innerWidth) * 2 - 1;
      mid = -(((r.top + r.height * 0.5) / window.innerHeight) * 2 - 1);
      top = -((r.top / window.innerHeight) * 2 - 1);
    }
  }
  const edge = halfW - BOT_HALF_W - 0.04;
  const beside = right * halfW + BOT_HALF_W + 0.04;
  // Beside the line, the head level with it…
  if (beside <= edge) return out.set(CONTACT_CAM.x + beside, CONTACT_CAM.y + mid * halfH - 0.08, CONTACT_CAM.z - CONTACT_DEPTH);
  // …or standing on the end of it.
  const x = Math.min(right * halfW - BOT_HALF_W, edge);
  return out.set(CONTACT_CAM.x + x, CONTACT_CAM.y + top * halfH + BOT_HEAD * 0.75, CONTACT_CAM.z - CONTACT_DEPTH);
}
