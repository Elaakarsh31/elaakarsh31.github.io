// Where the bot is and what it does at each moment of the build. Scroll-driven and reversible:
// every position is a function of the timeline position p.
import { Vector3 } from 'three';
import type { BotTask } from './bot/behaviour';
import type { ToolName } from './bot/buildBot';
import { easeInOut, fragWindow, heroWeld, plateStart, seg, weldWindow } from './choreo';
import type { DataHandles } from './data/buildData';
import type { MachineHandles } from './machine/buildMachine';
import { PLATES } from './machine/parts';
import { contactBotPoint, type Spot } from './afterBuild';

export type BotPlan = { target: Vector3; task: BotTask; tool: ToolName };

const deg = Math.PI / 180;
const P = new Vector3();
const A = new Vector3();
const B = new Vector3();
const point = new Vector3();

export const HOVER_BESIDE = new Vector3(0.82, 1.6, 0.7);
const HERD_START = new Vector3(-2.75, 1.38, -0.45);
const POWER_SPOT = new Vector3(-0.92, 1.3, 1.05);

const WELD_OFFSET = new Vector3(0.36, 0.1, 0.22);

function heroPos(p: number, m: MachineHandles, out: Vector3) {
  m.heroWeldPoint(p, P);
  return out.copy(P).add(B.set(0.36, 0.12, 0.2));
}

function seamPos(k: number, p: number, m: MachineHandles, out: Vector3) {
  m.seamPoint(k, p, P);
  return out.copy(P).add(WELD_OFFSET);
}

function boltPos(k: number, m: MachineHandles, out: Vector3) {
  m.plateBoltPoint(k, P);
  const spec = PLATES[k];
  const a = spec.angle * deg;
  out.copy(P).add(B.set(Math.sin(a) * 0.34, 0.05, Math.cos(a) * 0.34));
  // Keep the bot in front of the machine so its face stays toward the camera.
  out.z = Math.max(out.z, 0.55);
  return out;
}

/** Position while herding: behind and above the fragment that is crossing now. */
function herdPos(p: number, d: DataHandles, out: Vector3) {
  const f = Math.min(11, Math.max(0, (p - 70) / 4.6));
  const j = Math.floor(f);
  const k = easeInOut(f - j);
  d.itemPosition(j, A).add(B.set(0.02, 0.3, -0.22));
  if (j < 11) {
    d.itemPosition(j + 1, P).add(B.set(0.02, 0.3, -0.22));
    A.lerp(P, k);
  }
  return out.copy(A);
}

export function planBot(p: number, m: MachineHandles, d: DataHandles, out: BotPlan): BotPlan {
  out.task = { kind: 'idle' };
  out.tool = p < 28 ? 'welder' : p < 150 ? 'gripper' : p < 282 ? 'welder' : 'gripper';

  // Hero: welding layer 0's fabrication line, then off toward the bench.
  if (p < 46) {
    heroPos(p, m, A);
    out.target.copy(A).lerp(HERD_START, easeInOut(seg(p, 14, 46)));
    const heat = heroWeld(p);
    if (heat > 0.02) out.task = { kind: 'weld', point: m.heroWeldPoint(p, point).clone(), heat };
    return out;
  }

  // Act 1: herd the fragments into the refinery, carrying every third one.
  if (p < 140) {
    if (p < 66) out.target.copy(HERD_START);
    else herdPos(p, d, out.target).lerp(HERD_START, 1 - seg(p, 66, 74));
    const f = Math.floor(Math.min(11, Math.max(0, (p - 70) / 4.6)));
    const [t0, t1] = fragWindow(f);
    const u = seg(p, t0, t1);
    if (f % 3 === 0 && u > 0.05 && u < 0.44) {
      d.itemPosition(f, point);
      out.task = { kind: 'carry', point: point.clone() };
      out.target.copy(point).add(B.set(-0.22, 0.12, 0.02));
    }
    return out;
  }

  // Into Act 2.
  if (p < 182) {
    herdPos(140, d, A);
    seamPos(0, p, m, P);
    out.target.copy(A).lerp(P, easeInOut(seg(p, 140, 176)));
    return out;
  }

  // Act 2: weld each seam, gliding between them.
  if (p < 262) {
    let k = 0;
    while (k < 3 && p > weldWindow(k)[1]) k++;
    const [w0, w1] = weldWindow(k);
    if (p < w0 && k > 0) {
      const prevEnd = weldWindow(k - 1)[1];
      seamPos(k - 1, p, m, A);
      seamPos(k, p, m, P);
      out.target.copy(A).lerp(P, easeInOut(seg(p, prevEnd, w0)));
    } else {
      seamPos(k, p, m, out.target);
    }
    if (p >= w0 && p <= w1) {
      m.seamPoint(k, p, point);
      out.task = { kind: 'weld', point: point.clone(), heat: seg(p, w0, w0 + 0.8) * (1 - seg(p, w1 - 0.8, w1)) };
    }
    if (p > w1) {
      seamPos(3, p, m, A);
      out.target.copy(A).lerp(A.clone().add(B.set(0.15, 0.35, 0.1)), easeInOut(seg(p, w1, 262)));
    }
    return out;
  }

  // Watch the spin-up, then to the first plate.
  if (p < plateStart(0) + 6) {
    seamPos(3, 262, m, A).add(B.set(0.15, 0.35, 0.1));
    boltPos(0, m, P);
    out.target.copy(A).lerp(P, easeInOut(seg(p, 270, plateStart(0) + 6)));
    return out;
  }

  // Act 3: bolt each plate as it locks.
  if (p < 366) {
    let k = 0;
    while (k < PLATES.length - 1 && p > plateStart(k) + 15) k++;
    const s = plateStart(k);
    if (p < s + 6 && k > 0) {
      boltPos(k - 1, m, A);
      boltPos(k, m, P);
      out.target.copy(A).lerp(P, easeInOut(seg(p, s - 2, s + 6)));
    } else {
      boltPos(k, m, out.target);
    }
    if (p >= s + 6 && p <= s + 13.5) {
      m.plateBoltPoint(k, point);
      out.task = { kind: 'bolt', point: point.clone(), twist: easeInOut(seg(p, s + 9, s + 13)) };
    }
    return out;
  }

  // Power-on: back off, thumbs up, then hover beside the machine.
  boltPos(PLATES.length - 1, m, A);
  out.target.copy(A).lerp(POWER_SPOT, easeInOut(seg(p, 366, 374)));
  if (p > 392) out.target.lerp(HOVER_BESIDE, easeInOut(seg(p, 392, 400)));
  if (p >= 370 && p < 394) out.task = { kind: 'thumbs' };
  return out;
}

