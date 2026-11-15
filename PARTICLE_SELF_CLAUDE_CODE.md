# Build my portfolio site with a Particle Self hero

Inputs in this repository:
- This file: design, build rules, and the short copy for each section.
- content/Aakarsh_Arora_Full_Resume.tex: the full merged resume. It is the source of truth for every experience, project, publication, education, and skill detail.
- public/resume.pdf (optional): a one-page resume for the Resume link.

## What this is

A portfolio for Aakarsh Arora, an MS in Artificial Intelligence student at Northeastern University graduating December 2026 and looking for full-time applied AI and ML roles. Most visitors will be recruiters and hiring managers who spend under a minute here. The hero should be memorable, but projects must be one click or one short scroll away, and every project row must say what was built and link to the code where a link is given below.

## Ground rules

- Work in this repository. If it is empty, scaffold Vite + React + TypeScript with Three.js installed from npm. If a lockfile exists, use that package manager and keep the existing stack where practical.
- Static site only. No backend, API keys, paid services or assets, MotionSites plugin, or MCP servers.
- Self-host fonts with @fontsource packages. At runtime the page should make no requests to other origins except when a visitor clicks an outbound link.
- Do not invent content. Use only the text, numbers, and links in this file and in content/Aakarsh_Arora_Full_Resume.tex. No made-up metrics, testimonials, logos, employers, dates, or project details. If something feels missing, leave it out and list it in your summary.
- Never publish the phone number from the resume header.
- Keep these in separate files so each can be edited alone: the hero and scene code, the shader source, the short copy (src/content/portfolio.ts), and the resume data generated from the .tex (see Resume data below).

## Order of work

Work in this order. Run the production build at the end of each step and fix errors before moving on. If the folder is a git repo, commit after each step.

1. Scaffold, the resume parser and generated data, the content file, the full page layout with every section, and the static fallback hero with no WebGL. The page must be complete and usable at this point.
2. The particle bust with a static camera. Take screenshots (see Verify) and iterate until the face reads as a face at desktop and mobile widths.
3. The scroll sequence: rotate, dissolve, and reassemble on reverse scroll.
4. Cursor turbulence and gaze parallax.
5. Reduced motion, the WebGL failure path, context loss, resize, pausing offscreen or on a hidden tab, and cleanup on unmount.
6. Meta tags, the OG image, the README, and the GitHub Pages workflow.

## Visual direction

Reference: the MotionSites "Particle Self" preview at https://motionsites.ai/?prompt=particle-self. The page is rendered with JavaScript and you probably cannot see it, so treat this description as the source of truth: a head-and-shoulders bust made of dense, luminous particles on black, with a giant greeting behind it. The design and the code must be original.

