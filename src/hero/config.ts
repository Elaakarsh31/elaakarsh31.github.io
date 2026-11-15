// Tunables for the particle portrait. Everything visual that is worth tweaking lives here.

export const HERO = {
  seed: 20261215,

  /** Point counts and device-pixel-ratio caps. */
  points: { desktop: 60000, mobile: 15000 },
  dprCap: { desktop: 1.5, mobile: 1.25 },
  /** Viewports at or below this width use the mobile budget. */
  mobileMaxWidth: 760,

  /** Bust frame: model units, y up, face toward +z. The bust spans y ∈ [0, ~2.45]. */
  bustHeight: 2.45,
  /** Samples below this height are dropped (head-and-shoulders crop). */
  cutoffY: 0.04,
  /** Resting three-quarter turn, radians. */
  baseYaw: -0.38,

  /** Marching-cubes cells along the bust height; lowered if extraction is slow. */
  gridCells: 64,
  gridCellsFallback: 44,
  /** Budget for the shell extraction on desktop, ms. */
  extractBudgetMs: 150,

  /** Optional GLB: fraction of the model height to keep, measured from the top (1 = keep all). */
  glbKeepTopFraction: 1,
} as const;
