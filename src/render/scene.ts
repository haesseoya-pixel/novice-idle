import type { Game } from '@/app/game';
import { ARENA_W, setArenaWidth, type Monster } from '@/game/battle';
import { HERO, MONSTER, RARITY_COLORS } from '@/game/balance';
import { JOBS } from '@/game/jobs';
import { stageInfo } from '@/game/monsters';
import { parseItemKey } from '@/game/stats';
import { COMPANION_BY_ID, equippedCompanions } from '@/game/companions';
import type { GameEvent } from '@/game/tick';
import { formatNumber } from '@/util/format';
import { TAU, clamp } from '@/util/math';
import { heroSpriteId, type AnimName, type Assets } from './assets';
import { drawBackground } from './background';
import { drawHero, drawMonster, drawPet, drawProjectile } from './fallback';
import { Fx } from './fx';
import { drawSprite } from './sprites';

function shadeHex(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, v + amt));
  return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
}

const NUM_COLORS: Record<string, string> = { normal: '#ffffff', crit: '#ffe66d', skill: '#ff9f43', tap: '#9ad8ff', heal: '#7cf5b3', burn: '#c8ff6b', hurt: '#ff6b6b' };

/**
 * Canvas renderer. Arena space: x 0..360 (hero at 80), ground at y = 0 with negative y upward.
 * Screen transform: translate(ox, groundY) · scale(s).
 */
export class Scene {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly fx = new Fx();
  private game: Game;
  private assets: Assets;
  w = 0;
  h = 0;
  dpr = 1;
  s = 1;
  ox = 0;
  gy = 0;
  private scroll = 0;
  private phase = 0;
  private time = 0;
  private heroAnim: AnimName = 'idle';
  private heroAnimT = 0;
  private groundFrac = 0.72;
  private groundTarget = 0.72;
  private viewScale = 1;
  private anchorFrac = 0.22;

