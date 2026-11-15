// Typed access to src/content/resume.generated.json (written by scripts/resume-to-json.mjs).
import data from './resume.generated.json';

export type RichNode =
  | string
  | { t: 'b' | 'i' | 'code'; c: RichNode[] }
  | { t: 'a'; href: string; c: RichNode[] };

export type Bullet = RichNode[];
export type ResumeLink = { kind: 'code' | 'paper' | 'demo' | 'notebook'; url: string };

export type ResumeExperience = {
  role: string;
  company: string;
  dates: string;
  location: string;
  tools: string[];
  bullets: Bullet[];
  links: ResumeLink[];
};

export type ResumeProject = {
  title: string;
  date: string;
  stack: string[];
  bullets: Bullet[];
  links: ResumeLink[];
};

export type ResumePublication = Omit<ResumeProject, 'stack'> & { venue: string };

export type ResumeData = {
  source: string;
  experience: ResumeExperience[];
  projects: ResumeProject[];
  publications: ResumePublication[];
  education: { institution: string; degree: string; dates: string }[];
  skills: { category: string; items: string[] }[];
  counts: Record<string, number>;
};

export const resume = data as ResumeData;

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function findProject(title: string, source: 'projects' | 'publications') {
  const list: (ResumeProject | ResumePublication)[] = resume[source];
  return list.find((p) => norm(p.title) === norm(title));
}

export function findPublication(title: string) {
  return resume.publications.find((p) => norm(p.title) === norm(title));
}

export function findExperience(company: string) {
  return resume.experience.find((e) => norm(e.company) === norm(company));
}
