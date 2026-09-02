import { describe, expect, it } from 'vitest';
import { ARENA, GEMS, RAID } from '@/game/balance';
import { ARTIFACTS, artifactTotals, artifactValue, unlockArtifact, upgradeArtifact, upgradeCost } from '@/game/artifacts';
import { battleTick, createBattle, startArena, startRaid } from '@/game/battle';
import { COMPANIONS, COMPANION_BY_ID, companionTotals, equipCompanion, equippedCompanions, summon } from '@/game/companions';
import { ATTENDANCE_REWARDS, MISSIONS, MISSION_ALL_BONUS, claimAttendance, claimMission, missionDone, missionProgress, resetMissions } from '@/game/missions';
import { computeStats } from '@/game/stats';
import { createInitialState } from '@/game/state';
import { sweep, sweepEstimate } from '@/game/sweep';
import { checkDaily, simulate } from '@/game/tick';
import { autoUpgrade } from '@/game/upgrades';
import { deserialize, serialize } from '@/util/save';

function run(gs: ReturnType<typeof createInitialState>, b: ReturnType<typeof createBattle>, seconds: number) {
  const events: ReturnType<typeof battleTick> = [];
  for (let i = 0; i < Math.round(seconds / 0.05); i++) events.push(...battleTick(gs, b, computeStats(gs), 0.05));
  return events;
}

describe('artifacts', () => {
  it('unlock with gems, upgrade with gold, totals apply', () => {
    const s = createInitialState(0);
    expect(unlockArtifact(s, 'crest')).toBe(false);
    s.gems = 1000;
    expect(unlockArtifact(s, 'crest')).toBe(true);
    expect(artifactValue(s, 'crest')).toBeCloseTo(0.04);
    expect(upgradeArtifact(s, 'crest')).toBe(false);
    s.gold = upgradeCost(s, 'crest') * 3;
    expect(upgradeArtifact(s, 'crest')).toBe(true);
    expect(artifactValue(s, 'crest')).toBeCloseTo(0.08);
    for (const a of ARTIFACTS) unlockArtifact(s, a.id);
    const t = artifactTotals(s);
    expect(t.cooldown).toBeCloseTo(0.01);
    expect(computeStats(s).cooldown).toBeCloseTo(0.01);
    expect(computeStats(s).atk).toBeCloseTo(10 * 1.08);
  });
});

describe('companions', () => {
  it('summons with rates, ten-pull guarantee, equips best, totals', () => {
    const s = createInitialState(0);
    expect(summon(s, 10)).toBeNull();
    s.gems = GEMS.companionTenCost * 30;
    let legendary = 0;
    for (let i = 0; i < 30; i++) {
      const r = summon(s, 10)!;
      expect(r.length).toBe(10);
      expect(r.some((p) => COMPANION_BY_ID[p.id].rarity >= 3)).toBe(true);
      legendary += r.filter((p) => COMPANION_BY_ID[p.id].rarity === 4).length;
    }
    expect(s.gems).toBe(0);
    expect(legendary).toBeGreaterThan(0);
    expect(equippedCompanions(s).length).toBe(3);
    const t = companionTotals(s);
    expect(Object.values(t).some((v) => v > 0)).toBe(true);
    const lowest = COMPANIONS.find((c) => c.rarity === 2)!;
    expect(equipCompanion(s, lowest.id, 0)).toBe(true);
    expect(s.companions.equipped[0]).toBe(lowest.id);
    expect(deserialize(serialize(s), 0)).toEqual(s);
  });
});

