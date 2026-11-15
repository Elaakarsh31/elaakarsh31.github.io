import {
  AdditiveBlending,
  CanvasTexture,
  Sprite,
  SpriteMaterial,


  CapsuleGeometry,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  TorusGeometry,
  Vector2,
  Mesh,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { brushedRoughness, radialBrushed } from '../materials/brushed';
import { C } from '../palette';
import { createFace, roundedMask, type EyeState } from './face';
import { solveTwoBone } from './ik';

// The bot: a wide visor head on a short neck over a barrel torso. Body-local origin is the
// torso's centre; the head turns, tilts and nods on its own around the top of the neck.
export const HEAD = { a: 0.172, b: 0.104, c: 0.124, n: 4.2 };
export const LAYOUT = {
  /** Where the neck meets the head: the head's pivot. */
  neckTop: 0.1,
  /** Head centre above the neck pivot. */
  headUp: 0.098,
  shoulderX: 0.14,
  shoulderY: 0.03,
};

/** Unit sphere pushed onto |x/a|^n + |y/b|^n + |z/c|^n = 1. */
function superellipsoid(dims: { a: number; b: number; c: number; n: number }, seg = 64) {
  const g = new SphereGeometry(1, seg, Math.round(seg * 0.75));
  const pos = g.attributes.position;
  const v = new Vector3();
  const { a, b, c, n } = dims;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const r = Math.pow(Math.pow(Math.abs(v.x / a), n) + Math.pow(Math.abs(v.y / b), n) + Math.pow(Math.abs(v.z / c), n), -1 / n);
    v.multiplyScalar(r);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Height of the head's front surface at (x, y). */
function frontZ(x: number, y: number) {
  const { a, b, c, n } = HEAD;
  const k = 1 - Math.pow(Math.abs(x / a), n) - Math.pow(Math.abs(y / b), n);
  return k <= 0 ? 0 : c * Math.pow(k, 1 / n);
}

/** A plane bent onto the head's front, for the screen and its bezel. */
function frontPatch(w: number, h: number, cy: number, lift: number) {
  const g = new PlaneGeometry(w, h, 24, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i) + cy;
    pos.setXYZ(i, x, y, frontZ(x, y) + lift);
  }
  g.computeVertexNormals();
  return g;
}

export type ToolName = 'gripper' | 'welder';

export type ArmPose = {
  /** Hand target in the bot's local space. */
  target: Vector3;
  tool: ToolName;
  /** 0 = tool out, 1 = retracted (for swapping). */
  retract: number;
  /** Gripper opening, 0..1. */
  open: number;
  /** One finger raised, 0..1 (thumbs-up). */
  thumb: number;
  roll: number;
};

export type BotPose = {
  eyes: EyeState;
  /** Pixel icon shown when eyes === 'icon'. */
  icon: string;
  dx: number;
  dy: number;
  frame: number;
  led: 'work' | 'idle' | 'off';
  thruster: number;
  weld: number;
  left: ArmPose;
  right: ArmPose;
  /** Head rotation on the neck, radians. */
  head: { yaw: number; pitch: number; roll: number };
};

const Y = new Vector3(0, 1, 0);

/** Soft radial gradient for the thruster glow sprites. */
function radialGlow() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 26, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new CanvasTexture(c);
}

