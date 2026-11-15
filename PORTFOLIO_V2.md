# Portfolio v2: the workshop

This file replaces PARTICLE_SELF_CLAUDE_CODE.md, which now lives in docs/archive/ and is no longer the plan. Retire its particle hero, shader and editorial-index layout.

Keep these parts of v1 because they work:
- the resume parser (scripts/resume-to-json.mjs) and the generated resume data
- the content-honesty rules
- the link checker
- the Playwright screenshot script
- the GitHub Pages deploy workflow

## Inputs

- This file holds the story, design, choreography and short copy.
- content/Aakarsh_Arora_Full_Resume.tex is the source of truth for dates, bullets, publications and skills, read through the existing parser.
- public/resume.pdf is the one-page resume.
- public/projects/ (optional) holds screenshots or frames for the featured projects.
- No character model file is needed. Everything 3D is built in code.

## The one idea

The site should make a recruiter think "okay, this is interesting" within five seconds, not "same template again". It does that by showing my actual story as a machine being built in front of them.

My story is a pipeline, and so is the page:
1. Data: I collect messy, unstructured data and refine it.
2. Model: I train models on that data.
3. System: I build a working system around the model.

The page is a dark, precise engineering workshop. A small, playful robot assembles one machine in three acts as you scroll. Raw data fragments get refined into clean blocks, the blocks get built into a model core, and the core gets wrapped in system parts until it powers on. Every stage is labeled with real evidence from my work.

The attitude is a brilliant engineer's private workshop: sleek, confident, a little witty, and clearly someone who knows what he is doing. It is never loud, cute-for-the-sake-of-it or trendy.

## Inspiration, not a theme

My inspiration is a famous movie inventor and his workshop (Iron Man: Tony Stark): sleek, dashing, brilliant, an engineer who clearly knows what he is doing. It stays an inspiration. Putting the character himself on the page would make the site feel like a fan project, so leave out the direct references:
- no armor or suit imagery and no red-and-gold armor look
- no glowing chest-reactor shapes
- no character, assistant or company names from the films, and no quotes

Everything else from that world is fair game, especially holographic HUDs, which are a big part of this design (see Holographic HUD layer). The vibe comes from craft, precision and confidence, not from a costume.

Also avoid the portfolio clichés recruiters have seen a hundred times:
- a 3D avatar of me, or a character sitting at a desk
- synthwave grids, code rain, terminal typing intros, glitch or scramble text
- particle portraits and purple-cyan neon gradients
- numbered project carousels
- the section titles "What I do", "My work" and "My tech stack"
- letter-spaced corner labels
- a lavender cursor blob

## Who it is for

Recruiters and hiring managers for data science, data engineering, ML research and applied AI roles, spending about a minute. The story must be readable from the first screen. The projects must be one click away from anywhere, through the nav or the command palette.

## Rules that carry over

- Static site: Vite + React + TypeScript, deployed by the existing workflow. No backend, API keys, paid services or paid assets.
- No invented content. Use only this file's copy and the resume data, with no new metrics, employers, dates or claims. Never show the phone number from the resume.
- No requests to other origins at runtime. Self-host fonts with @fontsource.
- External links open in a new tab with rel="noopener noreferrer".

## Look

Color tokens (adjust any that fail contrast):
- Graphite #0F1013: page background
- Gunmetal #1A1C21: panels and dock surfaces
- Titanium #B9BEC7: metal highlights and secondary UI
- Text #EEF0F3 and Muted #8D929C for type
- Molten #FF5B1F: the only hot color, used for heat, sparks, active states and primary buttons
- Holo #6FD3FF: hologram light for HUD panels, projections, wireframes and readouts
- Ice #CFE3F2: thin annotation lines and HUD text

Warm metal and cool holograms are the core contrast: Molten is the heat of things being built, Holo is the light of things being designed.

Materials: brushed metal, dark glass and soft studio light from above, with hot seams that glow where parts are joined. The floor is a dark surface with a faint, blurred reflection.

Typography:
- Archivo (variable, including its width axis) is the main face. Use expanded heavy settings for the name and act titles, and regular for body text.
- IBM Plex Mono is used only for engineering annotations: callout labels, spec lines and the command palette.
- Write titles in sentence case. Verify the @fontsource package names.

The signature visual device is the holographic engineering callout. Floating HUD panels with thin leader lines point at parts of the machine, the way a technical drawing labels parts. Each callout carries one real fact from my work, so the metrics read like dimensions on a blueprint.

