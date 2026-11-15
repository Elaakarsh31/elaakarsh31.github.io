import { portfolio, STAGES, type Act } from '../content/portfolio';
import { Callout } from './Callout';
import { Frame } from './Frame';

const stageLabel = (id: Act['id']) => STAGES.find((s) => s.id === id)!.label;

function Hero() {
  const h = portfolio.hero;
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title" className="hero-name">
          {portfolio.site.name}
        </h1>
        <p className="hero-tagline">{h.tagline}</p>
        <p className="hero-intro">{h.intro}</p>
        <p className="hero-edu">{h.education}</p>
      </div>
      <Frame name="hero" alt={h.frameAlt} className="hero-frame" />
      <p className="hero-cue" aria-hidden="true">
        <span>{h.cue}</span>
      </p>
    </section>
  );
}

function ActSection({ act }: { act: Act }) {
  return (
    <section id={act.id} className="act" data-act={act.id} aria-labelledby={`act-${act.id}-title`}>
      <div className="act-copy">
        <p className="act-kicker">
          Act {act.index}, {stageLabel(act.id)}
        </p>
        <h2 id={`act-${act.id}-title`} className="act-title">
          {act.title}
        </h2>
        <p className="act-line">{act.line}</p>
        <a className="act-link" href={act.link.href}>
          {act.link.label} →
        </a>
      </div>
      <Frame name={act.id} alt={act.frameAlt} className="act-frame" />
      <ul className="callouts" aria-label={`${stageLabel(act.id)} evidence`}>
        {act.callouts.map((c) => (
          <Callout key={c.id} c={c} />
        ))}
      </ul>
    </section>
  );
}

/** The hero and the three acts. In live mode this becomes one pinned stage (see build.css). */
export function Build() {
  return (
    <div id="build" className="build">
      <div className="stage">
        <Hero />
        {portfolio.acts.map((a) => (
          <ActSection key={a.id} act={a} />
        ))}
      </div>
    </div>
  );
}
