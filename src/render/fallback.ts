/**
 * Procedural chibi drawings used whenever a generated sprite is unavailable.
 * Every entity is drawn feet-at-(x, y) facing right; monsters face left.
 * All animations are driven by `anim` (state) + `t` (seconds in state) + `phase` (continuous time).
 */
import { JOBS, type JobPath, type JobTier } from '@/game/jobs';
import type { MonsterType } from '@/game/monsters';
import { RARITY_COLORS, type Rarity } from '@/game/balance';
import { TAU, clamp, easeOutCubic } from '@/util/math';
import type { AnimName } from './assets';

const OUTLINE = '#1c1630';
const SKIN = '#ffd8b4';

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = clamp(((n >> 16) & 255) + amt, 0, 255);
  const g = clamp(((n >> 8) & 255) + amt, 0, 255);
  const b = clamp((n & 255) + amt, 0, 255);
  return `rgb(${r},${g},${b})`;
}

function eye(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, closed = false, angry = false): void {
  if (closed) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r, y);
    ctx.lineTo(x + r, y);
    ctx.stroke();
    return;
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 1.15, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = OUTLINE;
  ctx.beginPath();
  ctx.arc(x + r * 0.2, y + r * 0.1, r * 0.55, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + r * 0.35, y - r * 0.2, r * 0.2, 0, TAU);
  ctx.fill();
  if (angry) {
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - r * 1.1, y - r * 1.3);
    ctx.lineTo(x + r * 0.9, y - r * 0.7);
    ctx.stroke();
  }
}

// ---- hero ---------------------------------------------------------------------

const HAIR: Record<JobPath | 'novice', string> = { novice: '#b5652c', warrior: '#c0392b', mage: '#6f4bd8', archer: '#3c9a4a', thief: '#2f2b4a' };

