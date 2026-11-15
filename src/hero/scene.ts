// Three.js scene for the hero: one Points object, one ShaderMaterial, GPU-driven animation.
// Per frame only uniforms and the camera change; particle buffers are written once.

import * as THREE from 'three';
import vertexShader from './shaders/particles.vert.glsl?raw';
import fragmentShader from './shaders/particles.frag.glsl?raw';
import { buildBust, type PointCloud } from './bust';
import { HERO } from './config';
import { createRng } from './rng';

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  /** Element whose size the canvas follows (the sticky stage). */
  stage: HTMLElement;
  /** Called after the first frame has been drawn. */
  onReady: () => void;
  /** Called if WebGL fails or the context is lost. */
  onFail: (reason: string) => void;
};

export type SceneHandle = { dispose: () => void };

const FOV = 26;

function dispersedTargets(cloud: PointCloud) {
  const rng = createRng(HERO.seed ^ 0x9e3779b9);
  const out = new Float32Array(cloud.count * 3);
  const cy = (cloud.min[1] + cloud.max[1]) * 0.5;
  for (let p = 0; p < cloud.count; p++) {
    // Push each point outward from the bust's axis, then scatter it in a loose shell.
    const u = rng() * 2 - 1;
    const phi = rng() * Math.PI * 2;
    const s = Math.sqrt(1 - u * u);
    const r = 0.8 + 2.6 * Math.pow(rng(), 0.7);
    const x = cloud.positions[p * 3];
    const y = cloud.positions[p * 3 + 1];
    const z = cloud.positions[p * 3 + 2];
    out[p * 3] = x * 1.7 + s * Math.cos(phi) * r * 1.5;
    out[p * 3 + 1] = cy + (y - cy) * 1.4 + u * r * 0.9 + 0.4;
    out[p * 3 + 2] = z * 1.7 + s * Math.sin(phi) * r * 0.9;
  }
  return out;
}

function buildGeometry(cloud: PointCloud) {
  const geo = new THREE.BufferGeometry();
  const rng = createRng(HERO.seed + 7);
  const seeds = new Float32Array(cloud.count);
  for (let p = 0; p < cloud.count; p++) seeds[p] = rng();
  geo.setAttribute('position', new THREE.BufferAttribute(cloud.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(cloud.normals, 3));
  geo.setAttribute('aDispersed', new THREE.BufferAttribute(dispersedTargets(cloud), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  geo.setAttribute('aLum', new THREE.BufferAttribute(cloud.lum, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 8);
  return geo;
}

export function createScene(opts: SceneOptions): SceneHandle {
  const { canvas, stage } = opts;
  const isMobile = window.innerWidth <= HERO.mobileMaxWidth;
  const count = isMobile ? HERO.points.mobile : HERO.points.desktop;
  const dprCap = isMobile ? HERO.dprCap.mobile : HERO.dprCap.desktop;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor(0x000000, 0);
  renderer.autoClear = false;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, dprCap));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.1, 60);

  const uniforms = {
    uTime: { value: 0 },
    uProgress: { value: 0 },
    uSize: { value: isMobile ? 0.021 : 0.0128 },
    uOccScale: { value: 2.6 * Math.sqrt(HERO.points.desktop / count) },
    uScale: { value: 1 },
    uOpacity: { value: 1 },
    uLightDir: { value: new THREE.Vector3(-0.5, 0.45, 0.74).normalize() },
  };
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
  });
  // Same shader, compiled as the dark silhouette pass.
  const occluder = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    defines: { OCCLUDER: '' },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.NormalBlending,
  });

  const cloud = buildBust(count, !isMobile);
  canvas.dataset.info = cloud.info;
  let geometry = buildGeometry(cloud);
  const points = new THREE.Points(geometry, material);
  points.rotation.y = HERO.baseYaw;
  points.frustumCulled = false;
  scene.add(points);

  // Framing: keep the head prominent, let the shoulders crop on narrow screens.
  const bustH = cloud.max[1] - cloud.min[1];
  const lookAt = new THREE.Vector3(0, cloud.min[1] + bustH * 0.6, 0);
  function frame(width: number, height: number) {
    const aspect = width / height;
    camera.aspect = aspect;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const byHeight = (bustH * 0.98) / 2 / tanHalf;
    const byWidth = 1.75 / 2 / (tanHalf * aspect); // head plus a little shoulder
    const narrow = aspect < 0.85;
    const dist = narrow ? Math.max(byHeight, byWidth) : byHeight;
    // On tall screens, sit the bust lower so the greeting above it stays readable.
    const target = narrow ? lookAt.clone().setY(lookAt.y + 0.2) : lookAt;
    camera.position.set(0, target.y + 0.02, dist);
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    uniforms.uScale.value = (height * renderer.getPixelRatio()) / (2 * tanHalf);
  }

  function resize() {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    frame(w, h);
  }
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(stage);

  // Optional GLB portrait, known at build time so a missing file never causes a request.
  let disposed = false;
  if (__HAS_MODEL__) {
    import('./glb')
      .then(({ loadGlbCloud }) => loadGlbCloud(`${import.meta.env.BASE_URL}models/portrait.glb`, count))
      .then((glbCloud) => {
        if (!glbCloud || disposed) return;
        canvas.dataset.info = glbCloud.info;
        const next = buildGeometry(glbCloud);
        points.geometry = next;
        geometry.dispose();
        geometry = next;
      })
      .catch((err) => console.warn('[portrait] could not load portrait.glb, using the procedural bust.', err));
  }

  // Scroll progress through the hero section, read from layout each frame (no scroll
  // listeners, no React state). 0 = top of the page, 1 = the Work section entering the viewport.
  const hero = (stage.closest('.hero') as HTMLElement | null) ?? stage;
  function readProgress() {
    const rect = hero.getBoundingClientRect();
    const travel = rect.height - window.innerHeight;
    if (travel <= 1) return rect.top < 0 ? Math.min(1, -rect.top / window.innerHeight) : 0;
    return Math.min(1, Math.max(0, -rect.top / travel));
  }
  let progress = readProgress();

  const clock = new THREE.Clock();
  let last = 0;
  let raf = 0;
  let readySent = false;
  function tick() {
    raf = requestAnimationFrame(tick);
    const now = clock.getElapsedTime();
    const dt = Math.min(0.1, now - last);
    last = now;
    uniforms.uTime.value = now;

    // Ease toward the scroll position so fast scrolls and anchor jumps still animate smoothly.
    const target = readProgress();
    progress += (target - progress) * (1 - Math.exp(-dt * 7));
    if (Math.abs(target - progress) < 1e-4) progress = target;
    uniforms.uProgress.value = progress;
    // A gentle turn toward the viewer, then away as it dissolves.
    const turn = Math.sin(Math.min(progress / 0.7, 1) * Math.PI * 0.5);
    points.rotation.y = HERO.baseYaw + turn * 0.75;
    points.rotation.x = progress * 0.08;
    renderer.clear();
    points.material = occluder;
    renderer.render(scene, camera);
    points.material = material;
    renderer.render(scene, camera);
    if (!readySent) {
      readySent = true;
      opts.onReady();
    }
  }
  raf = requestAnimationFrame(tick);

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      geometry.dispose();
      material.dispose();
      occluder.dispose();
      renderer.dispose();
    },
  };
}
