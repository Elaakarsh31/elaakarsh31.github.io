# Aakarsh Arora: portfolio

A static portfolio site. The hero is a head-and-shoulders bust made of luminous particles (Three.js, one `Points` object with an original shader) in front of a giant HTML greeting. It turns and dissolves as you scroll and reacts to the cursor. Below it are Work, Publications, Experience, Skills, Education, About and Contact.

Vite + React + TypeScript. No backend, no API keys, and no requests to other origins at runtime, because fonts are self-hosted with `@fontsource`.

## Commands

```sh
npm install                 # install dependencies
npx playwright install chromium   # once, only needed for `npm run shots`

npm run dev                 # dev server at http://localhost:5173 (regenerates resume data first)
npm run build               # type-check and build to dist/ (regenerates resume data first)
npm run preview             # serve dist/ at http://localhost:4173
npm run shots               # screenshots of the production build into screenshots/ (run `npm run build` first)
npm run links               # request every URL in src/content/portfolio.ts and list any that are not 200
npm run resume              # only regenerate src/content/resume.generated.json
```

`npm run shots` serves `dist/` with `vite preview` and saves these captures to `screenshots/`:
- desktop (1440×900) and mobile (390×844) at hero progress 0, 0.5 and 1
- the Work section
- the bust after scrolling back up
- a pointer sweep and the frame 2 seconds after it
- a reduced-motion run, a run with WebGL disabled, and a context-loss run

It also checks the following, and fails on any console error, page error or cross-origin request:
- the skill count matches the `.tex`
- every project has Details
- the nav anchors land on their sections
- Tab reaches every link
- the loop pauses offscreen and in a hidden tab

`npm run shots -- --og` also rewrites `public/og.png`, a 1200×630 frame of the hero. `npm run shots -- --only=desktop-p0` captures a subset.

## Where to edit content

| What | Where |
| --- | --- |
| Full details: every experience, project, publication, education entry and skill | `content/Aakarsh_Arora_Full_Resume.tex` |
| Short copy: tagline, summaries, stacks, links, featured flags, About, contact, `showDetails` | `src/content/portfolio.ts` |

The `.tex` is the source of truth. `scripts/resume-to-json.mjs` parses it into `src/content/resume.generated.json` before every `dev` and `build`, so editing the `.tex` is all it takes:
- Lines starting with `%` are ignored.
- LaTeX becomes plain text with bold, italic, code and links.
- `[Code]`, `[Paper]` and `[Live Demo]` links are lifted out of bullet text and attached to the entry.
- The script fails with a clear message if any LaTeX command would reach the page.

Entries in `portfolio.ts` are matched to the resume by title (`resumeTitle`) or company (`resumeCompany`). The match ignores case and punctuation, and treats `&` and "and" as the same. Links in `portfolio.ts` take precedence over links in the `.tex`.

To show Fidelity's full bullets, set `showDetails: true` on that entry. The bullets are already in the generated data.

## Adding a resume PDF

Put a one-page PDF at `public/resume.pdf` and rebuild. A "Resume (PDF)" link appears under Contact. The link is only rendered when the file exists at build time, and its href respects `BASE_PATH`.

Keep personal phone numbers out of any PDF you publish.

## Adding a real portrait model

Put a model at `public/models/portrait.glb` and rebuild. Without it, the site uses the procedural bust.

The model should be:
- binary glTF (`.glb`), uncompressed: no Draco, no meshopt. In Blender, export glTF Binary with compression off.
- head and shoulders, facing +Z (glTF's default front)
- ideally under 10 MB and 100k triangles

The visible mesh triangles are sampled by area with world transforms applied, then centered and framed. If the mesh has a base-color texture, each point's brightness comes from it. Otherwise it comes from `COLOR_0` vertex colors if present. This lets eyes, brows and lips read.

For a full-head or full-body model, lower `glbKeepTopFraction` in `src/hero/config.ts` to keep only the top part, for example `0.25`. A compressed file logs a console message and falls back to the procedural bust.

Other portrait tunables (point counts, DPR caps, framing, grid resolution) are in the same config file. The shaders are in `src/hero/shaders/`.

## Deployment

`.github/workflows/deploy.yml` builds the site on every push to `main` and deploys `dist/` to GitHub Pages with `actions/upload-pages-artifact` and `actions/deploy-pages`.

1. In the repository, go to Settings → Pages → Build and deployment and set **Source: GitHub Actions**.
2. The workflow assumes the repository is named `elaakarsh31.github.io`, which serves from the root with `BASE_PATH=/`. For any other repository name, the site is served at `https://<user>.github.io/<repo>/`. In that case, set `BASE_PATH: /<repo>/` in the workflow's build step.
3. Canonical and Open Graph URLs default to `https://elaakarsh31.github.io` plus the base path. For a custom domain, set `SITE_URL` in the build step, for example `SITE_URL: https://example.com`.

## Layout

```
content/Aakarsh_Arora_Full_Resume.tex   resume source of truth
scripts/resume-to-json.mjs              .tex → src/content/resume.generated.json
scripts/shots.mjs                       Playwright screenshots and checks
scripts/check-links.mjs                 link checker
src/content/portfolio.ts                short copy, links and flags (typed)
src/content/resume.ts                   types and title matching for the generated data
src/components/                         page sections
src/hero/                               HeroScene (React mount), scene, bust (SDF + marching cubes), glb, config
src/hero/shaders/                       particle vertex and fragment shaders
```
