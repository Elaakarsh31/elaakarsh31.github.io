import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Material,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  Object3D,
  ShaderMaterial,
  Texture,
  TorusGeometry,
} from 'three';
import { createRng } from '../../lib/rng';
import {
  blueprint,
  coreSpin,
  crownFab,
  crownLift,
  explode,
  filaments,
  layerFab,
  layerLift,
  plateOut,
  plateState,
  power,
  powered,
  seamHeat,
} from '../choreo';
import { brushedRoughness } from '../materials/brushed';
import { createFabricateMaterial, type FabUniforms } from '../materials/fabricate';
import { createHologramMaterial, type HologramMaterial } from '../materials/hologram';
import { C } from '../palette';
import {
  CORE_R,
  CROWN_PROFILE,
  CROWN_Y,
  LAYERS,
  LAYER_GAP,
  LAYER_H,
  LAYER_PROFILE,
  PLATES,
  PLATE_R0,
  PLATE_R1,
  SPINE_TOP,
  baseGeometry,
  crownGeometry,
  layerGeometry,
  layerY,
  plateGeometry,
  spineGeometry,
} from './parts';
import { edgesOf, latheWire } from './wire';

const deg = Math.PI / 180;
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** A part that exists first as a hologram and is then fabricated in metal. */
type HoloPart = {
  group: Group;
  metal: Mesh;
  fab: FabUniforms;
  ghost: Mesh<BufferGeometry, HologramMaterial>;
  wire: LineSegments<BufferGeometry, LineBasicMaterial>;
};

function wireMaterial() {
  return new LineBasicMaterial({
    color: C.holo,
    transparent: true,
    opacity: 0.6,
    blending: AdditiveBlending,
    depthWrite: false,
  });
}

function holoPart(geometry: BufferGeometry, wire: BufferGeometry, metalParams: ConstructorParameters<typeof MeshPhysicalMaterial>[0]): HoloPart {
  geometry.computeBoundingBox();
  const bb = geometry.boundingBox!;
  const { material, uniforms } = createFabricateMaterial(metalParams ?? {});
  uniforms.uMinY.value = bb.min.y;
  uniforms.uMaxY.value = bb.max.y;
  const metal = new Mesh(geometry, material);
  metal.castShadow = true;
  metal.receiveShadow = true;
  const ghostMat = createHologramMaterial();
  ghostMat.uniforms.uMinY.value = bb.min.y;
  ghostMat.uniforms.uMaxY.value = bb.max.y;
  const ghost = new Mesh(geometry, ghostMat);
  ghost.renderOrder = 2;
  const lines = new LineSegments(wire, wireMaterial());
  lines.renderOrder = 3;
  const group = new Group();
  group.add(metal, ghost, lines);
  return { group, metal, fab: uniforms, ghost, wire: lines };
}

/** Light running along a plate's edges when it locks: a band travelling down the plate. */
function flashMaterial(h: number) {
  return new ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: { uFlash: { value: 0 }, uH: { value: h } },
    vertexShader: /* glsl */ `
      varying float vY;
      void main() {
        vY = position.y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform float uFlash;
      uniform float uH;
      varying float vY;
      void main() {
        float travel = (1.0 - uFlash) * uH * 1.2;
        float band = smoothstep(0.18, 0.0, abs(vY - (uH - travel)));
        float a = uFlash * (0.35 + band);
        gl_FragColor = vec4(vec3(0.85, 0.95, 1.0) * a * 1.4, a);
      }`,
  });
}

export type MachineHandles = ReturnType<typeof buildMachine>;

