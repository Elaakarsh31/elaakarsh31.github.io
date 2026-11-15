import { useFrame, useThree } from '@react-three/fiber';
import { Vector3 } from 'three';
import { getAnchor } from './anchors';

const v = new Vector3();
let cache: HTMLElement[] = [];
let frame = 0;

/**
 * Pins DOM elements marked data-hud-anchor="name" to named 3D points every frame, writing
 * --hx/--hy (px) and data-hud-visible. Runs after the camera and the scene have moved.
 */
export function HudSync() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useFrame(() => {
    if (frame++ % 30 === 0) cache = [...document.querySelectorAll<HTMLElement>('[data-hud-anchor]')];
    for (const el of cache) {
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
  });
  return null;
}
