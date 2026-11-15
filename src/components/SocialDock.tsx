import { portfolio } from '../content/portfolio';
import { GitHubIcon, LinkedInIcon, MailIcon, ScholarIcon } from './Icons';
import type { ReactNode } from 'react';

function DockLink({ href, label, children, external = true }: { href: string; label: string; children: ReactNode; external?: boolean }) {
  return (
    <li>
      <a
        className="dock-link"
        href={href}
        aria-label={external ? `${label} (opens in a new tab)` : label}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {children}
        <span className="dock-tip" aria-hidden="true">
          {label}
        </span>
      </a>
    </li>
  );
}

/** Slim gunmetal plate, bottom left. Each icon heats up on hover or focus. */
export function SocialDock({ extra }: { extra?: ReactNode }) {
  const c = portfolio.contact;
  return (
    <aside className="dock" aria-label="Social links">
      <ul>
        <DockLink href={c.github} label="GitHub">
          <GitHubIcon />
        </DockLink>
        <DockLink href={c.linkedin} label="LinkedIn">
          <LinkedInIcon />
        </DockLink>
        <DockLink href={c.scholar} label="Google Scholar">
          <ScholarIcon />
        </DockLink>
        <DockLink href={`mailto:${c.email}`} label={`Email ${c.email}`} external={false}>
          <MailIcon />
        </DockLink>
        {extra}
      </ul>
    </aside>
  );
}
