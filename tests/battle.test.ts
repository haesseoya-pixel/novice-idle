import { describe, expect, it } from 'vitest';
import { attemptBoss, castSkill, createBattle, battleTick, startDungeon, tapAttack } from '@/game/battle';
import { HERO, BOSS } from '@/game/balance';
import { NOVICE_SKILL } from '@/game/jobs';
import { computeStats } from '@/game/stats';
import { createInitialState } from '@/game/state';
import { simulate } from '@/game/tick';

function run(gs: ReturnType<typeof createInitialState>, b: ReturnType<typeof createBattle>, seconds: number) {
  const events: ReturnType<typeof battleTick> = [];
  const steps = Math.round(seconds / 0.05);
  for (let i = 0; i < steps; i++) {
    const stats = computeStats(gs);
    events.push(...battleTick(gs, b, stats, 0.05));
  }
  return events;
}

describe('battle', () => {
  it('clears stage 1 and advances with gold and exp', () => {
    const gs = createInitialState(0);
    gs.hero.upgrades.atk = 20;
    const b = createBattle(gs, computeStats(gs));
    const events = run(gs, b, 60);
    expect(events.some((e) => e.type === 'kill')).toBe(true);
    expect(events.some((e) => e.type === 'stageClear')).toBe(true);
    expect(gs.progress.stage).toBeGreaterThan(1);
    expect(gs.gold).toBeGreaterThan(0);
    expect(gs.hero.exp + gs.hero.level).toBeGreaterThan(1);
    expect(gs.stats.totalKills).toBeGreaterThanOrEqual(5);
  });
  it('boss timer failure drops to farming and auto-retries', () => {
    const gs = createInitialState(0);
    gs.progress.stage = 10;
    gs.progress.maxStage = 10;
    gs.progress.bossMode = true;
    gs.settings.autoBoss = true;
    gs.hero.upgrades.hp = 200; // survive
    const b = createBattle(gs, computeStats(gs));
    const events = run(gs, b, BOSS.timer + 5);
    expect(events.some((e) => e.type === 'bossFail' && e.reason === 'timer')).toBe(true);
    expect(gs.progress.farmStage).toBe(9);
    expect(gs.progress.stage).toBe(9);
    expect(gs.progress.bossMode).toBe(false);
    // farming continues on stage 9 and eventually retries the boss
    const more = run(gs, b, BOSS.autoRetryInterval + 40);
    expect(gs.stats.bossAttempts).toBeGreaterThanOrEqual(1);
    expect(more.length).toBeGreaterThan(0);
  });
  it('strong hero beats the boss and gets first-clear gems', () => {
    const gs = createInitialState(0);
    gs.progress.stage = 10;
    gs.progress.maxStage = 10;
    gs.progress.bossMode = true;
    gs.hero.upgrades.atk = 200;
    const b = createBattle(gs, computeStats(gs));
    const events = run(gs, b, 25);
    const win = events.find((e) => e.type === 'bossWin');
    expect(win).toBeDefined();
    expect(gs.gems).toBeGreaterThanOrEqual(5 + 2);
    expect(gs.progress.firstClears).toContain(10);
    expect(gs.progress.stage).toBeGreaterThanOrEqual(11);
    expect(gs.progress.milestones).toContain(10);
  });
  it('hero death retreats one stage and respawns', () => {
    const gs = createInitialState(0);
    gs.progress.stage = 40;
    gs.progress.maxStage = 40;
    const b = createBattle(gs, computeStats(gs));
    const events = run(gs, b, 40);
    expect(events.some((e) => e.type === 'heroDie')).toBe(true);
    expect(events.some((e) => e.type === 'heroRespawn')).toBe(true);
    expect(gs.progress.stage).toBeLessThan(40);
  });
  it('tap attack respects cooldown and skills respect cooldown', () => {
    const gs = createInitialState(0);
    const b = createBattle(gs, computeStats(gs));
    run(gs, b, 3); // let a monster arrive
    const stats = computeStats(gs);
    const ev: ReturnType<typeof battleTick> = [];
    expect(tapAttack(gs, b, stats, ev)).toBe(true);
    expect(tapAttack(gs, b, stats, ev)).toBe(false);
    b.tapCd = 0;
    expect(tapAttack(gs, b, stats, ev)).toBe(true);
    expect(gs.stats.taps).toBe(2);
    b.skillCd.novice_strike = 0;
    expect(castSkill(gs, b, stats, NOVICE_SKILL, ev)).toBe(true);
    expect(castSkill(gs, b, stats, NOVICE_SKILL, ev)).toBe(false);
    expect(b.skillCd.novice_strike).toBeCloseTo(HERO.tapCooldown > 0 ? NOVICE_SKILL.cooldown : 0);
  });
  it('gold dungeon consumes a ticket, runs for its duration and returns', () => {
    const gs = createInitialState(0);
    gs.hero.upgrades.atk = 30;
    const b = createBattle(gs, computeStats(gs));
    expect(startDungeon(gs, b, computeStats(gs), 'gold')).toBe(true);
    expect(gs.daily.goldTickets).toBe(2);
    const events = run(gs, b, 62);
    const end = events.find((e) => e.type === 'dungeonEnd');
    expect(end).toBeDefined();
    expect(b.mode).toBe('stage');
    expect(gs.gold).toBeGreaterThan(0);
    gs.daily.goldTickets = 0;
    expect(startDungeon(gs, b, computeStats(gs), 'gold')).toBe(false);
  });
  it('simulate wraps battle with quests/achievements/daily', () => {
    const gs = createInitialState(0);
    gs.hero.upgrades.atk = 20;
    const b = createBattle(gs, computeStats(gs));
    const events: ReturnType<typeof simulate> = [];
    for (let i = 0; i < 1200; i++) events.push(...simulate(gs, b, 0.05, i * 50));
    expect(events.some((e) => e.type === 'achievement')).toBe(true);
    expect(gs.achievements.firstKill).toBeDefined();
    expect(gs.gems).toBeGreaterThan(0);
    expect(gs.offline.emaGold).toBeGreaterThan(0);
    // attemptBoss from farm state
    gs.progress.farmStage = 9;
    gs.progress.stage = 9;
    expect(attemptBoss(gs, b)).toBe(true);
    expect(gs.progress.bossMode).toBe(true);
    expect(gs.progress.stage).toBe(10);
  });
});
