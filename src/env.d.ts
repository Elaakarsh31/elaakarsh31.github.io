/// <reference types="vite/client" />

/** True when public/resume.pdf existed at build time (see vite.config.ts). */
declare const __HAS_RESUME__: boolean;

/** Fontsource subpaths are CSS files resolved through the package's exports map. */
declare module '@fontsource/*';
