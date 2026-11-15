import { Vector3 } from 'three';
import { input } from '../input';
import type { ArmPose, BotPose, ToolName } from './buildBot';
import type { EyeState } from './face';

export type BotTask =
  | { kind: 'idle' }
  | { kind: 'weld'; point: Vector3; heat: number }
  | { kind: 'carry'; point: Vector3 }
  | { kind: 'bolt'; point: Vector3; twist: number }
  | { kind: 'thumbs' }
  | { kind: 'salute' };

export type BotContext = {
  /** World position the bot should hover at. */
  target: Vector3;
  task: BotTask;
  /** Tool on the left (tool) arm for this moment of the build. The right arm is a gripper. */
  tool: ToolName;
  /** Bot's projected screen position, for looking at the cursor. */
  screenX: number;
  screenY: number;
  motion: boolean;
  /** Deterministic pose for still-frame captures: no blinking, sleeping or wobble. */
  capture: boolean;
  /** The pointer is over the bot. */
  hover?: boolean;
};

const SLEEP_AFTER = 20000;
const _dir = new Vector3();

/** Pulls a hand target back toward the shoulder by the tool's length, so the tool tip lands on it. */
function reachFor(target: Vector3, shoulder: Vector3, toolLength: number) {
  _dir.subVectors(target, shoulder);
  const len = _dir.length();
  if (len > toolLength) target.addScaledVector(_dir.normalize(), -toolLength);
  return target;
}
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** The bot's procedural behaviour: hover, lean, look, blink, doze, get dizzy, spin, do the work. */
export class BotBrain {
  pos = new Vector3(Infinity, 0, 0);
  vel = new Vector3();
  yaw = 0;
  pitch = 0;
  roll = 0;
  private nextBlink = 2;
  private blinkUntil = -1;
  private spinStart = -10;
  private startleUntil = -1;
  private dizzyUntil = -1;
  private lastShake = 0;
  private asleep = false;
  private saluteStart = -10;
  private happyUntil = -1;
  /** 0..1, eased: how much the hover reaction is showing. */
  private hoverK = 0;
  private wasHover = false;
  private nodStart = -10;
  private tilt = 0;
  private tuckL = new Vector3();
  private tuckR = new Vector3();
  private tool: ToolName = 'welder';
  private swapStart = -10;
  private swapTo: ToolName = 'welder';
  private local = new Vector3();
  private shoulderL = new Vector3(-0.19, -0.006, 0);
  private shoulderR = new Vector3(0.19, -0.006, 0);
  readonly pose: BotPose;

  constructor() {
    const arm = (side: number): ArmPose => ({
      target: new Vector3(side * 0.21, -0.07, 0.13),
      tool: side < 0 ? 'welder' : 'gripper',
      retract: 0,
      open: 0.3,
      thumb: 0,
      roll: 0,
    });
    this.pose = {
      eyes: 'open',
      dx: 0,
      dy: 0,
      frame: 0,
      led: 'idle',
      thruster: 1,
      weld: 0,
      left: arm(-1),
      right: arm(1),
    };
  }

  poke(t: number) {
    this.spinStart = t;
    this.asleep = false;
    input.lastInput = performance.now();
  }

  salute(t: number) {
    this.saluteStart = t;
  }

  /** A short happy reaction, for example when the machine is pinged. */
  react(t: number) {
    this.happyUntil = t + 1.4;
  }

  /** Spin angle for the click animation. */
  spinAngle(t: number) {
    const k = (t - this.spinStart) / 0.8;
    return k >= 0 && k <= 1 ? easeInOut(k) * Math.PI * 2 : 0;
  }

