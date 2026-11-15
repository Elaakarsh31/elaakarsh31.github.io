// Toggles which parts of the pinned stage are live, from the timeline position: the current
// act (for pointer events), each callout and its leader line, and the plate labels.
// Thresholds are symmetric, so scrolling back hides things in reverse order.
import { gsap } from 'gsap';
import { portfolio } from '../content/portfolio';
import { FRAGMENTS, fragWindow, plateLockAt } from '../three/timing';
import { playClick, playLand, playScan } from './sound';
import { BUILD_LENGTH, stage } from './stage';

function setFlag(el: Element & { dataset: DOMStringMap }, key: string, on: boolean) {
  if (!!el.dataset[key] === on) return;
  if (on) el.dataset[key] = '1';
  else delete el.dataset[key];
}

export function startStageSync(root: HTMLElement) {
  const callouts = [...root.querySelectorAll<HTMLElement>('.callout[data-callout]')];
  const leaders = new Map([...document.querySelectorAll<SVGGElement>('[data-leader]')].map((g) => [g.dataset.leader!, g]));
  const acts = [...root.querySelectorAll<HTMLElement>('.act[data-act]')];
  const hero = root.querySelector<HTMLElement>('.hero');
  const plateTags = [...document.querySelectorAll<HTMLElement>('.plate-tag')];
  const timing = new Map(portfolio.acts.flatMap((a) => a.callouts.map((c) => [c.id, { at: c.at, to: a.to }] as const)));
  const ranges = new Map(portfolio.acts.map((a) => [a.id, a] as const));
  let last = -1;

  const tick = () => {
    const p = stage.p;
    if (p === last) return;
    // A click when a plate locks while scrolling forward.
    for (let k = 0; k < plateTags.length; k++) {
      const at = plateLockAt(k);
      if (last < at && p >= at && p - last < 20) playClick();
    }
    // Act 1, either way: a scan as a fragment passes the ring, a knock as its block lands.
    // At most one of each per frame, so a fast scroll does not pile them up.
    if (Math.abs(p - last) < 20) {
      const lo = Math.min(last, p);
      const hi = Math.max(last, p);
      let scan = -1;
      let land = false;
      for (let j = 0; j < FRAGMENTS; j++) {
        const [t0, t1] = fragWindow(j);
        if (lo < t0 + 6.2 && hi >= t0 + 6.2) scan = j;
        if (lo < t1 && hi >= t1) land = true;
      }
      if (scan >= 0) playScan(scan / (FRAGMENTS - 1));
      if (land) playLand();
    }
    last = p;
    for (const c of callouts) {
      const r = timing.get(c.dataset.callout!)!;
      const on = p >= r.at && p < r.to - 0.5;
      setFlag(c, 'on', on);
      const g = leaders.get(c.dataset.callout!);
      if (g) setFlag(g, 'on', on);
    }
    for (const a of acts) {
      const def = ranges.get(a.dataset.act as 'data')!;
      setFlag(a, 'live', p >= def.from && p < def.to - 0.5);
    }
    if (hero) setFlag(hero, 'live', p < 30);
    plateTags.forEach((t, i) => setFlag(t, 'on', p >= plateLockAt(i) && p < BUILD_LENGTH - 0.5));
  };
  gsap.ticker.add(tick);
  tick();
  return () => gsap.ticker.remove(tick);
}
