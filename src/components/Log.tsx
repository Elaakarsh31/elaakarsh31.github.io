import { useEffect, useRef } from 'react';
import { portfolio, type LogEntry } from '../content/portfolio';
import { findEducation, findExperience } from '../content/resume';
import { Details } from './Details';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "Sep 2024" → months since year 0. */
function monthIndex(s: string) {
  const m = s.trim().toLowerCase().match(/([a-z]{3})[a-z]*\.?\s+(\d{4})/);
  return m ? Number(m[2]) * 12 + MONTHS.indexOf(m[1]) : NaN;
}

type Branch = 'none' | 'fork' | 'through' | 'merge';
type Row =
  | { type: 'entry'; e: LogEntry; dates: string; role: string; lane: 0 | 1; start: number; branch?: Branch }
  | { type: 'merge'; branch: string; when: string; state?: Branch };

/** Entries in date order, with a merge row where each degree branch rejoins main. */
function buildRows(): Row[] {
  const now = new Date();
  const nowIdx = now.getFullYear() * 12 + now.getMonth();
  const entries = portfolio.log.map((e) => {
    if (e.kind === 'work') {
      const r = findExperience(e.resumeCompany!);
      return { type: 'entry' as const, e, dates: r?.dates ?? '', role: r?.role ?? '', lane: 0 as const };
    }
    if (e.kind === 'degree') {
      const r = findEducation(e.resumeInstitution!);
      return { type: 'entry' as const, e, dates: r?.dates ?? '', role: e.role ?? '', lane: 1 as const };
    }
    return { type: 'entry' as const, e, dates: e.dates ?? '', role: e.role ?? '', lane: 0 as const };
  });
  const withStart = entries.map((r) => ({
    ...r,
    start: r.e.kind === 'now' ? nowIdx : r.e.kind === 'next' ? monthIndex('Jan 2027') : monthIndex(r.dates.split('–')[0]),
  }));
  const rows: Row[] = [];
  const merges = withStart
    .filter((r) => r.e.kind === 'degree')
    .map((r) => {
      const end = r.dates.split('–')[1]?.trim() ?? '';
      return { branch: r.e.branch ?? '', when: end, at: monthIndex(end) };
    });
  withStart.forEach((r, k) => {
    rows.push(r);
    const next = withStart[k + 1];
    for (const m of merges) {
      if (r.start < m.at && (!next || next.start >= m.at)) rows.push({ type: 'merge', branch: m.branch, when: m.when });
    }
  });
  // Branch lane state per row, for drawing the graph.
  let open = false;
  for (const r of rows) {
    if (r.type === 'merge') {
      r.state = 'merge';
      open = false;
    } else if (r.lane === 1) {
      r.branch = 'fork';
      open = true;
    } else r.branch = open ? 'through' : 'none';
  }
  return rows;
}

/** One row of the commit graph: main lane, branch lane, fork or merge curve, and the node. */
function Graph({ lane, branch, first, last, kind }: { lane: 0 | 1 | 'merge'; branch: Branch; first: boolean; last: boolean; kind?: string }) {
  return (
    <span className="log-graph" aria-hidden="true" data-branch={branch} data-lane={lane} data-first={first || undefined} data-last={last || undefined}>
      <span className="lane lane-main" />
      {branch !== 'none' && <span className="lane lane-branch" />}
      {branch === 'fork' && (
        <svg className="curve curve-fork" viewBox="0 0 64 28" width="64" height="28">
          <path d="M20,0 C20,16 44,10 44,26" />
        </svg>
      )}
      {branch === 'merge' && (
        <svg className="curve curve-merge" viewBox="0 0 64 28" width="64" height="28">
          <path d="M44,0 C44,16 20,10 20,26" />
        </svg>
      )}
      <span className="node" data-kind={kind} />
    </span>
  );
}

/** Heats up the entry nearest the middle of the viewport. */
function useCurrentEntry(list: React.RefObject<HTMLOListElement | null>) {
  useEffect(() => {
    const ol = list.current;
    if (!ol) return;
    const entries = [...ol.querySelectorAll<HTMLElement>('.log-entry')];
    const seen = new Set<HTMLElement>();
    const io = new IntersectionObserver(
      (items) => {
        for (const it of items) {
          const el = it.target as HTMLElement;
          if (it.isIntersecting) seen.add(el);
          else seen.delete(el);
        }
        // The last one in document order wins, so the graph heats up as you read down.
        const current = entries.filter((e) => seen.has(e)).pop();
        if (!current) return;
        for (const e of entries) {
          if (e === current) e.dataset.current = '1';
          else delete e.dataset.current;
          if (entries.indexOf(e) < entries.indexOf(current)) e.dataset.past = '1';
          else delete e.dataset.past;
        }
      },
      { rootMargin: '-42% 0px -42% 0px' },
    );
    entries.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [list]);
}

export function Log() {
  const rows = buildRows();
  const list = useRef<HTMLOListElement>(null);
  useCurrentEntry(list);
  return (
    <section id="log" className="section log" aria-labelledby="log-title">
      <h2 id="log-title" className="section-title" tabIndex={-1}>
        Log
      </h2>
      <p className="log-about">{portfolio.about}</p>
      <ol className="log-list" ref={list}>
        {rows.map((r, k) => {
          if (r.type === 'merge') {
            return (
              <li key={`merge-${k}`} className="log-row log-merge">
                <Graph lane="merge" branch="merge" first={k === 0} last={k === rows.length - 1} />
                <p className="log-merge-text">
                  Merge {r.branch} into main, {r.when}
                </p>
              </li>
            );
          }
          const { e } = r;
          const resumeEntry = e.kind === 'work' ? findExperience(e.resumeCompany!) : undefined;
          return (
            <li key={e.id} id={e.id} className="log-row log-entry" data-lane={r.lane} data-kind={e.kind}>
              <Graph lane={r.lane} branch={r.branch ?? 'none'} first={k === 0} last={k === rows.length - 1} kind={e.kind} />
              <div className="log-body">
                <p className="log-head">
                  <span className="log-version">{e.version}</span>
                  <span className="log-dates">{r.dates}</span>
                  {e.kind === 'degree' && <span className="log-branch">branch: {e.branch}</span>}
                </p>
                <h3 className="log-title">
                  {r.role}
                  <span className="log-org">{e.org}</span>
                </h3>
                {e.notes.length > 0 && (
                  <ul className="log-notes">
                    {e.notes.map((n) => (
                      <li key={n.text}>
                        <span className="log-tag" data-tag={n.tag}>
                          {n.tag}
                        </span>{' '}
                        {n.text}
                      </li>
                    ))}
                  </ul>
                )}
                {e.showDetails && resumeEntry && <Details bullets={resumeEntry.bullets} label="More" />}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
