import { CanvasTexture, LinearFilter, NearestFilter, SRGBColorSpace } from 'three';

// The bot's face screen: two simple pixel eyes on a visible 16×8 LED grid.
const COLS = 16;
const ROWS = 8;
const CELL = 4; // px per LED (3px lamp + 1px gap)

export type EyeState = 'open' | 'blink' | 'closed' | 'happy' | 'spiral' | 'startle' | 'focus' | 'heart' | 'icon';

/** Full-screen pixel icons (16×8) the bot shows while it walks through the Career timeline. */
const ICONS: Record<string, string[]> = {
  cap: [
    '................',
    '.......XX.......',
    '....XXXXXXXX....',
    '.XXXXXXXXXXXXXX.',
    '....XXXXXXXX..X.',
    '.....XXXXXX...X.',
    '.....XXXXXX..XXX',
    '................',
  ],
  lens: [
    '.....XXXX.......',
    '....X....X......',
    '...X......X.....',
    '...X......X.....',
    '....X....X......',
    '.....XXXXXX.....',
    '..........XX....',
    '...........XX...',
  ],
  db: [
    '....XXXXXXXX....',
    '...X........X...',
    '...XXXXXXXXXX...',
    '...X........X...',
    '...XXXXXXXXXX...',
    '...X........X...',
    '....XXXXXXXX....',
    '................',
  ],
  spark: [
    '.......XX.......',
    '.......XX.......',
    '...X..XXXX..X...',
    '....XXXXXXXX....',
    '..XXXXXXXXXXXX..',
    '....XXXXXXXX....',
    '...X..XXXX..X...',
    '.......XX.......',
  ],
  chart: [
    '...........XX...',
    '.......XX..XX...',
    '.......XX..XX...',
    '...XX..XX..XX...',
    '...XX..XX..XX...',
    '...XX..XX..XX...',
    '..XXXXXXXXXXXX..',
    '................',
  ],
};

const HEART: Cells = [
  [-1, -1], [1, -1],
  [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0],
  [-1, 1], [0, 1], [1, 1],
  [0, 2],
];

type Cells = [number, number][];

const EYE_X = [4, 11]; // left, right eye centre columns
const EYE_Y = 3.5;

/** A solid w×h block of lit LEDs; `round` drops the corners (only for larger shapes). */
function openEye(cx: number, dx: number, dy: number, w = 2, h = 3, round = false): Cells {
  const out: Cells = [];
  const x0 = Math.round(cx - w / 2 + dx);
  const y0 = Math.round(EYE_Y - (h - 1) / 2 + dy);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      const corner = round && (x === 0 || x === w - 1) && (y === 0 || y === h - 1);
      if (!corner) out.push([x0 + x, y0 + y]);
    }
  }
  return out;
}

const SPIRAL: Cells = [
  [0, 0], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1], [2, -1], [2, 0], [2, 1], [2, 2], [1, 2], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-2, -1], [-2, -2], [-1, -2], [0, -2], [1, -2],
];

function eyeCells(state: EyeState, cx: number, dx: number, dy: number, frame: number): Cells {
  switch (state) {
    case 'open':
      return openEye(cx, dx, dy);
    case 'focus':
      return openEye(cx, dx, dy + 0.5, 2, 2);
    case 'startle':
      return openEye(cx, 0, 0, 4, 4, true);
    case 'blink':
      return [-1, 0].map((x) => [Math.round(cx) + x, 4] as [number, number]);
    case 'closed':
      return [-2, -1, 0, 1].map((x) => [Math.round(cx) + x, 5] as [number, number]);
    case 'happy':
      return [
        [-2, 5], [-1, 4], [0, 4], [1, 5],
      ].map(([x, y]) => [Math.round(cx) + x, y - 1] as [number, number]);
    case 'heart':
      // A little beat: the hearts sit one row lower on alternate frames.
      return HEART.map(([x, y]) => [Math.round(cx) + x, 3 + y] as [number, number]);
    case 'icon':
      return [];
    case 'spiral': {
      // Rotate the spiral in quarter turns.
      const r = frame % 4;
      const n = 10 + (frame % 3) * 5;
      return SPIRAL.slice(0, n).map(([x, y]) => {
        const [rx, ry] = r === 0 ? [x, y] : r === 1 ? [-y, x] : r === 2 ? [-x, -y] : [y, -x];
        return [Math.round(cx) + rx, Math.round(EYE_Y) + ry] as [number, number];
      });
    }
  }
}

export function createFace() {
  const canvas = document.createElement('canvas');
  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;
  const g = canvas.getContext('2d')!;
  const texture = new CanvasTexture(canvas);
  texture.magFilter = NearestFilter;
  texture.minFilter = LinearFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;

  let key = '';
  function draw(state: EyeState, dx = 0, dy = 0, frame = 0, icon = '') {
    const k = `${state}|${dx}|${dy}|${state === 'spiral' ? frame : 0}|${state === 'icon' ? icon : ''}`;
    if (k === key) return;
    key = k;
    g.fillStyle = '#000';
    g.fillRect(0, 0, canvas.width, canvas.height);
    // Unlit LEDs: a faint grid so the screen reads as a matrix.
    g.fillStyle = '#0c151b';
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) g.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
    g.fillStyle = '#ffffff';
    if (state === 'icon' && ICONS[icon]) {
      ICONS[icon].forEach((row, y) => [...row].forEach((c, x) => c === 'X' && g.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1)));
      texture.needsUpdate = true;
      return;
    }
    for (const cx of EYE_X) {
      for (const [x, y] of eyeCells(state, cx, dx, dy, frame)) {
        if (x < 0 || y < 0 || x >= COLS || y >= ROWS) continue;
        g.fillRect(x * CELL, y * CELL, CELL - 1, CELL - 1);
      }
    }
    texture.needsUpdate = true;
  }
  draw('open');
  return { texture, draw };
}

/** Rounded-rectangle alpha mask for the screen and its bezel. */
export function roundedMask(w: number, h: number, r: number) {
  const s = 4;
  const c = document.createElement('canvas');
  c.width = 128 * s;
  c.height = Math.round((128 * s * h) / w);
  const g = c.getContext('2d')!;
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  const rr = (r / w) * c.width;
  g.beginPath();
  g.roundRect(0, 0, c.width, c.height, rr);
  g.fill();
  const t = new CanvasTexture(c);
  return t;
}
