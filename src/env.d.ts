/// <reference types="vite/client" />

/** Files in public/projects/ at build time (see vite.config.ts). */
declare const __PROJECT_IMAGES__: string[];
/** Files in public/frames/ at build time (see vite.config.ts). */
declare const __FRAMES__: string[];

/** Fontsource subpaths are CSS files resolved through the package's exports map. */
declare module '@fontsource/*';
declare module '@fontsource-variable/*';
