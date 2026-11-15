import { useRef } from 'react';
import { portfolio } from '../content/portfolio';
import { HeroScene } from '../hero/HeroScene';

/** Hero copy. The greeting is real HTML text; the particle canvas sits on top of it. */
export function Hero() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [first, ...rest] = portfolio.site.greeting.replace("'", '’').split(' ');
  const line2 = rest.pop();
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-stage" ref={stageRef}>
        <div className="hero-glow" aria-hidden="true" />
        <h1 id="hero-title" className="greeting">
          <span>{[first, ...rest].join(' ')}</span> <span>{line2}</span>
        </h1>
        <HeroScene stageRef={stageRef} />
        <div className="hero-copy">
          <p className="tagline">{portfolio.site.tagline}</p>
          <a className="hero-cta" href="#work">
            View projects <span aria-hidden="true">↓</span>
          </a>
        </div>
      </div>
    </section>
  );
}