export const BOT_CAREER = new Vector3(5.0, 1.42, 3.35);
/** Leaving Career: risen out of the top of the frame, as if scrolled away with the timeline. */
export const BOT_CAREER_UP = BOT_CAREER.clone().add(new Vector3(0, 1.05, 0));
/** Out of sight above the Contact framing while the toolbench is on screen; it drops in from here. */
export const BOT_WINGS = new Vector3(4.6, 3.6, 3.2);

const SW_CENTER = new Vector3(0, 1.32, 0);

/**
 * In Projects, the bot acts out the sheet in view while the machine runs its show:
 * SOP tightens the Gates plate, StoryWeaver sweeps around the front, EcoSurve follows the scan,
 * GPT-2 welds a seam while the forward pass climbs the layers.
 */
export function planProject(project: string | null, t: number, m: MachineHandles, out: BotPlan): BotPlan | null {
  if (!project) return null;
  switch (project) {
    case 'sop': {
      boltPos(0, m, out.target);
      m.plateBoltPoint(0, point);
      out.task = { kind: 'bolt', point: point.clone(), twist: easeInOut((t * 0.55) % 1) };
      out.tool = 'gripper';
      return out;
    }
    case 'storyweaver': {
      const a = Math.sin(t * 0.42) * 1.05;
      out.target.set(Math.sin(a) * 1.3, SW_CENTER.y + Math.sin(t * 1.3) * 0.08, Math.cos(a) * 1.3);
      out.task = { kind: 'look', point: SW_CENTER };
      out.tool = 'gripper';
      return out;
    }
    case 'ecosurve': {
      const a = (50 * Math.PI) / 180;
      const y = m.scanHeight();
      out.target.set(Math.sin(a) * 1.12, y + 0.08, Math.cos(a) * 1.12);
      out.task = { kind: 'look', point: point.set(0, y, 0).clone() };
      out.tool = 'gripper';
      return out;
    }
    case 'gpt2': {
      const k = Math.floor(t / 2.6) % 3;
      seamPos(k, 400, m, out.target);
      m.seamPoint(k, 400, point);
      out.task = { kind: 'weld', point: point.clone(), heat: 0.85 };
      out.tool = 'welder';
      return out;
    }
  }
  return null;
}

/** Where the bot is, and what it does, at each after-build spot. */
export function planSpot(spot: Spot, project: string | null, t: number, m: MachineHandles, d: DataHandles, out: BotPlan): BotPlan {
  switch (spot) {
    case 'exit':
      return planBot(400, m, d, out);
    case 'projects':
      return planProject(project, t, m, out) ?? planBot(400, m, d, out);
    case 'career':
      out.target.copy(BOT_CAREER);
      out.task = { kind: 'idle' };
      out.tool = 'gripper';
      return out;
    case 'careerUp':
      out.target.copy(BOT_CAREER_UP);
      out.task = { kind: 'idle' };
      out.tool = 'gripper';
      return out;
    case 'toolbench':
      out.target.copy(BOT_WINGS);
      out.task = { kind: 'idle' };
      out.tool = 'gripper';
      return out;
    case 'contact':
      contactBotPoint(out.target);
      out.task = { kind: 'cool' };
      out.tool = 'gripper';
      return out;
  }
}

export const newPlan = (): BotPlan => ({ target: new Vector3(), task: { kind: 'idle' }, tool: 'welder' });
