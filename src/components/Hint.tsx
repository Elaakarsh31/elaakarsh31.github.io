import type { ReactNode } from 'react';

/** Small Figma-style pointer, for "point at this" hints. */
export function PointerIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true" focusable="false">
      <path
        d="M3.7 2.9 20.1 9.5c.9.4.8 1.6-.1 1.8l-6.7 1.7c-.3.1-.5.3-.6.6l-1.7 6.7c-.2.9-1.5 1-1.8.1L2.9 3.7c-.2-.6.3-1.1.8-.8Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Four-way arrows, for "drag this" hints. */
export function DragIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true" focusable="false">
      <path
        d="M12 2.5v19M2.5 12h19M12 2.5 9.2 5.3M12 2.5l2.8 2.8M12 21.5l-2.8-2.8M12 21.5l2.8-2.8M2.5 12l2.8-2.8M2.5 12l2.8 2.8M21.5 12l-2.8-2.8M21.5 12l-2.8 2.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** A glowing Holo chip with an icon: how to use something on the page. */
export function Hint({ icon, children, className = '' }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <p className={`hint-chip ${className}`}>
      <span className="hint-icon">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
