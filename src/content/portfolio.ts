// Short copy, flags and links for the site. Full bullets come from the resume
// (content/Aakarsh_Arora_Full_Resume.tex → src/content/resume.generated.json).
// Entries are matched to the resume by `resumeTitle` / `resumeCompany`.

export type Links = {
  code?: string;
  demo?: string;
  /** Small note shown next to the demo link. */
  demoNote?: string;
  paper?: string;
  notebook?: string;
};

export type Project = {
  title: string;
  /** Title of the matching entry in the .tex. */
  resumeTitle: string;
  /** Which .tex section holds the bullets. */
  source: 'projects' | 'publications';
  year: string;
  /** Extra context shown next to the year, e.g. "Team project". */
  note?: string;
  featured: boolean;
  summary: string;
  stack: string[];
  links: Links;
};

export type Publication = {
  title: string;
  resumeTitle: string;
  venue: string;
  year: string;
  /** Fallback when the resume has no matching bullet. */
  summary: string;
  links: Links;
};

export type Experience = {
  role: string;
  company: string;
  resumeCompany: string;
  location: string;
  dates: string;
  summary: string;
  /** When false, only the one-line summary is public. Bullets stay in the generated data. */
  showDetails: boolean;
};

export type Education = {
  degree: string;
  school: string;
  location?: string;
  dates: string;
};

export type Portfolio = {
  site: {
    name: string;
    greeting: string;
    tagline: string;
    availability: string;
  };
  contact: {
    email: string;
    github: string;
    linkedin: string;
    scholar: string;
  };
  projects: Project[];
  publications: Publication[];
  publicationsNote: string;
  experience: Experience[];
  education: Education[];
  about: string;
};

const ecoSurveyLinks: Links = {
  paper: 'https://link.springer.com/chapter/10.1007/978-3-032-26217-2_6',
  code: 'https://github.com/Elaakarsh31/EcoSurve-VLM-powered-Crime-Footage-Summarization',
};

