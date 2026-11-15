/** Exploded mini-diagram drawn in code for a project's spec sheet (filled in at step 5). */
export function Schematic({ id }: { id: string }) {
  return <div className="schematic" data-schematic={id} aria-hidden="true" />;
}
