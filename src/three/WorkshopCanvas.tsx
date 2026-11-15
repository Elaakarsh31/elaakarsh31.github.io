import { Canvas, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useEffect, useMemo } from 'react';
import { markContextLost, type Mode } from '../lib/env';
import { stage } from '../lib/stage';
import { CameraRig, SHOTS, newShot, shotAt, type ShotState } from './CameraRig';
import { debugCam, fixedP, isCapture, noPost } from './capture';
import { HudSync } from './HudSync';
import { startInput } from './input';
import { Studio } from './Studio';
import { Workshop } from './Workshop';

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
    const vis = () => {
      const running = !document.hidden;
      setFrameloop(running ? 'always' : 'never');
      canvas.dataset.running = running ? '1' : '0';
    };
    document.addEventListener('visibilitychange', vis);
    vis();
    return () => {
      canvas.removeEventListener('webglcontextlost', lost);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [gl, setFrameloop]);
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
      if (phone) {
        const s = SHOTS.heroPhone;
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
        <Lifecycle />
        <Studio reflect={!phone} shadows={!phone} />
        <Workshop motion={motion} capture={isCapture} />
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
