import { useEffect, useRef, useState } from 'react';
import { createScene } from './scene';

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Mounts the particle canvas into the hero stage, or nothing if WebGL is unavailable. */
export function HeroScene({ stageRef }: { stageRef: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);

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
        onReady: () => {
          root.dataset.hero = 'webgl';
        },
        onFail: () => {
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
  }, [stageRef]);

  if (failed) return null;
  return <canvas ref={canvasRef} className="hero-canvas" aria-hidden="true" />;
}
