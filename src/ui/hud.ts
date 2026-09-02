import type { Game } from '@/app/game';
import { BOSS, DUNGEON, TOWER, expReq } from '@/game/balance';
import { canChallengeBoss } from '@/game/battle';
import { JOBS, jobTitle, type SkillDef } from '@/game/jobs';
import { MISSIONS, attendanceAvailable, missionClaimed, missionDone } from '@/game/missions';
import { stageInfo } from '@/game/monsters';
import { GEMS, MONSTER } from '@/game/balance';
import { QUEST_NAMES, questGoldReward, questType } from '@/game/quests';
import { unlockedSkills } from '@/game/skills';
import { todayKey } from '@/game/state';
import { heroSpriteId, type Assets } from '@/render/assets';
import { drawHero } from '@/render/fallback';
import { drawSprite } from '@/render/sprites';
import { formatNumber } from '@/util/format';
import { h, N, setText, toggleClass } from './dom';

export interface HudHooks {
  cast: (id: string) => void;
  challengeBoss: () => void;
  openJob: () => void;
  openSettings: () => void;
  openQuest: () => void;
  selectStage: (n: number) => void;
  openMenu: (sub: string) => void;
  openDungeon: () => void;
  openTab: (id: 'growth' | 'gear' | 'summon' | 'skill' | 'job' | 'dungeon' | 'record') => void;
}

export const SKILL_ICON: Record<SkillDef['fx'], string> = { basic: '⚔️', slash: '🗡️', quake: '🌋', shield: '🛡️', ultWarrior: '💥', fireball: '🔥', lightning: '⚡', firefield: '🔥', meteor: '☄️', doubleShot: '🏹', arrowRain: '🌧️', poison: '☠️', ultArcher: '🌠', assassinate: '🗡️', shuriken: '✴️', stealth: '👤', ultThief: '🌑' };

/**
 * Landscape HUD laid out like a mobile idle RPG:
 * top-left hero card + currencies · top-center stage panel · top-right icons ·
 * left guide-quest card · right quick column · bottom-center status · bottom-right skills/auto/next.
 */
export class Hud {
  private game: Game;
  private assets: Assets;
  private hooks: HudHooks;
  private portrait: HTMLCanvasElement;
  private heroName: HTMLElement;
  private heroPower: HTMLElement;
  private hpBar: HTMLElement;
  private hpText: HTMLElement;
  private expBar: HTMLElement;
  private expText: HTMLElement;
  private statusName: HTMLElement;
  private gold: HTMLElement;
  private gems: HTMLElement;
  private stageName: HTMLElement;
  private stageSub: HTMLElement;
  private waveBar: HTMLElement;
  private prevBtn: HTMLButtonElement;
  private nextBtn: HTMLButtonElement;
  private bossBtn: HTMLButtonElement;
  private jobBtn: HTMLButtonElement;
  private autoBtn: HTMLButtonElement;
  private autoUpBtn: HTMLButtonElement;
  private advanceBtn: HTMLButtonElement;
  private bossWrap: HTMLElement;
  private bossName: HTMLElement;
  private bossBar: HTMLElement;
  private bossTimer: HTMLElement;
  private modeWrap: HTMLElement;
  private questTitle: HTMLElement;
  private questProg: HTMLElement;
  private questBar: HTMLElement;
  private questReward: HTMLElement;
  private skillBar: HTMLElement;
  private skillEls = new Map<string, { root: HTMLElement; cd: HTMLElement; lv: HTMLElement }>();
  private skillKey = '';
  private portraitKey = '';
  private quick: Record<string, { btn: HTMLButtonElement; badge: HTMLElement }> = {};
  private topIcons: Record<string, { btn: HTMLButtonElement; badge: HTMLElement }> = {};

