import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  Color,
  DoubleSide,
  EdgesGeometry,
  Euler,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  TorusGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createRng } from '../../lib/rng';
import { BLOCK, FRAGMENTS, REFINERY, RING_R, blockJoinPoint, blockLiftWindow, blockSlot, bump, easeInOut, fragWindow, fragmentsIn, seg } from '../choreo';
import { brushedRoughness } from '../materials/brushed';
import { C } from '../palette';
import { CARD_KINDS, drawCard } from './cards';

const ENTRY = REFINERY.clone().add(new Vector3(-0.42, 0, 0));
const EXIT = REFINERY.clone().add(new Vector3(0.42, 0, 0));
const ALIGNED = new Quaternion().setFromEuler(new Euler(0, Math.PI / 2, 0)); // card face toward +x

export type DataHandles = ReturnType<typeof buildData>;

/** Act 1: the refinery gate, twelve raw fragments, and the clean blocks they become. */
export function buildData() {
  const root = new Group();
  root.name = 'data';
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);
  const rng = createRng(1234);

  // --- Refinery gate ---------------------------------------------------------------------------
  const gate = new Group();
  gate.position.copy(REFINERY);
  root.add(gate);
  const rough = track(brushedRoughness(41));
  const ti = track(new MeshPhysicalMaterial({ color: '#b3b9c2', metalness: 1, roughness: 0.5, roughnessMap: rough }));
  const dark = track(new MeshPhysicalMaterial({ color: '#3b3f46', metalness: 1, roughness: 0.6, roughnessMap: rough }));
  const ring = new Mesh(track(new TorusGeometry(RING_R, 0.024, 20, 120)), ti);
  ring.rotation.y = Math.PI / 2;
  ring.castShadow = true;
  gate.add(ring);
  const ring2 = new Mesh(track(new TorusGeometry(RING_R + 0.045, 0.008, 12, 120)), dark);
  ring2.rotation.y = Math.PI / 2;
  gate.add(ring2);
  const holoRingMat = track(new MeshBasicMaterial({ color: C.holo.clone().multiplyScalar(0.8), transparent: true, opacity: 0.8, blending: AdditiveBlending, depthWrite: false }));
  const holoRing = new Mesh(track(new TorusGeometry(RING_R - 0.05, 0.0035, 8, 120)), holoRingMat);
  holoRing.rotation.y = Math.PI / 2;
  gate.add(holoRing);
  // Tick marks around the gate.
  const tickGeo = track(new BoxGeometry(0.004, 0.028, 0.006));
  const tickMat = track(new MeshBasicMaterial({ color: C.holo.clone().multiplyScalar(0.7), transparent: true, blending: AdditiveBlending, depthWrite: false }));
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const t = new Mesh(tickGeo, tickMat);
    const r = RING_R + 0.085 + (i % 5 === 0 ? 0.01 : 0);
    t.position.set(0, Math.cos(a) * r, Math.sin(a) * r);
    t.rotation.x = -a;
    t.scale.y = i % 5 === 0 ? 1.6 : 1;
    gate.add(t);
  }
  // Scan plane inside the ring.
  const scanMat = track(
    new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      side: DoubleSide,
      uniforms: { uTime: { value: 0 }, uOn: { value: 0 }, uFlash: { value: 0 }, uColor: { value: C.holo.clone() } },
      vertexShader: /* glsl */ `
        varying vec2 vP;
        void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform float uOn; uniform float uFlash; uniform vec3 uColor;
        varying vec2 vP;
        void main() {
          float r = length(vP) / ${(RING_R - 0.03).toFixed(3)};
          float sweep = smoothstep(0.03, 0.0, abs(fract(uTime * 0.45) * 2.0 - 1.0 - vP.y / ${(RING_R - 0.03).toFixed(3)}));
          float lines = step(0.5, fract(vP.y * 90.0)) * 0.25;
          float a = (0.05 + lines * 0.08 + sweep * 0.35) * uOn + uFlash * 0.55 * (1.0 - r * 0.6);
          a *= smoothstep(1.0, 0.94, r);
          gl_FragColor = vec4(uColor * a, a);
        }`,
    }),
  );
  const scan = new Mesh(track(new CircleGeometry(RING_R - 0.03, 64)), scanMat);
  scan.rotation.y = Math.PI / 2;
  scan.renderOrder = 4;
  gate.add(scan);
  // Two feet and a base plate.
  const legGeo = track(new RoundedBoxGeometry(0.05, REFINERY.y - RING_R + 0.02, 0.05, 2, 0.01));
  for (const z of [-0.2, 0.2]) {
    const leg = new Mesh(legGeo, dark);
    leg.position.set(0, -(RING_R + (REFINERY.y - RING_R + 0.02) / 2) + 0.02, z);
    leg.castShadow = true;
    gate.add(leg);
  }
  const foot = new Mesh(track(new RoundedBoxGeometry(0.22, 0.03, 0.62, 2, 0.01)), dark);
  foot.position.set(0, -REFINERY.y + 0.015, 0);
  foot.receiveShadow = true;
  gate.add(foot);
  const refineryAnchor = new Object3D();
  refineryAnchor.position.set(0, RING_R + 0.1, 0.05);
  gate.add(refineryAnchor);

  // --- Items: a fragment card that becomes a clean block ---------------------------------------
  const cardGeo = track(new PlaneGeometry(0.26, 0.17));
  const blockGeo = track(new RoundedBoxGeometry(BLOCK, BLOCK, BLOCK, 3, 0.014));
  const blockMat = track(new MeshPhysicalMaterial({ color: '#cdd2da', metalness: 1, roughness: 0.42, roughnessMap: rough }));
  const blockEdgeGeo = track(new EdgesGeometry(new BoxGeometry(BLOCK + 0.004, BLOCK + 0.004, BLOCK + 0.004)));
  const blockEdgeMat = track(new LineBasicMaterial({ color: C.holo, transparent: true, opacity: 0.35, blending: AdditiveBlending, depthWrite: false }));

  const items = Array.from({ length: FRAGMENTS }, (_, j) => {
    const kind = CARD_KINDS[j % 4];
    const tex = track(drawCard(kind, 100 + j));
    const mat = track(
      new MeshStandardMaterial({
        map: tex,
        roughness: 0.65,
        metalness: 0,
        emissive: new Color('#ffffff'),
        emissiveMap: tex,
        emissiveIntensity: 0.62,
        transparent: true,
        alphaTest: 0.4,
        side: DoubleSide,
      }),
    );
    const group = new Group();
    const card = new Group();
    const face = new Mesh(cardGeo, mat);
    face.castShadow = true;
    card.add(face);
    const block = new Group();
    const bm = new Mesh(blockGeo, blockMat);
    bm.castShadow = bm.receiveShadow = true;
    block.add(bm, new LineSegments(blockEdgeGeo, blockEdgeMat));
    group.add(card, block);
    root.add(group);
    // Messy starting arrangement left of the gate.
    const scatter = new Vector3(-3.42 + rng() * 0.78, 0.32 + rng() * 0.95, -0.35 + rng() * 1.35);
    const enter = scatter.clone().add(new Vector3(-2.2 - rng(), 0.6 + rng() * 0.5, -0.4));
    // Mostly facing the camera, tilted and turning slowly, so the faces read.
    const baseRot = new Euler((rng() - 0.5) * 0.9, (rng() - 0.5) * 1.1, (rng() - 0.5) * 1.3);
    const spin = new Vector3((rng() - 0.5) * 0.35, (rng() - 0.5) * 0.45, (rng() - 0.5) * 0.4);
    const phase = rng() * 10;
    return { j, kind, group, card, block, scatter, enter, baseRot, spin, phase, slot: blockSlot(j) };
  });

  const tmpQ = new Quaternion();
  const tumble = new Euler();
  const pos = new Vector3();
  const join = new Vector3();
  const idQ = new Quaternion();

  function update(p: number, t: number, motion: boolean, highlightData: boolean) {
    const time = motion ? t : 0;
    const inK = fragmentsIn(p);
    let flash = 0;
    for (const it of items) {
      const [t0, t1] = fragWindow(it.j);
      const u = seg(p, t0, t1);
      // Tumbling, drifting position before the crossing.
      tumble.set(
        it.baseRot.x + it.spin.x * (time + p * 0.03),
        it.baseRot.y + it.spin.y * (time + p * 0.03),
        it.baseRot.z + it.spin.z * (time + p * 0.03),
      );
      pos.copy(it.enter).lerp(it.scatter, inK);
      pos.x += Math.sin(time * 0.6 + it.phase) * 0.04;
      pos.y += Math.sin(time * 0.8 + it.phase * 1.3) * 0.05;
      pos.z += Math.cos(time * 0.5 + it.phase) * 0.04;
      it.group.visible = inK > 0.001;
      let cardScale = 1;
      let blockScale = 0;
      if (u <= 0) {
        it.group.quaternion.setFromEuler(tumble);
        it.group.position.copy(pos);
      } else if (u < 0.45) {
        const k = easeInOut(u / 0.45);
        it.group.position.copy(pos).lerp(ENTRY, k);
        tmpQ.setFromEuler(tumble).slerp(ALIGNED, k);
        it.group.quaternion.copy(tmpQ);
      } else if (u < 0.62) {
        const k = (u - 0.45) / 0.17;
        it.group.position.copy(ENTRY).lerp(EXIT, k);
        it.group.quaternion.copy(ALIGNED).slerp(idQ, seg(k, 0.5, 1));
        cardScale = 1 - seg(k, 0.25, 0.55);
        blockScale = seg(k, 0.4, 0.75);
        flash = Math.max(flash, bump(k, 0.15, 0.4, 0.8));
      } else {
        const k = easeInOut((u - 0.62) / 0.38);
        it.group.position.copy(EXIT).lerp(it.slot, k);
        it.group.position.y += Math.sin(Math.PI * k) * 0.35;
        it.group.quaternion.identity();
        cardScale = 0;
        blockScale = 1;
      }
      // Act 2: the block lifts into its layer and is absorbed.
      const [l0, l1] = blockLiftWindow(it.j);
      const v = seg(p, l0, l1);
      if (v > 0) {
        blockJoinPoint(it.j, join);
        const k = easeInOut(v);
        it.group.position.copy(it.slot).lerp(join, k);
        it.group.position.y += Math.sin(Math.PI * k) * 0.5;
        blockScale = 1 - seg(v, 0.82, 1);
        cardScale = 0;
      }
      it.card.visible = cardScale > 0.001;
      it.card.scale.setScalar(Math.max(0.001, cardScale));
      it.block.visible = blockScale > 0.001;
      it.block.scale.setScalar(Math.max(0.001, blockScale));
    }
    // The gate rises out of the bench as the hero clears, powers up for Act 1, and idles after.
    const rise = easeInOut(seg(p, 8, 40)) * (1 - easeInOut(seg(p, 148, 172)));
    gate.position.y = REFINERY.y - (1 - rise) * 1.25;
    gate.visible = rise > 0.001;
    const on = seg(p, 30, 50) * (1 - 0.7 * seg(p, 135, 160)) + (highlightData ? 0.8 : 0);
    scanMat.uniforms.uOn.value = on;
    scanMat.uniforms.uFlash.value = flash;
    scanMat.uniforms.uTime.value = time;
    holoRingMat.opacity = 0.35 + 0.6 * Math.min(1, on) + flash * 0.5;
    blockEdgeMat.opacity = 0.35 + (highlightData ? 0.4 : 0);
  }

  const anchors: Record<string, Object3D> = {
    refinery: refineryAnchor,
    'frag-post': items[0].group,
    'frag-listing': items[3].group,
  };

  /** Current world position of item j (fragment or block). */
  const itemPosition = (j: number, out: Vector3) => out.copy(items[j].group.position);

  return {
    root,
    anchors,
    update,
    itemPosition,
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}
