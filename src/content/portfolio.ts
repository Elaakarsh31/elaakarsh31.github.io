// Every piece of short copy on the site lives here. Dates, bullets, publications and the full
// skill list come from the resume (content/Aakarsh_Arora_Full_Resume.tex →
// src/content/resume.generated.json). Entries are matched to the resume by title or company.

export type Stage = 'data' | 'model' | 'system';

export const STAGES: { id: Stage; label: string }[] = [
  { id: 'data', label: 'Data' },
  { id: 'model', label: 'Model' },
  { id: 'system', label: 'System' },
];

export type Links = {
  code?: string;
  demo?: string;
  /** Small note shown next to the demo link. */
  demoNote?: string;
  paper?: string;
  notebook?: string;
};

/** Where an expanded callout sends the reader. */
export type CalloutLink = { href: string; label: string; external?: boolean };

/** A resume bullet to quote inside an expanded callout. */
export type BulletRef =
  | { source: 'projects'; title: string; index: number }
  | { source: 'publications'; title: string; index: number }
  | { source: 'experience'; company: string; index: number };

export type Callout = {
  id: string;
  /** The fact, exactly as it appears on the panel. */
  text: string;
  /** Named part of the 3D machine the leader line points at. */
  anchor: string;
  /** Timeline position (vh of scroll inside the build) where the panel appears. */
  at: number;
  /** Panel position in the HUD column, top to bottom, matching where its part sits so leader lines don't cross. */
  slot: number;
  /** Shown when the panel is expanded. */
  detail: string;
  bullet?: BulletRef;
  links: CalloutLink[];
};

export type Act = {
  id: Stage;
  /** Act number, shown with the stage name. */
  index: number;
  title: string;
  line: string;
  /** Timeline range in vh of scroll inside the build. */
  from: number;
  to: number;
  callouts: Callout[];
  link: CalloutLink;
  /** Alt text for the still frame used on phones, with reduced motion and without WebGL. */
  frameAlt: string;
};

export type Project = {
  id: string;
  title: string;
  /** Title of the matching entry in the .tex. */
  resumeTitle: string;
  source: 'projects' | 'publications';
  year: string;
  note?: string;
  chips: Stage[];
  summary: string;
  keyResult: string;
  stack: string[];
  links: Links;
  /** Plate names on the machine that light up with this sheet, besides its pipeline chips. */
  plates?: string[];
};

export type Paper = {
  resumeTitle: string;
  /** Display title when the .tex capitalisation differs. */
  title?: string;
  /** Links here take precedence over the links in the .tex. */
  links: Links;
};

export type LogNote = { tag: 'Added' | 'Improved'; text: string };

export type LogEntry = {
  version: string;
  id: string;
  kind: 'work' | 'degree' | 'now' | 'next';
  /** For work: company in the .tex. Dates and role come from there. */
  resumeCompany?: string;
  /** For degrees: institution in the .tex. Dates come from there. */
  resumeInstitution?: string;
  /** Short branch name used on the merge row. */
  branch?: string;
  dates?: string;
  role?: string;
  org: string;
  notes: LogNote[];
  /** When false, the "More" disclosure is left out. The bullets stay in the generated data. */
  showDetails?: boolean;
};

export type ToolTag = { name: string; tray: Stage };

const links = {
  sopCode: 'https://github.com/Elaakarsh31/SOP-Guided-Agent',
  sopDemo: 'https://sop-guided-agent.onrender.com/',
  ecoPaper: 'https://link.springer.com/chapter/10.1007/978-3-032-26217-2_6',
  ecoCode: 'https://github.com/Elaakarsh31/EcoSurve-VLM-powered-Crime-Footage-Summarization',
  gptCode: 'https://github.com/Elaakarsh31/gpt2-shakespear',
  numericCode: 'https://github.com/Elaakarsh31/semeval2024-task7-subtask1',
};

const contact = {
  email: 'aakarshverma330@gmail.com',
  github: 'https://github.com/Elaakarsh31',
  linkedin: 'https://www.linkedin.com/in/aakarsharora/',
  scholar: 'https://scholar.google.com/citations?user=zabMms8AAAAJ&hl=en',
};

