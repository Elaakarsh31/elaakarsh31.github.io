import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { bootStep, setPowered } from '../lib/boot';
import { markContextLost } from '../lib/env';
import { currentSection } from '../lib/spy';
import { BUILD_LENGTH, stage } from '../lib/stage';
import { blendAt, type Spot } from './afterBuild';
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
    const near = new Set(['career', 'resume', 'toolbench', 'contact']);
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

/** Reports the first frames to the power-on gate: shaders compiled, then the bot running. */
function BootProbe() {
  const frames = useRef(0);
  useFrame(() => {
    frames.current++;
    if (frames.current === 3) bootStep('materials');
    if (frames.current === 10) bootStep('bot');
  });
  return null;
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

/** Pauses rendering while the tab is hidden, and falls back to still frames if the WebGL context is lost. */
function Lifecycle() {
  const gl = useThree((s) => s.gl);
  const setFrameloop = useThree((s) => s.setFrameloop);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => {
      e.preventDefault();
      markContextLost();
    };
    canvas.addEventListener('webglcontextlost', lost);
    const apply = () => {
      const on = !document.hidden;
      setFrameloop(on ? 'always' : 'never');
      canvas.dataset.running = on ? '1' : '0';
    };
    document.addEventListener('visibilitychange', apply);
    apply();
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      document.removeEventListener('visibilitychange', apply);
    };
  }, [gl, setFrameloop]);
  return null;
}

/** The fixed WebGL canvas behind the page: studio, machine, bot, HUD anchors. */
export default function WorkshopCanvas() {
  const motion = !isCapture;
  useEffect(() => {
    startInput();
    if (fixedP !== null) stage.p = fixedP;
    // Still frames have no gate: the workshop is powered from the start.
    if (isCapture) {
      stage.power = 1;
      setPowered();
    }
  }, []);

  const resolve = useMemo(() => {
    const tmp = newShot();
    const tmpB = newShot();
    const fill = (spot: Spot, o: ShotState) => {
      if (spot === 'exit') return shotAt(BUILD_LENGTH, o);
      const s = SHOTS[spot === 'careerUp' ? 'career' : spot];
      o.pos.fromArray(s.pos);
      o.target.fromArray(s.target);
      o.shift = s.shift;
      o.lift = s.lift ?? 0;
      o.fov = s.fov ?? 30;
      return o;
    };
    return (out: ShotState) => {
      out.rate = 7;
      if (debugCam) {
        out.pos.set(debugCam[0], debugCam[1], debugCam[2]);
        out.target.set(debugCam[3], debugCam[4], debugCam[5]);
        out.shift = 0;
        out.lift = 0;
        out.fov = debugCam[6] ?? 30;
        return out;
      }
      if (isCapture) {
        const s = SHOTS[`frame${captureFrame![0].toUpperCase()}${captureFrame!.slice(1)}`];
        out.pos.fromArray(s.pos);
        out.target.fromArray(s.target);
        out.shift = s.shift;
        out.lift = s.lift ?? 0;
        out.fov = s.fov ?? 30;
        return out;
      }
      // After the build the framing follows the scroll from section to section (exit → Projects
      // → Career → Toolbench → Contact), so every move glides and plays back in reverse.
      if (stage.p >= BUILD_LENGTH - 0.5) {
        const { a: sa, b: sb, k } = blendAt(window.scrollY);
        fill(sa, tmp);
        fill(sb, tmpB);
        out.pos.copy(tmp.pos).lerp(tmpB.pos, k);
        out.target.copy(tmp.target).lerp(tmpB.target, k);
        out.shift = tmp.shift + (tmpB.shift - tmp.shift) * k;
        out.lift = tmp.lift + (tmpB.lift - tmp.lift) * k;
        out.fov = tmp.fov + (tmpB.fov - tmp.fov) * k;
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
  }, []);

  return (
    <div className="webgl" aria-hidden="true">
      <Canvas
        dpr={[1, 1.75]}
        shadows
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: isCapture }}
        camera={{ fov: 30, near: 0.1, far: 60, position: [0.35, 1.7, 6.6] }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
        onCreated={(state) => {
          if (import.meta.env.DEV) (window as unknown as { __r3f: unknown }).__r3f = state;
          bootStep('scene');
        }}
      >
        {isCapture ? <CaptureReady /> : <Lifecycle />}
        <BootProbe />
        <Studio reflect shadows />
        <Workshop motion={motion} sparks={motion || isCapture} capture={isCapture} />
        {!isCapture && <BenchLoader />}
        <CameraRig resolve={resolve} immediate={isCapture} />
        <HudSync />
        {!noPost && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.75} luminanceThreshold={1.4} luminanceSmoothing={0.2} radius={0.62} />
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>
    </div>
  );
}
