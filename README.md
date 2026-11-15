# Aakarsh Arora: portfolio

A static portfolio that tells one story: **data → model → system**. In a dark engineering workshop, a small robot builds one machine in three acts as you scroll. Raw data fragments are refined into clean blocks. The blocks are fabricated into a model core. Housing plates lock on until the machine powers on. Holographic callouts pin real facts from the resume to the parts they describe.

The page opens on a **power-on gate**: a systems check that shows the scene loading for real, then one Power on button. Browsers only play sound after a click, tap or key press (scrolling doesn't count), so this one click is what lets every visitor hear the workshop. It is skipped with reduced motion or without WebGL, where there is no sound.

Vite + React + TypeScript, with Three.js through React Three Fiber, GSAP ScrollTrigger and Lenis. Rapier runs the toolbench physics. There is no backend and there are no API keys. Nothing is requested from another origin at runtime: fonts are self-hosted with `@fontsource`, and Rapier's WASM is inlined.

## Commands

```sh
npm install
npx playwright install chromium   # once, for shots, frames and video

npm run dev       # dev server at http://localhost:5173 (regenerates resume data first)
npm run build     # type-check and build to dist/ (regenerates resume data first)
npm run preview   # serve dist/ at http://localhost:4173

npm run shots     # full verification + screenshots into screenshots/ (build first)
npm run video     # record one full scroll, then a frame every 0.5 s into screenshots/video/ (needs ffmpeg)
npm run frames    # capture the still frames and the OG image from the real scene (build first, then build again)
npm run links     # request every URL in src/content/portfolio.ts and list any that are not 200
npm run resume    # only regenerate src/content/resume.generated.json
```

`npm run shots` serves `dist/` and checks the following. It fails on any console error, page error or request to another origin.
- The power-on gate holds the page, fills, focuses Power on, lifts on Enter or a tap, and starts audio.
- Screenshots at 1440×900 and 390×844 (plus a portrait tablet and a phone held sideways, which must use the compact layout with nothing floating over the content): the hero; the start, middle and end of each act; projects; career; the toolbench before and after sorting; contact.
- No HUD panel overlaps the act copy.
- Readouts show live values.
- Rendering pauses offscreen and in a hidden tab.
- The command palette:
  - opens with ⌘K, Ctrl K and "/"
  - every action works from the keyboard alone: jumps land with focus, the email is in the clipboard, links open in new tabs, and the bot replies
- Content:
  - every toolbench tag is a `.tex` skill
  - no phone number appears on the page
  - every new-tab link has `rel="noopener noreferrer"`
- Tab reaches every link, button and disclosure with a visible focus ring.
- Reduced motion and WebGL disabled each fall back to still frames, and so does a lost WebGL context.

On macOS the scripts render with the GPU (ANGLE Metal). Pass `-- --sw` to use SwiftShader instead, which is also the default on other platforms.

## Where to edit

| What | Where |
| --- | --- |
| Dates, bullets, publications, skills | `content/Aakarsh_Arora_Full_Resume.tex` (source of truth) |
| Hero copy, act titles and lines, callouts, spec sheets, publications, career notes, toolbench tags, contact | `src/content/portfolio.ts` |
| The bot's lines | `portfolio.bot.lines` in `src/content/portfolio.ts` |
| The bot's name | `portfolio.bot.name` in the same file. It is empty by default, and with no name the bot shows none anywhere. |
| The one-page resume | `public/resume.pdf` |
| Optional project previews | `public/projects/<id>.png` (or `.jpg`, `.webp`, `.svg`) with `<id>` one of `sop`, `storyweaver`, `ecosurve`, `gpt2`. They replace the code-drawn schematic. |

`scripts/resume-to-json.mjs` parses the `.tex` into `src/content/resume.generated.json` before every `dev` and `build`.
- It reads nothing above `\section{Experience}`, so the header and its phone number never reach the page.
- It fails with a clear message if any LaTeX would leak through.

Entries in `portfolio.ts` match the resume by title or company, ignoring case and punctuation. Fidelity has `showDetails: false`, so its Career entry has no "More" disclosure.

Callouts carry:
- `at`: when the callout appears on the timeline
- `anchor`: the part its leader line points at
- `slot`: its position in the HUD column, ordered top to bottom so leader lines don't cross

## How the page works

- **Modes** (`src/lib/env.ts`) are set on `<html data-mode>`:
  - `live`: a wide, landscape window (at least 1000×560 and wider than 1.15:1) with WebGL and motion allowed. The pinned build, the HUD, the physics bench, the power-on gate and sound run here.
  - `static`: everything else: phones, portrait tablets, phones held sideways, small windows, reduced motion, no WebGL or a lost context. Every section sits in normal flow beside its still frame, with native scrolling and no WebGL.
  - `<html data-size>` is `compact` on the small and squarish screens: the dock, rail and floating resume button are hidden so nothing covers the content, and Resume moves into the nav.
  - On narrower live windows the camera holds its horizontal view (`src/three/lens.ts`), and from 1800px up the type and text columns grow (`src/styles/large.css`).
- **The build** (`src/components/Build.tsx`, `src/lib/timeline.ts`):
  - `#build` is 500vh tall with a sticky 100vh stage.
  - One GSAP timeline, scrubbed by ScrollTrigger and driven by Lenis, tweens `stage.p` from 0 to 400 (vh of scroll). It also handles the act copy.
  - Every scene state is a pure function of `p` (`src/three/timing.ts`, `choreo.ts`, `plan.ts`), so scrolling back plays the build in reverse.
- **The scene** (`src/three/`) is built from primitives in code:
  - the machine (`machine/`), Act 1's fragments, refinery and blocks (`data/`), and the bot (`bot/`)
  - hologram and fabricate shaders (`materials/`)
  - the physics toolbench (`toolbench/`, loaded lazily)
  - `HudSync.tsx` pins the DOM HUD (leader lines, plate and tray labels, the bot's speech tag) to 3D anchors every frame. All HUD text is real DOM text.
- **URL switches:**
  - `?static` forces the static layout.
  - `?p=123` holds the build at a timeline position.
  - `?frame=hero|data|model|system|og` renders one still frame with no UI. `npm run frames` uses it.

## Deployment

`.github/workflows/deploy.yml` builds on every push to `main` and deploys `dist/` to GitHub Pages.

1. In the repository, set Settings → Pages → Build and deployment → **Source: GitHub Actions**.
2. The workflow assumes the repository is named `elaakarsh31.github.io` (served from `/`). For another name, set `BASE_PATH: /<repo>/` in the build step.
3. Canonical and Open Graph URLs default to `https://elaakarsh31.github.io` plus the base path. For a custom domain, set `SITE_URL` in the build step.

## Layout

```
content/Aakarsh_Arora_Full_Resume.tex   resume source of truth
scripts/resume-to-json.mjs              .tex → src/content/resume.generated.json
scripts/shots.mjs                       Playwright verification and screenshots
scripts/video.mjs                       full-scroll recording and frame extraction
scripts/frames.mjs                      still frames and OG image from the real scene
scripts/check-links.mjs                 link checker
src/content/                            portfolio.ts (copy), resume.ts (typed resume data)
src/components/                         sections, HUD, palette, rail, dock, cursor
src/lib/                                modes, scroll, timeline, stage state, spy, sound, boot
src/three/                              canvas, studio, machine, bot, data, toolbench, HUD sync
public/frames/                          still frames (generated), og.png (generated), resume.pdf
```
