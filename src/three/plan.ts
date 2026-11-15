// Where the bot is and what it does at each moment of the build (scroll-driven, reversible).
import { Vector3 } from 'three';
import type { BotTask } from './bot/behaviour';
import type { ToolName } from './bot/buildBot';
import { heroWeld, seg, easeInOut } from './choreo';
import type { MachineHandles } from './machine/buildMachine';

export type BotPlan = { target: Vector3; task: BotTask; tool: ToolName };

const P = new Vector3();
const A = new Vector3();
const B = new Vector3();

const HOVER_PROJECTS = new Vector3(1.05, 1.42, 0.78);

export function planBot(p: number, machine: MachineHandles, out: BotPlan): BotPlan {
  out.tool = 'welder';
  // Hero: welding layer 0's fabrication line, front right, then drifting off toward the bench.
  if (p < 40) {
    machine.heroWeldPoint(p, P);
    A.copy(P).add(B.set(0.36, 0.12, 0.2));
    const leave = easeInOut(seg(p, 14, 40));
    out.target.copy(A).lerp(HOVER_PROJECTS, leave);
    const heat = heroWeld(p);
    out.task = heat > 0.02 ? { kind: 'weld', point: P.clone(), heat } : { kind: 'idle' };
    return out;
  }
  out.target.copy(HOVER_PROJECTS);
  out.task = { kind: 'idle' };
  return out;
}

export const newPlan = (): BotPlan => ({ target: new Vector3(), task: { kind: 'idle' }, tool: 'welder' });
