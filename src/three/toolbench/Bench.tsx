import { CuboidCollider, Physics, RigidBody, type RapierRigidBody } from '@react-three/rapier';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CanvasTexture, Color, MeshPhysicalMaterial, Object3D, Plane, Quaternion, Raycaster, RepeatWrapping, Vector2, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { portfolio } from '../../content/portfolio';
import { isBenchSorted } from '../../lib/bench';
import { createRng } from '../../lib/rng';
import { registerAnchor } from '../anchors';
import { brushedRoughness } from '../materials/brushed';
import { C } from '../palette';
import { BENCH, TAG_DEPTH, TAG_THICK, TRAY, TRAY_ORDER, tagWidth, trayCenter, traySlot } from './layout';
import { tagTexture } from './tagTexture';

const tmp = new Vector3();
const here = new Vector3();
const qa = new Quaternion();
const qb = new Quaternion();

/** A faint engraved grid for the bench top. */
function benchTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#16181c';
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = 'rgba(207,227,242,0.045)';
  g.lineWidth = 1;
  for (let i = 0; i <= 512; i += 32) {
    g.beginPath();
    g.moveTo(i, 0);
    g.lineTo(i, 512);
    g.moveTo(0, i);
    g.lineTo(512, i);
    g.stroke();
  }
  const t = new CanvasTexture(c);
  t.repeat.set(3, 2);
  t.wrapS = t.wrapT = RepeatWrapping;
  return t;
}