export const portfolio: Portfolio = {
  site: {
    name: 'Aakarsh Arora',
    greeting: "HI, I'M AAKARSH",
    tagline: 'Applied AI Engineer · MS in AI, Northeastern University',
    availability: 'Graduating December 2026. Open to full-time roles from January 2027.',
  },

  contact: {
    email: 'aakarshverma330@gmail.com',
    github: 'https://github.com/Elaakarsh31',
    linkedin: 'https://www.linkedin.com/in/aakarsharora/',
    scholar: 'https://scholar.google.com/citations?user=zabMms8AAAAJ&hl=en',
  },

  projects: [
    {
      title: 'SOP-Guided Insurance Claims Agent',
      resumeTitle: 'SOP-Guided Insurance Claims Agent',
      source: 'projects',
      year: '2026',
      featured: true,
      summary:
        'A claims support agent that follows a fixed four-phase procedure: verify identity, resolve intent, process the case, and follow up. The LLM extracts details and writes replies, but every gate (identity match, representative consent, which guidance can be shared) runs in plain Python, so the model cannot talk its way past a check. The gate logic is covered by 31 unit tests.',
      stack: ['LangGraph', 'Gemini', 'FastAPI', 'Pydantic', 'Docker', 'Render'],
      links: {
        code: 'https://github.com/Elaakarsh31/SOP-Guided-Agent',
        demo: 'https://sop-guided-agent.onrender.com/',
        demoNote: 'free hosting, first load can take up to a minute',
      },
    },
    {
      title: 'StoryWeaver',
      resumeTitle: 'StoryWeaver AI',
      source: 'projects',
      year: '2026',
      featured: true,
      summary:
        'Turns a book into a narrated, scene-by-scene AI video. A LangGraph pipeline splits the story into scenes, generates them in parallel, keeps characters consistent with a locked persona schema, and pauses for human approval before rendering. Video and ElevenLabs narration are generated in parallel for each scene and joined with MoviePy.',
      stack: ['LangGraph', 'Gemini', 'ComfyUI', 'ElevenLabs', 'MoviePy', 'Docker', 'Kubernetes'],
      // The repo is not public yet.
      links: {},
    },
    {
      title: 'EcoSurve: AI-Powered Surveillance Video Summarization',
      resumeTitle: 'EcoSurve: AI-Powered Surveillance Video Summarization',
      source: 'publications',
      year: '2026',
      note: 'CVC, Springer',
      featured: true,
      summary:
        'Lets operators find incidents in long surveillance footage without watching all of it. A UniVTG video-language model condenses the footage into timestamped event segments, and BERT-based retrieval answers questions over those segments, so each answer points back to the source clip.',
      stack: ['UniVTG', 'BERT', 'RAG'],
      links: ecoSurveyLinks,
    },
    {
      title: 'Real-Time Object Recognition with One-Shot CNN Embeddings',
      resumeTitle: 'Real-Time Object Recognition & One-Shot CNN Embeddings',
      source: 'projects',
      year: '2026',
      featured: false,
      summary:
        'A C++17 and OpenCV pipeline that segments and classifies several objects per frame from a single example per class, using 512-dimensional ResNet18 embeddings run through OpenCV DNN as an ONNX model. Reached 98% accuracy, with scripted confusion-matrix evaluation.',
      stack: ['C++17', 'OpenCV', 'ONNX', 'ResNet18'],
      links: {
        code: 'https://github.com/Elaakarsh31/Real-Time-Object-Recognition-One-Shot-CNN-Embeddings',
      },
    },
    {
      title: 'GPT-2 Style Shakespeare Generator',
      resumeTitle: 'GPT-2 Shakespeare Text Generator',
      source: 'projects',
      year: '2026',
      note: 'Team project',
      featured: false,
      summary:
        'A 7.24M-parameter decoder-only Transformer written from scratch in PyTorch and trained on Tiny Shakespeare. Against a bigram baseline it cut perplexity from 12.07 to 4.56 and raised accuracy from 26.9% to 56.6%, with a hyperparameter grid search and context-length and positional-embedding ablations.',
      stack: ['Python', 'PyTorch'],
      links: { code: 'https://github.com/Elaakarsh31/gpt2-shakespear' },
    },
    {
      title: 'Numerical Reasoning with LLMs, SemEval-2024 Task 7',
      resumeTitle: 'Numerical Reasoning with LLMs',
      source: 'projects',
      year: '2024',
      featured: false,
      summary:
        'Fine-tuned BERT, Flan-T5, and Llama to answer questions that depend on numbers in text, reaching 71% F1 with chain-of-thought prompting.',
      stack: ['Python', 'PyTorch'],
      links: { code: 'https://github.com/Elaakarsh31/semeval2024-task7-subtask1' },
    },
    {
      title: 'Skimlit',
      resumeTitle: 'Skimlit: Text Summarization for Research Papers',
      source: 'projects',
      year: '2024',
      featured: false,
      summary:
        'Labels each sentence of a research abstract by its role so papers can be skimmed faster. TensorFlow models with USE and GloVe embeddings, trained on 200k+ abstracts, reach 85% F1.',
      stack: ['Python', 'TensorFlow'],
      links: { code: 'https://github.com/Elaakarsh31/Skimlit' },
    },
    {
      title: 'GPTBot, a RAG chat assistant',
      resumeTitle: 'LLM Chatbot: Document-Grounded Conversational AI Assistant',
      source: 'projects',
      year: '2024',
      featured: false,
      summary:
        'A GPT-4 chatbot built with LangChain and Chainlit that answers from uploaded documents using RAG, with per-user sessions and chat history stored in Firebase.',
      stack: ['LangChain', 'Chainlit', 'OpenAI API', 'Firebase'],
      links: { code: 'https://github.com/Elaakarsh31/GPTBot' },
    },
    {
      title: 'Fuel Economy Analysis',
      resumeTitle: 'Fuel Economy Analysis',
      source: 'projects',
      year: '2025',
      featured: false,
      summary:
        'Random Forest and XGBoost regression on 40k+ vehicle records to predict fuel economy, reaching R² of 0.85 and RMSE of 2.3.',
      stack: ['Python', 'pandas', 'scikit-learn', 'XGBoost'],
      links: { code: 'https://github.com/Elaakarsh31/FuelEconomyAnalysis' },
    },
  ],

  publications: [
    {
      title: 'EcoSurve: AI-Powered Surveillance Video Summarization',
      resumeTitle: 'EcoSurve: AI-Powered Surveillance Video Summarization',
      venue: 'CVC, Springer',
      year: '2026',
      summary: 'UniVTG video summarization with BERT-based retrieval over the resulting segments.',
      links: ecoSurveyLinks,
    },
    {
      title: 'Chicken Disease Multiclass Classification',
      resumeTitle: 'Chicken Disease Multiclass Classification',
      venue: 'ICITA, Springer',
      year: '2023',
      summary: 'Benchmarked 12 CNN architectures. The proposed ChicNetV6 reached 94.49% accuracy.',
      links: {
        paper: 'https://link.springer.com/chapter/10.1007/978-981-19-9331-2_19',
        code: 'https://github.com/Elaakarsh31/Chicken-Disease-Classification',
      },
    },
    {
      title: 'Semantic Segmentation of Retinal Vessels',
      resumeTitle: 'Semantic Segmentation of Retinal Vessels',
      venue: 'OITS, IEEE',
      year: '2023',
      summary:
        'Attention U-Net with a ResNet encoder, GAN oversampling, and Gabor filtering, reaching 97% accuracy.',
      links: {
        paper: 'https://ieeexplore.ieee.org/abstract/document/10053840',
        notebook: 'https://colab.research.google.com/drive/1JQ-6DLyqRbs7589cfOMndfEZ_UR9Gaxn?usp=sharing',
      },
    },
  ],
  publicationsNote: 'Six publications, first author on each. Full list on Google Scholar.',

  experience: [
    {
      role: 'Data Scientist',
      company: 'Fidelity Investments',
      resumeCompany: 'Fidelity Investments',
      location: 'Boston',
      dates: 'July 2025 – Dec 2025',
      summary:
        'Built an LLM document-validation pipeline on AWS (S3, Textract, Claude) for student-debt workitems. An LLM-as-judge returns a verdict, confidence, and reason for each field, and low-confidence fields go to human review.',
      showDetails: false,
    },
    {
      role: 'Machine Learning Engineer',
      company: 'Zingroll',
      resumeCompany: 'Zingroll',
      location: 'New Delhi',
      dates: 'Jan 2024 – Aug 2024',
      summary:
        'Collected unstructured social media data such as tweets and posts, and fine-tuned Hugging Face models to generate dark-humor memes.',
      showDetails: true,
    },
    {
      // Role title follows the .tex ("Software Engineer"); the short copy listed "Machine Learning Backend Intern".
      role: 'Software Engineer',
      company: 'Hexbit',
      resumeCompany: 'Hexbit',
      location: 'New Delhi',
      dates: 'Feb 2023 – Aug 2023',
      summary:
        'Built pipelines over seller catalog and listing-update data, raising the share of eligible records published by the scheduled cutoff from 75% to 90%.',
      showDetails: true,
    },
    {
      role: 'Research Assistant',
      company: 'KIIT University',
      resumeCompany: 'KIIT University',
      location: 'Bhubaneswar',
      dates: 'Mar 2022 – Jan 2023',
      summary: 'Medical image segmentation research with Attention U-Net and GAN-based augmentation.',
      showDetails: true,
    },
  ],

  education: [
    {
      degree: 'MS in Artificial Intelligence',
      school: 'Khoury College of Computer Sciences, Northeastern University',
      location: 'Boston',
      dates: 'Sept 2024 – Dec 2026',
    },
    {
      degree: 'Bachelor of Technology in Computer Science',
      school: 'Kalinga Institute of Industrial Technology',
      dates: 'Sept 2020 – May 2024',
    },
  ],

  about:
    "I'm finishing an MS in Artificial Intelligence at Northeastern in Boston this December. Before that I built LLM evaluation pipelines as a data scientist at Fidelity, worked as an ML engineer at Zingroll, and did computer vision research at KIIT. I've published six papers, first author on each. I'm most interested in applied AI, agentic systems, and evaluation.",
};
