import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { getAnchor } from './anchors';

const v = new Vector3();
let pinned: HTMLElement[] = [];
let callouts: { li: HTMLElement; path: SVGPathElement | null; dot: SVGCircleElement | null; ring: SVGCircleElement | null }[] = [];
let frame = 0;

function collect() {
  pinned = [...document.querySelectorAll<HTMLElement>('[data-hud-anchor]')];
  callouts = [...document.querySelectorAll<HTMLElement>('.stage .callout[data-anchor]')].map((li) => {
    const id = li.dataset.callout!;
    return {
      li,
      path: document.querySelector<SVGPathElement>(`[data-leader="${id}"] path`),
      dot: document.querySelector<SVGCircleElement>(`[data-leader="${id}"] .leader-dot`),
      ring: document.querySelector<SVGCircleElement>(`[data-leader="${id}"] .leader-ring`),
    };
  });
}

/**
 * Pins the HUD to the scene every frame, after the camera and the scene have moved:
 * - elements with data-hud-anchor get --hx/--hy (px) and data-hud-visible
 * - each visible callout panel gets a leader line from its edge to its part, with an elbow
 *   like a technical drawing's dimension line
 */
export function HudSync() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    if (frame++ % 20 === 0) collect();
    for (const el of pinned) {
      const a = getAnchor(el.dataset.hudAnchor!);
      if (!a) {
        el.dataset.hudVisible = '';
        continue;
      }
      a.getWorldPosition(v).project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      el.style.setProperty('--hx', `${x.toFixed(1)}px`);
      el.style.setProperty('--hy', `${y.toFixed(1)}px`);
      el.dataset.hudVisible = v.z < 1 ? '1' : '';
    }
    // Read every panel box first, then write the lines, to avoid layout thrashing.
    const boxes = callouts.map((c) => (c.li.dataset.on ? c.li.getBoundingClientRect() : null));
    callouts.forEach((c, i) => {
      const box = boxes[i];
      const a = getAnchor(c.li.dataset.anchor!);
      if (!box || !a || !c.path) {
        c.path?.setAttribute('d', '');
        c.dot?.setAttribute('r', '0');
        c.ring?.setAttribute('r', '0');
        return;
      }
      a.getWorldPosition(v).project(camera);
      const ax = (v.x * 0.5 + 0.5) * size.width;
      const ay = (-v.y * 0.5 + 0.5) * size.height;
      const left = ax < box.left;
      const sx = left ? box.left : box.right;
      const sy = box.top + Math.min(26, box.height / 2);
      const ex = sx + (left ? -1 : 1) * Math.min(28, Math.abs(ax - sx) * 0.3);
      c.path.setAttribute('d', `M${sx.toFixed(1)},${sy.toFixed(1)} H${ex.toFixed(1)} L${ax.toFixed(1)},${ay.toFixed(1)}`);
      c.dot?.setAttribute('cx', ax.toFixed(1));
      c.dot?.setAttribute('cy', ay.toFixed(1));
      c.dot?.setAttribute('r', '2.5');
      c.ring?.setAttribute('cx', ax.toFixed(1));
      c.ring?.setAttribute('cy', ay.toFixed(1));
      c.ring?.setAttribute('r', '7');
    });
  });
  return null;
}