/** The toolbench: engraved tags you can drag and fling, sorted by magnets into three trays. */
export default function Bench({ active }: { active: boolean }) {
  const tags = portfolio.toolbench.tags;
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const [fontsReady, setFontsReady] = useState(false);
  const bodies = useRef<(RapierRigidBody | null)[]>([]);
  const drag = useRef<{ i: number; target: Vector3 } | null>(null);
  const sorting = useRef(isBenchSorted());
  const glow = useRef(0);

  useEffect(() => {
    document.fonts.load('500 32px "IBM Plex Mono"').finally(() => setFontsReady(true));
  }, []);

  const mats = useMemo(() => {
    const rough = brushedRoughness(77);
    return {
      rough,
      tag: new MeshPhysicalMaterial({ color: '#c3c8d0', metalness: 1, roughness: 0.5, roughnessMap: rough }),
      tray: new MeshPhysicalMaterial({ color: '#3a3e45', metalness: 1, roughness: 0.6, roughnessMap: rough }),
      bench: new MeshPhysicalMaterial({ map: benchTexture(), color: '#6b7078', metalness: 0.15, roughness: 0.92, envMapIntensity: 0.25 }),
    };
  }, []);

  const tagData = useMemo(() => {
    if (!fontsReady) return [];
    const rng = createRng(808);
    const perTray: Record<string, number> = {};
    return tags.map((t, i) => {
      const w = tagWidth(t.name);
      const k = (perTray[t.tray] = (perTray[t.tray] ?? -1) + 1);
      return {
        ...t,
        w,
        geo: new RoundedBoxGeometry(w, TAG_THICK, TAG_DEPTH, 2, 0.008),
        tex: tagTexture(t.name, w - 0.012, TAG_DEPTH - 0.012, 500 + i),
        slot: traySlot(t.tray, k),
        start: [BENCH.x + (rng() - 0.5) * 3.6, 0.08 + rng() * 0.35, BENCH.z + 0.18 + rng() * 0.85] as [number, number, number],
        rot: [0, (rng() - 0.5) * Math.PI * 1.6, (rng() - 0.5) * 0.2] as [number, number, number],
      };
    });
  }, [fontsReady, tags]);

  // Tray label anchors for the DOM.
  const trayAnchors = useMemo(
    () =>
      TRAY_ORDER.map((tray) => {
        const o = new Object3D();
        const [x, z] = trayCenter(tray);
        o.position.set(x, TRAY.h + 0.02, z + TRAY.d / 2 + 0.05);
        return { tray, o };
      }),
    [],
  );

  useEffect(() => {
    trayAnchors.forEach(({ tray, o }) => registerAnchor(`tray-${tray}`, o));
    return () => {
      trayAnchors.forEach(({ tray }) => registerAnchor(`tray-${tray}`, null));
      tagData.forEach((t) => {
        t.geo.dispose();
        t.tex.dispose();
      });
    };
  }, [trayAnchors, tagData]);

  useEffect(
    () => () => {
      Object.values(mats).forEach((m) => m.dispose());
    },
    [mats],
  );

  // Sort and scatter, from the button or the scroll position.
  useEffect(() => {
    const onSort = (e: Event) => {
      const sorted = (e as CustomEvent<boolean>).detail;
      sorting.current = sorted;
      glow.current = 1;
      if (!sorted) {
        const rng = createRng(Math.floor(performance.now()));
        bodies.current.forEach((b) => {
          if (!b) return;
          b.wakeUp();
          const p = b.translation();
          const tx = BENCH.x + (rng() - 0.5) * 3.4;
          const tz = BENCH.z + 0.2 + rng() * 0.8;
          b.setLinvel({ x: (tx - p.x) * 2.2, y: 2.2 + rng() * 1.2, z: (tz - p.z) * 2.2 }, true);
          b.setAngvel({ x: (rng() - 0.5) * 6, y: (rng() - 0.5) * 8, z: (rng() - 0.5) * 6 }, true);
        });
      }
    };
    window.addEventListener('bench:sort', onSort);
    return () => window.removeEventListener('bench:sort', onSort);
  }, []);

  // Drag: a spring from the tag to the pointer on a plane above the bench; release flings it.
  const plane = useMemo(() => new Plane(new Vector3(0, 1, 0), -0.32), []);
  const ray = useMemo(() => new Raycaster(), []);
  const ndc = useMemo(() => new Vector2(), []);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const r = gl.domElement.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      ray.ray.intersectPlane(plane, drag.current.target);
    };
    const up = () => {
      drag.current = null;
      delete document.documentElement.dataset.grabbing;
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
    };
  }, [camera, gl, ndc, plane, ray]);

  const onDown = (i: number) => (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
    e.stopPropagation();
    const b = bodies.current[i];
    if (!b) return;
    const p = b.translation();
    drag.current = { i, target: new Vector3(p.x, 0.32, p.z) };
    document.documentElement.dataset.grabbing = '1';
  };

  useFrame((_, dt) => {
    if (!active) return;
    glow.current = Math.max(0, glow.current - dt * 0.6);
    bodies.current.forEach((b, i) => {
      if (!b) return;
      const t = tagData[i];
      if (!t) return;
      if (drag.current?.i === i) {
        const p = b.translation();
        tmp.copy(drag.current.target).sub(here.set(p.x, p.y, p.z)).multiplyScalar(14).clampLength(0, 9);
        b.setLinvel(tmp, true);
        const w = b.angvel();
        b.setAngvel({ x: w.x * 0.85, y: w.y * 0.85, z: w.z * 0.85 }, true);
        return;
      }
      if (!sorting.current) return;
      // Magnet: lift, carry to the slot, set down square.
      const p = b.translation();
      const [sx, sy, sz] = t.slot;
      const dx = sx - p.x;
      const dz = sz - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.02 && Math.abs(p.y - sy) < 0.03) return;
      const v = b.linvel();
      const want = {
        x: Math.max(-3, Math.min(3, dx * 4.5)),
        y: dist > 0.12 ? (0.42 - p.y) * 5 : (sy - p.y) * 4,
        z: Math.max(-3, Math.min(3, dz * 4.5)),
      };
      b.setLinvel({ x: v.x + (want.x - v.x) * 0.25, y: v.y + (want.y - v.y) * 0.25, z: v.z + (want.z - v.z) * 0.25 }, true);
      const r = b.rotation();
      qa.set(r.x, r.y, r.z, r.w);
      qb.identity().multiply(qa.invert());
      const angle = 2 * Math.acos(Math.min(1, Math.abs(qb.w)));
      const s = Math.sqrt(1 - qb.w * qb.w) || 1;
      const sign = qb.w < 0 ? -1 : 1;
      b.setAngvel({ x: ((qb.x / s) * angle * 6 * sign) || 0, y: ((qb.y / s) * angle * 6 * sign) || 0, z: ((qb.z / s) * angle * 6 * sign) || 0 }, true);
    });
  });

  const lightTarget = useMemo(() => {
    const o = new Object3D();
    o.position.set(BENCH.x, 0, -0.2);
    return o;
  }, []);
  const benchW = 4.6;
  const benchD = 2.7;
  return (
    <group>
      <primitive object={lightTarget} />
      <spotLight position={[BENCH.x + 0.4, 4.6, 1.6]} angle={0.7} penumbra={0.9} intensity={80} decay={2} color="#f4f6fa" castShadow shadow-mapSize={[1024, 1024]} target={lightTarget} />
      <mesh position={[BENCH.x, -0.03, BENCH.z]} material={mats.bench} receiveShadow>
        <boxGeometry args={[benchW, 0.06, benchD]} />
      </mesh>
      {TRAY_ORDER.map((tray) => {
        const [x, z] = trayCenter(tray);
        return (
          <group key={tray} position={[x, 0, z]}>
            <mesh position={[0, 0.006, 0]} material={mats.tray} receiveShadow>
              <boxGeometry args={[TRAY.w, 0.012, TRAY.d]} />
            </mesh>
            {[
              [0, TRAY.d / 2, TRAY.w + TRAY.wall, TRAY.wall],
              [0, -TRAY.d / 2, TRAY.w + TRAY.wall, TRAY.wall],
              [TRAY.w / 2, 0, TRAY.wall, TRAY.d],
              [-TRAY.w / 2, 0, TRAY.wall, TRAY.d],
            ].map(([px, pz, sx, sz], k) => (
              <mesh key={k} position={[px, TRAY.h / 2, pz]} material={mats.tray} castShadow receiveShadow>
                <boxGeometry args={[sx, TRAY.h, sz]} />
              </mesh>
            ))}
            {/* Magnet strip: glows while sorting. */}
            <MagnetStrip glow={glow} />
          </group>
        );
      })}
      {trayAnchors.map(({ tray, o }) => (
        <primitive key={tray} object={o} />
      ))}
      <Physics gravity={[0, -9.81, 0]} paused={!active} timeStep={1 / 60}>
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[benchW / 2, 0.03, benchD / 2]} position={[BENCH.x, -0.03, BENCH.z]} />
          <CuboidCollider args={[0.05, 1, benchD / 2]} position={[BENCH.x - benchW / 2, 1, BENCH.z]} />
          <CuboidCollider args={[0.05, 1, benchD / 2]} position={[BENCH.x + benchW / 2, 1, BENCH.z]} />
          <CuboidCollider args={[benchW / 2, 1, 0.05]} position={[BENCH.x, 1, BENCH.z - benchD / 2]} />
          <CuboidCollider args={[benchW / 2, 1, 0.05]} position={[BENCH.x, 1, BENCH.z + benchD / 2]} />
          {TRAY_ORDER.flatMap((tray) => {
            const [x, z] = trayCenter(tray);
            return [
              <CuboidCollider key={`${tray}-f`} args={[TRAY.w / 2, TRAY.h / 2, TRAY.wall / 2]} position={[x, TRAY.h / 2, z + TRAY.d / 2]} />,
              <CuboidCollider key={`${tray}-b`} args={[TRAY.w / 2, TRAY.h / 2, TRAY.wall / 2]} position={[x, TRAY.h / 2, z - TRAY.d / 2]} />,
              <CuboidCollider key={`${tray}-l`} args={[TRAY.wall / 2, TRAY.h / 2, TRAY.d / 2]} position={[x - TRAY.w / 2, TRAY.h / 2, z]} />,
              <CuboidCollider key={`${tray}-r`} args={[TRAY.wall / 2, TRAY.h / 2, TRAY.d / 2]} position={[x + TRAY.w / 2, TRAY.h / 2, z]} />,
            ];
          })}
        </RigidBody>
        {tagData.map((t, i) => (
          <RigidBody
            key={t.name}
            ref={(b) => {
              bodies.current[i] = b;
            }}
            position={t.start}
            rotation={t.rot}
            colliders={false}
            linearDamping={0.5}
            angularDamping={0.7}
            ccd
          >
            <CuboidCollider args={[t.w / 2, TAG_THICK / 2, TAG_DEPTH / 2]} friction={0.7} restitution={0.15} />
            <group
              onPointerDown={onDown(i)}
              onPointerOver={() => (document.documentElement.dataset.grab = '1')}
              onPointerOut={() => delete document.documentElement.dataset.grab}
            >
              <mesh geometry={t.geo} material={mats.tag} castShadow receiveShadow />
              <mesh position={[0, TAG_THICK / 2 + 0.0006, 0]} rotation-x={-Math.PI / 2}>
                <planeGeometry args={[t.w - 0.012, TAG_DEPTH - 0.012]} />
                <meshPhysicalMaterial map={t.tex} metalness={0.85} roughness={0.42} />
              </mesh>
            </group>
          </RigidBody>
        ))}
      </Physics>
    </group>
  );
}

function MagnetStrip({ glow }: { glow: React.RefObject<number> }) {
  const mat = useRef<MeshPhysicalMaterial>(null);
  const base = useMemo(() => new Color('#0d1216'), []);
  useFrame(() => {
    if (!mat.current) return;
    const g = glow.current ?? 0;
    mat.current.emissive.copy(base).lerp(C.holo, Math.min(1, 0.15 + g));
  });
  return (
    <mesh position={[0, 0.0125, TRAY.d / 2 - 0.06]}>
      <boxGeometry args={[TRAY.w - 0.12, 0.002, 0.02]} />
      <meshPhysicalMaterial ref={mat} color="#0d1216" emissive="#0d1216" emissiveIntensity={1} />
    </mesh>
  );
}