export function buildBot() {
  const root = new Group();
  root.name = 'bot';
  const body = new Group(); // leans and turns; root carries position
  root.add(body);
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T) => (disposables.push(x), x);

  const shellMat = track(
    new MeshPhysicalMaterial({
      color: '#33363d',
      metalness: 0.35,
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.3,
    }),
  );
  const ti = track(brushedRoughness(29, 150, 50));
  const titanium = track(
    new MeshPhysicalMaterial({ color: '#c3c8d0', metalness: 1, roughness: 0.5, roughnessMap: ti }),
  );
  const hubTex = track(radialBrushed(5));
  const hubMat = track(new MeshPhysicalMaterial({ color: '#c8cdd5', metalness: 1, roughness: 0.32, map: hubTex }));
  const jointMat = track(new MeshPhysicalMaterial({ color: '#1c1e22', metalness: 0.6, roughness: 0.4 }));
  const screwMat = track(new MeshPhysicalMaterial({ color: '#8e949d', metalness: 1, roughness: 0.35 }));

  // Torso: a turned barrel with a titanium chest plate, a belt ring and a rear vent.
  const torsoProfile: [number, number][] = [
    [0, -0.105],
    [0.06, -0.105],
    [0.094, -0.09],
    [0.112, -0.05],
    [0.118, 0],
    [0.112, 0.042],
    [0.09, 0.064],
    [0.05, 0.072],
    [0, 0.072],
  ];
  const torso = new Mesh(track(new LatheGeometry(torsoProfile.map(([r, y]) => new Vector2(r, y)), 56)), shellMat);
  torso.castShadow = true;
  body.add(torso);
  const shell = torso;
  const chest = new Mesh(track(new RoundedBoxGeometry(0.086, 0.062, 0.014, 3, 0.006)), titanium);
  chest.position.set(0, 0.004, 0.11);
  chest.castShadow = true;
  body.add(chest);
  const belt = new Mesh(track(new TorusGeometry(0.111, 0.0055, 8, 64)), titanium);
  belt.rotation.x = Math.PI / 2;
  belt.position.y = -0.05;
  body.add(belt);
  const ventGeo = track(new RoundedBoxGeometry(0.06, 0.006, 0.01, 2, 0.003));
  for (let i = 0; i < 3; i++) {
    const v = new Mesh(ventGeo, titanium);
    v.position.set(0, -0.02 + i * 0.016, -0.114);
    body.add(v);
  }
  // Status lamp on the chest plate: Molten while working, Ice when idle, off when asleep.
  const ledMat = track(new MeshBasicMaterial({ color: '#000', toneMapped: false }));
  const led = new Mesh(track(new SphereGeometry(0.0068, 12, 8)), ledMat);
  led.position.set(0, -0.012, 0.119);
  body.add(led);

  // Neck and head. The head pivots at the top of the neck.
  const neck = new Mesh(track(new CylinderGeometry(0.026, 0.032, 0.05, 24)), titanium);
  neck.position.y = 0.078;
  body.add(neck);
  const head = new Group();
  head.position.y = LAYOUT.neckTop;
  body.add(head);
  const headShell = new Mesh(track(superellipsoid(HEAD)), shellMat);
  headShell.position.y = LAYOUT.headUp;
  headShell.castShadow = true;
  head.add(headShell);
  const face = createFace();
  track(face.texture);
  const SW = 0.22;
  const SH = 0.1;
  const SCY = 0.004;
  const faceGroup = new Group();
  faceGroup.position.y = LAYOUT.headUp;
  head.add(faceGroup);
  const bezelMask = track(roundedMask(SW + 0.018, SH + 0.018, 0.03));
  faceGroup.add(
    new Mesh(
      track(frontPatch(SW + 0.018, SH + 0.018, SCY, 0.0016)),
      track(new MeshPhysicalMaterial({ color: '#9ea4ad', metalness: 1, roughness: 0.3, alphaMap: bezelMask, alphaTest: 0.5 })),
    ),
  );
  const screenMask = track(roundedMask(SW, SH, 0.024));
  faceGroup.add(
    new Mesh(
      track(frontPatch(SW, SH, SCY, 0.0032)),
      track(
        new MeshPhysicalMaterial({
          color: '#05070a',
          metalness: 0,
          roughness: 0.08,
          clearcoat: 1,
          clearcoatRoughness: 0.04,
          emissive: C.ice.clone(),
          emissiveMap: face.texture,
          emissiveIntensity: 1.15,
          alphaMap: screenMask,
          alphaTest: 0.5,
        }),
      ),
    ),
  );
  // Ear pods with brushed caps, and a short antenna with a lamp.
  const earGeo = track(new CylinderGeometry(0.034, 0.034, 0.024, 32));
  const earCapGeo = track(new CylinderGeometry(0.024, 0.024, 0.004, 32));
  const ringMat = track(new MeshBasicMaterial({ color: C.holo.clone().multiplyScalar(0.7), toneMapped: false }));
  const earRingGeo = track(new TorusGeometry(0.028, 0.0022, 6, 40));
  for (const sd of [-1, 1]) {
    const ear = new Mesh(earGeo, jointMat);
    ear.rotation.z = Math.PI / 2;
    ear.position.set(sd * (HEAD.a + 0.006), LAYOUT.headUp - 0.004, -0.004);
    ear.castShadow = true;
    head.add(ear);
    const cap = new Mesh(earCapGeo, hubMat);
    cap.rotation.z = Math.PI / 2;
    cap.position.set(sd * (HEAD.a + 0.019), LAYOUT.headUp - 0.004, -0.004);
    head.add(cap);
    const ring = new Mesh(earRingGeo, ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(sd * (HEAD.a + 0.019), LAYOUT.headUp - 0.004, -0.004);
    head.add(ring);
  }
  const mast = new Mesh(track(new CylinderGeometry(0.0045, 0.006, 0.05, 10)), titanium);
  mast.position.set(0.07, LAYOUT.headUp + HEAD.b + 0.018, -0.02);
  mast.rotation.z = -0.25;
  head.add(mast);
  const mastTip = new Mesh(track(new SphereGeometry(0.0095, 12, 8)), ringMat);
  mastTip.position.set(0.077, LAYOUT.headUp + HEAD.b + 0.045, -0.02);
  head.add(mastTip);
  // The HUD's anchor for the bot: just above the head.
  const anchor = new Group();
  anchor.position.y = LAYOUT.headUp + HEAD.b + 0.03;
  head.add(anchor);

  // Shoulder sockets on the torso sides.
  const hubGeo = track(new CylinderGeometry(0.03, 0.03, 0.026, 32));
  const screwGeo = track(new CylinderGeometry(0.0038, 0.0038, 0.004, 10));
  for (const sd of [-1, 1]) {
    const hub = new Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(sd * 0.118, LAYOUT.shoulderY, 0);
    hub.castShadow = true;
    body.add(hub);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
      const sc = new Mesh(screwGeo, screwMat);
      sc.rotation.z = Math.PI / 2;
      sc.position.set(sd * 0.132, LAYOUT.shoulderY + Math.sin(a) * 0.019, Math.cos(a) * 0.019);
      body.add(sc);
    }
  }

  // Thrusters: two nozzle pods under the torso with a soft downward glow.
  const podGeo = track(new CylinderGeometry(0.026, 0.021, 0.03, 24));
  const nozzleMat = track(new MeshBasicMaterial({ color: '#000', toneMapped: false }));
  const nozzleGeo = track(new CircleGeometry(0.016, 20));
  const glowTex = track(radialGlow());
  const glowMat = track(
    new SpriteMaterial({ map: glowTex, color: C.molten.clone().multiplyScalar(1.6), blending: AdditiveBlending, depthWrite: false, transparent: true }),
  );
  for (const sd of [-1, 1]) {
    const pod = new Mesh(podGeo, jointMat);
    pod.position.set(sd * 0.05, -0.112, 0);
    body.add(pod);
    const nozzle = new Mesh(nozzleGeo, nozzleMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(sd * 0.05, -0.128, 0);
    body.add(nozzle);
    const glow = new Sprite(glowMat);
    glow.position.set(sd * 0.05, -0.148, 0);
    glow.scale.set(0.05, 0.066, 1);
    glow.renderOrder = 6;
    body.add(glow);
  }

  // Arms -----------------------------------------------------------------------------------------
  const L1 = 0.11;
  const L2 = 0.105;
  const upperGeo = track(new CapsuleGeometry(0.015, L1 - 0.026, 4, 14));
  const foreGeo = track(new CapsuleGeometry(0.0135, L2 - 0.024, 4, 14));
  const jointGeo = track(new SphereGeometry(0.019, 16, 12));
  const shoulderGeo = track(new SphereGeometry(0.022, 16, 12));
  const fingerGeo = track(new RoundedBoxGeometry(0.0065, 0.032, 0.012, 2, 0.002));
  const gripBaseGeo = track(new CylinderGeometry(0.014, 0.012, 0.016, 20));
  const welderBodyGeo = track(new CylinderGeometry(0.012, 0.012, 0.02, 20));
  const welderConeGeo = track(new ConeGeometry(0.009, 0.034, 20));
  const tipMat = track(new MeshBasicMaterial({ color: '#000', toneMapped: false }));
  const tipGeo = track(new SphereGeometry(0.0042, 12, 8));

  function makeArm(side: -1 | 1) {
    const S = new Vector3(side * LAYOUT.shoulderX, LAYOUT.shoulderY, 0);
    const shoulder = new Mesh(shoulderGeo, jointMat);
    shoulder.position.copy(S);
    const upper = new Mesh(upperGeo, titanium);
    const elbow = new Mesh(jointGeo, jointMat);
    const fore = new Mesh(foreGeo, titanium);
    upper.castShadow = fore.castShadow = true;
    const wrist = new Group();
    const toolRoll = new Group();
    wrist.add(toolRoll);

    const gripper = new Group();
    const gb = new Mesh(gripBaseGeo, jointMat);
    gb.position.y = 0.006;
    gripper.add(gb);
    const fingers = [-1, 1].map((f) => {
      const pivot = new Group();
      pivot.position.set(f * 0.0075, 0.012, 0);
      const finger = new Mesh(fingerGeo, titanium);
      finger.position.y = 0.016;
      pivot.add(finger);
      gripper.add(pivot);
      return { pivot, f };
    });

    const welder = new Group();
    const wb = new Mesh(welderBodyGeo, jointMat);
    wb.position.y = 0.008;
    const wc = new Mesh(welderConeGeo, titanium);
    wc.position.y = 0.035;
    const tip = new Mesh(tipGeo, tipMat);
    tip.position.y = 0.053;
    welder.add(wb, wc, tip);

    toolRoll.add(gripper, welder);
    body.add(shoulder, upper, elbow, fore, wrist);
    return { side, S, upper, elbow, fore, wrist, toolRoll, gripper, fingers, welder, tip };
  }
  const arms = { left: makeArm(-1), right: makeArm(1) };

  const elbowP = new Vector3();
  const reach = new Vector3();
  const segDir = new Vector3();
  const pole = new Vector3();
  const q = new Quaternion();

  function placeSegment(mesh: Mesh, a: Vector3, b: Vector3) {
    segDir.subVectors(b, a);
    mesh.position.copy(a).addScaledVector(segDir, 0.5);
    mesh.quaternion.setFromUnitVectors(Y, segDir.normalize());
  }

  function poseArm(arm: ReturnType<typeof makeArm>, pose: ArmPose, weld: number) {
    pole.set(arm.side * 0.4, -1, -0.6);
    solveTwoBone(arm.S, pose.target, L1, L2, pole, elbowP, reach);
    placeSegment(arm.upper, arm.S, elbowP);
    arm.elbow.position.copy(elbowP);
    placeSegment(arm.fore, elbowP, reach);
    arm.wrist.position.copy(reach);
    q.setFromUnitVectors(Y, segDir.subVectors(reach, elbowP).normalize());
    arm.wrist.quaternion.copy(q);
    arm.toolRoll.rotation.y = pose.roll;
    const s = Math.max(0.001, 1 - pose.retract);
    arm.gripper.visible = pose.tool === 'gripper';
    arm.welder.visible = pose.tool === 'welder';
    arm.gripper.scale.setScalar(s);
    arm.welder.scale.setScalar(s);
    for (const f of arm.fingers) {
      const thumb = f.f === 1 ? pose.thumb : 0;
      f.pivot.rotation.z = f.f * (0.08 + pose.open * 0.45) * (1 - pose.thumb) - thumb * 0.1;
      f.pivot.rotation.x = thumb * -1.3;
    }
    const heat = pose.tool === 'welder' ? weld : 0;
    tipMat.color.setRGB(0.05 + C.molten.r * heat * 9, 0.05 + C.molten.g * heat * 9 + heat * 2, 0.05 + C.molten.b * heat * 9 + heat);
  }

  const tipWorld = new Vector3();
  const ledColors: Record<BotPose['led'], Color> = {
    work: C.molten.clone().multiplyScalar(2.6),
    idle: C.ice.clone().multiplyScalar(0.9),
    off: new Color('#0b0c0e'),
  };

  function setPose(pose: BotPose) {
    face.draw(pose.eyes, pose.dx, pose.dy, pose.frame, pose.icon);
    head.rotation.set(pose.head.pitch, pose.head.yaw, pose.head.roll, 'YXZ');
    ledMat.color.copy(ledColors[pose.led]);
    nozzleMat.color.copy(C.molten).multiplyScalar(0.3 + pose.thruster * 3);
    glowMat.opacity = Math.min(1, pose.thruster * 0.6);
    poseArm(arms.right, pose.right, 0);
    poseArm(arms.left, pose.left, pose.weld);
  }

  /** World position of the welder tip on the left (tool) arm. */
  function weldTip(out = tipWorld) {
    arms.left.tip.getWorldPosition(out);
    return out;
  }

  return {
    root,
    body,
    head,
    anchor,
    shell,
    setPose,
    weldTip,
    shoulders: { left: arms.left.S, right: arms.right.S },
    dispose() {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export type BotHandles = ReturnType<typeof buildBot>;