describe('missions & attendance', () => {
  it('progress, claim, all-clear bonus, daily reset, attendance cycle', () => {
    const s = createInitialState(0);
    missionProgress(s, 'kills', 199);
    expect(missionDone(s, 'kills')).toBe(false);
    missionProgress(s, 'kills', 1);
    expect(claimMission(s, 'kills')).toBe(5);
    expect(claimMission(s, 'kills')).toBe(0);
    for (const m of MISSIONS) {
      missionProgress(s, m.id, m.target);
      claimMission(s, m.id);
    }
    expect(s.missions.bonusClaimed).toBe(true);
    expect(s.gems).toBe(MISSIONS.reduce((a, m) => a + m.gems, 0) + MISSION_ALL_BONUS);
    resetMissions(s, '2026-09-03');
    expect(missionDone(s, 'kills')).toBe(false);
    const g0 = s.gems;
    expect(claimAttendance(s, '2026-09-03')).toBe(ATTENDANCE_REWARDS[0]);
    expect(claimAttendance(s, '2026-09-03')).toBe(0);
    expect(claimAttendance(s, '2026-09-04')).toBe(ATTENDANCE_REWARDS[1]);
    expect(s.gems).toBe(g0 + ATTENDANCE_REWARDS[0] + ATTENDANCE_REWARDS[1]);
    // daily tick resets missions and tickets
    s.daily.date = '2000-01-01';
    s.daily.raidTickets = 0;
    expect(checkDaily(s, Date.now())).toBe(true);
    expect(s.daily.raidTickets).toBe(RAID.tickets);
    expect(s.missions.progress.kills ?? 0).toBe(0);
  });
});

describe('raid & arena & sweep & auto', () => {
  it('raid tallies damage and rewards by par', () => {
    const s = createInitialState(0);
    s.hero.upgrades.atk = 100;
    const b = createBattle(s, computeStats(s));
    expect(startRaid(s, b, computeStats(s))).toBe(true);
    expect(s.daily.raidTickets).toBe(0);
    const events = run(s, b, RAID.duration + 3);
    const end = events.find((e) => e.type === 'raidEnd');
    expect(end).toBeDefined();
    if (end?.type === 'raidEnd') {
      expect(end.damage).toBeGreaterThan(0);
      expect(end.gems).toBeGreaterThanOrEqual(0);
      expect(s.raid.bestDamage).toBe(end.damage);
    }
    expect(b.mode).toBe('stage');
    expect(startRaid(s, b, computeStats(s))).toBe(false);
  });
  it('arena win and loss adjust rating', () => {
    const s = createInitialState(0);
    s.hero.upgrades.atk = 500;
    s.hero.upgrades.hp = 200;
    const b = createBattle(s, computeStats(s));
    expect(startArena(s, b, computeStats(s), { name: '상대', stage: 1, level: 5 })).toBe(true);
    let events = run(s, b, ARENA.duration + 2);
    let end = events.find((e) => e.type === 'arenaEnd');
    expect(end?.type === 'arenaEnd' && end.won).toBe(true);
    expect(s.arena.rating).toBe(1000 + ARENA.ratingWin);
    s.hero.upgrades.atk = 0;
    expect(startArena(s, b, computeStats(s), { name: '강자', stage: 300, level: 200 })).toBe(true);
    events = run(s, b, ARENA.duration + 2);
    end = events.find((e) => e.type === 'arenaEnd');
    expect(end?.type === 'arenaEnd' && !end.won).toBe(true);
    expect(s.arena.losses).toBe(1);
    expect(b.mode).toBe('stage');
  });
  it('sweep spends a ticket and pays out', () => {
    const s = createInitialState(0);
    const st = computeStats(s);
    const est = sweepEstimate(s, st, 'gold');
    expect(est.gold).toBeGreaterThan(0);
    expect(sweep(s, st, 'gold')).not.toBeNull();
    expect(s.daily.goldTickets).toBe(2);
    expect(s.gold).toBeCloseTo(est.gold);
    expect(sweep(s, st, 'gem')!.gems).toBeGreaterThan(0);
    expect(s.daily.gemTickets).toBe(0);
    expect(sweep(s, st, 'gem')).toBeNull();
  });
  it('auto upgrade buys cheapest affordable; autoAdvance off farms the stage', () => {
    const s = createInitialState(0);
    s.gold = 100;
    expect(autoUpgrade(s)).toBeGreaterThan(0);
    expect(s.gold).toBeLessThan(30);
    const s2 = createInitialState(0);
    s2.settings.autoAdvance = false;
    s2.hero.upgrades.atk = 50;
    const b = createBattle(s2, computeStats(s2));
    for (let i = 0; i < 1200; i++) simulate(s2, b, 0.05, i * 50);
    expect(s2.progress.maxStage).toBe(1);
    expect(s2.progress.farmStage).toBe(1);
    expect(s2.stats.totalKills).toBeGreaterThan(5);
  });
});
