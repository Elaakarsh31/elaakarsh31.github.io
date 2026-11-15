import { STAGES } from '../content/portfolio';

/** Slim vertical rail on the left edge: Data, Model, System, each filling as its act plays. */
export function PipelineRail() {
  return (
    <nav className="rail" aria-label="Pipeline" data-spy>
      <ol>
        {STAGES.map((s) => (
          <li key={s.id}>
            <a className="rail-seg" data-seg={s.id} href={`#${s.id}`}>
              <span className="rail-track" aria-hidden="true">
                <span className="rail-fill" />
              </span>
              <span className="rail-label">{s.label}</span>
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
