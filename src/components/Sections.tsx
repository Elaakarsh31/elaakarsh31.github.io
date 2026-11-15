import { portfolio } from '../content/portfolio';
import { findExperience, findPublication, resume } from '../content/resume';
import { Details } from './Details';
import { ExtLink } from './ExtLink';
import { LinkRow } from './LinkRow';
import { Rich } from './Rich';

const SKILLS_SHOWN = 8;

export function Publications() {
  return (
    <section id="publications" className="section" aria-labelledby="pubs-title">
      <h2 id="pubs-title" className="section-title">
        Publications
      </h2>
      <ul className="rows">
        {portfolio.publications.map((p) => {
          const entry = findPublication(p.resumeTitle);
          return (
            <li key={p.title} className="row pub">
              <div className="row-head">
                <h3 className="row-title">{p.title}</h3>
                <p className="row-meta">
                  <span>{p.venue}</span>
                  <span>{p.year}</span>
                </p>
              </div>
              <div className="row-body">
                <p className="row-summary">{entry?.bullets[0] ? <Rich nodes={entry.bullets[0]} /> : p.summary}</p>
                <LinkRow links={p.links} />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="section-note">
        <ExtLink href={portfolio.contact.scholar}>{portfolio.publicationsNote}</ExtLink>
      </p>
    </section>
  );
}

export function Experience() {
  return (
    <section id="experience" className="section" aria-labelledby="exp-title">
      <h2 id="exp-title" className="section-title">
        Experience
      </h2>
      <ul className="rows">
        {portfolio.experience.map((e) => {
          const entry = findExperience(e.resumeCompany);
          return (
            <li key={e.company} className="row exp">
              <div className="row-head">
                <h3 className="row-title">
                  {e.role}
                  <span className="row-at">, {e.company}</span>
                </h3>
                <p className="row-meta">
                  <span>{e.dates}</span>
                  <span>{e.location}</span>
                </p>
              </div>
              <div className="row-body">
                <p className="row-summary">{e.summary}</p>
                {e.showDetails && entry && <Details bullets={entry.bullets} />}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Skills() {
  return (
    <section id="skills" className="section" aria-labelledby="skills-title">
      <h2 id="skills-title" className="section-title">
        Skills
      </h2>
      <ul className="rows skills">
        {resume.skills.map((s) => {
          const shown = s.items.slice(0, SKILLS_SHOWN);
          const rest = s.items.slice(SKILLS_SHOWN);
          return (
            <li key={s.category} className="row skill-row">
              <h3 className="skill-cat">{s.category}</h3>
              <div className="skill-body">
                <ul className="skill-list">
                  {shown.map((item, k) => (
                    <li key={k} data-skill>
                      {item}
                    </li>
                  ))}
                </ul>
                {rest.length > 0 && (
                  <details className="details">
                    <summary>
                      <span className="details-label">All {s.category.toLowerCase()}</span>
                    </summary>
                    <ul className="skill-list">
                      {rest.map((item, k) => (
                        <li key={k} data-skill>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function Education() {
  return (
    <section id="education" className="section" aria-labelledby="edu-title">
      <h2 id="edu-title" className="section-title">
        Education
      </h2>
      <ul className="rows">
        {portfolio.education.map((e) => (
          <li key={e.degree} className="row edu">
            <div className="row-head">
              <h3 className="row-title">{e.degree}</h3>
              <p className="row-meta">
                <span>{e.dates}</span>
              </p>
            </div>
            <div className="row-body">
              <p className="row-summary">
                {e.school}
                {e.location && `, ${e.location}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <h2 id="about-title" className="section-title">
        About
      </h2>
      <div className="prose">
        <p>{portfolio.about}</p>
        <p className="availability">{portfolio.site.availability}</p>
      </div>
    </section>
  );
}

export function Contact() {
  const c = portfolio.contact;
  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <h2 id="contact-title" className="section-title">
        Contact
      </h2>
      <p className="contact-email">
        <a href={`mailto:${c.email}`}>{c.email}</a>
      </p>
      <ul className="contact-links">
        <li>
          <ExtLink href={c.linkedin}>LinkedIn</ExtLink>
        </li>
        <li>
          <ExtLink href={c.github}>GitHub</ExtLink>
        </li>
        <li>
          <ExtLink href={c.scholar}>Google Scholar</ExtLink>
        </li>
        {__HAS_RESUME__ && (
          <li>
            <ExtLink href={`${import.meta.env.BASE_URL}resume.pdf`}>Resume (PDF)</ExtLink>
          </li>
        )}
      </ul>
    </section>
  );
}