## Holographic HUD layer

The workbench has a built-in hologram projector, and the whole build happens half in light and half in metal. Every new part of the machine appears first as a Holo wireframe hologram, and then the bot fabricates the real metal part into it. Design in light, then build it for real: that is the story of the page in one motion.

HUD elements:
- Callout panels: translucent, with a soft edge glow, faint scanlines and a quick flicker as they appear. Each is anchored to its part with a leader line.
- Stage readouts at the edges: the current act, scroll progress as a thin radial gauge, a live loss value during Model, and a plates-locked count during System.
- Hovering a panel brings it forward and brightens it. Clicking a callout expands it into a larger panel with the details and a link to the project or log entry.
- Dragging on the stage orbits the machine and its holograms a few degrees, then it eases back.
- The command palette opens as a HUD panel, and the bot's speech tags are tiny holograms it projects.
- Hexagon patterns, rings, tick marks and scanlines are all welcome, styled in Holo and Ice.

Make every HUD element show something real (a fact, a progress value or a control) so it reads as a working interface.

Rules:
- All HUD text is real DOM text layered over the canvas, so it is readable, selectable and crawlable, and it meets contrast against the background.
- HUD panels never cover body copy.
- With reduced motion: no flicker or animated scanlines. Panels simply appear.
- On phones: panels become static overlays on the still frames.

## Libraries

- three, @react-three/fiber and @react-three/drei
- @react-three/rapier for the toolbench
- @react-three/postprocessing for subtle bloom on hot seams and sparks only
- gsap with ScrollTrigger
- lenis for smooth scrolling
- cmdk, or a small hand-written command palette

Remove any dependencies that only the particle hero used.

## The bot

A small, playful workshop robot built entirely from primitives in code.

Design:
- A palm-sized, hovering body: a rounded graphite shell with brushed titanium panels.
- A small dark-glass face screen with two simple pixel eyes.
- Two short articulated arms with swappable tool tips: a gripper and a welder.
- A soft Molten thruster glow underneath.
- It must not resemble any known robot character: no single big eye, no dome head on a ball, no robot arm on a stand, no boxy trash-compactor shape.

Behaviour, all procedural:
- It hovers with a gentle bob and leans in the direction it moves.
- Its eyes follow the cursor.
- It blinks every few seconds.
- If the cursor shakes fast, it goes dizzy for a moment (spiral eyes).
- After 20 seconds without input it falls asleep (closed eyes and a slow bob), and any input wakes it.
- In each act it does the work: carries fragments in Data, welds layers in Model (spark particles) and bolts plates on in System.
- At Contact it gives a small salute.
- Clicking it makes it spin once and show one line from botLines in a small speech tag.

Give it a name field in src/content/portfolio.ts, left empty for me to fill. If the name is empty, show no name.

botLines:
- Refining data. Please hold.
- Loss is going down. Morale is going up.
- Tested. Thirty-one times.
- I only weld what's been validated.
- He wrote me in an afternoon. I'm still mad about it.

## The page, top to bottom

One fixed WebGL canvas sits behind the content. The DOM owns all the text, so everything stays readable, selectable and crawlable.

### Global UI

- Nav: an "AA" monogram, then Data, Model, System, Projects, Log and Contact, plus a small "⌘K" hint (Ctrl K on Windows). It stays keyboard reachable during pinned sections, and anchor links must land correctly with Lenis and the pins.
- Pipeline rail: a slim vertical rail on the left edge with three segments, Data, Model and System. Each segment fills as you scroll through its act and is clickable. Hide it on phones.
- Command palette: opens with ⌘K, Ctrl K or "/".
  - Actions: go to any section, open resume, copy email (with a "Copied" confirmation), open GitHub, LinkedIn or Google Scholar.
  - Fully keyboard driven and accessible as a dialog.
  - This is the coder's signature, so make it feel fast and precise.
- Social dock, fixed at the bottom left: GitHub, LinkedIn, Google Scholar and email on a slim gunmetal plate. On hover or focus, each icon heats up: it fills with Molten, gets a soft heat halo and lifts slightly.
- Resume button, fixed at the bottom right: "Resume" with a small document icon.
- Cursor, for fine pointers only: a small precision ring with four tick marks. Over a link or card, the ring expands and wraps the element's bounds as a thin outline, then snaps back. Hide it on touch devices and with reduced motion.