export const portfolio = {
  site: {
    name: 'Aakarsh Arora',
    monogram: 'AA',
    title: 'Aakarsh Arora | Data Scientist, ML Researcher, AI Engineer',
  },

  hero: {
    tagline: 'Messy data in. Working systems out.',
    intro:
      'Data scientist, ML researcher, AI engineer. I collect and refine the data, train the model, and build the system around it.',
    education: 'MS in AI at Northeastern, graduating December 2026.',
    cue: 'Scroll to build',
    frameAlt:
      'A half-built machine in exploded view on a dark workbench. A small hovering robot welds a seam while the unbuilt parts hang as blue hologram wireframes.',
  },

  about:
    "I'm finishing an MS in Artificial Intelligence at Northeastern in Boston this December. Before that I built LLM evaluation pipelines as a data scientist at Fidelity, worked as an ML engineer at Zingroll, and did computer vision research at KIIT. I've published six papers, first author on each. Where I'm heading: training custom language models on data I refined myself, and building the systems that put them to work.",

  contact,
  availability: 'Open to full-time roles from January 2027.',

  bot: {
    /** Fill this in to give the bot a name. Left empty, no name is shown anywhere. */
    name: '',
    lines: [
      'Refining data. Please hold.',
      'Loss is going down. Morale is going up.',
      'Tested. Thirty-one times.',
      "I only weld what's been validated.",
      "He wrote me in an afternoon. I'm still mad about it.",
    ],
  },

  acts: [
    {
      id: 'data',
      index: 1,
      title: 'Start with the mess.',
      line: 'I collect messy, unstructured data and refine it.',
      from: 40,
      to: 160,
      link: { href: '#career', label: 'See my career' },
      frameAlt:
        'Scattered data fragments (a social post, a scanned form, a video frame, a product row) pass through a glowing refinery ring and come out as identical clean blocks in rows.',
      callouts: [
        {
          id: 'hexbit',
          text: 'Hexbit: records published on time went from 75% to 90%',
          anchor: 'frag-listing',
          at: 55,
          slot: 1,
          detail:
            'Pipelines over seller catalog and listing-update data raised the share of records published by the scheduled cutoff from 75% to 90%.',
          bullet: { source: 'experience', company: 'Hexbit', index: 0 },
          links: [{ href: '#career-v0-3', label: 'Career v0.3, Hexbit' }],
        },
        {
          id: 'zingroll',
          text: 'Zingroll: social posts collected and cleaned for fine-tuning',
          anchor: 'frag-post',
          at: 85,
          slot: 2,
          detail:
            'Collected unstructured social media data, tweets and posts, and fine-tuned Hugging Face models to generate dark-humor memes.',
          bullet: { source: 'experience', company: 'Zingroll', index: 0 },
          links: [{ href: '#career-v0-4', label: 'Career v0.4, Zingroll' }],
        },
        {
          id: 'fidelity-textract',
          text: 'Fidelity: fields pulled from scanned documents with Textract',
          anchor: 'refinery',
          at: 110,
          slot: 3,
          detail:
            'An LLM document-validation pipeline on AWS (S3, Textract, Claude) for student-debt workitems.',
          links: [{ href: '#career-v0-6', label: 'Career v0.6, Fidelity' }],
        },
      ],
    },
    {
      id: 'model',
      index: 2,
      title: 'Train on what you refined.',
      line: 'I train models on that data.',
      from: 160,
      to: 280,
      link: { href: '#project-gpt2', label: 'GPT-2 spec sheet' },
      frameAlt:
        'Clean blocks stack into a four-layer model core. The robot welds the seams, which glow orange, and thin light filaments flicker between the layers.',
      callouts: [
        {
          id: 'gpt2',
          text: 'GPT-2 style Transformer, 7.24M parameters, written from scratch',
          anchor: 'layer-1',
          at: 185,
          slot: 4,
          detail:
            'A decoder-only Transformer written from scratch in PyTorch and trained on Tiny Shakespeare, with a hyperparameter grid search and ablations on context length and positional embeddings.',
          bullet: { source: 'projects', title: 'GPT-2 Shakespeare Text Generator', index: 0 },
          links: [{ href: '#project-gpt2', label: 'GPT-2 spec sheet' }],
        },
        {
          id: 'perplexity',
          text: 'Perplexity from 12.07 to 4.56 against a bigram baseline',
          anchor: 'filaments',
          at: 205,
          slot: 3,
          detail:
            'The loss readout on this stage runs from 2.491 to 1.517: the cross-entropy that those two perplexities imply (ln 12.07 and ln 4.56).',
          links: [{ href: '#project-gpt2', label: 'GPT-2 spec sheet' }],
        },
        {
          id: 'numeric',
          text: 'Fine-tuned BERT, Flan-T5 and Llama for numerical reasoning',
          anchor: 'layer-3',
          at: 225,
          slot: 2,
          detail: 'SemEval-2024 Task 7: questions that depend on the numbers in a text.',
          bullet: { source: 'projects', title: 'Numerical Reasoning with LLMs', index: 1 },
          links: [{ href: links.numericCode, label: 'Code', external: true }],
        },
        {
          id: 'publications',
          text: 'Six publications, first author on each',
          anchor: 'crown',
          at: 245,
          slot: 1,
          detail: 'Three of them are listed under Publications, with venue, year and links.',
          links: [
            { href: '#publications', label: 'Publications' },
            { href: contact.scholar, label: 'Google Scholar', external: true },
          ],
        },
      ],
    },
    {
      id: 'system',
      index: 3,
      title: 'Then make it useful.',
      line: 'I build a working system around the model.',
      from: 280,
      to: 400,
      link: { href: '#project-sop', label: 'SOP agent spec sheet' },
      frameAlt:
        'Five labeled housing plates (Gates, Retrieval, Human review, API, Interface) lock onto the core and the machine powers on, with light running through every seam.',
      callouts: [
        {
          id: 'sop',
          text: 'SOP agent: every gate runs in plain Python, covered by 31 tests',
          anchor: 'plate-gates',
          at: 303,
          slot: 3,
          detail:
            'The LLM extracts details and writes replies, but every gate (identity match, representative consent, which guidance can be shared) runs in plain Python, so the model cannot talk its way past a check.',
          links: [{ href: '#project-sop', label: 'SOP agent spec sheet' }],
        },
        {
          id: 'storyweaver',
          text: 'StoryWeaver: scenes generated in parallel, human approval before render',
          anchor: 'plate-api',
          at: 348,
          slot: 1,
          detail:
            'A LangGraph pipeline splits a book into scenes, generates them in parallel, keeps characters consistent with a locked persona schema, and pauses for human approval before rendering.',
          links: [{ href: '#project-storyweaver', label: 'StoryWeaver spec sheet' }],
        },
        {
          id: 'fidelity-judge',
          text: 'Fidelity: LLM-as-judge, low-confidence fields go to a human',
          anchor: 'plate-human-review',
          at: 333,
          slot: 2,
          detail:
            'An LLM-as-judge returns a verdict, confidence and reason per field, and low-confidence fields go to human review.',
          links: [{ href: '#career-v0-6', label: 'Career v0.6, Fidelity' }],
        },
      ],
    },
  ] satisfies Act[] as Act[],

  plates: ['Gates', 'Retrieval', 'Human review', 'API', 'Interface'],

  projects: [
    {
      id: 'sop',
      title: 'SOP-Guided Insurance Claims Agent',
      resumeTitle: 'SOP-Guided Insurance Claims Agent',
      source: 'projects',
      year: '2026',
      chips: ['system'],
      summary:
        'A claims support agent that follows a fixed four-phase procedure. The LLM extracts details and writes replies, but every gate (identity match, representative consent, which guidance can be shared) runs in plain Python, so the model cannot talk its way past a check.',
      keyResult: '31 unit tests cover the gate logic.',
      stack: ['LangGraph', 'Gemini', 'FastAPI', 'Pydantic', 'Docker'],
      links: {
        demo: links.sopDemo,
        demoNote: 'free hosting, first load can take up to a minute',
        code: links.sopCode,
      },
      plates: ['Gates'],
    },
    {
      id: 'storyweaver',
      title: 'StoryWeaver',
      resumeTitle: 'StoryWeaver AI',
      source: 'projects',
      year: '2026',
      chips: ['data', 'model', 'system'],
      summary:
        'Turns a book into a narrated, scene-by-scene AI video. A LangGraph pipeline splits the story into scenes, generates them in parallel, keeps characters consistent with a locked persona schema, and pauses for human approval before rendering.',
      keyResult:
        'Video and ElevenLabs narration are generated in parallel for each scene and joined with MoviePy.',
      stack: ['LangGraph', 'Gemini', 'ComfyUI', 'ElevenLabs', 'MoviePy', 'Kubernetes'],
      // No public repository: no code link and no "coming soon" label.
      links: {},
      plates: ['API', 'Human review'],
    },
    {
      id: 'ecosurve',
      title: 'EcoSurve',
      resumeTitle: 'EcoSurve: AI-Powered Surveillance Video Summarization',
      source: 'publications',
      year: '2026',
      chips: ['data', 'model'],
      summary:
        'Lets operators find incidents in long surveillance footage without watching all of it. A UniVTG video-language model condenses the footage into timestamped event segments, and BERT-based retrieval answers questions with a pointer back to the source clip.',
      keyResult: 'Published at CVC, Springer.',
      stack: ['UniVTG', 'BERT', 'RAG'],
      links: { paper: links.ecoPaper, code: links.ecoCode },
      plates: ['Retrieval'],
    },
    {
      id: 'gpt2',
      title: 'GPT-2 Style Shakespeare Generator',
      resumeTitle: 'GPT-2 Shakespeare Text Generator',
      source: 'projects',
      year: '2026',
      note: 'Team project',
      chips: ['model'],
      summary:
        'A 7.24M-parameter decoder-only Transformer written from scratch in PyTorch and trained on Tiny Shakespeare, with a hyperparameter grid search and ablations on context length and positional embeddings.',
      keyResult: 'Perplexity fell from 12.07 to 4.56 against a bigram baseline.',
      stack: ['Python', 'PyTorch'],
      links: { code: links.gptCode },
    },
  ] satisfies Project[] as Project[],

  moreOnGitHub: 'More on GitHub',

  papers: [
    {
      resumeTitle: 'EcoSurve: AI-Powered Surveillance Video Summarization',
      links: { paper: links.ecoPaper, code: links.ecoCode },
    },
    {
      resumeTitle: 'Chicken Disease Multiclass Classification',
      title: 'Chicken Disease Multiclass Classification',
      links: {
        paper: 'https://link.springer.com/chapter/10.1007/978-981-19-9331-2_19',
        code: 'https://github.com/Elaakarsh31/Chicken-Disease-Classification',
      },
    },
    {
      resumeTitle: 'Semantic Segmentation of Retinal Vessels',
      links: {
        paper: 'https://ieeexplore.ieee.org/abstract/document/10053840',
        notebook: 'https://colab.research.google.com/drive/1JQ-6DLyqRbs7589cfOMndfEZ_UR9Gaxn?usp=sharing',
      },
    },
  ] satisfies Paper[] as Paper[],
  papersNote: 'Six publications, first author on each. Full list on Google Scholar.',

  log: [
    {
      version: 'v0.1',
      id: 'career-v0-1',
      kind: 'degree',
      resumeInstitution: 'Kalinga Institute of Industrial Technology',
      branch: 'B.Tech',
      role: 'B.Tech in Computer Science',
      org: 'Kalinga Institute of Industrial Technology',
      notes: [],
    },
    {
      version: 'v0.2',
      id: 'career-v0-2',
      kind: 'work',
      resumeCompany: 'KIIT University',
      org: 'KIIT University, Bhubaneswar',
      notes: [
        { tag: 'Added', text: 'Medical image segmentation research with Attention U-Net and GAN-based augmentation.' },
        { tag: 'Added', text: 'Publications in IEEE OITS and Springer ICITA, 2023.' },
      ],
      showDetails: true,
    },
    {
      version: 'v0.3',
      id: 'career-v0-3',
      kind: 'work',
      // Role title comes from the .tex ("Software Engineer").
      resumeCompany: 'Hexbit',
      org: 'Hexbit, New Delhi',
      notes: [
        { tag: 'Added', text: 'Pipelines over seller catalog and listing-update data.' },
        { tag: 'Improved', text: 'Records published by the scheduled cutoff, from 75% to 90%.' },
      ],
      showDetails: true,
    },
    {
      version: 'v0.4',
      id: 'career-v0-4',
      kind: 'work',
      resumeCompany: 'Zingroll',
      org: 'Zingroll, New Delhi',
      notes: [
        { tag: 'Added', text: 'Collection of unstructured social media data, tweets and posts.' },
        { tag: 'Added', text: 'Fine-tuned Hugging Face models to generate dark-humor memes.' },
      ],
      showDetails: true,
    },
    {
      version: 'v0.5',
      id: 'career-v0-5',
      kind: 'degree',
      resumeInstitution: 'Northeastern University',
      branch: 'MS',
      role: 'MS in Artificial Intelligence',
      org: 'Khoury College of Computer Sciences, Northeastern University, Boston',
      notes: [],
    },
    {
      version: 'v0.6',
      id: 'career-v0-6',
      kind: 'work',
      resumeCompany: 'Fidelity Investments',
      org: 'Fidelity Investments, Boston',
      notes: [
        {
          tag: 'Added',
          text: 'LLM document-validation pipeline on AWS (S3, Textract, Claude) for student-debt workitems.',
        },
        {
          tag: 'Added',
          text: 'An LLM-as-judge returns a verdict, confidence and reason per field, and low-confidence fields go to human review.',
        },
      ],
      showDetails: false,
    },
    {
      version: 'v0.9',
      id: 'career-v0-9',
      kind: 'now',
      dates: 'Now',
      role: 'Building agent systems',
      org: 'The SOP-guided claims agent and StoryWeaver',
      notes: [],
    },
    {
      version: 'v1.0',
      id: 'career-v1-0',
      kind: 'next',
      dates: 'From January 2027',
      role: '“Ships with your team.”',
      org: 'Open to full-time roles.',
      notes: [],
    },
  ] satisfies LogEntry[] as LogEntry[],

  resumeBand: { line: 'Want the one-page version?', button: 'Download resume' },

  toolbench: {
    title: 'Toolbench',
    line: 'The tools I reach for, sorted by the same pipeline.',
    sort: 'Sort the bench',
    scatter: 'Scatter',
    all: 'See every skill',
    // Every name must match a skill in the .tex exactly.
    tags: [
      { name: 'SQL', tray: 'data' },
      { name: 'Pandas', tray: 'data' },
      { name: 'PySpark', tray: 'data' },
      { name: 'Delta Lake', tray: 'data' },
      { name: 'PostgreSQL', tray: 'data' },
      { name: 'Amazon Textract', tray: 'data' },
      { name: 'PyTorch', tray: 'model' },
      { name: 'TensorFlow', tray: 'model' },
      { name: 'Hugging Face', tray: 'model' },
      { name: 'scikit-learn', tray: 'model' },
      { name: 'XGBoost', tray: 'model' },
      { name: 'OpenCV', tray: 'model' },
      { name: 'LangGraph', tray: 'system' },
      { name: 'LangChain', tray: 'system' },
      { name: 'FastAPI', tray: 'system' },
      { name: 'Docker', tray: 'system' },
      { name: 'Kubernetes', tray: 'system' },
      { name: 'AWS', tray: 'system' },
    ] satisfies ToolTag[] as ToolTag[],
  },

  contactSection: { title: "Let's build something." },
};

export type Portfolio = typeof portfolio;
