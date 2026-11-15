import { useEffect, useRef, useState } from 'react';
import { createScene } from './scene';

const REDUCED = '(prefers-reduced-motion: reduce)';

function useReducedMotion() {
  const [reduced, setReduced] = useState(() => window.matchMedia(REDUCED).matches);
  useEffect(() => {
    const mq = window.matchMedia(REDUCED);
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    gl?.getExtension('WEBGL_lose_context')?.loseContext(); // release the probe context
    return !!gl;
  } catch {
    return false;
  }
}

/** Mounts the particle canvas into the hero stage, or nothing if WebGL is unavailable. */
export function HeroScene({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const root = document.documentElement;
    if (!canvas || !stage) return;
    if (!hasWebGL()) {
      root.dataset.hero = 'fallback';
      setFailed(true);
      return;
    }
    let handle: ReturnType<typeof createScene> | null = null;
    try {
      handle = createScene({
        canvas,
        stage,
        reducedMotion,
        onReady: () => {
          root.dataset.hero = 'webgl';
        },
        onFail: (reason) => {
          console.warn(`[portrait] ${reason}, showing the static hero.`);
          root.dataset.hero = 'fallback';
          setFailed(true);
        },
      });
    } catch (err) {
      console.warn('[portrait] WebGL setup failed, showing the static hero.', err);
      root.dataset.hero = 'fallback';
      setFailed(true);
    }
    return () => handle?.dispose();
  }, [stageRef, reducedMotion]);

  if (failed) return null;
  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />;
}
