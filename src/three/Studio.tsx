import { Environment, Lightformer, MeshReflectorMaterial } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { AdditiveBlending, CylinderGeometry, DoubleSide, Object3D, ShaderMaterial, type SpotLight } from 'three';
import { stage } from '../lib/stage';
import { blueprint } from './choreo';
import { C } from './palette';

/** A faint visible cone under the single overhead light. */
function LightCone() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: { uStrength: { value: 0.085 } },
        vertexShader: /* glsl */ `
          varying float vY;
          varying vec3 vN;
          varying vec3 vView;
          void main() {
            vY = uv.y;
            vec4 w = modelMatrix * vec4(position, 1.0);
            vN = normalize(mat3(modelMatrix) * normal);
            vView = normalize(cameraPosition - w.xyz);
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uStrength;
          varying float vY;
          varying vec3 vN;
          varying vec3 vView;
          void main() {
            float facing = abs(dot(normalize(vN), normalize(vView)));
            float a = uStrength * pow(max(facing, 1e-4), 1.6) * smoothstep(0.0, 0.35, vY) * smoothstep(1.0, 0.7, vY);
            gl_FragColor = vec4(vec3(0.85, 0.9, 1.0) * a, a);
          }`,
      }),
    [],
  );
  const geo = useMemo(() => new CylinderGeometry(0.12, 2.3, 6.2, 64, 1, true).translate(0, 3.1, 0), []);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  return <mesh geometry={geo} material={mat} position={[0.25, 0, 0.3]} renderOrder={1} />;
}

/** The workbench's hologram projector: hex cells and tick rings in Holo, under the machine. */
function Projector() {
  const mat = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uOn: { value: 1 }, uColor: { value: C.holo.clone() } },
        vertexShader: /* glsl */ `
          varying vec2 vP;
          void main() {
            vP = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime;
          uniform float uOn;
          uniform vec3 uColor;
          varying vec2 vP;
          float hexDist(vec2 p) {
            p = abs(p);
            return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
          }
          void main() {
            float r = length(vP);
            // Hex cells.
            vec2 s = vec2(1.0, 1.7320508) * 0.11;
            vec2 a = mod(vP, s) - s * 0.5;
            vec2 b = mod(vP - s * 0.5, s) - s * 0.5;
            vec2 g = dot(a, a) < dot(b, b) ? a : b;
            float edge = smoothstep(0.004, 0.0, abs(hexDist(g) - 0.05));
            float cells = edge * smoothstep(1.3, 0.95, r) * smoothstep(0.86, 0.95, r);
            // Tick ring, slowly turning.
            float ang = atan(vP.y, vP.x) + uTime * 0.05;
            float tick = smoothstep(0.35, 0.0, abs(fract(ang / 6.2831853 * 72.0) - 0.5) * 2.0 - 0.6);
            float major = step(0.92, fract(ang / 6.2831853 * 12.0 + 0.04));
            float ring1 = smoothstep(0.004, 0.0, abs(r - 1.18));
            float ticks = tick * smoothstep(1.2, 1.205, r) * smoothstep(1.26 + major * 0.05, 1.255 + major * 0.05, r);
            float ring2 = smoothstep(0.003, 0.0, abs(r - 1.34)) * 0.6;
            float a2 = (cells * 0.35 + ring1 * 0.5 + ticks * 0.55 + ring2) * uOn;
            gl_FragColor = vec4(uColor * a2, a2);
          }`,
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame(({ clock }) => {
    mat.uniforms.uTime.value = clock.elapsedTime;
    const lit = stage.highlight?.chips.includes('data') ? 0.7 : 0;
    mat.uniforms.uOn.value = Math.min(1.4, 0.45 + 0.55 * blueprint(stage.p) + lit);
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.004} material={mat} renderOrder={1}>
      <circleGeometry args={[1.4, 96]} />
    </mesh>
  );
}

export function Studio({ reflect, shadows }: { reflect: boolean; shadows: boolean }) {
  const spot = useRef<SpotLight>(null);
  const target = useMemo(() => {
    const o = new Object3D();
    o.position.set(0, 0.9, 0);
    return o;
  }, []);
  return (
    <>
      <color attach="background" args={['#0f1013']} />
      <fog attach="fog" args={['#0f1013', 7.5, 17]} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 1]} rotation-x={Math.PI / 2} scale={[7, 3, 1]} />
        <Lightformer form="rect" intensity={1.1} color="#cfe3f2" position={[-5, 1.6, 1.5]} rotation-y={Math.PI / 2} scale={[2.4, 5, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#ffe0cf" position={[5, 1.4, -0.5]} rotation-y={-Math.PI / 2} scale={[2.4, 5, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[0, 1.5, 7]} scale={[6, 1.2, 1]} />
      </Environment>
      <hemisphereLight args={['#cfe3f2', '#0f1013', 0.22]} />
      <primitive object={target} />
      <spotLight
        ref={spot}
        position={[0.5, 6.6, 1.6]}
        angle={0.42}
        penumbra={0.9}
        intensity={150}
        decay={2}
        color="#f4f6fa"
        target={target}
        castShadow={shadows}
        shadow-mapSize={[1536, 1536]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-3.5, 3, -4]} intensity={0.9} color="#9cc8ff" />
      <directionalLight position={[3.5, 1.2, 3]} intensity={0.18} color="#ffc2a6" />
      <LightCone />
      <Projector />
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[40, 40]} />
        {reflect ? (
          <MeshReflectorMaterial
            resolution={1024}
            blur={[320, 90]}
            mixBlur={1}
            mixStrength={1.1}
            mixContrast={1}
            roughness={0.85}
            metalness={0.5}
            depthScale={0.8}
            minDepthThreshold={0.3}
            maxDepthThreshold={1.4}
            color="#0c0d10"
            mirror={0.5}
          />
        ) : (
          <meshStandardMaterial color="#0d0e11" roughness={0.9} metalness={0.3} />
        )}
      </mesh>
    </>
  );
}
