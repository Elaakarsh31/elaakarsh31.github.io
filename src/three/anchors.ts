import type { Object3D } from 'three';

// Named points on the machine, the bench and the bot. The HUD projects these to the screen every
// frame to aim callout leader lines, plate labels and the bot's speech tag.
const anchors = new Map<string, Object3D>();

export function registerAnchor(name: string, obj: Object3D | null) {
  if (obj) anchors.set(name, obj);
  else anchors.delete(name);
}

export const getAnchor = (name: string) => anchors.get(name);
