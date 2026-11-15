import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  define: {
    // The Resume link is rendered only when a one-page PDF has been added.
    __HAS_RESUME__: JSON.stringify(existsSync('public/resume.pdf')),
    // The particle portrait loads public/models/portrait.glb only when it exists.
    __HAS_MODEL__: JSON.stringify(existsSync('public/models/portrait.glb')),
  },
});