  constructor(root: HTMLElement, game: Game, assets: Assets, hooks: HudHooks) {
    this.game = game;
    this.assets = assets;
    this.hooks = hooks;
    this.portrait = h('canvas', { attrs: { width: '112', height: '112' } }) as HTMLCanvasElement;
    this.heroName = h('div', { class: 'hero-name' });
    this.heroPower = h('div', { class: 'hero-power' });
    this.hpBar = h('div', { class: 'bar-fill hp' });
    this.hpText = h('span', { class: 'bar-text' });
    this.expBar = h('div', { class: 'bar-fill exp' });
    this.expText = h('span', { class: 'bar-text' });
    this.statusName = h('span', { class: 'status-name' });
    this.gold = h('span');
    this.gems = h('span');
    this.stageName = h('b');
    this.stageSub = h('span');
    this.waveBar = h('div', { class: 'bar-fill stage' });
    this.prevBtn = h('button', { class: 'arrow', text: '◀', attrs: { 'aria-label': '이전 사냥터' }, on: { click: () => hooks.selectStage(game.state.progress.stage - 1) } }) as HTMLButtonElement;
    this.nextBtn = h('button', { class: 'arrow', text: '▶', attrs: { 'aria-label': '다음 사냥터' }, on: { click: () => hooks.selectStage(game.state.progress.stage + 1) } }) as HTMLButtonElement;
    this.bossBtn = h('button', { class: 'boss-btn red', text: '👑 보스 도전', on: { click: () => hooks.challengeBoss() } }) as HTMLButtonElement;
    this.jobBtn = h('button', { class: 'job-btn primary pulse', text: '전직 가능!', on: { click: () => hooks.openJob() } }) as HTMLButtonElement;
    this.autoBtn = h('button', { class: 'auto-btn toggle', on: { click: () => this.game.setSetting('autoAdvance', !this.game.state.settings.autoAdvance) } }, h('span', { class: 'auto-ic', text: '▶▶' }), h('span', { class: 'auto-label', text: '자동 진행' })) as HTMLButtonElement;
    this.autoUpBtn = h('button', { class: 'auto-btn toggle', on: { click: () => this.game.setSetting('autoUpgrade', !this.game.state.settings.autoUpgrade) } }, h('span', { class: 'auto-ic', text: '⇧' }), h('span', { class: 'auto-label', text: '자동 강화' })) as HTMLButtonElement;
    this.advanceBtn = h('button', { class: 'advance-btn', attrs: { 'aria-label': '다음 스테이지' }, on: { click: () => hooks.selectStage(game.state.progress.stage + 1) } }, h('span', { text: '▲' }), h('span', { class: 'tiny', text: '다음' })) as HTMLButtonElement;
    this.bossName = h('span');
    this.bossTimer = h('span', { class: 'boss-timer' });
    this.bossBar = h('div', { class: 'bar-fill boss' });
    this.bossWrap = h('div', { class: 'hud-boss' }, h('div', { class: 'row' }, this.bossName, this.bossTimer), h('div', { class: 'bar' }, this.bossBar));
    this.modeWrap = h('div', { class: 'hud-mode' });
    this.questTitle = h('b');
    this.questProg = h('span', { class: 'tiny' });
    this.questBar = h('div', { class: 'bar-fill quest' });
    this.questReward = h('div', { class: 'quest-reward tiny' });
    this.skillBar = h('div', { class: 'skill-bar' });
    // quick column (right)
    const quickDefs: [string, string, string, () => void][] = [
      ['attend', '🗓️', '출석', () => hooks.openMenu('daily')],
      ['mission', '📋', '미션', () => hooks.openMenu('daily')],
      ['dungeon', '🏰', '던전', () => hooks.openDungeon()],
      ['raid', '👹', '레이드', () => hooks.openDungeon()],
      ['rank', '🏆', '랭킹', () => hooks.openMenu('rank')],
    ];
    const quickCol = h('div', { class: 'quick-col' });
    for (const [id, icon, label, fn] of quickDefs) {
      const badge = h('span', { class: 'badge' });
      badge.hidden = true;
      const iconEl = h('span', { class: 'quick-icon', text: icon });
      const qimg = assets.image(`quick_${id}`);
      if (qimg) iconEl.replaceChildren(h('img', { attrs: { src: qimg.src, alt: '' } }));
      const btn = h('button', { class: 'quick-btn', on: { click: fn } }, iconEl, h('span', { class: 'quick-label', text: label }), badge) as HTMLButtonElement;
      quickCol.append(btn);
      this.quick[id] = { btn, badge };
    }
    // top-right icons
    const topDefs: [string, string, string, () => void][] = [
      ['codex', '📖', '도감', () => hooks.openMenu('codex')],
      ['stats', '📊', '통계', () => hooks.openMenu('stats')],
      ['settings', '⚙️', '설정', () => hooks.openSettings()],
    ];
    const topRight = h('div', { class: 'hud-tr' });
    for (const [id, icon, label, fn] of topDefs) {
      const badge = h('span', { class: 'badge' });
      badge.hidden = true;
      const btn = h('button', { class: 'icon-btn', title: label, attrs: { 'aria-label': label }, on: { click: fn } }, h('span', { text: icon }), badge) as HTMLButtonElement;
      topRight.append(btn);
      this.topIcons[id] = { btn, badge };
    }
    const heroCard = h('div', { class: 'hero-card', on: { click: () => hooks.openTab('growth') } }, h('div', { class: 'hero-portrait' }, this.portrait), h('div', { class: 'hero-meta' }, this.heroName, this.heroPower));
    const curIcon = (id: string, fallback: string) => {
      const img = assets.image(id);
      return img ? h('span', { class: 'ic' }, h('img', { attrs: { src: img.src, alt: '' } })) : h('span', { class: 'ic', text: fallback });
    };
    const currencies = h('div', { class: 'currencies' }, h('div', { class: 'cur gold' }, curIcon('ui_gold', '🪙'), this.gold), h('div', { class: 'cur gem' }, curIcon('ui_gem', '★'), this.gems));
    const stagePanel = h('div', { class: 'stage-panel' }, h('div', { class: 'stage-row' }, this.prevBtn, h('div', { class: 'stage-label' }, this.stageName, this.stageSub), this.nextBtn), h('div', { class: 'bar stage' }, this.waveBar), h('div', { class: 'stage-actions' }, this.bossBtn, this.jobBtn));
    const questCard = h('div', { class: 'quest-card', on: { click: () => hooks.openQuest() } }, h('div', { class: 'quest-head' }, h('span', { text: '가이드 퀘스트' })), h('div', { class: 'quest-body' }, this.questTitle, this.questProg, h('div', { class: 'bar quest' }, this.questBar), this.questReward));
    const status = h('div', { class: 'hud-bc' }, h('div', { class: 'status-top' }, this.statusName), h('div', { class: 'bar hp' }, this.hpBar, this.hpText), h('div', { class: 'bar exp' }, this.expBar, this.expText));
    const br = h('div', { class: 'hud-br' }, h('div', { class: 'auto-col' }, this.autoBtn, this.autoUpBtn), this.skillBar, this.advanceBtn);
    root.append(
      h('div', { class: 'hud-top' }, h('div', { class: 'hud-tl' }, heroCard, currencies), topRight),
      h('div', { class: 'hud-stage' }, stagePanel, this.bossWrap, this.modeWrap),
      h('div', { class: 'hud-mid' }, questCard, quickCol),
      document.getElementById('toasts') ?? h('div'),
      h('div', { class: 'hud-bottom' }, status, br),
    );
    this.bossWrap.hidden = true;
    this.modeWrap.hidden = true;
    this.bossBtn.hidden = true;
    this.jobBtn.hidden = true;
  }

