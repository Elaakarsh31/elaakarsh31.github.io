import type { ReactNode } from 'react';

/** Outbound link: new tab, no opener, no referrer. */
export function ExtLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
      <span className="ext" aria-hidden="true">
        ↗
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
