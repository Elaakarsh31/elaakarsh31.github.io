import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three';
import { C } from '../palette';

/**
 * Hologram shell: fresnel rim, world-space scanlines drifting upward, a soft flicker, and a
 * brighter scan band where the metal is being fabricated (uFabY, 0..1 of the part's height).
 * Additive and never above 1, so it doesn't bloom.
 */
export function createHologramMaterial() {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    uniforms: {
      uColor: { value: new Color().copy(C.holo) },
      uOpacity: { value: 1 },
      uTime: { value: 0 },
      uMotion: { value: 1 },
      uFab: { value: 0 },
      uMinY: { value: 0 },
      uMaxY: { value: 1 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      varying float vLocalY;
      uniform float uMinY;
      uniform float uMaxY;
      void main() {
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - w.xyz);
        vLocalY = (position.y - uMinY) / max(0.0001, uMaxY - uMinY);
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      uniform float uMotion;
      uniform float uFab;
      varying vec3 vWorld;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      varying float vLocalY;
      void main() {
        // Above the fabricated height only: the metal takes over below.
        if (vLocalY < uFab - 0.002) discard;
        float rim = pow(max(1.0 - abs(dot(normalize(vNormalW), normalize(vViewDir))), 1e-4), 2.2);
        float lines = smoothstep(0.55, 1.0, sin((vWorld.y * 140.0) - uTime * 2.0 * uMotion) * 0.5 + 0.5);
        float flicker = mix(1.0, 0.86 + 0.14 * sin(uTime * 23.0 + vWorld.y * 3.0) * sin(uTime * 7.3), uMotion);
        float band = uFab > 0.0 && uFab < 1.0 ? smoothstep(0.06, 0.0, abs(vLocalY - uFab - 0.02)) : 0.0;
        float a = (0.05 + rim * 0.55 + lines * 0.07 + band * 0.6) * flicker * uOpacity;
        gl_FragColor = vec4(uColor * a, a);
      }
    `,
  });
}

export type HologramMaterial = ReturnType<typeof createHologramMaterial>;
