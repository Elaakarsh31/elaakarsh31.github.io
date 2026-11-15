// URL switches used by still-frame captures and debugging. No three.js imports.
//   ?frame=hero|data|model|system|og   render one moment, deterministically, with no page UI
//   ?p=123                              hold the build at a timeline position
//   ?cam=x,y,z,tx,ty,tz[,fov]           dev only: override the camera
//   ?nopost                             dev only: disable postprocessing
const params = new URLSearchParams(location.search);

/** Timeline positions for the still frames. */
export const FRAME_P: Record<string, number> = {
  hero: 0,
  data: 94,
  model: 246,
  system: 386,
  og: 388,
};

export const captureFrame = params.get('frame');
export const isCapture = !!captureFrame && captureFrame in FRAME_P;
export const fixedP = isCapture ? FRAME_P[captureFrame!] : params.has('p') ? Number(params.get('p')) : null;

export const debugCam = import.meta.env.DEV ? (params.get('cam')?.split(',').map(Number) ?? null) : null;
export const noPost = import.meta.env.DEV && params.has('nopost');