### 1. Hero

- A dark studio with a single cone of light from above.
- The machine sits in the center, half-built, with its parts hanging in an exploded view.
- The bot is welding a seam, throwing a few sparks.
- Text on the left:
  - "Aakarsh Arora" in big expanded type.
  - Under it: "Messy data in. Working systems out."
  - Then: "Data scientist, ML researcher, AI engineer. I collect and refine the data, train the model, and build the system around it."
  - Then: "MS in AI at Northeastern, graduating December 2026."
- A small cue at the bottom reads "Scroll to build".

### 2–4. The three acts

Pin one stage across the three acts, about 120vh each on desktop. Tie the whole sequence to scroll position so scrolling back reverses it. Each act gets:
- a short title and one line
- two or three callouts pinned to the machine
- a link to the related project or log entry

**Act 1, Data: "Start with the mess."**
- Raw fragments drift and tumble around the bench as small cards with textures drawn in code: a social post, a scanned form page, a video frame with a timestamp, a product listing row. Keep the text on them generic and never show anything that looks like real customer data.
- The bot herds them into a glowing refinery ring. They come out the other side as identical, clean blocks lined up in rows.
- Callouts:
  - "Hexbit: records published on time went from 75% to 90%"
  - "Zingroll: social posts collected and cleaned for fine-tuning"
  - "Fidelity: fields pulled from scanned documents with Textract"

**Act 2, Model: "Train on what you refined."**
- The clean blocks lift and stack into the model core as layers. The bot welds each seam, and the seams glow Molten and then cool.
- Thin Ice filaments flicker between layers as the core spins up.
- A small mono readout shows a loss value ticking down.
- Callouts:
  - "GPT-2 style Transformer, 7.24M parameters, written from scratch"
  - "Perplexity from 12.07 to 4.56 against a bigram baseline"
  - "Fine-tuned BERT, Flan-T5 and Llama for numerical reasoning"
  - "Six papers, first author on each"

**Act 3, System: "Then make it useful."**
- Labeled armor plates swing in and lock onto the core one at a time, each with a short click of light along its seam: Gates, Retrieval, Human review, API, Interface.
- When the last plate locks, the machine powers on: a slow pulse of light runs through every seam, and the bot gives a thumbs-up with its gripper.
- Callouts:
  - "SOP agent: every gate runs in plain Python, covered by 31 tests"
  - "StoryWeaver: scenes generated in parallel, human approval before render"
  - "Fidelity: LLM-as-judge, low-confidence fields go to a human"

### 5. Projects, as spec sheets

- Show the four featured projects as large, calm spec sheets, not cards in a carousel.
- Each sheet has:
  - a schematic preview (from public/projects/ if present, otherwise an exploded mini-diagram drawn in code)
  - the title and a one-sentence summary
  - three pipeline chips (Data, Model, System), with the ones the project covers lit in Molten
  - the key result in Ice mono
  - the stack and links
- Hovering a sheet makes the machine in the background light up the matching plates.
- After the last sheet, add a "More on GitHub" link, then a compact Papers strip. It lists the three publications from the resume data with venue, year and links, and ends with "Six publications, first author on each. Full list on Google Scholar."

### 6. Log: my career as release notes

- A vertical changelog with a git-style commit graph down the left.
  - Work runs on main.
  - My two degrees are side branches that open and merge back.
  - The newest entry sits at the bottom, as v1.0.
- As you scroll, the current entry's node heats up in Molten and its notes brighten. Earlier entries stay visible but cool.
- Each entry shows the version, date range, role and organization, plus one or two lines tagged Added or Improved.
- Each entry has a "More" disclosure with the bullets from the resume data. Respect showDetails: false for Fidelity.
- In the DOM this is an ordered list.

### 7. Resume

- A short band reading "Want the one-page version?" with a "Download resume" button.

### 8. Toolbench

- About 18 tools from the resume skills, shown as engraved metal tags scattered on a dark bench.
- Visitors can drag and fling them with the pointer (Rapier physics).
- As you scroll further, or when someone presses "Sort the bench", magnets pull each tag into one of three trays: Data, Model and System. This shows the stack is organized by the same pipeline.
- Below, a "See every skill" disclosure lists every skill from the .tex by category.

### 9. Contact

- The bot hovers to the center and salutes.
- Title: "Let's build something."
- The email in large type with a copy button, the social links, and "Open to full-time roles from January 2027."