  private rebuildSkills(skills: SkillDef[]): void {
    this.skillBar.replaceChildren();
    this.skillEls.clear();
    for (const sk of skills) {
      const cd = h('div', { class: 'skill-cd' });
      const lv = h('span', { class: 'skill-lv' });
      const icon = h('span', { class: 'skill-icon', text: SKILL_ICON[sk.fx] });
      const img = this.assets.image(`skill_${sk.id}`);
      if (img) icon.replaceChildren(h('img', { attrs: { src: img.src, alt: sk.name } }));
      const root = h('button', { class: 'skill', title: `${sk.name}: ${sk.description}`, attrs: { 'aria-label': sk.name }, on: { click: () => this.hooks.cast(sk.id) } }, icon, lv, cd);
      this.skillBar.append(root);
      this.skillEls.set(sk.id, { root, cd, lv });
    }
  }

  private drawPortrait(): void {
    const s = this.game.state;
    const key = `${s.hero.job}_${s.hero.tier}`;
    if (key === this.portraitKey) return;
    this.portraitKey = key;
    const ctx = this.portrait.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 56, 56);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, 56, 56);
    ctx.clip();
    if (!drawSprite(ctx, this.assets, heroSpriteId(s.hero.job, s.hero.tier), 'idle', 0, 28, 92, { scale: 1.5 })) drawHero(ctx, s.hero.job, s.hero.tier, 'idle', 0, 0, 28, 92, 1.5);
    ctx.restore();
  }

  update(): void {
    const g = this.game;
    const s = g.state;
    const b = g.battle;
    const info = stageInfo(b.stage);
    this.drawPortrait();
    setText(this.gold, N(s.gold));
    setText(this.gems, String(s.gems));
    const job = s.hero.job;
    setText(this.heroName, `Lv.${s.hero.level} ${jobTitle(job, s.hero.tier)}`);
    setText(this.heroPower, `⚔ 전투력 ${N(g.stats.power)}`);
    setText(this.statusName, `Lv.${s.hero.level} ${jobTitle(job, s.hero.tier)}${job ? ` · ${JOBS[job].name} ${s.hero.tier}차` : ''}`);
    const hpFrac = b.heroMaxHp > 0 ? Math.max(0, b.heroHp / b.heroMaxHp) : 0;
    this.hpBar.style.width = `${(hpFrac * 100).toFixed(1)}%`;
    setText(this.hpText, `HP ${formatNumber(Math.max(0, b.heroHp), s.settings.numberFormat)} / ${formatNumber(b.heroMaxHp, s.settings.numberFormat)}`);
    const req = expReq(s.hero.level);
    const ef = Math.min(1, s.hero.exp / req);
    this.expBar.style.width = `${(ef * 100).toFixed(1)}%`;
    setText(this.expText, `EXP ${(ef * 100).toFixed(1)}%`);

    if (b.mode === 'stage') {
      setText(this.stageName, `${info.region.index + 1}. ${info.region.name}${info.loop > 0 ? ` (${info.loop + 1}회차)` : ''}`);
      const boss = info.isBoss && s.progress.bossMode;
      setText(this.stageSub, boss ? `👑 ${info.region.boss.title}` : `Stage ${info.stage}/10 · ${s.progress.farmStage !== null ? '반복 사냥' : '진행'} ${Math.min(b.waveTotal, b.waveKilled)}/${b.waveTotal}`);
      this.waveBar.style.width = `${((Math.min(b.waveTotal, b.waveKilled) / Math.max(1, b.waveTotal)) * 100).toFixed(0)}%`;
      this.prevBtn.disabled = s.progress.stage <= 1 || b.heroDead;
      const atFrontier = s.progress.stage >= s.progress.maxStage;
      this.nextBtn.disabled = (atFrontier && (s.settings.autoAdvance || s.progress.farmStage === null)) || b.heroDead;
      this.advanceBtn.disabled = this.nextBtn.disabled;
      this.modeWrap.hidden = true;
      const bossMon = b.monsters.find((m) => m.boss && !m.dead);
      const showBoss = boss && b.bossTimer > 0;
      this.bossWrap.hidden = !showBoss;
      if (showBoss) {
        setText(this.bossName, info.region.boss.name);
        setText(this.bossTimer, `${Math.ceil(b.bossTimer)}s`);
        this.bossBar.style.width = `${((bossMon ? bossMon.hp / bossMon.maxHp : 1) * 100).toFixed(1)}%`;
        toggleClass(this.bossTimer, 'urgent', b.bossTimer < 10);
      }
      const canChallenge = canChallengeBoss(s) && !b.heroDead;
      this.bossBtn.hidden = !canChallenge;
      if (canChallenge) setText(this.bossBtn, s.settings.autoBoss ? `👑 보스 도전 (${Math.max(0, Math.ceil(BOSS.autoRetryInterval - b.farmRetryT))}s)` : '👑 보스 도전');
    } else {
      this.prevBtn.disabled = true;
      this.nextBtn.disabled = true;
      this.advanceBtn.disabled = true;
      this.bossBtn.hidden = true;
      this.waveBar.style.width = '0%';
      if (b.mode === 'tower') {
        setText(this.stageName, `무한의 탑 ${b.towerFloor}층`);
        setText(this.stageSub, `${Math.ceil(b.towerTimer)}초 · 최고 ${s.tower.bestFloor}층`);
        const bossMon = b.monsters.find((m) => !m.dead);
        this.bossWrap.hidden = !bossMon;
        if (bossMon) {
          setText(this.bossName, bossMon.type.name);
          setText(this.bossTimer, `${Math.ceil(b.towerTimer)}s`);
          this.bossBar.style.width = `${((bossMon.hp / bossMon.maxHp) * 100).toFixed(1)}%`;
          toggleClass(this.bossTimer, 'urgent', b.towerTimer < 10);
        }
        this.modeWrap.hidden = false;
        setText(this.modeWrap, `별점 +${b.dungeonGems} · 층당 ${TOWER.timer}초`);
      } else if (b.mode === 'raid') {
        setText(this.stageName, '보스 레이드');
        setText(this.stageSub, `${Math.ceil(b.dungeonT)}초 남음`);
        const bossMon = b.monsters.find((m) => !m.dead);
        this.bossWrap.hidden = !bossMon;
        if (bossMon) {
          setText(this.bossName, bossMon.type.name);
          setText(this.bossTimer, `${Math.ceil(b.dungeonT)}s`);
          this.bossBar.style.width = '100%';
        }
        this.modeWrap.hidden = false;
        setText(this.modeWrap, `누적 피해 ${N(b.raidDamage)}`);
      } else if (b.mode === 'arena') {
        setText(this.stageName, '아레나');
        setText(this.stageSub, `vs ${b.arenaOpp?.name ?? '도전자'} · ${Math.ceil(b.dungeonT)}초`);
        const opp = b.monsters.find((m) => !m.dead);
        this.bossWrap.hidden = !opp;
        if (opp) {
          setText(this.bossName, opp.type.name);
          setText(this.bossTimer, `${Math.ceil(b.dungeonT)}s`);
          this.bossBar.style.width = `${((opp.hp / opp.maxHp) * 100).toFixed(1)}%`;
        }
        this.modeWrap.hidden = false;
        setText(this.modeWrap, `레이팅 ${s.arena.rating}`);
      } else {
        const gold = b.mode === 'dungeonGold';
        setText(this.stageName, gold ? '골드 던전' : '별점 던전');
        setText(this.stageSub, `${Math.ceil(b.dungeonT)}초 남음`);
        this.bossWrap.hidden = true;
        this.modeWrap.hidden = false;
        setText(this.modeWrap, gold ? `처치 ${b.dungeonKills} · 골드 +${N(b.dungeonGold)}` : `처치 ${b.dungeonKills} · 별점 +${b.dungeonGems} / ${DUNGEON.gem.gemCap}`);
      }
    }
    this.jobBtn.hidden = !g.canAdvance();
    toggleClass(this.autoBtn, 'on', s.settings.autoAdvance);
    toggleClass(this.autoUpBtn, 'on', s.settings.autoUpgrade);
    const today = todayKey();
    this.quick.attend!.badge.hidden = !attendanceAvailable(s, today);
    this.quick.mission!.badge.hidden = !MISSIONS.some((m) => missionDone(s, m.id) && !missionClaimed(s, m.id));
    this.quick.raid!.badge.hidden = !(s.daily.raidTickets > 0 && s.progress.maxStage >= 5);
    this.quick.dungeon!.badge.hidden = !(b.mode === 'stage' && (s.daily.goldTickets > 0 || s.daily.gemTickets > 0) && s.progress.maxStage >= 5);
    // guide quest
    const qt = questType(s);
    setText(this.questTitle, QUEST_NAMES[qt]);
    setText(this.questProg, `${N(Math.min(s.quest.progress, s.quest.target))} / ${N(s.quest.target)}`);
    this.questBar.style.width = `${Math.min(100, (s.quest.progress / s.quest.target) * 100).toFixed(0)}%`;
    setText(this.questReward, `보상 ★${GEMS.questReward(s.quest.cycle)} · 🪙${N(questGoldReward(s))}`);
    void MONSTER;
    // skills
    const skills = unlockedSkills(s);
    const key = skills.map((k) => k.id).join(',');
    if (key !== this.skillKey) {
      this.skillKey = key;
      this.rebuildSkills(skills);
    }
    for (const sk of skills) {
      const el = this.skillEls.get(sk.id);
      if (!el) continue;
      const cd = b.skillCd[sk.id] ?? 0;
      el.cd.style.height = `${((cd > 0 ? cd / sk.cooldown : 0) * 100).toFixed(1)}%`;
      toggleClass(el.root, 'ready', cd <= 0 && !b.heroDead);
      setText(el.lv, `${s.hero.skills[sk.id] ?? 1}`);
    }
  }
}
