import { useEffect, useLayoutEffect, useRef } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { portfolio, STAGES, type Act } from '../content/portfolio';
import { useMode } from '../lib/env';
import { scrollToTarget } from '../lib/scroll';
import { BUILD_LENGTH, registerSection, stage } from '../lib/stage';
import { startStageSync } from '../lib/stageSync';
import { createBuildTimeline } from '../lib/timeline';
import { Callout } from './Callout';
import { Frame } from './Frame';
import { StageReadouts } from './StageReadouts';

const stageLabel = (id: Act['id']) => STAGES.find((s) => s.id === id)!.label;
const PLATE_SLUGS = ['gates', 'retrieval', 'human-review', 'api', 'interface'];

function Hero() {
  const h = portfolio.hero;
  return (
    <section id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero-copy">
        <h1 id="hero-title" className="hero-name" tabIndex={-1}>
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
        <h2 id={`act-${act.id}-title`} className="act-title" tabIndex={-1}>
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

/** Scroll position (px) of a timeline position inside the build. */
function scrollAt(root: HTMLElement, p: number) {
  return root.offsetTop + (p / 100) * window.innerHeight;
}

/** Drag on the empty stage to orbit the machine a few degrees; it eases back on release. */
function useOrbitDrag(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let x0 = 0;
    let y0 = 0;
    let id = -1;
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      id = e.pointerId;
      x0 = e.clientX;
      y0 = e.clientY;
      el.setPointerCapture(id);
      el.dataset.dragging = '1';
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
      stage.orbit.yaw = clamp(((e.clientX - x0) / window.innerWidth) * 1.1, 0.18);
      stage.orbit.pitch = clamp(((e.clientY - y0) / window.innerHeight) * 0.5, 0.07);
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      stage.orbit.yaw = 0;
      stage.orbit.pitch = 0;
      delete el.dataset.dragging;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [ref, enabled]);
}

/** The hero and the three acts. In live mode this is one pinned stage driven by the master timeline. */
export function Build() {
  const mode = useMode();
  const live = mode === 'live';
  const root = useRef<HTMLDivElement>(null);
  const drag = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !live) {
      stage.p = 0;
      return;
    }
    const tl = createBuildTimeline(el);
    const stopSync = startStageSync(el);
    const unregister = [
      registerSection('top', { range: () => [0, scrollAt(el, 40)], landing: () => 0 }),
      ...portfolio.acts.map((a) =>
        registerSection(a.id, {
          range: () => [scrollAt(el, a.from), scrollAt(el, a.to)],
          landing: () => scrollAt(el, a.from + 14),
        }),
      ),
    ];
    document.fonts.ready.then(() => ScrollTrigger.refresh());
    return () => {
      tl.scrollTrigger?.kill();
      tl.kill();
      stopSync();
      unregister.forEach((u) => u());
      stage.p = 0;
    };
  }, [live]);

  // Keyboard focus inside a hidden act or callout scrolls the build to where it is visible.
  useEffect(() => {
    const el = root.current;
    if (!el || !live) return;
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      const callout = t.closest<HTMLElement>('.callout[data-callout]');
      const act = t.closest<HTMLElement>('.act[data-act]');
      if (callout && !callout.dataset.on) {
        const c = portfolio.acts.flatMap((a) => a.callouts).find((x) => x.id === callout.dataset.callout)!;
        window.scrollTo({ top: scrollAt(el, c.at + 3), behavior: 'instant' });
      } else if (act && !act.dataset.live) {
        scrollToTarget(act.dataset.act!, { focus: false, instant: true });
      } else if (t.closest('.hero') && stage.p > 30) {
        scrollToTarget('top', { focus: false, instant: true });
      }
    };
    el.addEventListener('focusin', onFocus);
    return () => el.removeEventListener('focusin', onFocus);
  }, [live]);

  useOrbitDrag(drag, live);

  const allCallouts = portfolio.acts.flatMap((a) => a.callouts);
  return (
    <div id="build" className="build" ref={root} style={{ ['--build-length' as string]: BUILD_LENGTH }}>
      <div className="stage">
        <div className="stage-drag" ref={drag} aria-hidden="true" />
        <Hero />
        {portfolio.acts.map((a) => (
          <ActSection key={a.id} act={a} />
        ))}
        {live && <StageReadouts />}
      </div>
      <svg className="hud-lines" aria-hidden="true">
        {allCallouts.map((c) => (
          <g key={c.id} data-leader={c.id}>
            <path />
            <circle className="leader-ring" r="0" />
            <circle className="leader-dot" r="0" />
          </g>
        ))}
      </svg>
      {live && (
        <div className="part-tag" data-hud-anchor="layer-1" aria-hidden="true">
          <span className="part-name">Core layer</span>
          <span className="part-hint">click to pulse</span>
        </div>
      )}
      <ul className="plate-tags" aria-label="Machine plates">
        {portfolio.plates.map((name, i) => (
          <li key={name} className="plate-tag" data-hud-anchor={`plate-${PLATE_SLUGS[i]}`} data-plate={name}>
            <span>{name}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
