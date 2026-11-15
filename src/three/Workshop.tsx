import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { botName, pokeBot, setBotPresent } from '../lib/bot-bus';
import { stage } from '../lib/stage';
import { registerAnchor } from './anchors';
import { BotBrain } from './bot/behaviour';
import { buildBot } from './bot/buildBot';
import { buildData } from './data/buildData';
import { buildMachine } from './machine/buildMachine';
import { blendAt } from './afterBuild';
import { newPlan, planBot, planSpot } from './plan';
import { currentSection } from '../lib/spy';
import { BUILD_LENGTH } from '../lib/stage';
import { createSparks } from './sparks';
import { setCrackle } from '../lib/sound';
import { input } from './input';

const v = new Vector3();
const camRight = new Vector3();
const camUp = new Vector3();
const local = new Vector3();

/** The scene is off screen (below the hero on phones, where the acts use still frames). */
function sceneHidden() {
  return document.documentElement.dataset.mode === 'phone' && currentSection() !== 'top';
}

/** Shows the hovered machine part's name in the HUD and lights its plate label. */
function showPart(part: { anchor: string; label: string; kind: string } | null) {
  const html = document.documentElement;
  const tag = document.querySelector<HTMLElement>('.part-tag');
  document.querySelectorAll<HTMLElement>('.plate-tag[data-hover]').forEach((t) => delete t.dataset.hover);
  if (!part) {
    delete html.dataset.machineHover;
    if (tag) delete tag.dataset.on;
    return;
  }
  html.dataset.machineHover = '1';
  if (part.kind === 'plate') {
    const pt = document.querySelector<HTMLElement>(`.plate-tag[data-plate="${part.label}"]`);
    if (pt) pt.dataset.hover = '1';
    if (tag) delete tag.dataset.on;
    return;
  }
  if (tag) {
    tag.dataset.hudAnchor = part.anchor;
    tag.querySelector('.part-name')!.textContent = part.label;
    tag.dataset.on = '1';
  }
}
/** The bot's size relative to the machine: palm-sized, big enough to read its face. */
export const BOT_SCALE = 1.3;

