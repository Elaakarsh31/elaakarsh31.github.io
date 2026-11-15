// The master timeline for the hero and the three acts. One GSAP timeline, scrubbed by scroll
// position, so scrolling back plays everything in reverse. Its duration is the build length in
// vh, so timeline positions and the 3D choreography share units.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { portfolio } from '../content/portfolio';
import { BUILD_LENGTH, stage } from './stage';

gsap.registerPlugin(ScrollTrigger);

export function createBuildTimeline(root: HTMLElement) {
  const q = gsap.utils.selector(root);
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: root, start: 'top top', end: 'bottom bottom', scrub: true, invalidateOnRefresh: true },
  });
  tl.to(stage, { p: BUILD_LENGTH, duration: BUILD_LENGTH }, 0);

  // Hero copy lifts away as the parts settle; the cue goes first.
  tl.fromTo(q('.hero-cue'), { opacity: 1 }, { opacity: 0, duration: 8 }, 0);
  tl.fromTo(q('.hero-copy'), { opacity: 1, y: 0 }, { opacity: 0, y: -70, duration: 28, ease: 'power1.in' }, 4);

  portfolio.acts.forEach((act, i) => {
    const copy = q(`.act[data-act="${act.id}"] .act-copy`);
    tl.fromTo(copy, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 11, ease: 'power2.out' }, act.from + 2);
    if (i < portfolio.acts.length - 1) {
      tl.to(copy, { opacity: 0, y: -46, duration: 10, ease: 'power2.in' }, act.to - 11);
    }
  });
  return tl;
}
