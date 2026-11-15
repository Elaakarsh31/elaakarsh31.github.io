import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial, Vector3 } from 'three';
import { C } from './palette';

const MAX = 260;

/**
 * Weld sparks: a small CPU particle system. HDR colors, so they bloom. Emission is driven by
 * the build (only while the bot is welding) and stops entirely with reduced motion.
 */
export function createSparks() {
  const geo = new BufferGeometry();
  const pos = new Float32Array(MAX * 3);
  const life = new Float32Array(MAX);
  const vel = new Float32Array(MAX * 3);
  const maxLife = new Float32Array(MAX);
  geo.setAttribute('position', new BufferAttribute(pos, 3));
  geo.setAttribute('aLife', new BufferAttribute(life, 1));
  const mat = new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uScale: { value: 1 }, uHot: { value: C.molten.clone() } },
    vertexShader: /* glsl */ `
      attribute float aLife;
      varying float vLife;
      uniform float uScale;
      void main() {
        vLife = aLife;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aLife <= 0.0 ? 0.0 : (2.0 + 5.0 * aLife) * uScale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying float vLife;
      uniform vec3 uHot;
      void main() {
        vec2 c = gl_PointCoord - 0.5;
        float d = dot(c, c);
        if (d > 0.25 || vLife <= 0.0) discard;
        float soft = smoothstep(0.25, 0.0, d);
        vec3 col = mix(uHot * 3.0, vec3(1.0, 0.86, 0.62) * 9.0, vLife * vLife);
        gl_FragColor = vec4(col * soft, soft);
      }`,
  });
  const points = new Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 8;

  let cursor = 0;
  let carry = 0;
  const tmp = new Vector3();

  function emit(origin: Vector3, rate: number, dt: number, normal?: Vector3) {
    carry += rate * dt;
    while (carry >= 1) {
      carry -= 1;
      const i = cursor;
      cursor = (cursor + 1) % MAX;
      pos[i * 3] = origin.x;
      pos[i * 3 + 1] = origin.y;
      pos[i * 3 + 2] = origin.z;
      tmp.set((Math.random() - 0.5) * 2, Math.random() * 1.4 + 0.2, (Math.random() - 0.5) * 2).normalize();
      if (normal) tmp.addScaledVector(normal, 0.8).normalize();
      const speed = 0.6 + Math.random() * 1.6;
      vel[i * 3] = tmp.x * speed;
      vel[i * 3 + 1] = tmp.y * speed;
      vel[i * 3 + 2] = tmp.z * speed;
      maxLife[i] = 0.35 + Math.random() * 0.55;
      life[i] = 1;
    }
  }

  function update(dt: number) {
    let alive = false;
    for (let i = 0; i < MAX; i++) {
      if (life[i] <= 0) continue;
      alive = true;
      life[i] -= dt / maxLife[i];
      vel[i * 3 + 1] -= 4.2 * dt;
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < 0.003) {
        pos[i * 3 + 1] = 0.003;
        vel[i * 3 + 1] *= -0.3;
        vel[i * 3] *= 0.55;
        vel[i * 3 + 2] *= 0.55;
      }
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.aLife.needsUpdate = true;
    points.visible = alive;
  }

  function clear() {
    life.fill(0);
    geo.attributes.aLife.needsUpdate = true;
    points.visible = false;
  }

  return {
    points,
    emit,
    update,
    clear,
    setScale(px: number) {
      mat.uniforms.uScale.value = px;
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