  update(dt: number, t: number, ctx: BotContext, toLocal: (world: Vector3, out: Vector3) => Vector3) {
    const pose = this.pose;
    dt = Math.min(dt, 0.05);
    const nowMs = performance.now();

    // Sleep after 20 s without input; any input wakes with a startle.
    if (!ctx.capture) {
      const idle = nowMs - input.lastInput > SLEEP_AFTER;
      if (idle && !this.asleep) this.asleep = true;
      if (!idle && this.asleep) {
        this.asleep = false;
        this.startleUntil = t + 0.5;
      }
    } else this.asleep = false;
    if (input.shakeAt !== this.lastShake) {
      this.lastShake = input.shakeAt;
      if (!this.asleep && ctx.motion) this.dizzyUntil = t + 1.6;
    }

    // Position: critically damped follow, a gentle bob, lean into the motion.
    if (!Number.isFinite(this.pos.x) || ctx.capture || this.pos.distanceTo(ctx.target) > 6) {
      this.pos.copy(ctx.target);
      this.vel.set(0, 0, 0);
    } else {
      const w = 5.2;
      const ax = -2 * w * this.vel.x - w * w * (this.pos.x - ctx.target.x);
      const ay = -2 * w * this.vel.y - w * w * (this.pos.y - ctx.target.y);
      const az = -2 * w * this.vel.z - w * w * (this.pos.z - ctx.target.z);
      this.vel.x += ax * dt;
      this.vel.y += ay * dt;
      this.vel.z += az * dt;
      this.pos.addScaledVector(this.vel, dt);
    }
    const dizzy = t < this.dizzyUntil;
    const bobAmp = this.asleep ? 0.016 : 0.011;
    const bobSpeed = this.asleep ? 0.9 : 2.1;
    const bob = ctx.capture || !ctx.motion ? 0 : Math.sin(t * bobSpeed) * bobAmp - (this.asleep ? 0.025 : 0);

    // Facing: toward the work, else toward the cursor.
    let yawT = 0;
    let pitchT = 0;
    let dx = 0;
    let dy = 0;
    const working = ctx.task.kind === 'weld' || ctx.task.kind === 'carry' || ctx.task.kind === 'bolt';
    if (working && 'point' in ctx.task) {
      const d = ctx.task.point.clone().sub(this.pos);
      // Turn toward the work, but never so far that the face leaves the camera.
      yawT = clamp(Math.atan2(d.x, d.z) * 0.45, -0.7, 0.7);
      pitchT = clamp(-Math.atan2(d.y, Math.hypot(d.x, d.z)) * 0.6, -0.4, 0.4);
      dx = d.x > 0.05 ? 1 : d.x < -0.05 ? -1 : 0;
      dy = d.y < -0.05 ? 1 : 0;
    } else if (input.hasPointer && !ctx.capture) {
      const nx = (input.x - ctx.screenX) / window.innerWidth;
      const ny = (input.y - ctx.screenY) / window.innerHeight;
      yawT = clamp(nx * 1.3, -0.27, 0.27);
      pitchT = clamp(ny * 0.8, -0.2, 0.22);
      dx = nx > 0.08 ? 1 : nx < -0.08 ? -1 : 0;
      dy = ny > 0.12 ? 1 : ny < -0.12 ? -1 : 0;
    }
    if (this.asleep) {
      yawT = 0;
      pitchT = 0.18;
    }
    const k = 1 - Math.exp(-dt * 6);
    this.yaw += (yawT - this.yaw) * k;
    this.pitch += (pitchT - this.pitch) * k;

    // Hover reaction, eased in and out: one small nod, then a curious head tilt toward the
    // pointer, grippers tucked together, a soft bounce.
    const hovering = !!ctx.hover && !working && !this.asleep && ctx.motion;
    if (hovering && !this.wasHover) this.nodStart = t;
    this.wasHover = hovering;
    this.hoverK += ((hovering ? 1 : 0) - this.hoverK) * (1 - Math.exp(-dt * 5));
    const side = input.x >= ctx.screenX ? -1 : 1;
    this.tilt += (side * 0.2 * this.hoverK - this.tilt) * (1 - Math.exp(-dt * 4));
    const nodU = (t - this.nodStart) / 0.6;
    const nod = nodU >= 0 && nodU <= 1 ? Math.sin(Math.PI * nodU) * 0.26 : 0;
    const bounce = this.hoverK * (1 - Math.cos(t * 4.2)) * 0.006;

    const leanZ = clamp(-this.vel.x * 0.55, -0.4, 0.4);
    const leanX = clamp(this.vel.z * 0.45, -0.3, 0.3) + clamp(-this.vel.y * 0.2, -0.15, 0.15);
    const wobble = dizzy ? Math.sin(t * 9) * 0.18 : 0;
    this.roll += (leanZ + wobble - this.roll) * k;

    // Eyes.
    let eyes: EyeState = 'open';
    if (t > this.nextBlink && !ctx.capture) {
      this.blinkUntil = t + 0.12;
      this.nextBlink = t + 3 + Math.random() * 3;
    }
    if (working) eyes = 'focus';
    if (t < this.blinkUntil) eyes = 'blink';
    if (ctx.task.kind === 'thumbs' || ctx.task.kind === 'salute' || t - this.saluteStart < 1.6) eyes = 'happy';
    if (!working && (ctx.hover || t < this.happyUntil)) eyes = 'happy';
    if (t < this.startleUntil) eyes = 'startle';
    if (dizzy) eyes = 'spiral';
    if (this.asleep) eyes = 'closed';
    pose.eyes = eyes;
    pose.dx = eyes === 'open' || eyes === 'focus' ? dx : 0;
    pose.dy = eyes === 'open' || eyes === 'focus' ? dy : 0;
    pose.frame = Math.floor(t * 10);
    pose.led = this.asleep ? 'off' : working ? 'work' : 'idle';
    pose.thruster = this.asleep ? 0.35 : 0.85 + this.hoverK * 0.2 + (ctx.motion && !ctx.capture ? Math.sin(t * 31) * 0.08 + Math.sin(t * 17) * 0.07 : 0);

    // Tool swap: retract the old tool into the wrist, extend the new one.
    if (ctx.tool !== this.swapTo) {
      this.swapTo = ctx.tool;
      this.swapStart = ctx.capture ? -10 : t;
    }
    const sw = clamp((t - this.swapStart) / 0.5, 0, 1);
    if (sw >= 0.5 || ctx.capture) this.tool = this.swapTo;
    pose.left.tool = this.tool;
    pose.left.retract = ctx.capture ? 0 : sw < 1 ? 1 - Math.abs(sw * 2 - 1) : 0;

    // Arms: the left arm holds the tool and does the work; the right gripper steadies or carries.
    const rest = (side: number, out: Vector3) =>
      out.set(side * 0.215, this.asleep ? -0.13 : -0.075 + (ctx.motion && !ctx.capture ? Math.sin(t * 2.1 + side) * 0.008 : 0), this.asleep ? 0.06 : 0.135);
    rest(-1, pose.left.target);
    rest(1, pose.right.target);
    pose.left.open = 0.3;
    pose.left.thumb = 0;
    pose.right.thumb = 0;
    pose.right.open = 0.3;
    pose.left.roll = 0;
    pose.right.roll = 0;
    pose.weld = 0;
    switch (ctx.task.kind) {
      case 'weld': {
        reachFor(toLocal(ctx.task.point, this.local), this.shoulderL, 0.055);
        pose.left.target.copy(this.local);
        pose.weld = ctx.task.heat * (ctx.capture ? 1 : 0.75 + Math.random() * 0.25);
        pose.right.target.set(0.16, -0.06, 0.16);
        break;
      }
      case 'carry': {
        reachFor(toLocal(ctx.task.point, this.local), this.shoulderR, 0.03);
        pose.right.target.copy(this.local);
        pose.right.open = 0.05;
        break;
      }
      case 'bolt': {
        // Use whichever gripper is on the side of the bolt.
        toLocal(ctx.task.point, this.local);
        const useRight = this.local.x >= 0;
        const arm = useRight ? pose.right : pose.left;
        const other = useRight ? pose.left : pose.right;
        reachFor(this.local, useRight ? this.shoulderR : this.shoulderL, 0.035);
        arm.target.copy(this.local);
        arm.open = 0.05;
        arm.roll = ctx.task.twist * Math.PI * 2;
        other.target.set(useRight ? -0.17 : 0.17, -0.02, 0.15);
        other.open = 0.6;
        break;
      }
      case 'thumbs': {
        pose.right.target.set(0.17, 0.1, 0.1);
        pose.right.open = 0;
        pose.right.thumb = 1;
        break;
      }
    }
    // Hovered: grippers drift together under the face, as if pleased to be noticed.
    if (this.hoverK > 0.001 && !working) {
      pose.left.target.lerp(this.tuckL.set(-0.075, -0.1, 0.17), this.hoverK);
      pose.right.target.lerp(this.tuckR.set(0.075, -0.1, 0.17), this.hoverK);
      pose.left.open += (0.08 - pose.left.open) * this.hoverK;
      pose.right.open += (0.08 - pose.right.open) * this.hoverK;
    }
    // Salute: right hand up to the top corner of the screen, hold, then snap out.
    const st = t - this.saluteStart;
    if (st >= 0 && st < 1.6) {
      const up = st < 0.25 ? easeInOut(st / 0.25) : st < 1.15 ? 1 : 1 - easeInOut((st - 1.15) / 0.45);
      pose.right.target.lerp(this.local.set(0.115, 0.1, 0.13), up);
      pose.right.open = 0;
    }

    return {
      x: this.pos.x,
      y: this.pos.y + bob + bounce,
      z: this.pos.z,
      yaw: this.yaw + this.spinAngle(t),
      pitch: this.pitch + leanX + nod,
      roll: this.roll + this.tilt,
    };
  }
}
