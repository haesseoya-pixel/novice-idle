import type { SkillDef } from '@/game/jobs';
import { TAU, clamp, easeOutCubic } from '@/util/math';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  g: number;
  kind: 'dot' | 'spark' | 'coin' | 'star' | 'smoke' | 'leaf';
  rot: number;
}

type FxKind = SkillDef['fx'] | 'ripple' | 'levelUp' | 'jobAdvance' | 'bossIntro';

interface Effect {
  kind: FxKind;
  x: number;
  y: number;
  t: number;
  dur: number;
  targets: { x: number; y: number }[];
  color: string;
  seed: number;
}

/** Arena-space particles and skill effects (ground at y = 0, up is negative). */
export class Fx {
  particles: Particle[] = [];
  effects: Effect[] = [];
  shake = 0;
  flash = 0;
  flashColor = '#fff';
  reduced = false;
  private seed = 1;

  private rnd(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private add(p: Omit<Particle, 'life' | 'rot'> & { life?: number }): void {
    if (this.particles.length > (this.reduced ? 120 : 420)) this.particles.shift();
    this.particles.push({ ...p, life: p.life ?? p.max, rot: this.rnd() * TAU });
  }

  burst(x: number, y: number, n: number, color: string, speed = 120, kind: Particle['kind'] = 'dot', size = 3, g = 300): void {
    const count = this.reduced ? Math.ceil(n / 3) : n;
    for (let i = 0; i < count; i++) {
      const a = this.rnd() * TAU;
      const v = speed * (0.4 + this.rnd() * 0.8);
      this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.4, max: 0.4 + this.rnd() * 0.5, size: size * (0.6 + this.rnd() * 0.8), color, g, kind });
    }
  }

  hit(x: number, y: number, crit: boolean, skill: boolean): void {
    this.burst(x, y, crit ? 10 : skill ? 8 : 4, crit ? '#ffe66d' : skill ? '#ff9f43' : '#ffffff', crit ? 180 : 110, 'spark', crit ? 4 : 2.5);
    if (crit) this.effects.push({ kind: 'ripple', x, y, t: 0, dur: 0.25, targets: [], color: '#ffe66d', seed: 0 });
  }

  kill(x: number, y: number, color: string, boss: boolean): void {
    this.burst(x, y, boss ? 40 : 12, color, boss ? 260 : 140, 'dot', boss ? 5 : 3.5);
    this.burst(x, y, boss ? 20 : 5, '#ffffff', boss ? 200 : 100, 'spark', 2);
    if (boss) {
      this.shake = Math.max(this.shake, 0.5);
      this.flash = 0.5;
      this.flashColor = '#fff';
    }
  }

  coins(x: number, y: number, n: number): void {
    const count = clamp(Math.round(n), 1, this.reduced ? 3 : 8);
    for (let i = 0; i < count; i++) {
      this.add({ x: x + (this.rnd() - 0.5) * 16, y: y - 10, vx: (this.rnd() - 0.5) * 120, vy: -180 - this.rnd() * 120, max: 0.9, size: 4.5, color: '#ffd166', g: 520, kind: 'coin' });
    }
  }

  heal(x: number, y: number): void {
    for (let i = 0; i < 8; i++) this.add({ x: x + (this.rnd() - 0.5) * 30, y: y - this.rnd() * 20, vx: 0, vy: -50 - this.rnd() * 40, max: 0.8, size: 3, color: '#7cf5b3', g: 0, kind: 'star' });
  }

  levelUp(x: number, y: number): void {
    this.effects.push({ kind: 'levelUp', x, y, t: 0, dur: 1.2, targets: [], color: '#ffe66d', seed: 0 });
    this.burst(x, y - 30, 24, '#ffe66d', 160, 'star', 4, 40);
  }

  jobAdvance(x: number, y: number, color: string): void {
    this.effects.push({ kind: 'jobAdvance', x, y, t: 0, dur: 2.2, targets: [], color, seed: 0 });
    this.burst(x, y - 30, 40, color, 220, 'star', 5, 20);
    this.burst(x, y - 30, 30, '#ffffff', 160, 'spark', 3, 20);
    this.flash = 0.8;
    this.flashColor = color;
  }

  bossIntro(x: number, y: number, color: string): void {
    this.effects.push({ kind: 'bossIntro', x, y, t: 0, dur: 1.2, targets: [], color, seed: 0 });
    this.shake = Math.max(this.shake, 0.5);
  }

  ripple(x: number, y: number): void {
    this.effects.push({ kind: 'ripple', x, y, t: 0, dur: 0.35, targets: [], color: '#ffffff', seed: 0 });
  }

  skill(fx: SkillDef['fx'], targets: { x: number; y: number }[], heroX: number, color: string): void {
    const first = targets[0] ?? { x: heroX + 100, y: 0 };
    const dur: Record<SkillDef['fx'], number> = { basic: 0.3, slash: 0.3, quake: 0.7, shield: 0.6, ultWarrior: 0.7, fireball: 0.3, lightning: 0.45, firefield: 5, meteor: 0.9, doubleShot: 0.2, arrowRain: 0.8, poison: 6, ultArcher: 0.7, assassinate: 0.45, shuriken: 0.4, stealth: 0.6, ultThief: 0.8 };
    this.effects.push({ kind: fx, x: fx === 'shield' || fx === 'stealth' || fx === 'assassinate' || fx === 'ultArcher' ? heroX : first.x, y: 0, t: 0, dur: dur[fx], targets: targets.length ? targets : [first], color, seed: Math.floor(this.rnd() * 1e6) });
    switch (fx) {
      case 'quake':
      case 'meteor':
        this.shake = Math.max(this.shake, fx === 'meteor' ? 0.6 : 0.35);
        for (const t of targets) this.burst(t.x, 0, 8, '#a08060', 120, 'smoke', 6, 200);
        break;
      case 'ultWarrior':
      case 'ultThief':
      case 'ultArcher':
        this.shake = Math.max(this.shake, 0.4);
        this.flash = 0.45;
        this.flashColor = color;
        break;
      case 'lightning':
        this.flash = 0.5;
        this.flashColor = '#ffffff';
        break;
      case 'stealth':
        this.burst(heroX, -30, 16, '#8a8aa8', 60, 'smoke', 8, -20);
        break;
      case 'shield':
        this.burst(heroX, -30, 10, '#9ad8ff', 90, 'star', 3, 0);
        break;
    }
  }

  update(dt: number): void {
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 1.6);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
    const keep: Particle[] = [];
    for (const p of this.particles) {
      p.life -= dt;
      if (p.life <= 0) continue;
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.kind === 'coin' && p.y > 0) {
        p.y = 0;
        p.vy *= -0.45;
        p.vx *= 0.7;
      }
      p.rot += dt * 6;
      keep.push(p);
    }
    this.particles = keep;
    const keepE: Effect[] = [];
    for (const e of this.effects) {
      e.t += dt;
      if (e.t < e.dur) keepE.push(e);
    }
    this.effects = keepE;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const e of this.effects) this.drawEffect(ctx, e);
    for (const p of this.particles) {
      const a = clamp(p.life / p.max, 0, 1);
      ctx.globalAlpha = p.kind === 'smoke' ? a * 0.5 : a;
      ctx.fillStyle = p.color;
      switch (p.kind) {
        case 'dot':
        case 'smoke':
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (p.kind === 'smoke' ? 1 + (1 - a) : a), 0, TAU);
          ctx.fill();
          break;
        case 'spark':
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size * 0.6;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.stroke();
          break;
        case 'coin':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.scale(Math.abs(Math.cos(p.rot)), 1);
          ctx.beginPath();
          ctx.arc(0, 0, p.size, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#b8860b';
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          break;
        case 'star':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          for (let i = 0; i < 5; i++) {
            const a1 = (i * TAU) / 5 - Math.PI / 2;
            ctx.lineTo(Math.cos(a1) * p.size, Math.sin(a1) * p.size);
            const a2 = a1 + TAU / 10;
            ctx.lineTo(Math.cos(a2) * p.size * 0.45, Math.sin(a2) * p.size * 0.45);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        case 'leaf':
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.5, p.rot, 0, TAU);
          ctx.fill();
          break;
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawEffect(ctx: CanvasRenderingContext2D, e: Effect): void {
    const k = clamp(e.t / e.dur, 0, 1);
    const ease = easeOutCubic(k);
    ctx.save();
    switch (e.kind) {
      case 'ripple':
        ctx.strokeStyle = e.color;
        ctx.globalAlpha = 1 - k;
        ctx.lineWidth = 3 * (1 - k) + 1;
        ctx.beginPath();
        ctx.arc(e.x, e.y, 8 + ease * 28, 0, TAU);
        ctx.stroke();
        break;
      case 'basic':
      case 'slash':
        ctx.strokeStyle = e.kind === 'slash' ? '#ff7a59' : '#ffffff';
        ctx.lineWidth = 5 * (1 - k) + 1;
        ctx.globalAlpha = 1 - k;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(e.x - 10, -28, 26 + ease * 10, -1.2 + ease * 2.4, -0.4 + ease * 2.4);
        ctx.stroke();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x - 10, -28, 20 + ease * 10, -1.0 + ease * 2.4, -0.5 + ease * 2.4);
        ctx.stroke();
        break;
      case 'quake': {
        ctx.strokeStyle = '#d6b27a';
        ctx.lineWidth = 6 * (1 - k) + 1;
        ctx.globalAlpha = 1 - k;
        ctx.beginPath();
        ctx.ellipse(e.x - 60, 0, 40 + ease * 170, 10 + ease * 14, 0, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = '#8b6a3a';
        for (let i = 0; i < 6; i++) {
          const px = e.x - 40 + i * 30 + ease * 40;
          const ph = 18 * Math.sin(Math.min(1, k * 2 - i * 0.1) * Math.PI);
          if (ph <= 0) continue;
          ctx.beginPath();
          ctx.moveTo(px - 8, 0);
          ctx.lineTo(px, -ph);
          ctx.lineTo(px + 8, 0);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'shield':
        break;
      case 'ultWarrior': {
        const cx = e.x - 120 + ease * 320;
        ctx.globalAlpha = 1 - k * k;
        const g = ctx.createLinearGradient(cx - 40, 0, cx + 20, 0);
        g.addColorStop(0, 'rgba(255,122,89,0)');
        g.addColorStop(0.6, '#ff7a59');
        g.addColorStop(1, '#ffffff');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(cx - 50, -30);
        ctx.quadraticCurveTo(cx + 30, -95, cx + 20, -30);
        ctx.quadraticCurveTo(cx + 30, 5, cx - 50, -30);
        ctx.fill();
        break;
      }
      case 'fireball':
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = '#ff9f43';
        ctx.beginPath();
        ctx.arc(e.x, -26, 6 + ease * 26, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff3b0';
        ctx.beginPath();
        ctx.arc(e.x, -26, 3 + ease * 12, 0, TAU);
        ctx.fill();
        break;
      case 'lightning':
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = k < 0.5 ? 1 : 1 - (k - 0.5) * 2;
        for (const t of e.targets) {
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#ffe66d';
          ctx.beginPath();
          let y = -240;
          let x = t.x + 30;
          ctx.moveTo(x, y);
          let s = e.seed + Math.floor(t.x);
          while (y < -10) {
            s = (s * 1103515245 + 12345) >>> 0;
            x = t.x + ((s >>> 8) % 40) - 20;
            y += 28;
            ctx.lineTo(x, y);
          }
          ctx.lineTo(t.x, -20);
          ctx.stroke();
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#ffffff';
          ctx.stroke();
        }
        break;
      case 'firefield': {
        const alpha = k < 0.1 ? k * 10 : k > 0.85 ? (1 - k) / 0.15 : 1;
        ctx.globalAlpha = alpha * 0.85;
        const x0 = Math.min(...e.targets.map((t) => t.x)) - 30;
        const x1 = Math.max(...e.targets.map((t) => t.x)) + 30;
        for (let x = x0; x <= x1; x += 9) {
          const ph = e.t * 9 + x * 0.3;
          const hgt = 14 + Math.sin(ph) * 6 + Math.sin(ph * 2.3) * 3;
          const g = ctx.createLinearGradient(0, 0, 0, -hgt);
          g.addColorStop(0, '#ff4f1f');
          g.addColorStop(0.6, '#ff9f43');
          g.addColorStop(1, 'rgba(255,240,150,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.moveTo(x - 5, 2);
          ctx.quadraticCurveTo(x - 6, -hgt * 0.5, x + Math.sin(ph) * 2, -hgt);
          ctx.quadraticCurveTo(x + 6, -hgt * 0.5, x + 5, 2);
          ctx.closePath();
          ctx.fill();
        }
        break;
      }
      case 'meteor':
        for (let i = 0; i < e.targets.length; i++) {
          const t = e.targets[i]!;
          const delay = i * 0.12;
          const kk = clamp((e.t - delay) / 0.45, 0, 1);
          if (kk <= 0) continue;
          if (kk < 1) {
            const mx = t.x + 160 * (1 - kk);
            const my = -260 * (1 - kk) - 20;
            ctx.globalAlpha = 1;
            ctx.strokeStyle = 'rgba(255,140,60,0.5)';
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(mx + 60, my - 90);
            ctx.lineTo(mx, my);
            ctx.stroke();
            ctx.fillStyle = '#7a3b1e';
            ctx.beginPath();
            ctx.arc(mx, my, 13, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#ff9f43';
            ctx.beginPath();
            ctx.arc(mx - 3, my - 3, 7, 0, TAU);
            ctx.fill();
          } else {
            const bk = clamp((e.t - delay - 0.45) / 0.35, 0, 1);
            ctx.globalAlpha = 1 - bk;
            ctx.fillStyle = '#ff7a2a';
            ctx.beginPath();
            ctx.arc(t.x, -18, 10 + bk * 40, 0, TAU);
            ctx.fill();
            ctx.fillStyle = '#fff3b0';
            ctx.beginPath();
            ctx.arc(t.x, -18, 5 + bk * 18, 0, TAU);
            ctx.fill();
          }
        }
        break;
      case 'doubleShot':
        break;
      case 'arrowRain':
        ctx.strokeStyle = '#8b5a2b';
        ctx.fillStyle = '#d8dde8';
        for (let i = 0; i < 14; i++) {
          let s = (e.seed + i * 7919) >>> 0;
          s = (s * 1103515245 + 12345) >>> 0;
          const tx = e.targets[i % e.targets.length]!.x + ((s >>> 8) % 60) - 30;
          const delay = ((s >>> 16) % 30) / 100;
          const kk = clamp((e.t - delay) / 0.35, 0, 1);
          if (kk <= 0) continue;
          const y = -220 + 210 * kk;
          ctx.globalAlpha = kk >= 1 ? clamp(1 - (e.t - delay - 0.35) / 0.4, 0, 1) : 1;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(tx - 4, y - 18);
          ctx.lineTo(tx, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(tx - 3, y - 6);
          ctx.lineTo(tx + 1, y + 1);
          ctx.lineTo(tx - 6, y - 2);
          ctx.closePath();
          ctx.fill();
        }
        break;
      case 'poison': {
        const alpha = k < 0.1 ? k * 10 : k > 0.85 ? (1 - k) / 0.15 : 1;
        ctx.globalAlpha = alpha * 0.55;
        ctx.fillStyle = '#7ed957';
        for (const t of e.targets) {
          for (let i = 0; i < 5; i++) {
            const ph = e.t * 1.5 + i * 1.3;
            ctx.beginPath();
            ctx.arc(t.x + Math.sin(ph) * 14 + (i - 2) * 6, -12 - ((e.t * 18 + i * 9) % 40), 7 + Math.sin(ph * 2) * 2, 0, TAU);
            ctx.fill();
          }
        }
        break;
      }
      case 'ultArcher': {
        ctx.globalAlpha = k < 0.3 ? k / 0.3 : 1 - (k - 0.3) / 0.7;
        const g = ctx.createLinearGradient(e.x, -30, e.x + 400, -30);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, '#c8ff6b');
        g.addColorStop(1, 'rgba(200,255,107,0)');
        ctx.fillStyle = g;
        const hgt = 8 + Math.sin(k * Math.PI) * 26;
        ctx.fillRect(e.x + 10, -30 - hgt / 2, 420, hgt);
        ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 5; i++) {
          ctx.beginPath();
          ctx.arc(e.x + 40 + i * 70 + ease * 60, -30 + Math.sin(i * 2 + e.t * 20) * hgt * 0.4, 3, 0, TAU);
          ctx.fill();
        }
        break;
      }
      case 'assassinate': {
        const tx = e.targets[0]!.x;
        ctx.globalAlpha = 1 - k;
        ctx.fillStyle = 'rgba(40,30,70,0.7)';
        for (let i = 0; i < 4; i++) {
          const px = e.x + (tx - 30 - e.x) * ((i + 1) / 4) * ease;
          ctx.beginPath();
          ctx.ellipse(px, -26, 10, 26, 0, 0, TAU);
          ctx.fill();
        }
        ctx.strokeStyle = '#ff4f6d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(tx - 24, -50);
        ctx.lineTo(tx + 14, -6);
        ctx.stroke();
        break;
      }
      case 'shuriken':
        for (const t of e.targets) {
          const sx = e.x - 200 + (t.x - (e.x - 200)) * ease;
          ctx.globalAlpha = 1 - k * 0.5;
          ctx.save();
          ctx.translate(sx, -28);
          ctx.rotate(e.t * 25);
          ctx.fillStyle = '#c9d1e0';
          ctx.beginPath();
          for (let i = 0; i < 4; i++) {
            const a = (i * TAU) / 4;
            ctx.lineTo(Math.cos(a) * 9, Math.sin(a) * 9);
            ctx.lineTo(Math.cos(a + TAU / 8) * 3, Math.sin(a + TAU / 8) * 3);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
        break;
      case 'stealth':
        break;
      case 'ultThief': {
        const tx = e.targets[0]!.x;
        ctx.fillStyle = `rgba(10,5,30,${(1 - k) * 0.55})`;
        ctx.fillRect(-500, -600, 1400, 700);
        ctx.strokeStyle = '#c78bff';
        ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const kk = clamp((k - i * 0.1) / 0.3, 0, 1);
          if (kk <= 0) continue;
          ctx.globalAlpha = 1 - kk;
          ctx.lineWidth = 5 - i * 0.5;
          const a = i * 0.7 - 1.2;
          ctx.beginPath();
          ctx.moveTo(tx + Math.cos(a) * -36, -30 + Math.sin(a) * -36);
          ctx.lineTo(tx + Math.cos(a) * 36 * kk, -30 + Math.sin(a) * 36 * kk);
          ctx.stroke();
        }
        break;
      }
      case 'levelUp': {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(e.x, 0, 14 + ease * 30, 5 + ease * 10, 0, 0, TAU);
        ctx.stroke();
        ctx.fillStyle = e.color;
        ctx.font = 'bold 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('LEVEL UP!', e.x, -80 - ease * 30);
        break;
      }
      case 'jobAdvance': {
        const g = ctx.createLinearGradient(0, -160, 0, 0);
        g.addColorStop(0, e.color + '00');
        g.addColorStop(0.5, e.color + 'aa');
        g.addColorStop(1, e.color + '00');
        ctx.globalAlpha = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
        ctx.fillStyle = g;
        ctx.fillRect(e.x - 26 - ease * 10, -180, 52 + ease * 20, 180);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.ellipse(e.x, -30 - i * 20, 20 + ((ease * 60 + i * 20) % 60), 6 + ((ease * 20 + i * 8) % 20), 0, 0, TAU);
          ctx.stroke();
        }
        break;
      }
      case 'bossIntro': {
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.ellipse(e.x, 0, 20 + ease * 90, 8 + ease * 25, 0, 0, TAU);
        ctx.stroke();
        break;
      }
    }
    ctx.restore();
  }
}
