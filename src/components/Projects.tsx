import { useEffect, useRef, useState } from 'react';
import { portfolio, STAGES, type Project } from '../content/portfolio';
import { findPublication, yearOf } from '../content/resume';
import { projectImageUrl } from '../lib/assets';
import { stage } from '../lib/stage';
import { ExtLink } from './ExtLink';
import { LinkRow } from './LinkRow';
import { Schematic } from './Schematic';

/** The sheet in view; a hovered or focused sheet takes over while the pointer is on it. */
let inView: string | null = null;
let hovered: string | null = null;
const listeners = new Set<(id: string | null) => void>();
function publish() {
  stage.project = hovered ?? inView;
  listeners.forEach((l) => l(stage.project));
}

/** Lights the matching parts of the machine (and plate labels) while a sheet is hovered or focused. */
function light(p: Project | null) {
  hovered = p?.id ?? null;
  publish();
  stage.highlight = p ? { chips: p.chips, plates: p.plates ?? [] } : null;
  document.querySelectorAll<HTMLElement>('.plate-tag').forEach((t) => {
    const lit = !!p && (p.chips.includes('system') || (p.plates ?? []).includes(t.dataset.plate!));
    if (lit) t.dataset.lit = '1';
    else delete t.dataset.lit;
  });
}

function SpecSheet({ p }: { p: Project }) {
  const img = projectImageUrl(p.id);
  return (
    <li>
      <article
        onPointerEnter={() => light(p)}
        onPointerLeave={() => light(null)}
        onFocus={() => light(p)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) light(null);
        }}
        id={`project-${p.id}`}
        className="sheet"
        data-chips={p.chips.join(' ')}
        data-plates={p.plates?.join('|')}
        aria-labelledby={`project-${p.id}-title`}
      >
        <div className="sheet-preview">
          {img ? <img src={img} alt="" loading="lazy" decoding="async" /> : <Schematic id={p.id} />}
        </div>
        <div className="sheet-body">
          <header className="sheet-head">
            <h3 id={`project-${p.id}-title`} className="sheet-title">
              {p.title}
            </h3>
            <p className="sheet-meta">
              <span>{p.year}</span>
              {p.note && <span>{p.note}</span>}
            </p>
          </header>
          <p className="sheet-summary">{p.summary}</p>
          <ul className="chips" aria-label="Pipeline stages">
            {STAGES.map((s) => {
              const on = p.chips.includes(s.id);
              return (
                <li key={s.id} className="chip" data-on={on || undefined}>
                  {s.label}
                  <span className="sr-only">{on ? ': covered' : ': not covered'}</span>
                </li>
              );
            })}
          </ul>
          <p className="sheet-result">
            <span className="sheet-result-label">Key result</span> {p.keyResult}
          </p>
          <ul className="stack" aria-label="Stack">
            {p.stack.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <LinkRow links={p.links} />
        </div>
      </article>
    </li>
  );
}

function Papers() {
  return (
    <section id="publications" className="papers" aria-labelledby="publications-title">
      <h3 id="publications-title" className="papers-title">
        Publications
      </h3>
      <ul className="papers-list">
        {portfolio.papers.map((paper) => {
          const entry = findPublication(paper.resumeTitle);
          if (!entry) return null;
          return (
            <li key={paper.resumeTitle} className="paper">
              <p className="paper-title">{paper.title ?? entry.title}</p>
              <p className="paper-meta">
                <span>{entry.venue}</span>
                <span>{yearOf(entry.date)}</span>
              </p>
              <LinkRow links={paper.links} />
            </li>
          );
        })}
      </ul>
      <p className="papers-note">
        <ExtLink href={portfolio.contact.scholar}>{portfolio.papersNote}</ExtLink>
      </p>
    </section>
  );
}

/** The project's stack pops up as small tags around the machine while its sheet is in view. */
function StackPop() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    listeners.add(setId);
    return () => {
      listeners.delete(setId);
    };
  }, []);
  const project = portfolio.projects.find((p) => p.id === id);
  return (
    <ul className="stack-pop" data-on={project ? '' : undefined} aria-hidden="true" key={id ?? 'none'}>
      {Array.from({ length: 6 }, (_, i) => (
        <li key={i} className="stack-tag" data-hud-anchor={`pop-${i}`} data-side="right" style={{ ['--i' as string]: i }}>
          {project?.stack[i] && <span>{project.stack[i]}</span>}
        </li>
      ))}
    </ul>
  );
}

/** Tracks which sheet sits in the middle of the viewport. */
function useSheetInView(list: React.RefObject<HTMLUListElement | null>) {
  useEffect(() => {
    const ul = list.current;
    if (!ul) return;
    const sheets = [...ul.querySelectorAll<HTMLElement>('.sheet')];
    const io = new IntersectionObserver(
      (items) => {
        for (const it of items) {
          if (it.isIntersecting) inView = it.target.id.replace('project-', '');
          else if (inView === it.target.id.replace('project-', '')) inView = null;
        }
        publish();
      },
      { rootMargin: '-40% 0px -40% 0px' },
    );
    sheets.forEach((s) => io.observe(s));
    return () => {
      io.disconnect();
      inView = null;
      publish();
    };
  }, [list]);
}

export function Projects() {
  const list = useRef<HTMLUListElement>(null);
  useSheetInView(list);
  return (
    <section id="projects" className="section projects" aria-labelledby="projects-title">
      <h2 id="projects-title" className="section-title" tabIndex={-1}>
        Projects
      </h2>
      <ul className="sheets" ref={list}>
        {portfolio.projects.map((p) => (
          <SpecSheet key={p.id} p={p} />
        ))}
      </ul>
      <p className="more-github">
        <ExtLink href={portfolio.contact.github}>{portfolio.moreOnGitHub}</ExtLink>
      </p>
      <Papers />
      <StackPop />
    </section>
  );
}
