import { DoubleSide, MeshPhysicalMaterial, type MeshPhysicalMaterialParameters } from 'three';
import { C } from '../palette';

export type FabUniforms = {
  uFab: { value: number };
  uMinY: { value: number };
  uMaxY: { value: number };
  uHeat: { value: number };
  uPulse: { value: number };
};

/**
 * Metal that is fabricated into its hologram: fragments above uFab (0..1 of the part's own
 * height) are discarded, with a thin HDR Molten weld line at the boundary. uPulse adds the
 * power-on glow.
 */
export function createFabricateMaterial(params: MeshPhysicalMaterialParameters) {
  const uniforms: FabUniforms = {
    uFab: { value: 1 },
    uMinY: { value: 0 },
    uMaxY: { value: 1 },
    uHeat: { value: 0 },
    uPulse: { value: 0 },
  };
  const m = new MeshPhysicalMaterial({ side: DoubleSide, ...params });
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uMinY;
        uniform float uMaxY;
        varying float vFabY;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vFabY = (position.y - uMinY) / max(0.0001, uMaxY - uMinY);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uFab;
        uniform float uHeat;
        uniform float uPulse;
        varying float vFabY;`,
      )
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        if (vFabY > uFab + 0.0001) discard;`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float edge = uFab < 0.999 ? smoothstep(0.035, 0.0, uFab - vFabY) : 0.0;
        totalEmissiveRadiance += vec3(${C.molten.r.toFixed(3)}, ${C.molten.g.toFixed(3)}, ${C.molten.b.toFixed(3)}) * (edge * 6.0 + uHeat);
        totalEmissiveRadiance += vec3(${C.molten.r.toFixed(3)}, ${C.molten.g.toFixed(3)}, ${C.molten.b.toFixed(3)}) * uPulse * 0.12;`,
      );
  };
  m.customProgramCacheKey = () => 'fabricate';
  return { material: m, uniforms };
}
