import { portfolio } from '../content/portfolio';
import { CopyEmail } from './CopyEmail';
import { ExtLink } from './ExtLink';

export function Contact() {
  const c = portfolio.contact;
  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <h2 id="contact-title" className="contact-title" tabIndex={-1}>
        {portfolio.contactSection.title}
      </h2>
      <div className="availability-card">
        <p className="availability-main">
          <span className="status-dot" aria-hidden="true" />
          {portfolio.availability}
        </p>
        <p className="availability-auth">
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
            <path d="M5 12.5l4.2 4.2L19 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {portfolio.workAuth}
        </p>
      </div>
      <p className="contact-email">
        <a href={`mailto:${c.email}`}>{c.email}</a>
      </p>
      <div className="contact-actions">
        <CopyEmail email={c.email} />
      </div>
      <ul className="contact-links">
        <li>
          <ExtLink href={c.github}>GitHub</ExtLink>
        </li>
        <li>
          <ExtLink href={c.linkedin}>LinkedIn</ExtLink>
        </li>
        <li>
          <ExtLink href={c.scholar}>Google Scholar</ExtLink>
        </li>
      </ul>
    </section>
  );
}
