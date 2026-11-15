/// <reference types="vite/client" />

/** True when public/resume.pdf existed at build time (see vite.config.ts). */
declare const __HAS_RESUME__: boolean;
/** True when public/models/portrait.glb existed at build time. */
declare const __HAS_MODEL__: boolean;

/** Fontsource subpaths are CSS files resolved through the package's exports map. */
declare module '@fontsource/*';
