import type { Links } from '../content/portfolio';
import { ExtLink } from './ExtLink';

/** Code, Live demo, Paper, Notebook — only the ones that have a URL. */
export function LinkRow({ links }: { links: Links }) {
  const items: { label: string; href: string; note?: string }[] = [];
  if (links.code) items.push({ label: 'Code', href: links.code });
  if (links.demo) items.push({ label: 'Live demo', href: links.demo, note: links.demoNote });
  if (links.paper) items.push({ label: 'Publication', href: links.paper });
  if (links.notebook) items.push({ label: 'Notebook', href: links.notebook });
  if (!items.length) return null;
  return (
    <ul className="link-row">
      {items.map((it) => (
        <li key={it.label}>
          <ExtLink href={it.href}>{it.label}</ExtLink>
          {it.note && <span className="link-note">{it.note}</span>}
        </li>
      ))}
    </ul>
  );
}
