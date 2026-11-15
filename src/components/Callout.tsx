import { useId, useState } from 'react';
import type { Callout as CalloutData } from '../content/portfolio';
import { bulletFor } from '../content/resume';
import { ExtLink } from './ExtLink';
import { Rich } from './Rich';

/** A holographic engineering callout: one real fact, expandable into details and a link. */
export function Callout({ c }: { c: CalloutData }) {
  const [open, setOpen] = useState(false);
  const detailId = useId();
  const bullet = c.bullet && bulletFor(c.bullet);
  return (
    <li className="callout" data-callout={c.id} data-anchor={c.anchor} data-open={open || undefined} style={{ order: c.slot }}>
      <button
        type="button"
        className="callout-face"
        aria-expanded={open}
        aria-controls={detailId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="callout-text">{c.text}</span>
        <span className="callout-toggle" aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>
      <div id={detailId} className="callout-detail" hidden={!open}>
        <p>{c.detail}</p>
        {bullet && (
          <p className="callout-bullet">
            <Rich nodes={bullet} />
          </p>
        )}
        <ul className="callout-links">
          {c.links.map((l) => (
            <li key={l.href}>
              {l.external ? <ExtLink href={l.href}>{l.label}</ExtLink> : <a href={l.href}>{l.label} →</a>}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}
