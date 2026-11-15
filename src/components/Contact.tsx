import { portfolio } from '../content/portfolio';
import { CopyEmail } from './CopyEmail';
import { ExtLink } from './ExtLink';
import { HoverText } from './HoverText';

export function Contact() {
  const c = portfolio.contact;
  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <h2 id="contact-title" className="contact-title" tabIndex={-1}>
        <HoverText text={portfolio.contactSection.title} />
      </h2>
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
      <p className="contact-availability">{portfolio.availability}</p>
    </section>
  );
}
