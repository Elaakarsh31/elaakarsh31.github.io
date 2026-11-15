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

export function findEducation(institution: string) {
  return resume.education.find((e) => norm(e.institution) === norm(institution));
}

/** Last four-digit year in a date string such as "Mar 2026". */
export function yearOf(date: string) {
  return date.match(/\d{4}(?!.*\d{4})/)?.[0] ?? date;
}

export function isSkill(name: string) {
  return resume.skills.some((s) => s.items.includes(name));
}

type BulletRef =
  | { source: 'projects'; title: string; index: number }
  | { source: 'publications'; title: string; index: number }
  | { source: 'experience'; company: string; index: number };

export function bulletFor(ref: BulletRef): Bullet | undefined {
  if (ref.source === 'experience') return findExperience(ref.company)?.bullets[ref.index];
  return findProject(ref.title, ref.source)?.bullets[ref.index];
}