export function buildMachine() {
  const root = new Group();
  root.name = 'machine';
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const rough = track(brushedRoughness(11));
  rough.repeat.set(3, 1);
  const roughFlat = track(brushedRoughness(5, 160, 40));

  const titanium = (color = '#b9bec7', r = 0.52, tex: Texture = rough) => ({
    color: new Color(color),
    metalness: 1,
    roughness: r,
    roughnessMap: tex,
    envMapIntensity: 1,
  });

  // --- Frame: base and spine, metal from the start ---------------------------------------------
  const baseMat = track(new MeshPhysicalMaterial({ ...titanium('#5d626b', 0.7) }));
  const base = new Mesh(track(baseGeometry()), baseMat);
  base.castShadow = base.receiveShadow = true;
  root.add(base);

  // Bolt heads around the base's top step.
  const boltGeo = track(new CylinderGeometry(0.022, 0.024, 0.018, 6));
  const boltMat = track(new MeshPhysicalMaterial({ ...titanium('#9da3ad', 0.5) }));
  const bolts = new InstancedMesh(boltGeo, boltMat, 12);
  const dummy = new Object3D();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.PI / 12;
    dummy.position.set(Math.sin(a) * 0.79, 0.192, Math.cos(a) * 0.79);
    dummy.rotation.set(0, a, 0);
    dummy.updateMatrix();
    bolts.setMatrixAt(i, dummy.matrix);
  }
  bolts.castShadow = true;
  root.add(bolts);

  const spineMat = track(new MeshPhysicalMaterial({ ...titanium('#7d838c', 0.78, roughFlat) }));
  const spine = new Mesh(track(spineGeometry()), spineMat);
  spine.castShadow = true;
  root.add(spine);
  const cap = new Mesh(track(new CylinderGeometry(0.075, 0.11, 0.07, 48)), spineMat);
  cap.position.y = SPINE_TOP + 0.035;
  root.add(cap);

  // Seam materials: cold gunmetal, glowing Molten when hot (HDR, so it blooms).
  const seamColor = (m: MeshBasicMaterial, heat: number, pulse: number) => {
    const cold = 0.05;
    const k = heat * heat * 7 + pulse * 2.2;
    m.color.setRGB(cold + C.molten.r * k, cold + C.molten.g * k + heat * heat * 0.6, cold + C.molten.b * k + heat * 0.15);
  };
  const seamMat = () => track(new MeshBasicMaterial({ color: '#111', toneMapped: false }));

  const baseSeamMat = seamMat();
  const baseSeam = new Mesh(track(new TorusGeometry(0.884, 0.0065, 8, 160)), baseSeamMat);
  baseSeam.rotation.x = Math.PI / 2;
  baseSeam.position.y = 0.095;
  root.add(baseSeam);

  // --- Core layers -----------------------------------------------------------------------------
  const core = new Group();
  root.add(core);
  const layerWire = track(latheWire(LAYER_PROFILE, 16));
  const layers = Array.from({ length: LAYERS }, (_, i) => {
    const geo = track(layerGeometry(i % 2 ? 10 : 8));
    const part = holoPart(geo, layerWire, {
      ...titanium(['#8a9099', '#949aa3', '#8a9099', '#979da6'][i], 0.66),
    });
    track(part.metal.material as Material);
    track(part.ghost.material);
    track(part.wire.material);
    const seamM = seamMat();
    const seam = new Mesh(track(new TorusGeometry(CORE_R - 0.012, 0.0075, 8, 160)), seamM);
    seam.rotation.x = Math.PI / 2;
    seam.position.y = LAYER_H + LAYER_GAP / 2;
    part.group.add(seam);
    // Anchor on the front right of the layer, at mid height.
    const anchor = new Object3D();
    anchor.position.set(Math.sin(38 * deg) * (CORE_R + 0.03), LAYER_H / 2, Math.cos(38 * deg) * (CORE_R + 0.03));
    part.group.add(anchor);
    core.add(part.group);
    return { ...part, seam, seamM, anchor };
  });

  // Filaments: thin Ice zig-zags hopping across the seams, flickering as the core spins up.
  const filamentGeo = new BufferGeometry();
  {
    const rng = createRng(21);
    const pos: number[] = [];
    const phase: number[] = [];
    for (let k = 0; k < LAYERS - 1; k++) {
      const yMid = layerY(k) + LAYER_H + LAYER_GAP / 2;
      for (let f = 0; f < 14; f++) {
        const a0 = rng() * Math.PI * 2;
        const ph = rng() * 100;
        let prev: [number, number, number] | null = null;
        const n = 5;
        for (let s = 0; s <= n; s++) {
          const t = s / n;
          const a = a0 + (rng() - 0.5) * 0.08;
          const r = CORE_R + 0.035 + (rng() - 0.3) * 0.02;
          const y = yMid + (t - 0.5) * 0.2 + (rng() - 0.5) * 0.02;
          const pt: [number, number, number] = [Math.sin(a) * r, y, Math.cos(a) * r];
          if (prev) {
            pos.push(...prev, ...pt);
            phase.push(ph, ph);
          }
          prev = pt;
        }
      }
    }
    filamentGeo.setAttribute('position', new Float32BufferAttribute(pos, 3));
    filamentGeo.setAttribute('phase', new Float32BufferAttribute(phase, 1));
  }
  track(filamentGeo);
  const filamentMat = track(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: { uOn: { value: 0 }, uTime: { value: 0 }, uColor: { value: C.ice.clone().lerp(C.holo, 0.35) } },
      vertexShader: /* glsl */ `
        attribute float phase;
        varying float vPhase;
        void main() {
          vPhase = phase;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOn;
        uniform float uTime;
        uniform vec3 uColor;
        varying float vPhase;
        void main() {
          float f = step(0.62, fract(sin(floor(uTime * 14.0 + vPhase) * 12.9898 + vPhase) * 43758.5453));
          float a = uOn * f * 0.55;
          gl_FragColor = vec4(uColor * a, a);
        }`,
    }),
  );
  const filamentLines = new LineSegments(filamentGeo, filamentMat);
  filamentLines.renderOrder = 4;
  core.add(filamentLines);
  const filamentAnchor = new Object3D();
  filamentAnchor.position.set(Math.sin(-34 * deg) * (CORE_R + 0.04), layerY(2) - LAYER_GAP / 2, Math.cos(-34 * deg) * (CORE_R + 0.04));
  root.add(filamentAnchor);

  // --- Crown -----------------------------------------------------------------------------------
  const crown = holoPart(track(crownGeometry()), track(latheWire(CROWN_PROFILE, 16)), {
    ...titanium('#a1a7b0', 0.6),
  });
  track(crown.metal.material as Material);
  track(crown.ghost.material);
  track(crown.wire.material);
  root.add(crown.group);
  const crownSeamM = seamMat();
  const crownSeam = new Mesh(track(new TorusGeometry(0.49, 0.0065, 8, 140)), crownSeamM);
  crownSeam.rotation.x = Math.PI / 2;
  crownSeam.position.y = 0.135;
  crown.group.add(crownSeam);
  // Indicator bar: a row of small rectangular lamps across the crown's front.
  const lampGeo = track(new BoxGeometry(0.034, 0.02, 0.012));
  const lamps: { mesh: Mesh; mat: MeshBasicMaterial }[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (-24 + i * 6) * deg;
    const mat = track(new MeshBasicMaterial({ color: '#16181c', toneMapped: false }));
    const lamp = new Mesh(lampGeo, mat);
    lamp.position.set(Math.sin(a) * 0.503, 0.07, Math.cos(a) * 0.503);
    lamp.rotation.y = a;
    crown.group.add(lamp);
    lamps.push({ mesh: lamp, mat });
  }
  const crownAnchor = new Object3D();
  crownAnchor.position.set(Math.sin(-40 * deg) * 0.46, 0.22, Math.cos(-40 * deg) * 0.46);
  crown.group.add(crownAnchor);

  // --- Plates ----------------------------------------------------------------------------------
  const plateBoltGeo = track(new CylinderGeometry(0.014, 0.014, 0.012, 6));
  const plates = PLATES.map((spec, k) => {
    const geo = track(plateGeometry(spec));
    const h = spec.y1 - spec.y0;
    const theta = spec.angle * deg;
    const half = (spec.span / 2) * deg;
    const hingeSide = spec.angle >= 0 ? 1 : -1; // swing open away from the front
    const hingeA = hingeSide * half;
    const Rm = (PLATE_R0 + PLATE_R1) / 2;
    const hx = Math.sin(hingeA) * Rm;
    const hz = Math.cos(hingeA) * Rm;

    // Ghost at the assembled position.
    const ghostGroup = new Group();
    const ghostMat = track(createHologramMaterial());
    geo.computeBoundingBox();
    ghostMat.uniforms.uMinY.value = geo.boundingBox!.min.y;
    ghostMat.uniforms.uMaxY.value = geo.boundingBox!.max.y;
    const ghost = new Mesh(geo, ghostMat);
    ghost.renderOrder = 2;
    const wireGeo = track(edgesOf(geo, 20));
    const wire = new LineSegments(wireGeo, track(wireMaterial()));
    wire.renderOrder = 3;
    ghostGroup.add(ghost, wire);
    ghostGroup.rotation.y = theta;
    ghostGroup.position.y = spec.y0;
    root.add(ghostGroup);

    // Metal on a hinge pivot.
    const { material, uniforms } = createFabricateMaterial({ ...titanium('#c2c7cf', 0.48, roughFlat), envMapIntensity: 1.1 });
    track(material);
    uniforms.uMinY.value = geo.boundingBox!.min.y;
    uniforms.uMaxY.value = geo.boundingBox!.max.y;
    const metal = new Mesh(geo, material);
    metal.castShadow = metal.receiveShadow = true;
    metal.position.set(-hx, 0, -hz);
    const flash = new LineSegments(wireGeo, track(flashMaterial(h)));
    flash.renderOrder = 5;
    metal.add(flash);
    const anchor = new Object3D();
    anchor.position.set(0, h * 0.5, PLATE_R1 + 0.01);
    metal.add(anchor);
    // Hex bolt heads at the four corners: what the bot tightens when the plate locks.
    for (const [ba, by] of [
      [-half + 5 * deg, 0.045],
      [half - 5 * deg, 0.045],
      [-half + 5 * deg, h - 0.045],
      [half - 5 * deg, h - 0.045],
    ]) {
      const bolt = new Mesh(plateBoltGeo, boltMat);
      bolt.position.set(Math.sin(ba) * (PLATE_R1 + 0.006), by, Math.cos(ba) * (PLATE_R1 + 0.006));
      bolt.rotation.set(Math.PI / 2, 0, -ba, 'YXZ');
      bolt.rotation.order = 'YXZ';
      bolt.rotation.y = ba;
      bolt.rotation.x = Math.PI / 2;
      metal.add(bolt);
    }
    const pivot = new Group();
    pivot.add(metal);
    const pivotOuter = new Group(); // rotates to the plate's angle
    pivotOuter.rotation.y = theta;
    pivotOuter.position.y = spec.y0;
    pivot.position.set(hx, 0, hz);
    pivotOuter.add(pivot);
    root.add(pivotOuter);

    return { spec, k, theta, hingeSide, ghostGroup, ghost, ghostMat, wire, metal, fab: uniforms, flash, pivot, pivotOuter, anchor };
  });

  // Plate labels need a point that sits on the plate's face.
  const baseAnchor = new Object3D();
  baseAnchor.position.set(Math.sin(-30 * deg) * 0.9, 0.16, Math.cos(-30 * deg) * 0.9);
  root.add(baseAnchor);

  const anchors: Record<string, Object3D> = {
    filaments: filamentAnchor,
    crown: crownAnchor,
    base: baseAnchor,
  };
  layers.forEach((l, i) => (anchors[`layer-${i + 1}`] = l.anchor));
  plates.forEach((pl) => (anchors[`plate-${pl.spec.slug}`] = pl.anchor));

  // --- Interaction: hover a part to outline it, click to send a pulse up the seams ------------
  type Part = { kind: 'base' | 'layer' | 'crown' | 'plate'; index: number; anchor: string; label: string };
  let hover: Part | null = null;
  let pingAt = -10;
  let lastP = 0;
  let lastT = 0;

  /** Which part of the machine a point on its proxy cylinder (machine-local) falls on. */
  function pick(local: { x: number; y: number; z: number }): Part | null {
    const a = Math.atan2(local.x, local.z) / deg;
    const y = local.y;
    for (const pl of plates) {
      const st = plateState(pl.k, lastP);
      if (st.fab < 0.999) continue;
      const da = ((a - pl.spec.angle + 540) % 360) - 180;
      if (Math.abs(da) <= pl.spec.span / 2 && y >= pl.spec.y0 && y <= pl.spec.y1) {
        return { kind: 'plate', index: pl.k, anchor: `plate-${pl.spec.slug}`, label: pl.spec.name };
      }
    }
    if (y < 0.27) return { kind: 'base', index: 0, anchor: 'base', label: 'Base' };
    if (y >= crown.group.position.y - 0.01) return { kind: 'crown', index: 0, anchor: 'crown', label: 'Crown' };
    for (let i = LAYERS - 1; i >= 0; i--) {
      if (y >= layers[i].group.position.y - LAYER_GAP / 2) return { kind: 'layer', index: i, anchor: `layer-${i + 1}`, label: `Core layer ${i + 1} of ${LAYERS}` };
    }
    return null;
  }

  function setHover(part: Part | null) {
    hover = part;
  }

  /** A pulse of light runs base → crown and the core gives one quick turn. */
  function ping() {
    pingAt = lastT;
  }

  // --- Per-frame update ------------------------------------------------------------------------
  let pulseClock = 0;
  const HEIGHT = SPINE_TOP;

  function update(p: number, t: number, dt: number, motion: boolean, highlight: { chips: string[]; plates: string[] } | null) {
    lastP = p;
    lastT = t;
    const ex = explode(p);
    const bp = blueprint(p);
    // A click on the machine adds one smooth extra turn of the core.
    const sinceP = t - pingAt;
    const kick = sinceP >= 0 && sinceP < 1.2 ? easeInOutCubic(sinceP / 1.2) * Math.PI * 2 : 0;
    const pingWave = sinceP >= 0 && sinceP < 1.5 ? sinceP / 1.3 : -1;
    const pingGlow = sinceP >= 0 && sinceP < 0.9 ? 1 - sinceP / 0.9 : 0;
    const spin = coreSpin(p) + kick;
    const isPowered = powered(p);
    pulseClock = isPowered && motion ? pulseClock + dt : 0;
    // Wave front from the base (0) to past the crown (1.15). Scroll-driven once, then on a timer.
    const wave = isPowered && motion ? ((pulseClock * 0.32) % 1.5) - 0.1 : power(p) * 1.15;
    const pulseAt = (y: number) => {
      let v = 0;
      if (isPowered || power(p) > 0) {
        const d = y / HEIGHT - wave;
        v = Math.exp(-(d * d) / 0.006);
      }
      if (pingWave >= 0) {
        const d = y / HEIGHT - pingWave * 1.15;
        v = Math.max(v, Math.exp(-(d * d) / 0.004) * 1.2);
      }
      return v;
    };
    const hoverHolo = (m: MeshBasicMaterial) => m.color.copy(C.holo).multiplyScalar(1.15);
    const hlModel = highlight?.chips.includes('model') ?? false;
    const hlSystem = highlight?.chips.includes('system') ?? false;

    const hlData = highlight?.chips.includes('data') ?? false;
    if (hlData || hover?.kind === 'base') hoverHolo(baseSeamMat);
    else seamColor(baseSeamMat, 0, pulseAt(0.1));

    layers.forEach((L, i) => {
      L.group.position.y = layerY(i) + ex * layerLift(i);
      L.group.rotation.y = spin + ex * (i % 2 ? 0.24 : -0.18);
      const fab = layerFab(i, p);
      L.fab.uFab.value = fab;
      L.fab.uPulse.value = 0;
      L.metal.visible = fab > 0.001;
      const gm = L.ghost.material;
      gm.uniforms.uFab.value = fab;
      gm.uniforms.uTime.value = t;
      gm.uniforms.uMotion.value = motion ? 1 : 0;
      const hovered = hover?.kind === 'layer' && hover.index === i;
      gm.uniforms.uOpacity.value = (fab >= 0.999 ? (hlModel ? 0.5 : hovered ? 0.35 : 0) : bp) + pingGlow * 0.5;
      L.ghost.visible = gm.uniforms.uOpacity.value > 0.001;
      L.wire.material.opacity = fab >= 0.999 ? (hlModel ? 0.35 : hovered ? 0.6 : 0) : 0.5 * bp + (hovered ? 0.35 : 0);
      L.wire.visible = L.wire.material.opacity > 0.001;
      const heat = Math.max(seamHeat(i, p), 0);
      if (hovered && heat < 0.05) hoverHolo(L.seamM);
      else seamColor(L.seamM, heat, pulseAt(layerY(i) + LAYER_H));
      L.seam.visible = fab > 0.98 || heat > 0;
    });

    filamentLines.rotation.y = spin;
    filamentMat.uniforms.uOn.value = Math.max(motion ? filaments(p) : filaments(p) * 0.6, pingGlow * 0.8);
    filamentMat.uniforms.uTime.value = motion ? t : 0;
    filamentLines.visible = filamentMat.uniforms.uOn.value > 0.001;

    crown.group.position.y = CROWN_Y + ex * crownLift;
    crown.group.rotation.y = spin + ex * 0.3;
    const cf = crownFab(p);
    crown.fab.uFab.value = cf;
    crown.fab.uPulse.value = 0;
    crown.metal.visible = cf > 0.001;
    crown.ghost.material.uniforms.uFab.value = cf;
    crown.ghost.material.uniforms.uTime.value = t;
    crown.ghost.material.uniforms.uMotion.value = motion ? 1 : 0;
    const crownHover = hover?.kind === 'crown';
    crown.ghost.material.uniforms.uOpacity.value = (cf >= 0.999 ? (crownHover ? 0.35 : 0) : bp) + pingGlow * 0.5;
    crown.ghost.visible = crown.ghost.material.uniforms.uOpacity.value > 0.001;
    crown.wire.material.opacity = cf >= 0.999 ? (crownHover ? 0.6 : 0) : 0.5 * bp + (crownHover ? 0.35 : 0);
    if (crownHover) hoverHolo(crownSeamM);
    else seamColor(crownSeamM, 0, pulseAt(CROWN_Y + 0.13));
    const pw = power(p);
    lamps.forEach((l, i) => {
      const chase = isPowered && motion ? 0.55 + 0.45 * Math.max(0, Math.sin(t * 3 - i * 0.7)) : 1;
      const on = Math.min(1, Math.max(0, pw * 9 - i)) * chase;
      l.mat.color.setRGB(0.07 + C.molten.r * on * 2.2, 0.075 + C.molten.g * on * 2.2, 0.085 + C.molten.b * on * 2.2);
    });

    plates.forEach((pl) => {
      const st = plateState(pl.k, p);
      const out = ex * plateOut(pl.k);
      pl.ghostGroup.position.set(Math.sin(pl.theta) * out, pl.spec.y0 + ex * (0.06 + pl.k * 0.03), Math.cos(pl.theta) * out);
      pl.ghostGroup.rotation.y = pl.theta + ex * pl.hingeSide * 0.25;
      const hl = (hlSystem ? 0.6 : 0) + (highlight?.plates.includes(pl.spec.name) ? 0.6 : 0);
      const ghostOn = st.fab >= 0.999 ? Math.min(1, hl) : bp * (0.75 + 0.6 * st.ghost);
      pl.ghostMat.uniforms.uOpacity.value = ghostOn;
      pl.ghostMat.uniforms.uTime.value = t;
      pl.ghostMat.uniforms.uMotion.value = motion ? 1 : 0;
      pl.ghost.visible = ghostOn > 0.001;
      pl.wire.material.opacity = st.fab >= 0.999 ? Math.min(0.8, hl) : 0.55 * bp * (0.7 + 0.6 * st.ghost);
      pl.wire.visible = pl.wire.material.opacity > 0.001;

      // Metal swings in on its hinge and locks.
      const open = 1 - st.swing;
      pl.pivot.rotation.y = pl.hingeSide * open * 1.25;
      const pull = open * 0.35;
      pl.pivotOuter.position.set(Math.sin(pl.theta) * pull, pl.spec.y0 + open * 0.08, Math.cos(pl.theta) * pull);
      pl.fab.uFab.value = st.fab;
      pl.fab.uPulse.value = 0;
      pl.metal.visible = st.fab > 0.001;
      // The lock click, and the power-on pulse running along the plate's seams.
      const pulse = st.locked ? pulseAt((pl.spec.y0 + pl.spec.y1) / 2) * 0.7 : 0;
      const plateHover = hover?.kind === 'plate' && hover.index === pl.k ? 0.55 : 0;
      (pl.flash.material as ShaderMaterial).uniforms.uFlash.value = Math.max(st.flash, pulse, plateHover);
      pl.flash.visible = st.flash > 0.001 || pulse > 0.01 || plateHover > 0;
    });
  }

  /** Where the hero weld happens: on layer 0's fabrication line, front right. */
  function heroWeldPoint<T extends { x: number; y: number; z: number }>(p: number, out: T): T {
    const fab = layerFab(0, p);
    const a = 34 * deg + coreSpin(p) - 0.18 * explode(p);
    out.x = Math.sin(a) * (CORE_R + 0.01);
    out.y = layerY(0) + explode(p) * layerLift(0) + fab * LAYER_H;
    out.z = Math.cos(a) * (CORE_R + 0.01);
    return out;
  }

  /** Front point of the seam on top of layer k, for welding. */
  function seamPoint<T extends { x: number; y: number; z: number }>(k: number, p: number, out: T): T {
    const a = 30 * deg;
    out.x = Math.sin(a) * (CORE_R + 0.01);
    out.y = layerY(k) + explode(p) * layerLift(k) + LAYER_H + LAYER_GAP / 2;
    out.z = Math.cos(a) * (CORE_R + 0.01);
    return out;
  }

  /** Lock point on plate k's outer face. */
  function plateBoltPoint<T extends { x: number; y: number; z: number }>(k: number, out: T): T {
    const spec = PLATES[k];
    const a = (spec.angle + (spec.angle >= 0 ? -spec.span * 0.32 : spec.span * 0.32)) * deg;
    out.x = Math.sin(a) * (PLATE_R1 + 0.01);
    out.y = (spec.y0 + spec.y1) / 2;
    out.z = Math.cos(a) * (PLATE_R1 + 0.01);
    return out;
  }


  return {
    root,
    anchors,
    update,
    pick,
    setHover,
    ping,
    heroWeldPoint,
    seamPoint,
    plateBoltPoint,
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
