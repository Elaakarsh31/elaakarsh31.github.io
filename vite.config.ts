import { existsSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// '/' for https://elaakarsh31.github.io; '/<repo>/' for a project site (see README).
const base = process.env.BASE_PATH ?? '/';
// Absolute URL used by canonical and Open Graph tags.
const siteUrl = (process.env.SITE_URL ?? 'https://elaakarsh31.github.io').replace(/\/$/, '') + base;

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'site-url',
      transformIndexHtml: (html) => html.replaceAll('__SITE_URL__', siteUrl),
    },
  ],
  define: {
    // The Resume link is rendered only when a one-page PDF has been added.
    __HAS_RESUME__: JSON.stringify(existsSync('public/resume.pdf')),
    // The particle portrait loads public/models/portrait.glb only when it exists.
    __HAS_MODEL__: JSON.stringify(existsSync('public/models/portrait.glb')),
  },
});
