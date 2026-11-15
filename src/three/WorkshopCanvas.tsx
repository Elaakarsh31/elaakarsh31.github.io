import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { markContextLost, type Mode } from '../lib/env';
import { currentSection } from '../lib/spy';
import { BUILD_LENGTH, stage } from '../lib/stage';

/** Sections after the build that frame the scene with their own camera shot. */
const AFTER_BUILD = new Set(['projects', 'papers', 'log', 'resume', 'toolbench', 'contact']);
import { CameraRig, SHOTS, newShot, shotAt, type ShotState } from './CameraRig';
import { captureFrame, debugCam, fixedP, isCapture, noPost } from './capture';
import { HudSync } from './HudSync';
import { startInput } from './input';
import { Studio } from './Studio';
import { Workshop } from './Workshop';

const Bench = lazy(() => import('./toolbench/Bench'));

/** Mounts the physics bench once the visitor is near it, and runs it only while it is on screen. */
function BenchLoader() {
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState(false);
  useEffect(() => {
    const near = new Set(['log', 'resume', 'toolbench', 'contact']);
    const on = () => {
      const s = currentSection();
      if (near.has(s)) setMounted(true);
      setActive(s === 'toolbench');
    };
    on();
    window.addEventListener('section', on);
    return () => window.removeEventListener('section', on);
  }, []);
  if (!mounted) return null;
  return (
    <Suspense fallback={null}>
      <Bench active={active} />
    </Suspense>
  );
}

/** Signals that a still-frame capture has rendered long enough for shadows and sparks to settle. */
function CaptureReady() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 90) (window as unknown as { __frameReady: boolean }).__frameReady = true;
  });
  return null;
}

/** Sections where the scene is faded out, so rendering pauses. */
const NO_SCENE = new Set(['log', 'resume']);

/**
 * Pauses rendering when the tab is hidden or the current section shows no scene, and falls back
 * to still frames if the WebGL context is lost.
 */
function Lifecycle({ phone }: { phone: boolean }) {
  const gl = useThree((s) => s.gl);
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const canvas = gl.domElement;
    let pauseTimer = 0;
    const lost = (e: Event) => {
      e.preventDefault();
      markContextLost();
    };
    canvas.addEventListener('webglcontextlost', lost);
    const apply = () => {
      clearTimeout(pauseTimer);
      const section = currentSection();
      // On phones only the hero is live; the acts below use still frames.
      const offstage = phone ? section !== 'top' : NO_SCENE.has(section);
      const run = (on: boolean) => {
        setFrameloop(on ? 'always' : 'never');
        canvas.dataset.running = on ? '1' : '0';
      };
      if (document.hidden) run(false);
      else if (offstage) pauseTimer = window.setTimeout(() => run(false), 650); // after the fade
      else run(true);
    };
    document.addEventListener('visibilitychange', apply);
    window.addEventListener('section', apply);
    apply();
    return () => {
      clearTimeout(pauseTimer);
      canvas.removeEventListener('webglcontextlost', lost);
      document.removeEventListener('visibilitychange', apply);
      window.removeEventListener('section', apply);
    };
  }, [gl, setFrameloop, phone]);
  return null;
}

/** The fixed WebGL canvas behind the page: studio, machine, bot, HUD anchors. */
export default function WorkshopCanvas({ mode }: { mode: Mode }) {
  const phone = mode === 'phone';
  const motion = !isCapture;
  useEffect(() => {
    startInput();
    if (fixedP !== null) stage.p = fixedP;
  }, []);

  const resolve = useMemo(() => {
    const tmp = newShot();
    return (out: ShotState) => {
      if (debugCam) {
        out.pos.set(debugCam[0], debugCam[1], debugCam[2]);
        out.target.set(debugCam[3], debugCam[4], debugCam[5]);
        out.shift = 0;
        out.lift = 0;
        out.fov = debugCam[6] ?? 30;
        return out;
      }
      if (isCapture || phone) {
        const s = isCapture ? SHOTS[`frame${captureFrame![0].toUpperCase()}${captureFrame!.slice(1)}`] : SHOTS.heroPhone;
        out.pos.fromArray(s.pos);
        out.target.fromArray(s.target);
        out.shift = s.shift;
        out.lift = s.lift ?? 0;
        out.fov = s.fov ?? 30;
        return out;
      }
      const section = currentSection();
      const after = stage.p >= BUILD_LENGTH - 0.5 && AFTER_BUILD.has(section);
      if (after) {
        const s = SHOTS[section === 'papers' ? 'projects' : section] ?? SHOTS.projects;
        out.pos.fromArray(s.pos);
        out.target.fromArray(s.target);
        out.shift = s.shift;
        out.lift = s.lift ?? 0;
        out.fov = s.fov ?? 30;
        return out;
      }
      shotAt(stage.p, tmp);
      out.pos.copy(tmp.pos);
      out.target.copy(tmp.target);
      out.shift = tmp.shift;
      out.lift = tmp.lift;
      out.fov = tmp.fov;
      return out;
    };
  }, [phone]);

  return (
    <div className="webgl" aria-hidden="true">
      <Canvas
        dpr={[1, phone ? 1.25 : 1.75]}
        shadows={!phone}
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: isCapture }}
        camera={{ fov: 30, near: 0.1, far: 60, position: [0.35, 1.7, 6.6] }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
        onCreated={(state) => {
          if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state;
        }}
      >
        {isCapture ? <CaptureReady /> : <Lifecycle phone={phone} />}
        <Studio reflect={!phone} shadows={!phone} />
        <Workshop motion={motion} sparks={motion || isCapture} capture={isCapture} />
        {!phone && !isCapture && <BenchLoader />}
        <CameraRig resolve={resolve} immediate={isCapture} />
        <HudSync />
        {!noPost && (
          <EffectComposer multisampling={phone ? 0 : 4}>
            <Bloom mipmapBlur intensity={0.75} luminanceThreshold={1.4} luminanceSmoothing={0.2} radius={0.62} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
