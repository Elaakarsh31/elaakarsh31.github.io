import { portfolio, STAGES } from '../content/portfolio';
import { resume } from '../content/resume';

/** Tags sorted into the three pipeline trays, plus every skill from the .tex. */
export function Toolbench() {
  const t = portfolio.toolbench;
  return (
    <section id="toolbench" className="section toolbench" aria-labelledby="toolbench-title">
      <h2 id="toolbench-title" className="section-title" tabIndex={-1}>
        {t.title}
      </h2>
      <p className="section-line">{t.line}</p>
      <div className="bench">
        <ul className="trays">
          {STAGES.map((s) => (
            <li key={s.id} className="tray" data-tray={s.id}>
              <h3 className="tray-title">{s.label}</h3>
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