## Motion and performance rules

- Sync Lenis smooth scrolling to ScrollTrigger. Use one master timeline for the hero and the three acts. Tie it to scroll position rather than one-shot triggers, so scrolling back plays in reverse.
- Use non-scroll motion sparingly: the bot's idle behaviour, sparks, and the power-on pulse. Do not fade and slide up every section.
- The hero plus the three acts take at most about four screens of scroll. The nav, the rail and the command palette jump straight to Projects.
- Pause rendering when the canvas isn't visible or the tab is hidden. Cap the device pixel ratio at 1.75 on desktop and 1.25 on mobile. Dispose of WebGL resources on unmount.
- Phones:
  - The hero gets the bot and the machine.
  - Each act becomes a still frame of the machine at that stage, with its callouts as a list.
  - No physics (the toolbench becomes tag chips), no rail and no custom cursor.
- With prefers-reduced-motion: no pinning, smooth scroll, physics, sparks or custom cursor. Show static frames and all of the content.
- With no WebGL, or after a lost context, show static PNG frames of the machine at each stage. Capture them with Playwright from the real scene.
- Sound, built last and optional: soft synthesized clicks when plates lock and a faint crackle for sparks, generated with Web Audio. It is off by default behind a small toggle.

## Copy

Hero, act lines, callouts and bot lines: as written above.

About, shown as a short paragraph under the hero text or at the start of Log, whichever reads better:

I'm finishing an MS in Artificial Intelligence at Northeastern in Boston this December. Before that I built LLM evaluation pipelines as a data scientist at Fidelity, worked as an ML engineer at Zingroll, and did computer vision research at KIIT. I've published six papers, first author on each. Where I'm heading: training custom language models on data I refined myself, and building the systems that put them to work.

Log entries (take exact dates from the resume data if they differ):
- v0.1, Sept 2020 to May 2024 (branch): B.Tech in Computer Science, Kalinga Institute of Industrial Technology.
- v0.2, Mar 2022 to Jan 2023: Research Assistant, KIIT University, Bhubaneswar.
  - Added: medical image segmentation research with Attention U-Net and GAN-based augmentation.
  - Added: papers in IEEE OITS and Springer ICITA, 2023.
- v0.3, Feb 2023 to Aug 2023: Machine Learning Backend Intern, Hexbit, New Delhi.
  - Added: pipelines over seller catalog and listing-update data.
  - Improved: records published by the scheduled cutoff, from 75% to 90%.
- v0.4, Jan 2024 to Aug 2024: Machine Learning Engineer, Zingroll, New Delhi.
  - Added: collection of unstructured social media data, tweets and posts.
  - Added: fine-tuned Hugging Face models to generate dark-humor memes.
- v0.5, Sept 2024 to Dec 2026 (branch): MS in Artificial Intelligence, Khoury College of Computer Sciences, Northeastern University, Boston.
- v0.6, July 2025 to Dec 2025: Data Scientist, Fidelity Investments, Boston.
  - Added: LLM document-validation pipeline on AWS (S3, Textract, Claude) for student-debt workitems.
  - Added: an LLM-as-judge returns a verdict, confidence and reason per field, and low-confidence fields go to human review.
- v0.9, now: Building agent systems: the SOP-guided claims agent and StoryWeaver.
- v1.0, from January 2027: "Ships with your team." Open to full-time roles.

Featured projects, with pipeline chips in brackets:
1. SOP-Guided Insurance Claims Agent (2026) [System]
   - Summary: A claims support agent that follows a fixed four-phase procedure. The LLM extracts details and writes replies, but every gate (identity match, representative consent, which guidance can be shared) runs in plain Python, so the model cannot talk its way past a check.
   - Key result: 31 unit tests cover the gate logic.
   - Stack: LangGraph, Gemini, FastAPI, Pydantic, Docker.
   - Links: Live demo https://sop-guided-agent.onrender.com/ with the note "free hosting, first load can take up to a minute"; Code https://github.com/Elaakarsh31/SOP-Guided-Agent
2. StoryWeaver (2026) [Data, Model, System]
   - Summary: Turns a book into a narrated, scene-by-scene AI video. A LangGraph pipeline splits the story into scenes, generates them in parallel, keeps characters consistent with a locked persona schema, and pauses for human approval before rendering.
   - Key result: Video and ElevenLabs narration are generated in parallel for each scene and joined with MoviePy.
   - Stack: LangGraph, Gemini, ComfyUI, ElevenLabs, MoviePy, Kubernetes.
   - Links: none. Show no code link and no "coming soon" label.
