import { useEffect, useState } from 'react';
import { portfolio, STAGES } from '../content/portfolio';
import { resume } from '../content/resume';
import { setBenchSorted } from '../lib/bench';
import { useMode } from '../lib/env';
import { DragIcon, Hint } from './Hint';

/**
 * Engraved tool tags scattered on a physics bench (live mode); "Sort the bench" switches on magnets
 * that pull each into its Data, Model or System tray. Elsewhere the same tags are chips in trays.
 */
export function Toolbench() {
  const t = portfolio.toolbench;
  const live = useMode() === 'live';
  const [sorted, setSorted] = useState(false);

  useEffect(() => setBenchSorted(sorted), [sorted]);

  return (
    <section id="toolbench" className="section toolbench" aria-labelledby="toolbench-title">
      <div className="bench-wrap">
        <div className="bench-stage">
          <div className="bench-head">
            <h2 id="toolbench-title" className="section-title" tabIndex={-1}>
              {t.title}
            </h2>
            <p className="section-line">{t.line}</p>
            {live && (
              <button
                type="button"
                className={sorted ? 'btn btn-ghost bench-sort' : 'btn btn-hot bench-sort'}
                aria-pressed={sorted}
                onClick={() => setSorted((v) => !v)}
              >
                {sorted ? t.scatter : t.sort}
              </button>
            )}
            {live && (
              <Hint icon={<DragIcon />} className="bench-hint">
                Drag a tag to throw it.
              </Hint>
            )}
          </div>
          <div className="bench">
            <ul className="trays">
              {STAGES.map((s) => (
                <li key={s.id} className="tray" data-tray={s.id}>
                  <h3 className="tray-title" data-hud-anchor={`tray-${s.id}`}>
                    <span>{s.label}</span>
                  </h3>
                  <ul className="tags">
                    {t.tags
                      .filter((tag) => tag.tray === s.id)
                      .map((tag) => (
                        <li key={tag.name} className="tag" data-tag={tag.name}>
                          {tag.name}
                        </li>
                      ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <details className="details all-skills">
        <summary>
          <span className="details-label">{t.all}</span>
        </summary>
        <div className="skill-groups">
          {resume.skills.map((s) => (
            <div key={s.category} className="skill-group">
              <h3 className="skill-cat">{s.category}</h3>
              <ul className="skill-list">
                {s.items.map((item, k) => (
                  <li key={k} data-skill>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
