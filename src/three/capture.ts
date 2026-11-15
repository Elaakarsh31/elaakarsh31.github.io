// URL switches used by screenshots and still-frame captures.
//   ?frame=hero|data|model|system|og   render one moment, deterministically, with no HUD
//   ?p=123                              hold the build at a timeline position (debug)
const params = new URLSearchParams(location.search);

export const FRAME_P: Record<string, number> = {
  hero: 0,
  data: 112,
  model: 246,
  system: 386,
  og: 386,
};

export const captureFrame = params.get('frame');
export const fixedP = captureFrame ? FRAME_P[captureFrame] ?? 0 : params.has('p') ? Number(params.get('p')) : null;
export const isCapture = !!captureFrame;

/** ?cam=x,y,z,tx,ty,tz overrides the camera (debug only). */
export const debugCam = params.get('cam')?.split(',').map(Number) ?? null;

/** ?nopost disables postprocessing (debug only). */
export const noPost = params.has('nopost');