3. EcoSurve (2026) [Data, Model]
   - Summary: Lets operators find incidents in long surveillance footage without watching all of it. A UniVTG video-language model condenses the footage into timestamped event segments, and BERT-based retrieval answers questions with a pointer back to the source clip.
   - Key result: Published at CVC, Springer.
   - Stack: UniVTG, BERT, RAG.
   - Links: Paper https://link.springer.com/chapter/10.1007/978-3-032-26217-2_6 and Code https://github.com/Elaakarsh31/EcoSurve-VLM-powered-Crime-Footage-Summarization
4. GPT-2 Style Shakespeare Generator (2026, team project) [Model]
   - Summary: A 7.24M-parameter decoder-only Transformer written from scratch in PyTorch and trained on Tiny Shakespeare, with a hyperparameter grid search and ablations on context length and positional embeddings.
   - Key result: Perplexity fell from 12.07 to 4.56 against a bigram baseline.
   - Stack: Python, PyTorch.
   - Links: Code https://github.com/Elaakarsh31/gpt2-shakespear

Toolbench tags: choose about 18 from the .tex skills and sort them by pipeline stage:
- Data: SQL, pandas, PySpark, Delta Lake, PostgreSQL, AWS Textract
- Model: PyTorch, TensorFlow, Hugging Face, scikit-learn, XGBoost, OpenCV
- System: LangGraph, LangChain, FastAPI, Docker, Kubernetes, AWS

Every tag must match a skill in the .tex. Swap in others from the .tex if any of these are missing.

Contact: aakarshverma330@gmail.com, https://github.com/Elaakarsh31, https://www.linkedin.com/in/aakarsharora/, and https://scholar.google.com/citations?user=zabMms8AAAAJ&hl=en

## Order of work

Run the production build at the end of each step, fix any errors, and commit.

1. Remove the particle hero, the shader and their dependencies. Lay out every section in normal flow with the real content and no WebGL. The page must be complete and usable at this point.
2. Fonts, color tokens, nav, pipeline rail, command palette, social dock, resume button, cursor, and Lenis wired to ScrollTrigger.
3. The studio, the machine in its exploded and assembled states, the hologram projector with the wireframe-then-metal effect, and the bot with its idle behaviour. Screenshot them and iterate until the bot reads as charming and the machine reads as precise engineering, not as a toy.
4. The hero and the three-act choreography, with HUD callouts anchored to parts of the machine and the stage readouts.
5. The project spec sheets, the plate highlighting and the Papers strip.
6. The Log with its commit graph.
7. The toolbench and the Contact salute.
8. Phones, reduced motion, the static fallbacks, performance and cleanup.
9. Optional sound, meta tags, a new OG image, the README, and the verification below.

## Verify

- The production build passes with no TypeScript errors.
- Take Playwright screenshots at desktop 1440x900 and mobile 390x844: the hero, the start, middle and end of each act, the projects, the log, the toolbench before and after sorting, and contact. If WebGL renders blank, use the swiftshader flags.
- Record one full-scroll video on desktop with Playwright's recordVideo, extract a frame every 0.5 seconds with ffmpeg, and review the frames. Check that the assembly reads clearly, that callouts point at the right parts, and that no text sits unreadably over the scene.
- Open the command palette with each shortcut and complete every action with the keyboard alone.
- Run the page once with reduced motion emulated and once with WebGL disabled.
- Treat any console error or page error as a failure.
- Check every link and report any that don't return 200, without deleting them.
- Tab must reach every link with a visible focus ring.
- Before finishing, check every screen against the inspiration rules and the cliché list. If anything shows a direct reference to the films (armor, reactor, names or quotes) or resembles a common portfolio template, change it and say what you changed.

## Ship

- Title: "Aakarsh Arora | Data Scientist, ML Researcher, AI Engineer". Make a new 1200x630 OG image from the assembled machine with the bot.
- Update the README for the new structure, remove the particle and portrait.glb instructions, and explain where the copy, the bot lines and the bot's name live.
- Keep the deploy workflow as it is.

## Final summary

Report:
- what you built
- the screenshot and frame paths
- any missing assets
- any failed links
- anything you couldn't do
- what you changed after the final check against the inspiration rules and the cliché list
