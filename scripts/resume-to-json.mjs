#!/usr/bin/env node
// Reads content/Aakarsh_Arora_Full_Resume.tex and writes src/content/resume.generated.json.
// Plain Node, no dependencies, no network. Fails loudly if any LaTeX would reach the page.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = resolve(root, 'content/Aakarsh_Arora_Full_Resume.tex');
const OUT = resolve(root, 'src/content/resume.generated.json');

function fail(msg) {
  console.error(`\n[resume-to-json] ERROR: ${msg}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// 1. Load, drop comment lines and inline comments, keep only the body after
//    \section{Experience} so the header (and its phone number) is never read.

const raw = readFileSync(SRC, 'utf8');
const lines = raw
  .split(/\r?\n/)
  .filter((l) => !l.trimStart().startsWith('%'))
  .map((l) => l.replace(/(?<!\\)%.*$/, ''));
const text = lines.join('\n');

const start = text.indexOf('\\section{Experience}');
const end = text.indexOf('\\end{document}');
if (start < 0 || end < 0) fail('could not find \\section{Experience} or \\end{document}');
const body = text.slice(start, end);

const sections = {};
{
  const re = /\\section\{([^}]*)\}/g;
  const marks = [...body.matchAll(re)];
  marks.forEach((m, k) => {
    const from = m.index + m[0].length;
    const to = k + 1 < marks.length ? marks[k + 1].index : body.length;
    sections[m[1].trim()] = body.slice(from, to);
  });
}
for (const name of ['Experience', 'Projects', 'Publications', 'Education', 'Technical Skills']) {
  if (!sections[name]) fail(`missing \\section{${name}}`);
}

// ---------------------------------------------------------------------------
// 2. Brace-aware argument readers.

function skipWs(s, i) {
  while (i < s.length && /\s/.test(s[i])) i++;
  return i;
}

/** Reads a {...} group starting at or after i. Returns { arg, i } with i after the closing brace. */
function readArg(s, i) {
  i = skipWs(s, i);
  if (s[i] !== '{') return null;
  let depth = 0;
  for (let j = i; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') {
      j++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) return { arg: s.slice(i + 1, j), i: j + 1 };
    }
  }
  fail(`unbalanced braces near: ${s.slice(i, i + 80)}`);
}

function readOptArg(s, i) {
  const k = skipWs(s, i);
  if (s[k] !== '[') return { arg: null, i };
  const close = s.indexOf(']', k);
  return { arg: s.slice(k + 1, close), i: close + 1 };
}

function readArgs(s, i, n) {
  const args = [];
  for (let k = 0; k < n; k++) {
    const r = readArg(s, i);
    if (!r) fail(`expected ${n} arguments near: ${s.slice(i, i + 80)}`);
    args.push(r.arg);
    i = r.i;
  }
  return { args, i };
}

/** Positions of a macro, ignoring longer macro names that share the prefix. */
function findMacro(s, name) {
  const re = new RegExp(`\\\\${name}(?![A-Za-z])`, 'g');
  return [...s.matchAll(re)].map((m) => ({ index: m.index, after: m.index + m[0].length }));
}

// ---------------------------------------------------------------------------
// 3. LaTeX → inline markup.
//    Node = string | { t: 'b' | 'i' | 'code', c: Node[] } | { t: 'a', href: string, c: Node[] }

const SUP = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻', '+': '⁺' };
const toSup = (str) => [...str].map((ch) => SUP[ch] ?? ch).join('');

const DROP_SWITCHES = new Set([
  'raggedright', 'strut', 'small', 'footnotesize', 'scriptsize', 'tiny', 'large', 'Large', 'LARGE',
  'huge', 'Huge', 'scshape', 'par', 'noindent', 'arraybackslash', 'centering', 'normalsize',
]);
const DROP_WITH_ARG = new Set(['vspace', 'hspace', 'resumeNeedspace', 'hypersetup']);

function convertMath(m) {
  let s = m
    .replace(/\\mathcal\{([^}]*)\}/g, '$1')
    .replace(/\{\\times\}/g, '×')
    .replace(/\\times/g, '×')
    .replace(/\\sim/g, '~')
    .replace(/\\,/g, ' ')
    .replace(/\\ /g, ' ')
    .replace(/\^\{([^}]*)\}/g, (_, x) => toSup(x))
    .replace(/\^(\S)/g, (_, x) => toSup(x));
  s = s.replace(/[{}]/g, '');
  return s;
}

function unescapeUrl(u) {
  return u.trim().replace(/\\([%#&_~$])/g, '$1');
}

function parse(s) {
  const out = [];
  const push = (n) => {
    if (typeof n === 'string' && typeof out[out.length - 1] === 'string') out[out.length - 1] += n;
    else if (n !== '') out.push(n);
  };
  const pushAll = (nodes) => nodes.forEach(push);

  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (c === '{') {
      const r = readArg(s, i);
      pushAll(parse(r.arg));
      i = r.i;
      continue;
    }
    if (c === '}') {
      i++;
      continue;
    }
    if (c === '$') {
      const close = s.indexOf('$', i + 1);
      if (close < 0) fail(`unclosed math near: ${s.slice(i, i + 60)}`);
      push(convertMath(s.slice(i + 1, close)));
      i = close + 1;
      continue;
    }
    if (c === '\\') {
      const next = s[i + 1];
      if (!/[A-Za-z]/.test(next ?? '')) {
        // Control symbols.
        const map = { '%': '%', '&': '&', _: '_', '#': '#', $: '$', ' ': ' ', ',': ' ', '\\': ' ', '{': '{', '}': '}' };
        if (next in map) {
          push(map[next]);
          i += 2;
          continue;
        }
        push(`\\${next}`); // unknown: leave it so the leftover check fails
        i += 2;
        continue;
      }
      let j = i + 1;
      while (j < s.length && /[A-Za-z]/.test(s[j])) j++;
      const name = s.slice(i + 1, j);
      i = j;

      if (DROP_SWITCHES.has(name)) {
        i = skipWs(s, i);
        continue;
      }
      if (DROP_WITH_ARG.has(name)) {
        if (s[i] === '*') i++;
        i = readArg(s, i)?.i ?? i;
        continue;
      }
      switch (name) {
        case 'textbf':
        case 'textit':
        case 'emph':
        case 'texttt': {
          const r = readArg(s, i);
          const t = name === 'textbf' ? 'b' : name === 'texttt' ? 'code' : 'i';
          out.push({ t, c: parse(r.arg) });
          i = r.i;
          continue;
        }
        case 'underline': {
          const r = readArg(s, i);
          pushAll(parse(r.arg));
          i = r.i;
          continue;
        }
        case 'href': {
          const { args, i: k } = readArgs(s, i, 2);
          out.push({ t: 'a', href: unescapeUrl(args[0]), c: parse(args[1]) });
          i = k;
          continue;
        }
        case 'textsuperscript': {
          const r = readArg(s, i);
          push(toSup(plain(parse(r.arg))));
          i = r.i;
          continue;
        }
        case 'parbox': {
          let r = readOptArg(s, i);
          r = readArg(s, r.i); // width
          r = readArg(s, r.i); // content
          pushAll(parse(r.arg));
          i = r.i;
          continue;
        }
        case 'ldots':
          push('…');
          continue;
        case 'times':
          push('×');
          continue;
        default:
          push(`\\${name}`); // unknown: leave it so the leftover check fails
          continue;
      }
    }
    if (s.startsWith('---', i)) {
      push('—');
      i += 3;
      continue;
    }
    if (s.startsWith('--', i)) {
      push('–');
      i += 2;
      continue;
    }
    if (s.startsWith('``', i)) {
      push('“');
      i += 2;
      continue;
    }
    if (s.startsWith("''", i)) {
      push('”');
      i += 2;
      continue;
    }
    if (c === '~') {
      push(' ');
      i++;
      continue;
    }
    push(c);
    i++;
  }
  return normalize(out);
}

function normalize(nodes) {
  return nodes
    .map((n) => (typeof n === 'string' ? n.replace(/\s+/g, ' ') : n))
    .filter((n) => n !== '');
}

function plain(nodes) {
  return nodes.map((n) => (typeof n === 'string' ? n : plain(n.c))).join('');
}

function trimNodes(nodes) {
  const out = [...nodes];
  while (typeof out[0] === 'string' && !out[0].trim()) out.shift();
  while (typeof out.at(-1) === 'string' && !out.at(-1).trim()) out.pop();
  if (typeof out[0] === 'string') out[0] = out[0].trimStart();
  if (typeof out.at(-1) === 'string') out[out.length - 1] = out.at(-1).trimEnd();
  return out;
}

const text_ = (raw) => plain(parse(raw)).replace(/\s+/g, ' ').trim();

/** Split on commas that are not inside parentheses or braces. */
function splitList(str) {
  const items = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < str.length; i++) {
    const c = str[i];
    if (c === '\\') {
      cur += c + (str[i + 1] ?? '');
      i++;
      continue;
    }
    if (c === '(' || c === '{') depth++;
    if (c === ')' || c === '}') depth--;
    if (c === ',' && depth === 0) {
      items.push(cur);
      cur = '';
    } else cur += c;
  }
  items.push(cur);
  return items.map((x) => x.trim()).filter(Boolean);
}

// Bracketed link labels in bullets become entry links.
const LINK_KINDS = { '[code]': 'code', '[paper]': 'paper', '[live demo]': 'demo', '[notebook]': 'notebook' };

function bulletsBetween(src, from, to, links) {
  const seg = src.slice(from, to);
  return findMacro(seg, 'resumeItem').map(({ after }) => {
    const r = readArg(seg, after);
    const nodes = parse(r.arg).filter((n) => {
      if (n && n.t === 'a') {
        const kind = LINK_KINDS[plain(n.c).trim().toLowerCase()];
        if (kind) {
          links.push({ kind, url: n.href });
          return false;
        }
      }
      return true;
    });
    return trimNodes(normalize(nodes));
  });
}

// ---------------------------------------------------------------------------
// 4. Sections.

function parseExperience(src) {
  const heads = findMacro(src, 'resumeSubheading');
  return heads.map((h, k) => {
    const { args, i } = readArgs(src, h.after, 4);
    const [role, dates, companyTools, location] = args.map(text_);
    const dash = companyTools.indexOf(' - ');
    const company = dash >= 0 ? companyTools.slice(0, dash).trim() : companyTools;
    const tools = dash >= 0 ? splitList(companyTools.slice(dash + 3)) : [];
    const links = [];
    const bullets = bulletsBetween(src, i, heads[k + 1]?.index ?? src.length, links);
    return { role, company, dates, location, tools, bullets, links };
  });
}

function parseHeadingEntries(src) {
  const heads = findMacro(src, 'resumeProjectHeading');
  return heads.map((h, k) => {
    const { args, i } = readArgs(src, h.after, 2);
    const head = text_(args[0]);
    const bar = head.indexOf('|');
    const title = (bar >= 0 ? head.slice(0, bar) : head).trim();
    const right = bar >= 0 ? head.slice(bar + 1).trim() : '';
    const date = text_(args[1]);
    const links = [];
    const bullets = bulletsBetween(src, i, heads[k + 1]?.index ?? src.length, links);
    return { title, right, date, bullets, links };
  });
}

function parseEducation(src) {
  return findMacro(src, 'resumeEduLine').map((h) => {
    const { args } = readArgs(src, h.after, 3);
    const [institution, degree, dates] = args.map(text_);
    return { institution, degree, dates };
  });
}

function parseSkills(src) {
  const blocks = [...src.matchAll(/\\begin\{tabularx\}([\s\S]*?)\\end\{tabularx\}/g)].map((m) => m[1]);
  return blocks.map((b) => {
    const bold = findMacro(b, 'textbf')[0];
    const fs = findMacro(b, 'footnotesize')[0];
    if (!bold || !fs) fail(`skills row without \\textbf or \\footnotesize: ${b.slice(0, 120)}`);
    const category = text_(readArg(b, bold.after).arg).replace(/:\s*$/, '');
    const items = splitList(readArg(b, fs.after).arg).map(text_).filter(Boolean);
    return { category, items };
  });
}

const experience = parseExperience(sections['Experience']);
const projects = parseHeadingEntries(sections['Projects']).map(({ right, ...p }) => ({
  ...p,
  stack: splitList(right),
}));
const publications = parseHeadingEntries(sections['Publications']).map(({ right, ...p }) => ({
  ...p,
  venue: right,
}));
const education = parseEducation(sections['Education']);
const skills = parseSkills(sections['Technical Skills']);

// ---------------------------------------------------------------------------
// 5. Validation.

const data = {
  source: 'content/Aakarsh_Arora_Full_Resume.tex',
  experience,
  projects,
  publications,
  education,
  skills,
  counts: {
    experience: experience.length,
    projects: projects.length,
    publications: publications.length,
    education: education.length,
    skillCategories: skills.length,
    skills: skills.reduce((n, s) => n + s.items.length, 0),
    bullets: [...experience, ...projects, ...publications].reduce((n, e) => n + e.bullets.length, 0),
  },
};

const leftovers = [];
function scan(v, path) {
  if (typeof v === 'string') {
    if (/\\/.test(v)) leftovers.push(`${path}: ${JSON.stringify(v.slice(Math.max(0, v.indexOf('\\') - 30), v.indexOf('\\') + 40))}`);
  } else if (Array.isArray(v)) v.forEach((x, k) => scan(x, `${path}[${k}]`));
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (k !== 'href' && k !== 'url') scan(x, `${path}.${k}`);
}
scan(data, 'resume');
if (leftovers.length) fail(`LaTeX left in output:\n  ${leftovers.join('\n  ')}`);

const json = JSON.stringify(data, null, 2);
if (/857\D?351/.test(json)) fail('phone number found in output');

for (const e of experience) if (!e.bullets.length) fail(`experience "${e.role} @ ${e.company}" has no bullets`);
for (const p of [...projects, ...publications]) if (!p.bullets.length) fail(`"${p.title}" has no bullets`);
if (!skills.length) fail('no skills parsed');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, json + '\n');

const c = data.counts;
console.log(
  `[resume-to-json] ${c.experience} experience, ${c.projects} projects, ${c.publications} publications, ` +
    `${c.education} education, ${c.skills} skills in ${c.skillCategories} categories, ${c.bullets} bullets. No LaTeX left.`,
);
