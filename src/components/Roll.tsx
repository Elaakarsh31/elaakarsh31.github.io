/**
 * Text that rolls up on hover: the label slides up and a coloured copy slides in from below.
 * The copy is hidden from assistive tech, so the label is read once.
 */
export function Roll({ children }: { children: string }) {
  return (
    <span className="roll">
      <span className="roll-a">{children}</span>
      <span className="roll-b" aria-hidden="true">
        {children}
      </span>
    </span>
  );
}
