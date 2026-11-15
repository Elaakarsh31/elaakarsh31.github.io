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

// Half extents and exponent of the body's superellipsoid: a squat, rounded pebble, wider than tall.
export const BODY = { a: 0.165, b: 0.112, c: 0.13, n: 3.4 };

/** Unit sphere pushed onto |x/a|^n + |y/b|^n + |z/c|^n = 1. */
function superellipsoid(seg = 64) {
  const g = new SphereGeometry(1, seg, Math.round(seg * 0.75));
  const pos = g.attributes.position;
  const v = new Vector3();
  const { a, b, c, n } = BODY;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i).normalize();
    const r = Math.pow(Math.pow(Math.abs(v.x / a), n) + Math.pow(Math.abs(v.y / b), n) + Math.pow(Math.abs(v.z / c), n), -1 / n);
    v.multiplyScalar(r);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

/** Height of the body's front surface at (x, y). */
function frontZ(x: number, y: number) {
  const { a, b, c, n } = BODY;
  const k = 1 - Math.pow(Math.abs(x / a), n) - Math.pow(Math.abs(y / b), n);
  return k <= 0 ? 0 : c * Math.pow(k, 1 / n);
}

/** Distance of the body's side surface from the centre at (y, z). */
function sideX(y: number, z: number) {
  const { a, b, c, n } = BODY;
  const k = 1 - Math.pow(Math.abs(y / b), n) - Math.pow(Math.abs(z / c), n);
  return k <= 0 ? 0 : a * Math.pow(k, 1 / n);
}

/** A titanium cheek panel bent onto the body's side (side = ±1). */
function sidePatch(d: number, h: number, side: number, lift: number) {
  const g = new PlaneGeometry(d, h, 16, 12);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const z = pos.getX(i);
    const y = pos.getY(i) - 0.004;
    pos.setXYZ(i, side * (sideX(y, z) + lift), y, -side * z);
  }
  g.computeVertexNormals();
  return g;
}

/** A plane bent onto the body's front, for the screen and its bezel. */
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

  const shell = new Mesh(track(superellipsoid()), shellMat);
  shell.castShadow = true;
  body.add(shell);

  // Face: titanium bezel, then dark glass with the LED eyes.
  const SW = 0.205;
  const SH = 0.1;
  const SCY = 0.014;
  const bezelMask = track(roundedMask(SW + 0.016, SH + 0.016, 0.03));
  const bezel = new Mesh(
    track(frontPatch(SW + 0.016, SH + 0.016, SCY, 0.0016)),
    track(new MeshPhysicalMaterial({ color: '#9ea4ad', metalness: 1, roughness: 0.3, alphaMap: bezelMask, alphaTest: 0.5 })),
  );
  body.add(bezel);
  const face = createFace();
  track(face.texture);
  const screenMask = track(roundedMask(SW, SH, 0.024));
  const screen = new Mesh(
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
  );
  body.add(screen);

  // Brushed titanium cheek panels on both sides, under the shoulder hubs.
  const cheekMask = track(roundedMask(0.17, 0.15, 0.04));
  const cheekMat = track(
    new MeshPhysicalMaterial({ color: '#b8bdc6', metalness: 1, roughness: 0.55, roughnessMap: ti, alphaMap: cheekMask, alphaTest: 0.5, side: 2 }),
  );
  for (const s of [-1, 1]) body.add(new Mesh(track(sidePatch(0.17, 0.15, s, 0.0018)), cheekMat));

  // Titanium spine plate across the top, with a status lamp at the front.
  const topPlate = new Mesh(track(new RoundedBoxGeometry(0.078, 0.01, 0.13, 3, 0.004)), titanium);
  topPlate.position.y = BODY.b - 0.0015;
  topPlate.castShadow = true;
  body.add(topPlate);
  const ledMat = track(new MeshBasicMaterial({ color: '#000', toneMapped: false }));
  const led = new Mesh(track(new SphereGeometry(0.0065, 12, 8)), ledMat);
  led.position.set(0, BODY.b + 0.005, 0.05);
  body.add(led);

  // Rear vent grille.
  const ventGeo = track(new RoundedBoxGeometry(0.09, 0.007, 0.01, 2, 0.003));
  for (let i = 0; i < 4; i++) {
    const v = new Mesh(ventGeo, titanium);
    v.position.set(0, -0.03 + i * 0.018, -BODY.c + 0.006);
    body.add(v);
  }

  // Shoulder hubs with three screws each.
  const hubGeo = track(new CylinderGeometry(0.044, 0.044, 0.02, 40));
  const screwGeo = track(new CylinderGeometry(0.0045, 0.0045, 0.004, 10));
  for (const s of [-1, 1]) {
    const hub = new Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;
    hub.position.set(s * (BODY.a - 0.002), -0.006, 0);
    hub.castShadow = true;
    body.add(hub);
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
      const sc = new Mesh(screwGeo, screwMat);
      sc.rotation.z = Math.PI / 2;
      sc.position.set(s * (BODY.a + 0.0095), -0.006 + Math.sin(a) * 0.028, Math.cos(a) * 0.028);
      body.add(sc);
    }
  }

  // Thrusters: two nozzle pods underneath with a soft downward glow.
  const podGeo = track(new CylinderGeometry(0.024, 0.02, 0.028, 24));
  const nozzleMat = track(new MeshBasicMaterial({ color: '#000', toneMapped: false }));
  const nozzleGeo = track(new CircleGeometry(0.015, 20));
  const glowTex = track(radialGlow());
  const glowMat = track(
    new SpriteMaterial({ map: glowTex, color: C.molten.clone().multiplyScalar(1.6), blending: AdditiveBlending, depthWrite: false, transparent: true }),
  );
  for (const s of [-1, 1]) {
    const pod = new Mesh(podGeo, jointMat);
    pod.position.set(s * 0.07, -BODY.b + 0.012, -0.01);
    body.add(pod);
    const nozzle = new Mesh(nozzleGeo, nozzleMat);
    nozzle.rotation.x = Math.PI / 2;
    nozzle.position.set(s * 0.07, -BODY.b - 0.0025, -0.01);
    body.add(nozzle);
    const glow = new Sprite(glowMat);
    glow.position.set(s * 0.07, -BODY.b - 0.022, -0.01);
    glow.scale.set(0.048, 0.064, 1);
    glow.renderOrder = 6;
    body.add(glow);
  }

  // Arms -----------------------------------------------------------------------------------------
  const L1 = 0.1;
  const L2 = 0.095;
  const upperGeo = track(new CapsuleGeometry(0.0145, L1 - 0.024, 4, 14));
  const foreGeo = track(new CapsuleGeometry(0.0128, L2 - 0.022, 4, 14));
  const jointGeo = track(new SphereGeometry(0.018, 16, 12));
  const shoulderGeo = track(new SphereGeometry(0.02, 16, 12));
  const fingerGeo = track(new RoundedBoxGeometry(0.0065, 0.032, 0.012, 2, 0.002));
  const gripBaseGeo = track(new CylinderGeometry(0.014, 0.012, 0.016, 20));
  const welderBodyGeo = track(new CylinderGeometry(0.012, 0.012, 0.02, 20));
  const welderConeGeo = track(new ConeGeometry(0.009, 0.034, 20));
  const tipMat = track(new MeshBasicMaterial({ color: '#000', toneMapped: false }));
  const tipGeo = track(new SphereGeometry(0.0042, 12, 8));

  function makeArm(side: -1 | 1) {
    const S = new Vector3(side * 0.19, -0.006, 0);
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
