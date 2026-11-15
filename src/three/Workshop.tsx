import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import { Group, Vector3 } from 'three';
import { botName, pokeBot, setBotPresent } from '../lib/bot-bus';
import { stage } from '../lib/stage';
import { registerAnchor } from './anchors';
import { BotBrain } from './bot/behaviour';
import { buildBot } from './bot/buildBot';
import { buildMachine } from './machine/buildMachine';
import { newPlan, planBot } from './plan';
import { createSparks } from './sparks';

const v = new Vector3();
/** The bot's size relative to the machine: palm-sized, big enough to read its face. */
export const BOT_SCALE = 1.35;

/** The machine, the bot and the sparks, driven every frame from the build timeline. */
export function Workshop({ motion, capture }: { motion: boolean; capture: boolean }) {
  const machine = useMemo(buildMachine, []);
  const bot = useMemo(() => {
    const b = buildBot();
    b.root.scale.setScalar(BOT_SCALE);
    return b;
  }, []);
  const brain = useMemo(() => new BotBrain(), []);
  const sparks = useMemo(createSparks, []);
  const plan = useMemo(newPlan, []);
  const turntable = useRef<Group>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const clock = useThree((s) => s.clock);

  useEffect(() => {
    for (const [name, obj] of Object.entries(machine.anchors)) registerAnchor(name, obj);
    const head = bot.body.children[0];
    registerAnchor('bot', head);
    setBotPresent(true);
    return () => {
      for (const name of Object.keys(machine.anchors)) registerAnchor(name, null);
      registerAnchor('bot', null);
      setBotPresent(false);
      machine.dispose();
      bot.dispose();
      sparks.dispose();
    };
  }, [machine, bot, sparks]);

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

    planBot(p, machine, plan);
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

    if (motion && brain.pose.weld > 0.05) sparks.emit(bot.weldTip(), 260 * brain.pose.weld, dt);
    if (motion) sparks.update(Math.min(dt, 0.05));
    else sparks.clear();
  }, -1);

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    pokeBot();
  };

  return (
    <group ref={turntable}>
      <primitive object={machine.root} />
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
