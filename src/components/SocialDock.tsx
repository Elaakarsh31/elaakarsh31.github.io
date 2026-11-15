import { useRef, type ReactNode } from 'react';
import { portfolio } from '../content/portfolio';
import { GitHubIcon, LinkedInIcon, MailIcon, ScholarIcon } from './Icons';

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

/**
 * Bare icons, bottom left. Pointing at one (or focusing it) brings up a Molten pill behind it,
 * and the pill slides between icons, stretching toward the next one before it settles.
 */
export function SocialDock({ extra }: { extra?: ReactNode }) {
  const c = portfolio.contact;
  const list = useRef<HTMLUListElement>(null);
  const pill = useRef<HTMLLIElement>(null);
  const active = useRef<HTMLElement | null>(null);

  const moveTo = (el: HTMLElement | null) => {
    const p = pill.current;
    const ul = list.current;
    if (!p || !ul) return;
    active.current?.removeAttribute('data-active');
    active.current = el;
    if (!el) {
      delete p.dataset.on;
      return;
    }
    el.setAttribute('data-active', '');
    const box = el.getBoundingClientRect();
    const base = ul.getBoundingClientRect();
    const left = box.left - base.left;
    const right = base.right - box.right;
    const prev = parseFloat(p.style.left);
    if (!p.dataset.on || Number.isNaN(prev)) {
      // Appear in place, without sliding in from the last position.
      p.style.transition = 'none';
      p.style.left = `${left}px`;
      p.style.right = `${right}px`;
      void p.offsetWidth;
      p.style.transition = '';
    }
    p.dataset.dir = left >= prev ? 'right' : 'left';
    p.style.left = `${left}px`;
    p.style.right = `${right}px`;
    p.dataset.on = '1';
  };

  const target = (e: React.SyntheticEvent) => (e.target as HTMLElement).closest<HTMLElement>('.dock-link');

  return (
    <aside className="dock" aria-label="Social links">
      <ul
        ref={list}
        onPointerOver={(e) => {
          // Gaps between icons keep the pill where it is; only leaving the dock hides it.
          const t = target(e);
          if (t) moveTo(t);
        }}
        onPointerLeave={() => moveTo(null)}
        onFocus={(e) => moveTo(target(e))}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) moveTo(null);
        }}
      >
        <li ref={pill} className="dock-pill" aria-hidden="true" />
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