function drawWeapon(ctx: CanvasRenderingContext2D, job: JobPath | null, tier: JobTier, swing: number): void {
  // origin at hand; blade points +x
  const col = job ? JOBS[job].color : '#a8a8b8';
  ctx.save();
  ctx.rotate(swing);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  const len = 18 + tier * 3;
  switch (job) {
    case 'mage': {
      ctx.fillStyle = '#8b5a2b';
      rr(ctx, -2, -len - 6, 4, len + 10, 2);
      ctx.fill();
      ctx.stroke();
      const g = ctx.createRadialGradient(0, -len - 6, 1, 0, -len - 6, 7 + tier);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.5, col);
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -len - 6, 7 + tier, 0, TAU);
      ctx.fill();
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -len - 6, 4 + tier * 0.5, 0, TAU);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'archer': {
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(-4, 0, len * 0.8, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(-4, 0, len * 0.8, -Math.PI * 0.5, Math.PI * 0.5);
      ctx.stroke();
      ctx.strokeStyle = '#eee';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-4, -len * 0.8);
      ctx.lineTo(-4, len * 0.8);
      ctx.stroke();
      break;
    }
    case 'thief': {
      ctx.fillStyle = '#d8dde8';
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(len * 0.7, -1);
      ctx.lineTo(len * 0.7 + 4, 0);
      ctx.lineTo(len * 0.7, 1);
      ctx.lineTo(0, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = col;
      rr(ctx, -6, -3, 6, 6, 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'warrior':
    default: {
      ctx.fillStyle = job ? '#e8ecf5' : '#c9b48a';
      ctx.beginPath();
      ctx.moveTo(2, -3);
      ctx.lineTo(len, -2);
      ctx.lineTo(len + 5, 0);
      ctx.lineTo(len, 2);
      ctx.lineTo(2, 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = job ? col : '#8b5a2b';
      rr(ctx, -1, -6, 4, 12, 1.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#8b5a2b';
      rr(ctx, -8, -2.5, 8, 5, 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}

export function drawHero(ctx: CanvasRenderingContext2D, job: JobPath | null, tier: JobTier, anim: AnimName, t: number, phase: number, x: number, y: number, scale = 1, flash = 0): void {
  const col = job ? JOBS[job].color : '#6fa7d8';
  const hair = HAIR[job ?? 'novice'];
  const walk = anim === 'walk';
  const swingT = anim === 'attack' ? clamp(t / 0.3, 0, 1) : 0;
  const castT = anim === 'cast' ? clamp(t / 0.35, 0, 1) : 0;
  const deathT = anim === 'death' ? clamp(t / 0.6, 0, 1) : 0;
  const hitT = anim === 'hit' ? clamp(t / 0.25, 0, 1) : 0;
  const bob = walk ? Math.abs(Math.sin(phase * 9)) * 3 : Math.sin(phase * 2.2) * 1.2;
  const legSwing = walk ? Math.sin(phase * 9) * 0.6 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (deathT > 0) {
    ctx.globalAlpha *= 1 - deathT * 0.85;
    ctx.rotate(-easeOutCubic(deathT) * Math.PI * 0.5);
  }
  if (hitT > 0) ctx.translate(-4 * (1 - hitT), 0);
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 14, 4, 0, 0, TAU);
  ctx.fill();
  ctx.translate(0, -bob);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // aura for high tiers
  if (tier >= 3 && deathT === 0) {
    const g = ctx.createRadialGradient(0, -26, 4, 0, -26, 34);
    g.addColorStop(0, col + '55');
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -26, 34, 0, TAU);
    ctx.fill();
  }
  // cape (tier ≥ 2)
  if (tier >= 2) {
    ctx.fillStyle = shade(col, -50);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    const flap = Math.sin(phase * 6) * 3 + (walk ? 4 : 0);
    ctx.beginPath();
    ctx.moveTo(-4, -34);
    ctx.quadraticCurveTo(-16 - flap, -20, -12 - flap, -4);
    ctx.lineTo(-2, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // legs
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 6;
  for (const s of [-1, 1]) {
    const lx = s * 5;
    const sw = legSwing * s;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(lx, -14);
    ctx.lineTo(lx + Math.sin(sw) * 9, -2 + Math.abs(Math.sin(sw)) * 2);
    ctx.stroke();
    ctx.strokeStyle = '#3d3556';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.fillStyle = shade(col, -40);
    ctx.beginPath();
    ctx.ellipse(lx + Math.sin(sw) * 9 + 1, -1 + Math.abs(Math.sin(sw)) * 2, 5, 3, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // long hair behind the body (ponytail swaying)
  const sway = Math.sin(phase * 3) * 2 + (walk ? Math.sin(phase * 9) * 2 : 0);
  ctx.fillStyle = hair;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -50);
  ctx.quadraticCurveTo(-20 - sway, -40, -16 - sway, -14);
  ctx.quadraticCurveTo(-12, -10, -6, -20);
  ctx.lineTo(-4, -44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // body (tunic with a short skirt)
  ctx.fillStyle = col;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  rr(ctx, -9, -32, 18, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = shade(col, -25);
  ctx.beginPath();
  ctx.moveTo(-9, -16);
  ctx.lineTo(9, -16);
  ctx.lineTo(12, -9);
  ctx.lineTo(-12, -9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // belt / tier stripes
  ctx.fillStyle = shade(col, -60);
  rr(ctx, -9, -17, 18, 4, 1);
  ctx.fill();
  if (tier >= 1) {
    ctx.fillStyle = '#ffd166';
    for (let i = 0; i < Math.min(tier, 4); i++) {
      ctx.beginPath();
      ctx.arc(-5 + i * 3.4, -15, 1.2, 0, TAU);
      ctx.fill();
    }
  }
  // shoulder pads (tier ≥ 2)
  if (tier >= 2) {
    ctx.fillStyle = shade(col, 40);
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(s * 10, -29, 5, 3.5, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
  }
  // back arm
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(-7, -28);
  ctx.lineTo(-11 + (walk ? Math.sin(phase * 9) * 5 : 0), -18);
  ctx.stroke();
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  // head
  const headY = -44;
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, headY, 13, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // hair: side-swept bangs with a ribbon
  ctx.fillStyle = hair;
  ctx.beginPath();
  ctx.arc(0, headY - 2, 13.5, Math.PI * 1.0, Math.PI * 2.0);
  ctx.quadraticCurveTo(12, headY + 2, 9, headY + 6);
  ctx.quadraticCurveTo(6, headY - 4, 0, headY - 4);
  ctx.quadraticCurveTo(-7, headY - 6, -10, headY + 4);
  ctx.quadraticCurveTo(-14, headY + 4, -13.5, headY - 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = job ? shade(col, 40) : '#ff6fa3';
  ctx.beginPath();
  ctx.moveTo(-10, headY - 10);
  ctx.lineTo(-16, headY - 16);
  ctx.lineTo(-13, headY - 8);
  ctx.lineTo(-17, headY - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // hat / crown per job
  if (job === 'mage') {
    ctx.fillStyle = shade(col, -20);
    ctx.beginPath();
    ctx.moveTo(-14, headY - 8);
    ctx.lineTo(14, headY - 8);
    ctx.lineTo(4, headY - 14);
    ctx.lineTo(2 + Math.sin(phase * 3) * 2, headY - 34 - tier * 2);
    ctx.lineTo(-4, headY - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (job === 'archer') {
    ctx.fillStyle = shade(col, -30);
    ctx.beginPath();
    ctx.moveTo(-12, headY - 7);
    ctx.lineTo(12, headY - 9);
    ctx.lineTo(6, headY - 16);
    ctx.lineTo(-8, headY - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ff4f6d';
    ctx.beginPath();
    ctx.moveTo(8, headY - 12);
    ctx.lineTo(20, headY - 22);
    ctx.lineTo(11, headY - 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (job === 'thief') {
    ctx.fillStyle = shade(col, -70);
    rr(ctx, -13, headY - 4, 26, 6, 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-12, headY - 2);
    ctx.lineTo(-22 - Math.sin(phase * 5) * 3, headY + 6);
    ctx.lineTo(-13, headY + 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else if (job === 'warrior' && tier >= 2) {
    ctx.fillStyle = '#d9dde8';
    rr(ctx, -13, headY - 12, 26, 8, 3);
    ctx.fill();
    ctx.stroke();
    if (tier >= 3) {
      ctx.fillStyle = '#ff4f6d';
      ctx.beginPath();
      ctx.moveTo(0, headY - 12);
      ctx.quadraticCurveTo(-6, headY - 28, -14 - Math.sin(phase * 4) * 2, headY - 22);
      ctx.quadraticCurveTo(-4, headY - 18, 0, headY - 12);
      ctx.fill();
      ctx.stroke();
    }
  }
  if (tier >= 4) {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const px = -10 + i * 5;
      ctx.lineTo(px, headY - 14);
      ctx.lineTo(px + 2.5, headY - 22 - (i === 2 ? 4 : 0));
    }
    ctx.lineTo(12, headY - 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  // face
  const closed = deathT > 0.3;
  eye(ctx, 4, headY + 1, 3.0, closed, anim === 'attack');
  eye(ctx, 10, headY + 1, 3.0, closed, anim === 'attack');
  ctx.fillStyle = '#ff9aa2';
  ctx.beginPath();
  ctx.arc(1, headY + 5, 1.8, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (hitT > 0 || deathT > 0) {
    ctx.arc(7, headY + 8, 2, Math.PI, 0);
  } else {
    ctx.arc(7, headY + 5, 2.5, 0.15, Math.PI - 0.15);
  }
  ctx.stroke();
  // front arm + weapon
  const armBase = walk ? Math.sin(phase * 9 + Math.PI) * 0.5 : 0;
  let swing = -0.9 + armBase * 0.3;
  if (swingT > 0) swing = -2.2 + easeOutCubic(swingT) * 3.0;
  if (castT > 0) swing = -2.4 + Math.sin(castT * Math.PI) * 0.3;
  if (job === 'archer') swing = swingT > 0 ? -0.1 : -0.2;
  ctx.save();
  ctx.translate(6, -26);
  const armAng = job === 'archer' ? -0.2 : swing + 0.9;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(armAng) * 10, Math.sin(armAng) * 10);
  ctx.stroke();
  ctx.strokeStyle = SKIN;
  ctx.lineWidth = 3.5;
  ctx.stroke();
  ctx.translate(Math.cos(armAng) * 10, Math.sin(armAng) * 10);
  drawWeapon(ctx, job, tier, job === 'archer' ? 0 : swing);
  ctx.restore();
  // attack slash arc
  if (swingT > 0 && swingT < 0.7 && job !== 'archer' && job !== 'mage') {
    ctx.strokeStyle = `rgba(255,255,255,${0.9 - swingT})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(14, -26, 22 + swingT * 8, -1.1 + swingT * 1.5, -0.2 + swingT * 1.5);
    ctx.stroke();
  }
  if (castT > 0) {
    ctx.fillStyle = `rgba(255,255,255,${(1 - castT) * 0.6})`;
    ctx.beginPath();
    ctx.arc(16, -40, 6 + castT * 10, 0, TAU);
    ctx.fill();
  }
  if (flash > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,80,80,${flash * 0.5})`;
    ctx.beginPath();
    ctx.ellipse(0, -28, 18, 32, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// ---- monsters -----------------------------------------------------------------

export function drawMonster(ctx: CanvasRenderingContext2D, type: MonsterType, boss: boolean, anim: AnimName, t: number, phase: number, x: number, y: number, scale = 1, flash = 0, hue = 0): void {
  const col = type.color;
  const dark = shade(col, -60);
  const light = shade(col, 50);
  const deathT = anim === 'death' ? clamp(t / 0.6, 0, 1) : 0;
  const hitT = anim === 'hit' ? clamp(t / 0.2, 0, 1) : 0;
  const atkT = anim === 'attack' ? clamp(t / 0.35, 0, 1) : 0;
  const walk = anim === 'walk';
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (hue) ctx.filter = `hue-rotate(${hue}deg)`;
  const lunge = atkT > 0 ? -Math.sin(atkT * Math.PI) * 14 : 0;
  ctx.translate(lunge, 0);
  if (hitT > 0) ctx.translate(6 * (1 - hitT), 0);
  if (deathT > 0) {
    ctx.globalAlpha *= 1 - deathT;
    ctx.translate(0, deathT * 6);
    ctx.scale(1 + deathT * 0.4, 1 - deathT * 0.6);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 16, 4.5, 0, 0, TAU);
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2.2;
  const eyeR = 3;
  const angry = atkT > 0 || boss;
  const closed = deathT > 0.3;
  switch (type.shape) {
    case 'blob': {
      const sq = walk ? Math.abs(Math.sin(phase * 7)) : Math.sin(phase * 3) * 0.5 + 0.5;
      const w = 30 + sq * 5;
      const h = 26 - sq * 4;
      ctx.translate(0, walk ? -Math.abs(Math.sin(phase * 7)) * 6 : 0);
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(-w / 2, 0);
      ctx.quadraticCurveTo(-w / 2 - 4, -h, 0, -h);
      ctx.quadraticCurveTo(w / 2 + 4, -h, w / 2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // fluff tufts
      ctx.fillStyle = light;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(-9 + i * 6, -h + 2 + (i % 2) * 3, 4, 0, TAU);
        ctx.fill();
      }
      eye(ctx, -8, -h * 0.5, eyeR, closed, angry);
      eye(ctx, 0, -h * 0.5, eyeR, closed, angry);
      mouth(ctx, -4, -h * 0.25, atkT > 0);
      break;
    }
    case 'hopper': {
      const hop = walk ? Math.abs(Math.sin(phase * 8)) * 12 : 0;
      ctx.translate(0, -hop);
      // ears
      ctx.fillStyle = col;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 5, -28);
        ctx.rotate(s * 0.25 + Math.sin(phase * 8) * 0.1);
        rr(ctx, -3, -16, 6, 18, 3);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#ffb3c1';
        rr(ctx, -1.5, -13, 3, 12, 2);
        ctx.fill();
        ctx.restore();
        ctx.fillStyle = col;
      }
      ctx.beginPath();
      ctx.ellipse(0, -16, 15, 15, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // feet
      ctx.fillStyle = dark;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * 7, -1, 6, 3, 0, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      eye(ctx, -7, -19, eyeR, closed, angry);
      eye(ctx, 1, -19, eyeR, closed, angry);
      ctx.fillStyle = '#ff8fa3';
      ctx.beginPath();
      ctx.arc(-4, -13, 1.8, 0, TAU);
      ctx.fill();
      break;
    }
    case 'flyer': {
      const hover = Math.sin(phase * 5) * 4;
      ctx.translate(0, -22 + hover);
      const flap = Math.sin(phase * 22) * 0.7;
      ctx.fillStyle = light;
      for (const s of [-1, 1]) {
        ctx.save();
        ctx.translate(s * 8, -4);
        ctx.rotate(s * flap);
        ctx.beginPath();
        ctx.ellipse(s * 9, 0, 11, 5, s * 0.3, 0, TAU);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 10, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = dark;
      for (let i = -1; i <= 1; i++) {
        rr(ctx, -2 + i * 5, -9, 2.5, 18, 1);
        ctx.fill();
      }
      eye(ctx, -6, -2, eyeR * 0.9, closed, angry);
      eye(ctx, 1, -2, eyeR * 0.9, closed, angry);
      ctx.fillStyle = '#ffd166';
      ctx.beginPath();
      ctx.moveTo(-10, 2);
      ctx.lineTo(-16, 4);
      ctx.lineTo(-10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'walker': {
      const step = walk ? Math.sin(phase * 8) : 0;
      ctx.translate(0, walk ? -Math.abs(step) * 2 : 0);
      ctx.strokeStyle = OUTLINE;
      for (const s of [-1, 1]) {
        ctx.lineWidth = 7;
        ctx.strokeStyle = OUTLINE;
        ctx.beginPath();
        ctx.moveTo(s * 6, -12);
        ctx.lineTo(s * 6 + step * s * 6, -1);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.strokeStyle = dark;
        ctx.stroke();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.2;
      ctx.fillStyle = col;
      rr(ctx, -13, -34, 26, 24, 7);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = light;
      rr(ctx, -9, -30, 18, 8, 3);
      ctx.fill();
      // arms
      for (const s of [-1, 1]) {
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(s * 12, -26);
        ctx.lineTo(s * 17 + (s < 0 ? lunge * 0.5 : 0), -16 + step * 3);
        ctx.stroke();
        ctx.strokeStyle = col;
        ctx.lineWidth = 3.5;
        ctx.stroke();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.2;
      eye(ctx, -7, -22, eyeR, closed, angry);
      eye(ctx, 1, -22, eyeR, closed, angry);
      mouth(ctx, -3, -15, atkT > 0);
      break;
    }
    case 'floater': {
      const hover = Math.sin(phase * 3) * 5;
      ctx.translate(0, -16 + hover);
      ctx.globalAlpha *= 0.92;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(0, -10, 15, Math.PI, 0);
      const wob = Math.sin(phase * 6) * 2;
      ctx.lineTo(15, 4);
      for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(11 - i * 7.5, 10 + wob * (i % 2 ? 1 : -1), 7.5 - i * 7.5, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.arc(-5, -16, 4, 0, TAU);
      ctx.fill();
      eye(ctx, -7, -10, eyeR, closed, angry);
      eye(ctx, 1, -10, eyeR, closed, angry);
      mouth(ctx, -3, -3, atkT > 0);
      break;
    }
    case 'crawler': {
      ctx.fillStyle = col;
      // legs
      for (let i = 0; i < 4; i++) {
        const lx = -12 + i * 8;
        const wig = walk ? Math.sin(phase * 14 + i) * 3 : 0;
        ctx.strokeStyle = OUTLINE;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(lx, -8);
        ctx.lineTo(lx + wig, 0);
        ctx.stroke();
        ctx.strokeStyle = dark;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2.2;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.ellipse(0, -13, 19, 11, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = light;
      ctx.beginPath();
      ctx.ellipse(0, -16, 12, 5, 0, 0, TAU);
      ctx.fill();
      // pincers
      ctx.fillStyle = dark;
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(-18, -14 + s * 3);
        ctx.lineTo(-27 - (atkT > 0 ? 5 : 0), -16 + s * 7);
        ctx.lineTo(-19, -12 + s * 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
      eye(ctx, -12, -18, eyeR * 0.9, closed, angry);
      eye(ctx, -5, -18, eyeR * 0.9, closed, angry);
      break;
    }
    case 'golem': {
      const stomp = walk ? Math.abs(Math.sin(phase * 5)) : 0;
      ctx.translate(0, -stomp * 3);
      ctx.fillStyle = dark;
      for (const s of [-1, 1]) {
        rr(ctx, s * 9 - 6 + (walk ? Math.sin(phase * 5) * s * 4 : 0), -10, 12, 10, 3);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = col;
      rr(ctx, -17, -40, 34, 32, 8);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = light;
      rr(ctx, -12, -36, 10, 6, 2);
      ctx.fill();
      rr(ctx, 2, -20, 8, 6, 2);
      ctx.fill();
      // arms
      for (const s of [-1, 1]) {
        ctx.fillStyle = col;
        rr(ctx, s * 19 - 5 + (s < 0 ? lunge * 0.6 : 0), -34, 10, 22, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#ffd166';
      for (const ex of [-8, 2]) {
        ctx.beginPath();
        ctx.arc(ex, -28, 3, 0, TAU);
        ctx.fill();
        ctx.stroke();
      }
      mouth(ctx, -5, -18, atkT > 0);
      break;
    }
  }
  if (boss) {
    ctx.fillStyle = '#ffd166';
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    const cy = type.shape === 'flyer' || type.shape === 'floater' ? -40 : type.shape === 'golem' ? -46 : -34;
    ctx.beginPath();
    ctx.moveTo(-10, cy);
    ctx.lineTo(-10, cy - 8);
    ctx.lineTo(-5, cy - 3);
    ctx.lineTo(0, cy - 10);
    ctx.lineTo(5, cy - 3);
    ctx.lineTo(10, cy - 8);
    ctx.lineTo(10, cy);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  if (flash > 0 || hitT > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,255,255,${Math.max(flash, (1 - hitT) * 0.7) * 0.55})`;
    ctx.beginPath();
    ctx.ellipse(0, -18, 22, 24, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function mouth(ctx: CanvasRenderingContext2D, x: number, y: number, open: boolean): void {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  if (open) {
    ctx.fillStyle = '#5a1a2a';
    ctx.ellipse(x, y + 1, 3.5, 3, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.arc(x, y, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();
  }
}

// ---- pet ----------------------------------------------------------------------

export function drawPet(ctx: CanvasRenderingContext2D, rarity: Rarity, phase: number, x: number, y: number, scale = 1): void {
  const col = RARITY_COLORS[rarity];
  ctx.save();
  ctx.translate(x, y - 6 + Math.sin(phase * 4) * 3);
  ctx.scale(scale, scale);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(0, -8, 8, 0, TAU);
  ctx.fill();
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(s * 4, -14);
    ctx.lineTo(s * 8, -22);
    ctx.lineTo(s * 1, -15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  eye(ctx, -3, -9, 1.7);
  eye(ctx, 3, -9, 1.7);
  if (rarity >= 4) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const a = phase * 2 + (i * TAU) / 3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 12, -8 + Math.sin(a) * 6, 1.2, 0, TAU);
      ctx.stroke();
    }
  }
  ctx.restore();
}

// ---- projectiles --------------------------------------------------------------

export function drawProjectile(ctx: CanvasRenderingContext2D, kind: 'arrow' | 'orb' | 'shuriken' | 'bolt', x: number, y: number, phase: number, skill: boolean): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.5;
  switch (kind) {
    case 'arrow':
      ctx.strokeStyle = '#8b5a2b';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(8, 0);
      ctx.stroke();
      ctx.fillStyle = skill ? '#7ed957' : '#d8dde8';
      ctx.beginPath();
      ctx.moveTo(8, -3);
      ctx.lineTo(13, 0);
      ctx.lineTo(8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff4f6d';
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(-14, -3);
      ctx.lineTo(-12, 0);
      ctx.lineTo(-14, 3);
      ctx.closePath();
      ctx.fill();
      break;
    case 'orb': {
      const r = skill ? 8 : 5;
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 1.8);
      g.addColorStop(0, '#fff');
      g.addColorStop(0.4, skill ? '#ff9f43' : '#7f8cff');
      g.addColorStop(1, 'rgba(255,120,60,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.8, 0, TAU);
      ctx.fill();
      ctx.fillStyle = skill ? '#ff6b3d' : '#5b6bff';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.7, 0, TAU);
      ctx.fill();
      break;
    }
    case 'shuriken':
      ctx.rotate(phase * 20);
      ctx.fillStyle = '#c9d1e0';
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * TAU) / 4;
        ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
        ctx.lineTo(Math.cos(a + TAU / 8) * 3, Math.sin(a + TAU / 8) * 3);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'bolt':
      ctx.strokeStyle = '#ffe66d';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-8, 0);
      ctx.lineTo(-2, -4);
      ctx.lineTo(2, 3);
      ctx.lineTo(8, 0);
      ctx.stroke();
      break;
  }
  ctx.restore();
}