/** The machine, the bot and the sparks, driven every frame from the build timeline. */
export function Workshop({ motion, sparks: sparksOn, capture }: { motion: boolean; sparks: boolean; capture: boolean }) {
  const machine = useMemo(buildMachine, []);
  const bot = useMemo(() => {
    const b = buildBot();
    b.root.scale.setScalar(BOT_SCALE);
    return b;
  }, []);
  const brain = useMemo(() => new BotBrain(), []);
  const sparks = useMemo(createSparks, []);
  const data = useMemo(buildData, []);
  // An invisible cylinder around the machine: one cheap raycast for hover and click.
  const proxy = useMemo(() => {
    const m = new Mesh(
      new CylinderGeometry(0.98, 0.98, 2.45, 32),
      new MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    );
    m.position.y = 1.22;
    m.name = 'machine-proxy';
    return m;
  }, []);
  const hoverPart = useRef<string>('');
  const plan = useMemo(newPlan, []);
  const planB = useMemo(newPlan, []);
  const turntable = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const clock = useThree((s) => s.clock);

  useEffect(() => {
    const all = { ...machine.anchors, ...data.anchors };
    for (const [name, obj] of Object.entries(all)) registerAnchor(name, obj);
    registerAnchor('bot', bot.anchor);
    setBotPresent(true);
    return () => {
      for (const name of Object.keys(all)) registerAnchor(name, null);
      registerAnchor('bot', null);
      setBotPresent(false);
      machine.dispose();
      data.dispose();
      proxy.geometry.dispose();
      (proxy.material as MeshBasicMaterial).dispose();
      bot.dispose();
      sparks.dispose();
    };
  }, [machine, bot, sparks, data, proxy]);

  // In Career, the bot's face shows an icon for the timeline entry in view.
  useEffect(() => {
    const ICON: Record<string, string> = {
      'career-v0-1': 'cap',
      'career-v0-2': 'lens',
      'career-v0-3': 'db',
      'career-v0-4': 'spark',
      'career-v0-5': 'cap',
      'career-v0-6': 'chart',
    };
    let entry: string | null = null;
    const apply = () => {
      const s = currentSection();
      brain.setGlyph(s === 'career' && entry ? ICON[entry] ?? null : null, clock.elapsedTime);
    };
    const onEntry = (e: Event) => {
      entry = (e as CustomEvent<string>).detail;
      apply();
    };
    window.addEventListener('career:entry', onEntry);
    window.addEventListener('section', apply);
    return () => {
      window.removeEventListener('career:entry', onEntry);
      window.removeEventListener('section', apply);
    };
  }, [brain, clock]);

  // At Contact the bot salutes once each time the section is entered, then strikes its pose.
  useEffect(() => {
    let last = '';
    const on = () => {
      const s = currentSection();
      if (s === 'contact' && last !== 'contact') window.setTimeout(() => brain.salute(clock.elapsedTime), 700);
      last = s;
    };
    window.addEventListener('section', on);
    return () => window.removeEventListener('section', on);
  }, [brain, clock]);

  useEffect(() => {
    const onPoke = () => brain.poke(clock.elapsedTime);
    window.addEventListener('bot:poke', onPoke);
    return () => window.removeEventListener('bot:poke', onPoke);
  }, [brain, clock]);

  useEffect(() => {
    sparks.setScale(5.5 * dpr * (size.height / 900));
  }, [sparks, dpr, size.height]);

  useFrame((state, dt) => {
    // Nothing on screen to point at: let go of any hover.
    if (sceneHidden() && (hoverPart.current || document.documentElement.dataset.botHover)) {
      hoverPart.current = '';
      machine.setHover(null);
      showPart(null);
      delete document.documentElement.dataset.botHover;
    }
    const p = stage.p;
    const t = state.clock.elapsedTime;
    machine.update(p, t, dt, motion, stage.highlight);
    data.update(p, t, motion, stage.highlight?.chips.includes('data') ?? false);

    // Drag-to-orbit: the turntable follows the drag and eases back on release.
    const tt = turntable.current;
    if (tt) {
      const k = 1 - Math.exp(-Math.min(dt, 0.05) * 6);
      tt.rotation.y += (stage.orbit.yaw - tt.rotation.y) * k;
      tt.rotation.x += (stage.orbit.pitch - tt.rotation.x) * k;
    }

    let project: string | null = null;
    if (p >= BUILD_LENGTH - 0.5) {
      // After the build the bot moves with the scroll between its spots, like the camera, and
      // takes up the task of whichever spot it is closer to.
      const section = currentSection();
      project = section === 'projects' || section === 'publications' ? stage.project : null;
      const { a, b, k } = blendAt(window.scrollY);
      planSpot(a, project, t, machine, data, plan);
      if (b !== a && k > 0) {
        planSpot(b, project, t, machine, data, planB);
        plan.target.lerp(planB.target, k);
        if (k >= 0.5) {
          plan.task = planB.task;
          plan.tool = planB.tool;
        }
      }
    } else planBot(p, machine, data, plan);
    machine.setShow(motion ? project : null);
    v.copy(bot.root.position).project(camera);
    const screenX = (v.x * 0.5 + 0.5) * size.width;
    const screenY = (-v.y * 0.5 + 0.5) * size.height;
    const hover = !!document.documentElement.dataset.botHover;
    const viewPitch = Math.atan2(camera.position.y - bot.root.position.y, Math.hypot(camera.position.x - bot.root.position.x, camera.position.z - bot.root.position.z));
    // Curious: when the pointer comes near and the bot is free, it drifts a little toward it.
    if (motion && input.hasPointer && plan.task.kind === 'idle') {
      const dx = input.x - screenX;
      const dy = input.y - screenY;
      const near = 1 - Math.min(1, Math.hypot(dx, dy) / 280);
      if (near > 0) {
        camRight.setFromMatrixColumn(camera.matrixWorld, 0);
        camUp.setFromMatrixColumn(camera.matrixWorld, 1);
        const k = near * 0.0006;
        plan.target.addScaledVector(camRight, Math.max(-0.14, Math.min(0.14, dx * k)));
        plan.target.addScaledVector(camUp, Math.max(-0.1, Math.min(0.1, -dy * k)));
      }
    }
    const tr = brain.update(dt, t, { ...plan, screenX, screenY, motion, capture, hover, viewPitch }, (world, out) =>
      bot.body.worldToLocal(out.copy(world)),
    );
    bot.root.position.set(tr.x, tr.y, tr.z);
    bot.body.rotation.set(tr.pitch, tr.yaw, tr.roll, 'YXZ');
    bot.root.updateMatrixWorld(true);
    bot.setPose(brain.pose);

    if (sparksOn && brain.pose.weld > 0.05) sparks.emit(bot.weldTip(), 260 * brain.pose.weld, dt);
    if (sparksOn) sparks.update(Math.min(dt, 0.05));
    else sparks.clear();
    setCrackle(motion ? brain.pose.weld : 0);
  }, -1);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (sceneHidden()) return;
    e.stopPropagation();
    pokeBot();
  };

  const onMachineMove = (e: ThreeEvent<PointerEvent>) => {
    if (capture || sceneHidden()) return;
    // The bot is in front: it takes the hover, the machine lets go.
    if (document.documentElement.dataset.botHover) {
      if (hoverPart.current) onMachineOut();
      return;
    }
    machine.root.worldToLocal(local.copy(e.point));
    const part = machine.pick(local);
    const key = part ? `${part.kind}:${part.index}` : '';
    if (key === hoverPart.current) return;
    hoverPart.current = key;
    machine.setHover(part);
    showPart(part);
  };
  const onMachineOut = () => {
    hoverPart.current = '';
    machine.setHover(null);
    showPart(null);
  };
  const onMachineClick = (e: ThreeEvent<MouseEvent>) => {
    if (capture || e.delta > 6 || document.documentElement.dataset.botHover || sceneHidden()) return;
    machine.ping();
    brain.react(clock.elapsedTime);
  };

  return (
    <group ref={turntable}>
      <primitive object={machine.root} />
      <primitive object={proxy} onPointerMove={onMachineMove} onPointerOut={onMachineOut} onClick={onMachineClick} />
      <primitive object={data.root} />
      <primitive
        object={bot.root}
        onClick={onClick}
        onPointerOver={() => {
          if (!sceneHidden()) document.documentElement.dataset.botHover = '1';
        }}
        onPointerOut={() => delete document.documentElement.dataset.botHover}
        name={botName() || 'bot'}
      />
      <primitive object={sparks.points} />
    </group>
  );
}