  constructor(canvas: HTMLCanvasElement, game: Game, assets: Assets) {
    this.canvas = canvas;
    this.game = game;
    this.assets = assets;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('2d context unavailable');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, Math.round(rect.width));
    this.h = Math.max(1, Math.round(rect.height));
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    // fit the 360-wide arena; on wide screens scale by height instead
    const landscape = this.w > this.h * 1.3;
    // 가로에서는 높이 기준으로 키운다(폭이 남으므로 캐릭터가 작아지지 않게)
    const base = landscape ? this.h / 460 : Math.min(this.w / ARENA_W, this.h / 380) * 1.25;
    this.s = clamp(base * this.viewScale, 0.7, 4);
    this.ox = landscape ? this.w * this.anchorFrac - HERO.x * this.s : (this.w - ARENA_W * this.s) / 2;
    // 넓은 화면에서는 몬스터가 화면 밖에서 걸어 들어오도록 필드 폭을 늘린다
    setArenaWidth(this.game.battle, (this.w - this.ox) / this.s - 20);
    this.gy = Math.round(this.h * this.groundFrac);
  }

  /** Where the ground line sits as a fraction of the canvas height (animated). */
  setGroundFrac(f: number): void {
    this.groundTarget = f;
  }

  /** Shrinks the battle when a panel covers the lower half. */
  setViewScale(f: number): void {
    if (this.viewScale === f) return;
    this.viewScale = f;
    this.resize();
  }

  /** Where the hero sits horizontally, as a fraction of canvas width (landscape only). */
  setAnchorFrac(f: number): void {
    if (this.anchorFrac === f) return;
    this.anchorFrac = f;
    this.resize();
  }

  /** Arena x/y (ground-relative) → screen. */
  toScreen(x: number, y: number): { x: number; y: number } {
    return { x: this.ox + x * this.s, y: this.gy + y * this.s };
  }

  heroScreen(): { x: number; y: number } {
    return this.toScreen(HERO.x, -30);
  }

  onEvent(e: GameEvent): void {
    const b = this.game.battle;
    const job = this.game.state.hero.job;
    switch (e.type) {
      case 'hit':
        this.fx.hit(e.x - 4, -22, e.crit, e.skill);
        break;
      case 'kill': {
        const m = b.monsters.find((mm) => mm.dead && Math.abs(mm.x - e.x) < 1);
        this.fx.kill(e.x, -20, m?.type.color ?? '#fff', e.boss);
        if (e.gold > 0) this.fx.coins(e.x, -10, e.boss ? 8 : 3);
        break;
      }
      case 'skill': {
        const alive = b.monsters.filter((m) => !m.dead).map((m) => ({ x: m.x, y: 0 }));
        this.fx.skill(e.fx, alive.length ? alive : [{ x: e.x, y: 0 }], HERO.x, job ? JOBS[job].color : '#9ad8ff');
        break;
      }
      case 'levelUp':
        this.fx.levelUp(HERO.x, 0);
        break;
      case 'heroHit':
        if (b.monsters.some((m) => m.boss)) this.fx.shake = Math.max(this.fx.shake, 0.25);
        break;
      case 'bossStart': {
        const m = b.monsters[0];
        this.fx.bossIntro(m ? m.x : 300, 0, stageInfo(e.stage).region.accent);
        break;
      }
      case 'tap':
        this.fx.ripple(HERO.x + 40, -26);
        break;
      case 'companion': {
        const c = COMPANION_BY_ID[e.id as keyof typeof COMPANION_BY_ID];
        this.fx.burst(e.x, -24, 14, c?.color ?? '#fff', 160, 'star', 4);
        this.fx.ripple(e.x, -24);
        break;
      }
    }
  }

  jobAdvanceFx(): void {
    const job = this.game.state.hero.job;
    this.fx.jobAdvance(HERO.x, 0, job ? JOBS[job].color : '#ffe66d');
  }

  frame(dt: number): void {
    const b = this.game.battle;
    const s = this.game.state;
    this.fx.reduced = s.settings.reducedMotion;
    this.time += dt;
    this.phase += dt;
    if (Math.abs(this.groundTarget - this.groundFrac) > 0.0005) {
      this.groundFrac += (this.groundTarget - this.groundFrac) * Math.min(1, dt * 8);
      this.gy = Math.round(this.h * this.groundFrac);
    }
    const walking = this.isWalking();
    if (walking) this.scroll += dt * 120;
    // hero animation state machine
    const next = this.heroAnimState();
    if (next.anim !== this.heroAnim) {
      this.heroAnim = next.anim;
      this.heroAnimT = 0;
    }
    this.heroAnimT = next.t ?? this.heroAnimT + dt;
    this.fx.update(dt);
    this.draw(walking);
    void b;
  }

  private isWalking(): boolean {
    const b = this.game.battle;
    if (b.heroDead) return false;
    if (b.transitionT > 0) return true;
    return b.mode === 'stage' && b.monsters.every((m) => m.dead) && b.waveSpawned < b.waveTotal;
  }

  private heroAnimState(): { anim: AnimName; t?: number } {
    const b = this.game.battle;
    if (b.heroDead) return { anim: 'death', t: HERO.respawnDelay - b.respawnT };
    if (b.heroHurtT < 0.25) return { anim: 'hit', t: b.heroHurtT };
    if (b.heroCastT < 0.35) return { anim: 'cast', t: b.heroCastT };
    if (b.heroAttackT < 0.3) return { anim: 'attack', t: b.heroAttackT };
    if (this.isWalking()) return { anim: 'walk' };
    return { anim: 'idle' };
  }

  private monsterAnim(m: Monster): { anim: AnimName; t: number } {
    if (m.dead) return { anim: 'death', t: m.deathT };
    if (m.hitT < 0.2) return { anim: 'hit', t: m.hitT };
    if (m.attackT < 0.35) return { anim: 'attack', t: m.attackT };
    const reach = HERO.x + MONSTER.meleeOffset + (m.boss ? 30 : (m.id % 3) * 14);
    if (m.x > reach + 0.5) return { anim: 'walk', t: this.phase };
    return { anim: 'idle', t: this.phase };
  }

  private draw(walking: boolean): void {
    const ctx = this.ctx;
    const b = this.game.battle;
    const s = this.game.state;
    const info = stageInfo(b.stage);
    const hue = s.settings.reducedMotion ? 0 : ((info.tint % 360) + 360) % 360;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const shake = this.fx.reduced ? 0 : this.fx.shake;
    if (shake > 0) ctx.translate((Math.random() - 0.5) * shake * 12, (Math.random() - 0.5) * shake * 8);
    const bgOverride = b.mode === 'tower' ? 'bg_tower' : b.mode === 'raid' ? 'bg_raid' : b.mode === 'arena' ? 'bg_arena' : b.mode === 'dungeonGold' ? 'bg_dungeon_gold' : b.mode === 'dungeonGem' ? 'bg_dungeon_gem' : null;
    drawBackground(ctx, info.region, this.w, this.h, this.gy, this.scroll, this.time, this.assets, hue, bgOverride);
    if (b.mode !== 'stage') {
      ctx.fillStyle = b.mode === 'dungeonGold' ? 'rgba(255,209,102,0.10)' : 'rgba(179,136,255,0.14)';
      ctx.fillRect(0, 0, this.w, this.h);
    }
    ctx.save();
    ctx.translate(this.ox, this.gy);
    ctx.scale(this.s, this.s);
    // firefield / poison etc. go under entities
    this.fx.draw(ctx);
    // entities sorted by depth (y stagger)
    const heroKey = s.hero.equipped.pet;
    const petRarity = heroKey ? parseItemKey(heroKey).rarity : null;
    this.drawHero(ctx, walking);
    // companions hover behind the hero
    equippedCompanions(s).forEach((c, i) => {
      const cx = HERO.x - 34 - i * 16 + Math.sin(this.time * 2 + i) * 3;
      const cy = -60 - i * 14 + Math.sin(this.time * 3 + i * 1.7) * 4;
      const cd = b.companionCd[c.id] ?? 0;
      const strike = cd > c.strikeEvery - 0.25 ? (c.strikeEvery - cd) / 0.25 : 0;
      const dx = strike > 0 ? Math.sin(strike * Math.PI) * 60 : 0;
      ctx.save();
      ctx.globalAlpha = 0.95;
      const g = ctx.createRadialGradient(cx + dx, cy, 2, cx + dx, cy, 12);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.4, c.color);
      g.addColorStop(1, c.color + '00');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx + dx, cy, 12, 0, TAU);
      ctx.fill();
      if (!drawSprite(ctx, this.assets, `companion_${c.id}`, 'idle', this.phase, cx + dx, cy + 14, { scale: 1 })) {
        ctx.font = '11px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.icon, cx + dx, cy + 4);
      }
      ctx.restore();
    });
    if (petRarity !== null && !b.heroDead) {
      const px = HERO.x - 26;
      if (!drawSprite(ctx, this.assets, `pet_${petRarity}`, walking ? 'walk' : 'idle', this.phase, px, 0, { scale: 0.7 })) drawPet(ctx, petRarity, this.phase, px, 0);
    }
    this.drawProps(ctx);
    const monsters = [...b.monsters].sort((a, c) => (a.id % 3) - (c.id % 3));
    for (const m of monsters) {
      const { anim, t } = this.monsterAnim(m);
      const y = (m.id % 3) * 5 - 5;
      const sc = m.scale;
      const flash = m.hitT < 0.12 ? 1 - m.hitT / 0.12 : 0;
      const id = m.type.id;
      const drawn = drawSprite(ctx, this.assets, id, anim, t, m.x, y, { flip: false, scale: sc, alpha: m.dead ? 1 - clamp(m.deathT / 0.6, 0, 1) : 1, flash });
      if (!drawn) drawMonster(ctx, m.type, m.boss, anim, t, this.phase + m.bob, m.x, y, sc, flash, hue);
      if (!m.dead) this.hpBar(ctx, m.x, y - (m.boss ? 95 : 52) * (m.type.shape === 'flyer' ? 1.15 : 1), m.boss ? 60 : 30, m.hp / m.maxHp, m.boss ? info.region.accent : '#ff6b6b');
      if (m.burn && !m.dead) {
        ctx.fillStyle = 'rgba(255,120,40,0.6)';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(m.x - 8 + i * 8, y - 24 - ((this.time * 40 + i * 9) % 24), 3.5, 0, TAU);
          ctx.fill();
        }
      }
    }
    for (const p of b.projectiles) drawProjectile(ctx, p.kind, p.x, p.y, this.time, p.skill);
    // damage numbers
    if (s.settings.showDamage) {
      ctx.textAlign = 'center';
      ctx.lineJoin = 'round';
      for (const d of b.dmgNumbers) {
        const age = b.time - d.t;
        if (age > 1.2) continue;
        const a = age < 0.9 ? 1 : 1 - (age - 0.9) / 0.3;
        const big = d.kind === 'crit' || d.kind === 'skill';
        ctx.globalAlpha = a;
        ctx.font = `bold ${big ? 15 : 12}px system-ui, sans-serif`;
        const text = (d.kind === 'heal' ? '+' : '') + formatNumber(d.value, s.settings.numberFormat) + (d.kind === 'crit' ? '!' : '');
        const x = d.x + (d.kind === 'hurt' ? -10 : 0);
        const y = -58 - age * 46 - (big ? 10 : 0);
        ctx.strokeStyle = 'rgba(20,15,40,0.9)';
        ctx.lineWidth = 3;
        ctx.strokeText(text, x, y);
        ctx.fillStyle = NUM_COLORS[d.kind] ?? '#fff';
        ctx.fillText(text, x, y);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
    // screen flash
    if (this.fx.flash > 0 && !this.fx.reduced) {
      ctx.globalAlpha = this.fx.flash * 0.35;
      ctx.fillStyle = this.fx.flashColor;
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;
    }
    // vignette when hero dead
    if (b.heroDead) {
      ctx.fillStyle = 'rgba(40,0,10,0.35)';
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`쓰러졌다… ${Math.ceil(b.respawnT)}초 후 부활`, this.w / 2, this.gy - 120 * this.s);
    }
  }

  private drawHero(ctx: CanvasRenderingContext2D, walking: boolean): void {
    const b = this.game.battle;
    const s = this.game.state;
    const anim = this.heroAnim;
    const t = this.heroAnimT;
    const alpha = b.invulnT > 0 ? 0.45 : 1;
    const flash = b.heroHurtT < 0.15 ? 1 - b.heroHurtT / 0.15 : 0;
    ctx.save();
    ctx.globalAlpha = alpha;
    const id = heroSpriteId(s.hero.job, s.hero.tier);
    if (!drawSprite(ctx, this.assets, id, anim, anim === 'walk' || anim === 'idle' ? this.phase : t, HERO.x, 0, { flash })) drawHero(ctx, s.hero.job, s.hero.tier, anim, t, this.phase, HERO.x, 0, 1, flash);
    ctx.restore();
    void walking;
    if (b.shieldT > 0) {
      ctx.strokeStyle = 'rgba(154,216,255,0.9)';
      ctx.fillStyle = 'rgba(154,216,255,0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(HERO.x, -28, 26 + Math.sin(this.time * 8) * 1.5, 36, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    if (!b.heroDead) this.hpBar(ctx, HERO.x, -72, 34, b.heroHp / Math.max(1, b.heroMaxHp), '#7cf5b3');
  }

  /** Stage dressing: entry portal on the right, signpost on the left. */
  private drawProps(ctx: CanvasRenderingContext2D): void {
    const b = this.game.battle;
    const info = stageInfo(b.stage);
    if (b.mode !== 'stage') return;
    const px = this.game.battle.arenaW - 14;
    const pulse = 1 + Math.sin(this.time * 4) * 0.06;
    const portalImg = this.assets.image('ui_portal');
    const signImg = this.assets.image('ui_signpost');
    if (portalImg) {
      const ph = 78 * pulse;
      ctx.drawImage(portalImg, px - (ph * portalImg.naturalWidth) / portalImg.naturalHeight / 2, -ph, (ph * portalImg.naturalWidth) / portalImg.naturalHeight, ph);
    } else {
      const g = ctx.createRadialGradient(px, -34, 4, px, -34, 30 * pulse);
      g.addColorStop(0, 'rgba(120,200,255,0.9)');
      g.addColorStop(0.6, 'rgba(60,110,255,0.5)');
      g.addColorStop(1, 'rgba(60,110,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(px, -34, 18 * pulse, 34 * pulse, 0, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(200,230,255,0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(px, -34, 14, 30, Math.sin(this.time * 2) * 0.2, 0, TAU);
      ctx.stroke();
    }
    if (signImg) ctx.drawImage(signImg, 6, -46, 46, 46);
    else {
      ctx.fillStyle = '#8b5a2b';
      ctx.fillRect(20, -38, 4, 38);
      ctx.fillStyle = '#c9a068';
      ctx.beginPath();
      ctx.roundRect(4, -50, 44, 16, 3);
      ctx.fill();
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.fillStyle = signImg ? '#fff' : '#3a2200';
    ctx.font = 'bold 8px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${info.chapterName.slice(0, 6)} ${info.stage}`, signImg ? 29 : 26, signImg ? -20 : -39);
  }

  private hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, frac: number, color: string): void {
    ctx.fillStyle = 'rgba(20,15,40,0.75)';
    ctx.beginPath();
    ctx.roundRect(x - w / 2 - 1, y - 1, w + 2, 6, 3);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y, Math.max(0, w * clamp(frac, 0, 1)), 4, 2);
    ctx.fill();
  }

  rarityColor(r: number): string {
    return RARITY_COLORS[r as 0] ?? '#fff';
  }
}