Supporting style: pure black (#000) background, warm off-white particles, sparse lavender for particle shadows, glints, and focus rings, thin 1px rules, a compact monospace face for navigation and project metadata, and quiet peripheral UI. The bust is the one bold element. Keep everything else restrained. Pick a condensed display face for the greeting that is not a default choice, plus one monospace face.

Particles: keep the facial silhouette crisp, use a restrained halo, and avoid an opaque mesh, a flat dotted image, a torus, or an unstructured star field.

Hero:
- A large, condensed, uppercase "HI, I'M AAKARSH" sits behind the particles. The real heading must be HTML text, not drawn in the canvas.
- Under it, the tagline from the content file and a "View projects" link to #work, both readable.
- Top navigation: Work, About, Contact. Readable and keyboard focusable at all times, including during the sticky sequence.
- The opening frame must be recognizable without scrolling or moving the mouse.

After the hero, the page scrolls normally:
- Work: an editorial index of wide rows with thin dividers. Each row shows the title, year, a one or two sentence summary, the stack in monospace, and text links (Code, Live demo, Paper, Notebook) only where a URL exists. Each row also has a "Details" disclosure (a native details/summary element or an accessible button) that expands to the full bullet list for that project from the resume data. The first three projects are featured and get more room. The rest are compact rows. Every project in the content file must appear. No cards, counters, numbered markers, or required thumbnails.
- Publications: a compact list with venue, year, the bullet from the resume, and links, plus a line linking to Google Scholar.
- Experience: compact rows with role, company, dates, and one line of description, each with a "Details" disclosure showing the full bullets from the resume, except where showDetails is false (see Experience below).
- Skills: one row per skill category from the resume, showing the category name and its first eight skills, with a disclosure that reveals the rest. Every skill in the resume must be reachable. Keep it compact and collapsed by default.
- Education and About: short.
- Contact: email, LinkedIn, GitHub, Google Scholar, and a Resume (PDF) link only if public/resume.pdf exists.
- On phones, everything stays in normal flow and the hero is shorter.

External links open in a new tab with rel="noopener noreferrer". Label the SOP agent's demo link "Live demo" with a small note: "free hosting, first load can take up to a minute".

## Build the particle portrait

1. Use one Three.js Points object with BufferGeometry and an original ShaderMaterial. If public/models/portrait.glb exists, load it with GLTFLoader using a path built from import.meta.env.BASE_URL. Sample the visible mesh triangles by area with world transforms applied, then normalize, center, and frame the samples. Keep only samples above a configurable cutoff height so a full-head or full-body model crops to head and shoulders. If the mesh has a base color texture, draw it once to an offscreen 2D canvas and sample it at each point's UV. If it has COLOR_0 vertex colors, interpolate those instead. Use that luminance to vary point brightness and size so the eyes, brows, lips, and hairline read. Do not add DRACOLoader or meshopt. If the file is compressed, log a clear console message and use the procedural bust.
2. If there is no GLB or loading fails, generate a recognizable bust locally from smoothly blended ellipsoids (a signed distance field) with a cranium, brow, cheekbones, tapered jaw, nose ridge, neck, and sloping shoulders, in a mild three-quarter view so the nose and jaw read. Extract the outer shell once with a coarse marching-cubes pass, sample the triangles by area, and add a small seeded depth jitter. No separate floating ellipsoids, generic sphere, or missing-asset placeholder. Precompute this at load. If extraction takes more than about 150 ms on desktop, lower the grid resolution.
3. Generate seeded portrait positions and dispersed target positions once. Store both as typed vertex attributes, with a per-point seed and normals for shading. One vertex shader interpolates between them from scroll progress and adds a slow, low-amplitude drift. Use soft circular point sprites with depth attenuation and restrained additive blending. Start around 60,000 points on desktop and 15,000 on mobile, with a device-pixel-ratio cap of about 1.5 on desktop and 1.25 on mobile. Tune density and point size from the screenshots so the silhouette reads without blowing out the highlights.
4. Add cursor turbulence using a short, fixed-length trail of recent pointer positions passed as uniforms, with radius, age falloff, and velocity. Compare pointer and particle positions in the same aspect-corrected screen space. Apply a small radial push and tangential swirl near the pointer, decay it over one to two seconds, and add a few degrees of damped gaze or camera parallax. Touch scrolling stays native, and touch can skip turbulence.
5. Drive the scene with normalized progress through the hero section, read from its bounding rect inside the animation loop, not from wheel deltas and not through React state. Make the desktop hero section about 160vh with a 100vh sticky stage, and about 120vh on phones, so visitors reach the Work section quickly. Start with the bust assembled, rotate it gently, and dissolve it into a dim particle cloud by the time the Work section enters the viewport. Scrolling back reassembles it smoothly. No scroll hijacking. Anchor links and normal scrolling must keep working.
6. Keep the animation GPU-driven. Update camera and uniforms per frame without rewriting particle positions or setting React state in the loop. Reuse buffers, handle resize, pause when the canvas is offscreen or the tab is hidden, and dispose WebGL resources and listeners on unmount. If WebGL is unavailable or the context is lost, show the legible static hero. Respect prefers-reduced-motion with a static portrait, no pointer effects, and a short, non-sticky hero.

## Resume data

Write scripts/resume-to-json.mjs (plain Node, no network) that reads content/Aakarsh_Arora_Full_Resume.tex and writes src/content/resume.generated.json. Run it automatically before dev and build (predev and prebuild npm scripts) so editing the .tex is all it takes to update the site.

- Skip every line whose first non-space character is %. Those are notes, not content.
- Parse Experience (\resumeSubheading: role, dates, company and tool list, location, bullets), Projects (\resumeProjectHeading: title, stack, date, bullets), Publications (title, venue, date, bullet, links), Education (\resumeEduLine), and Technical Skills (one category per tabularx row, items split on commas outside parentheses).
- Convert LaTeX to plain text or simple inline markup: \textbf to bold, \emph to italic, \texttt to code, \href{url}{label} to a link object, \% to %, \& to &, \_ to _, \# to #, $\sim$ to ~, $\times$ to ×, R\textsuperscript{2} to R², -- to an en dash, --- to an em dash, ~ to a space, and inline math like $224{\times}224$ to 224×224. Drop layout macros such as \parbox, \raggedright, \strut, \vspace, \resumeNeedspace.
- Fail the script with a clear message if any backslash command is left in the output, so raw LaTeX never reaches the page.
- Strip [Code], [Paper], [Live Demo] links out of bullet text and attach them to the entry instead.
- Match entries to the short copy below by title. If a title in the .tex has no match below, or the reverse, list it in your summary.

## Portfolio content

Put this in src/content/portfolio.ts with a typed schema. Use the wording as given. Trimming for layout is fine. New claims are not. The full bullets for each entry come from the resume data.

### Site

- Name: Aakarsh Arora
- Greeting: HI, I'M AAKARSH
- Tagline: Applied AI Engineer · MS in AI, Northeastern University
- Availability: Graduating December 2026. Open to full-time roles from January 2027.

### Contact

- Email: aakarshverma330@gmail.com
- GitHub: https://github.com/Elaakarsh31
- LinkedIn: https://www.linkedin.com/in/aakarsharora/
- Google Scholar: https://scholar.google.com/citations?user=zabMms8AAAAJ&hl=en
- Resume: public/resume.pdf, only if the file exists. Build the href from BASE_URL.

### Projects

Show all of these in this order. The first three are featured.

1. SOP-Guided Insurance Claims Agent (2026, resume title: SOP-Guided Insurance Claims Agent)
   Summary: A claims support agent that follows a fixed four-phase procedure: verify identity, resolve intent, process the case, and follow up. The LLM extracts details and writes replies, but every gate (identity match, representative consent, which guidance can be shared) runs in plain Python, so the model cannot talk its way past a check. The gate logic is covered by 31 unit tests.
   Stack: LangGraph, Gemini, FastAPI, Pydantic, Docker, Render
   Code: https://github.com/Elaakarsh31/SOP-Guided-Agent
   Live demo: https://sop-guided-agent.onrender.com/

2. StoryWeaver (2026, resume title: StoryWeaver AI)
   Summary: Turns a book into a narrated, scene-by-scene AI video. A LangGraph pipeline splits the story into scenes, generates them in parallel, keeps characters consistent with a locked persona schema, and pauses for human approval before rendering. Video and ElevenLabs narration are generated in parallel for each scene and joined with MoviePy.
   Stack: LangGraph, Gemini, ComfyUI, ElevenLabs, MoviePy, Docker, Kubernetes
   Links: none. The repo is not public yet. Show no code link and no "coming soon" label.

3. EcoSurve: AI-Powered Surveillance Video Summarization (2026, CVC, Springer; its details come from the Publications entry of the same name)
   Summary: Lets operators find incidents in long surveillance footage without watching all of it. A UniVTG video-language model condenses the footage into timestamped event segments, and BERT-based retrieval answers questions over those segments, so each answer points back to the source clip.
   Stack: UniVTG, BERT, RAG
   Paper: https://link.springer.com/chapter/10.1007/978-3-032-26217-2_6
   Code: https://github.com/Elaakarsh31/EcoSurve-VLM-powered-Crime-Footage-Summarization

4. Real-Time Object Recognition with One-Shot CNN Embeddings (2026, resume title: Real-Time Object Recognition & One-Shot CNN Embeddings)
   Summary: A C++17 and OpenCV pipeline that segments and classifies several objects per frame from a single example per class, using 512-dimensional ResNet18 embeddings run through OpenCV DNN as an ONNX model. Reached 98% accuracy, with scripted confusion-matrix evaluation.
   Stack: C++17, OpenCV, ONNX, ResNet18
   Code: https://github.com/Elaakarsh31/Real-Time-Object-Recognition-One-Shot-CNN-Embeddings

5. GPT-2 Style Shakespeare Generator (2026, team project; resume title: GPT-2 Shakespeare Text Generator)
   Summary: A 7.24M-parameter decoder-only Transformer written from scratch in PyTorch and trained on Tiny Shakespeare. Against a bigram baseline it cut perplexity from 12.07 to 4.56 and raised accuracy from 26.9% to 56.6%, with a hyperparameter grid search and context-length and positional-embedding ablations.
   Stack: Python, PyTorch
   Code: https://github.com/Elaakarsh31/gpt2-shakespear

6. Numerical Reasoning with LLMs, SemEval-2024 Task 7 (2024, resume title: Numerical Reasoning with LLMs)
   Summary: Fine-tuned BERT, Flan-T5, and Llama to answer questions that depend on numbers in text, reaching 71% F1 with chain-of-thought prompting.
   Stack: Python, PyTorch
   Code: https://github.com/Elaakarsh31/semeval2024-task7-subtask1

7. Skimlit (2024, resume title: Skimlit: Text Summarization for Research Papers)
   Summary: Labels each sentence of a research abstract by its role so papers can be skimmed faster. TensorFlow models with USE and GloVe embeddings, trained on 200k+ abstracts, reach 85% F1.
   Stack: Python, TensorFlow
   Code: https://github.com/Elaakarsh31/Skimlit

8. GPTBot, a RAG chat assistant (2024, resume title: LLM Chatbot: Document-Grounded Conversational AI Assistant)
   Summary: A GPT-4 chatbot built with LangChain and Chainlit that answers from uploaded documents using RAG, with per-user sessions and chat history stored in Firebase.
   Stack: LangChain, Chainlit, OpenAI API, Firebase
   Code: https://github.com/Elaakarsh31/GPTBot

9. Fuel Economy Analysis (2025, resume title: Fuel Economy Analysis)
   Summary: Random Forest and XGBoost regression on 40k+ vehicle records to predict fuel economy, reaching R² of 0.85 and RMSE of 2.3.
   Stack: Python, pandas, scikit-learn, XGBoost
   Code: https://github.com/Elaakarsh31/FuelEconomyAnalysis

### Publications

- EcoSurve: AI-Powered Surveillance Video Summarization. CVC, Springer, 2026. Paper and Code links as in Projects.
- Chicken Disease Multiclass Classification. ICITA, Springer, 2023. Benchmarked 12 CNN architectures. The proposed ChicNetV6 reached 94.49% accuracy.
  Paper: https://link.springer.com/chapter/10.1007/978-981-19-9331-2_19
  Code: https://github.com/Elaakarsh31/Chicken-Disease-Classification
- Semantic Segmentation of Retinal Vessels. OITS, IEEE, 2023. Attention U-Net with a ResNet encoder, GAN oversampling, and Gabor filtering, reaching 97% accuracy.
  Paper: https://ieeexplore.ieee.org/abstract/document/10053840
  Notebook: https://colab.research.google.com/drive/1JQ-6DLyqRbs7589cfOMndfEZ_UR9Gaxn?usp=sharing
- Closing line: "Six publications, first author on each. Full list on Google Scholar." Link it to the Scholar URL.

### Experience

- Data Scientist, Fidelity Investments, Boston. July 2025 to Dec 2025. showDetails: false
  Built an LLM document-validation pipeline on AWS (S3, Textract, Claude) for student-debt workitems. An LLM-as-judge returns a verdict, confidence, and reason for each field, and low-confidence fields go to human review.
- Machine Learning Engineer, Zingroll, New Delhi. Jan 2024 to Aug 2024
  Collected unstructured social media data such as tweets and posts, and fine-tuned Hugging Face models to generate dark-humor memes.
- Machine Learning Backend Intern, Hexbit, New Delhi. Feb 2023 to Aug 2023
  Built pipelines over seller catalog and listing-update data, raising the share of eligible records published by the scheduled cutoff from 75% to 90%.
- Research Assistant, KIIT University, Bhubaneswar. Mar 2022 to Jan 2023
  Medical image segmentation research with Attention U-Net and GAN-based augmentation.

showDetails: false means the Fidelity row shows only its one-line summary on the public page. Keep its full bullets in the generated data, controlled by that flag, so Aakarsh can turn them on later.

### Education

- MS in Artificial Intelligence, Khoury College of Computer Sciences, Northeastern University, Boston. Sept 2024 to Dec 2026
- Bachelor of Technology in Computer Science, Kalinga Institute of Industrial Technology. Sept 2020 to May 2024

### About

I'm finishing an MS in Artificial Intelligence at Northeastern in Boston this December. Before that I built LLM evaluation pipelines as a data scientist at Fidelity, worked as an ML engineer at Zingroll, and did computer vision research at KIIT. I've published six papers, first author on each. I'm most interested in applied AI, agentic systems, and evaluation.

## Verify

- The production build passes with no TypeScript errors.
- Add Playwright as a dev dependency (no MCP server needed) and an npm script, for example `npm run shots`, that serves the production build with vite preview and saves screenshots to a screenshots/ folder: desktop 1440x900 and mobile 390x844, at hero progress 0, 0.5, and 1, plus the Work section. Also capture one run with reduced motion emulated and one with WebGL disabled. Headless Chromium may render WebGL blank. If it does, launch with `--use-angle=swiftshader --enable-unsafe-swiftshader`. Open the screenshots yourself and iterate until the face reads clearly at both sizes and the highlights are not blown out.
- Treat any console error or page error during those runs as a failure.
- Check every URL in portfolio.ts with a request (curl -sIL or a short Node script) and report any that do not return 200. Do not silently delete a failing link. List it.
- Run the resume script on a clean checkout and confirm it reports no leftover LaTeX, every project and experience entry has its bullets, and the number of skills on the page equals the number in the .tex.
- Confirm the page works with no GLB, the Work, About, and Contact anchors land correctly, forward and reverse scroll reassemble the bust, the pointer disturbance settles within about two seconds, and Tab reaches every link with a visible focus ring.

## Ship

- index.html: title "Aakarsh Arora | Applied AI Engineer", a meta description from the tagline, Open Graph and Twitter tags, an OG image at public/og.png (a 1200x630 hero screenshot from the Playwright run), and a simple original SVG favicon.
- vite.config: `base: process.env.BASE_PATH ?? '/'`.
- .github/workflows/deploy.yml that builds the site and deploys it to GitHub Pages with actions/upload-pages-artifact and actions/deploy-pages. Assume the repo is named elaakarsh31.github.io, which serves from the root with base '/'. Document that any other repo name needs BASE_PATH=/<repo-name>/ set in the workflow, and that Pages must be set to deploy from GitHub Actions in the repo settings.
- README: exact install, dev, build, preview, and shots commands; where to edit content (content/Aakarsh_Arora_Full_Resume.tex for details, src/content/portfolio.ts for the short copy, flags, and links); how to add public/resume.pdf; how to add public/models/portrait.glb (uncompressed binary glTF, head and shoulders, ideally under 10 MB and 100k triangles, exported from Blender with compression off); and how deployment works.

## Final summary

List what you built, what you verified with the screenshot paths, any titles that did not match between this file and the .tex, any links that failed, and anything in this file you could not do.
