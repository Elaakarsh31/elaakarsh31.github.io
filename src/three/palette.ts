import { Color } from 'three';

// Scene colors, matching the CSS tokens. HDR versions (values above 1) are the only things
// bright enough to bloom: hot seams, the weld line, sparks and the thrusters.
export const C = {
  graphite: new Color('#0f1013'),
  gunmetal: new Color('#1a1c21'),
  titanium: new Color('#b9bec7'),
  molten: new Color('#ff5b1f'),
  holo: new Color('#6fd3ff'),
  ice: new Color('#cfe3f2'),
};

export const hdr = (c: Color, k: number) => c.clone().multiplyScalar(k);
