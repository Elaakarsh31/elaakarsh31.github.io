import { portfolio, type Project } from '../content/portfolio';
import { findProject } from '../content/resume';
import { Details } from './Details';
import { LinkRow } from './LinkRow';

function ProjectRow({ project }: { project: Project }) {
  const entry = findProject(project.resumeTitle, project.source);
  if (!entry && import.meta.env.DEV) console.warn(`[portfolio] no resume match for "${project.resumeTitle}"`);
  return (
    <li className={project.featured ? 'row project featured' : 'row project'}>
      <div className="row-head">
        <h3 className="row-title">{project.title}</h3>
        <p className="row-meta">
          <span>{project.year}</span>
          {project.note && <span>{project.note}</span>}
        </p>
      </div>
      <div className="row-body">
        <p className="row-summary">{project.summary}</p>
        <ul className="stack" aria-label="Stack">
          {project.stack.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
        <LinkRow links={project.links} />
        {entry && <Details bullets={entry.bullets} />}
      </div>
    </li>
  );
}

export function Work() {
  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <h2 id="work-title" className="section-title">
        Work
      </h2>
      <ul className="rows">
        {portfolio.projects.map((p) => (
          <ProjectRow key={p.title} project={p} />
        ))}
      </ul>
    </section>
  );
}
