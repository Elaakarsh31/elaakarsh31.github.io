import { existsSync, readdirSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// '/' for https://elaakarsh31.github.io; '/<repo>/' for a project site (see README).
const base = process.env.BASE_PATH ?? '/';
// Absolute URL used by canonical and Open Graph tags.
const siteUrl = (process.env.SITE_URL ?? 'https://elaakarsh31.github.io').replace(/\/$/, '') + base;

/** Image files in a public/ folder at build time, so optional assets need no code change. */
function listImages(dir: string) {
  return existsSync(dir) ? readdirSync(dir).filter((f) => /\.(png|jpe?g|webp|avif|svg)$/i.test(f)) : [];
}

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
    // Optional schematic previews for the project spec sheets: public/projects/<project id>.<ext>
    __PROJECT_IMAGES__: JSON.stringify(listImages('public/projects')),
    // Still frames of the machine at each stage (npm run frames): public/frames/<stage>.png
    __FRAMES__: JSON.stringify(listImages('public/frames')),
  },
});
