import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Group, Vector3 } from 'three';
import { botName, pokeBot, setBotPresent } from '../lib/bot-bus';
import { stage } from '../lib/stage';
import { registerAnchor } from './anchors';
import { BotBrain } from './bot/behaviour';
import { buildBot } from './bot/buildBot';
import { buildData } from './data/buildData';
import { buildMachine } from './machine/buildMachine';
import { newPlan, planAfterBuild, planBot } from './plan';
import { currentSection } from '../lib/spy';
import { BUILD_LENGTH } from '../lib/stage';
import { createSparks } from './sparks';
import { setCrackle } from '../lib/sound';

const v = new Vector3();
/** The bot's size relative to the machine: palm-sized, big enough to read its face. */
export const BOT_SCALE = 1.35;

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
  const plan = useMemo(newPlan, []);
  const turntable = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const clock = useThree((s) => s.clock);

  useEffect(() => {
    const all = { ...machine.anchors, ...data.anchors };
    for (const [name, obj] of Object.entries(all)) registerAnchor(name, obj);
    const head = bot.body.children[0];
    registerAnchor('bot', head);
    setBotPresent(true);
    return () => {
      for (const name of Object.keys(all)) registerAnchor(name, null);
      registerAnchor('bot', null);
      setBotPresent(false);
      machine.dispose();
      data.dispose();
      bot.dispose();
      sparks.dispose();
    };
  }, [machine, bot, sparks, data]);

  // At Contact the bot comes to centre stage and salutes, once each time the section is entered.
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

    planBot(p, machine, data, plan);
    if (p >= BUILD_LENGTH - 0.5) planAfterBuild(currentSection(), plan);
    v.copy(bot.root.position).project(camera);
    const screenX = (v.x * 0.5 + 0.5) * size.width;
    const screenY = (-v.y * 0.5 + 0.5) * size.height;
    const tr = brain.update(dt, t, { ...plan, screenX, screenY, motion, capture }, (world, out) =>
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
    e.stopPropagation();
    pokeBot();
  };

  return (
    <group ref={turntable}>
      <primitive object={machine.root} />
      <primitive object={data.root} />
      <primitive
        object={bot.root}
        onClick={onClick}
        onPointerOver={() => (document.documentElement.dataset.botHover = '1')}
        onPointerOut={() => delete document.documentElement.dataset.botHover}
        name={botName() || 'bot'}
      />
      <primitive object={sparks.points} />
    </group>
  );
}
