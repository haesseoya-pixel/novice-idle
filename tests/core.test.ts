import { describe, expect, it } from 'vitest';
import { advanceJob, canAdvance, reclass } from '@/game/advance';
import { MAX_STAGE, RARITY_RATES, UPGRADES, UPGRADE_BY_ID, expReq } from '@/game/balance';
import { autoEquip, bestForSlot, canStarforce, pull, pullOnce, starforce, starforceCost } from '@/game/equipment';
import { availableSkills, jobTitle } from '@/game/jobs';
import { REGIONS, bossHp, isBossStage, monsterAtk, monsterGold, monsterHp, stageInfo, stageLabel } from '@/game/monsters';
import { offlineReward, updateEma } from '@/game/offline';
import { claimQuest, questDone, questType } from '@/game/quests';
import { skillUpgradeCost, unlockedSkills, upgradeSkill } from '@/game/skills';
import { computeStats, damageTaken, itemValue } from '@/game/stats';
import { createInitialState } from '@/game/state';
import { affordableCount, buyUpgrade, costOfN, maxAffordable } from '@/game/upgrades';

describe('balance tables', () => {
  it('upgrade values and costs are finite, positive and monotonic to max', () => {
    for (const u of UPGRADES) {
      let prevV = -Infinity;
      for (const L of [0, 1, 10, Math.min(100, u.max), u.max]) {
        const v = u.value(L);
        expect(Number.isFinite(v)).toBe(true);
        expect(v).toBeGreaterThanOrEqual(prevV);
        prevV = v;
        expect(Number.isFinite(costOfN(u, 0, L || 1))).toBe(true);
      }
    }
    expect(UPGRADE_BY_ID.atk.value(0)).toBe(10);
    expect(UPGRADE_BY_ID.hp.value(0)).toBe(100);
  });
  it('monster tables are monotonic and finite up to MAX_STAGE', () => {
    let prev = 0;
    for (let n = 1; n <= MAX_STAGE; n += 7) {
      const hp = monsterHp(n);
      expect(Number.isFinite(hp)).toBe(true);
      expect(hp).toBeGreaterThan(prev);
      prev = hp;
      expect(Number.isFinite(monsterAtk(n))).toBe(true);
      expect(Number.isFinite(monsterGold(n))).toBe(true);
      expect(Number.isFinite(bossHp(n))).toBe(true);
    }
    expect(monsterHp(1)).toBe(80);
    expect(monsterHp(10)).toBeCloseTo(80 * Math.pow(1.15, 9), 3);
  });
  it('stage info loops through 10 regions and flags bosses', () => {
    expect(stageInfo(1).region.id).toBe('meadow');
    expect(stageInfo(10).isBoss).toBe(true);
    expect(stageInfo(11).region.index).toBe(1);
    expect(stageInfo(100).region.index).toBe(9);
    expect(stageInfo(101).loop).toBe(1);
    expect(stageInfo(101).region.index).toBe(0);
    expect(isBossStage(20)).toBe(true);
    expect(isBossStage(21)).toBe(false);
    expect(stageLabel(101)).toContain('2회차');
    expect(REGIONS.length).toBe(10);
    for (const r of REGIONS) expect(new Set(r.monsters.map((m) => m.id)).size).toBe(3);
  });
  it('exp curve grows', () => {
    expect(expReq(1)).toBeCloseTo(5.35, 2);
    expect(expReq(10)).toBeGreaterThan(expReq(5));
  });
  it('rarity rates sum to 1', () => {
    expect(RARITY_RATES.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
  });
});

describe('upgrades', () => {
  it('costOfN matches summed singles; maxAffordable exact', () => {
    const def = UPGRADE_BY_ID.atk;
    let sum = 0;
    for (let i = 3; i < 10; i++) sum += def.base * Math.pow(def.growth, i);
    expect(costOfN(def, 3, 7)).toBeCloseTo(sum, 6);
    const budget = costOfN(def, 0, 5);
    expect(maxAffordable(def, 0, budget)).toBe(5);
    expect(maxAffordable(def, 0, budget - 0.001)).toBe(4);
    expect(maxAffordable({ ...def, max: 3 }, 2, 1e12)).toBe(1);
  });
  it('buyUpgrade deducts gold and respects max', () => {
    const s = createInitialState(0);
    s.gold = 100;
    expect(buyUpgrade(s, 'atk', 1)).toBe(1);
    expect(s.gold).toBeCloseTo(90);
    expect(affordableCount(s, 'atk', 'max')).toBeGreaterThan(0);
    s.hero.upgrades.def = 400;
    expect(buyUpgrade(s, 'def', 1)).toBe(0);
  });
});

describe('stats', () => {
  it('composes multipliers', () => {
    const s = createInitialState(0);
    const base = computeStats(s);
    expect(base.atk).toBeCloseTo(10);
    expect(base.hp).toBeCloseTo(100);
    expect(base.critMult).toBeCloseTo(1 + 0.05 * 0.5);
    s.hero.level = 11;
    expect(computeStats(s).atk).toBeCloseTo(11);
    s.hero.job = 'warrior';
    s.hero.tier = 1;
    const w = computeStats(s);
    expect(w.atk).toBeCloseTo(11 * 1.5);
    expect(w.hp).toBeCloseTo(110 * 1.5 * 1.3);
    s.inventory.weapon_3 = 1;
    s.hero.equipped.weapon = 'weapon_3';
    expect(computeStats(s).atk).toBeCloseTo(11 * 1.5 * 2 * (1 + 0.005));
    s.hero.stars.weapon = 10;
    expect(computeStats(s).atk).toBeCloseTo(11 * 1.5 * (1 + 1.6) * 1.005);
  });
  it('damage taken never reaches zero', () => {
    expect(damageTaken(100, 0)).toBe(100);
    expect(damageTaken(100, 100)).toBe(50);
    expect(damageTaken(100, 2000)).toBeGreaterThan(0);
  });
  it('item value scales with level', () => {
    expect(itemValue(0, 1)).toBeCloseTo(0.1);
    expect(itemValue(0, 101)).toBeCloseTo(0.1 * 9);
    expect(itemValue(5, 1)).toBe(4);
  });
});

describe('equipment & gacha', () => {
  it('rates roughly match over many pulls and pity guarantees fire', () => {
    const s = createInitialState(0);
    const counts = [0, 0, 0, 0, 0, 0];
    let maxSinceHero = 0;
    let maxSinceLegend = 0;
    for (let i = 0; i < 6000; i++) {
      const r = pullOnce(s);
      counts[r.rarity] = (counts[r.rarity] ?? 0) + 1;
      maxSinceHero = Math.max(maxSinceHero, s.pity.sinceHero);
      maxSinceLegend = Math.max(maxSinceLegend, s.pity.sinceLegend);
    }
    expect(counts[0]! / 6000).toBeGreaterThan(0.3);
    expect(counts[0]! / 6000).toBeLessThan(0.5);
    expect(counts[3]! + counts[4]! + counts[5]!).toBeGreaterThan(400);
    expect(maxSinceHero).toBeLessThanOrEqual(30);
    expect(maxSinceLegend).toBeLessThanOrEqual(100);
  });
  it('ten pull costs 90 gems, guarantees 희귀+, levels duplicates, auto equips best', () => {
    const s = createInitialState(0);
    s.gems = 100;
    const res = pull(s, 10);
    expect(res).not.toBeNull();
    expect(s.gems).toBe(10);
    expect(res!.some((r) => r.rarity >= 2)).toBe(true);
    const total = Object.values(s.inventory).reduce((a, b) => a + (b ?? 0), 0);
    expect(total).toBe(10);
    for (const slot of ['weapon', 'armor', 'accessory', 'pet'] as const) {
      const best = bestForSlot(s, slot);
      expect(s.hero.equipped[slot]).toBe(best);
    }
    expect(pull(s, 10)).toBeNull();
  });
  it('starforce costs gold and raises stars', () => {
    const s = createInitialState(0);
    s.inventory.weapon_0 = 1;
    autoEquip(s);
    expect(canStarforce(s, 'weapon')).toBe(false);
    s.gold = starforceCost(s, 'weapon') * 3;
    expect(starforce(s, 'weapon')).toBe(true);
    expect(s.hero.stars.weapon).toBe(1);
    expect(starforceCost(s, 'weapon')).toBeGreaterThan(starforceCost({ ...s, hero: { ...s.hero, stars: { ...s.hero.stars, weapon: 0 } } }, 'weapon'));
  });
});

describe('jobs & skills', () => {
  it('advances tiers at level thresholds and needs a path for tier 1', () => {
    const s = createInitialState(0);
    expect(canAdvance(s)).toBe(false);
    s.hero.level = 10;
    expect(canAdvance(s)).toBe(true);
    expect(advanceJob(s)).toBeNull();
    expect(advanceJob(s, 'mage')).toBe(1);
    expect(jobTitle(s.hero.job, s.hero.tier)).toBe('견습 마법사');
    expect(availableSkills('mage', 1).length).toBe(2);
    expect(unlockedSkills(s).map((k) => k.id)).toEqual(['novice_strike', 'm_fireball']);
    s.hero.level = 29;
    expect(canAdvance(s)).toBe(false);
    s.hero.level = 100;
    expect(advanceJob(s)).toBe(2);
    expect(advanceJob(s)).toBe(3);
    expect(advanceJob(s)).toBe(4);
    expect(advanceJob(s)).toBeNull();
    expect(unlockedSkills(s).length).toBe(5);
    s.gems = 300;
    expect(reclass(s, 'archer')).toBe(true);
    expect(s.hero.job).toBe('archer');
    expect(s.hero.tier).toBe(4);
  });
  it('skill upgrade cost curve and gold deduction', () => {
    const s = createInitialState(0);
    expect(skillUpgradeCost('novice_strike', 1)).toBe(50);
    expect(skillUpgradeCost('w_ult', 1)).toBe(100);
    s.gold = 49;
    expect(upgradeSkill(s, 'novice_strike')).toBe(false);
    s.gold = 50;
    expect(upgradeSkill(s, 'novice_strike')).toBe(true);
    expect(s.hero.skills.novice_strike).toBe(2);
    expect(s.gold).toBe(0);
  });
});

describe('quests & offline', () => {
  it('quest chain cycles and rewards', () => {
    const s = createInitialState(0);
    expect(questType(s)).toBe('kills');
    s.quest.progress = s.quest.target;
    expect(questDone(s)).toBe(true);
    const r = claimQuest(s);
    expect(r?.gems).toBe(3);
    expect(questType(s)).toBe('upgrades');
    expect(s.gems).toBe(3);
    for (let i = 0; i < 4; i++) {
      s.quest.progress = s.quest.target;
      claimQuest(s);
    }
    expect(s.quest.cycle).toBe(1);
    expect(questType(s)).toBe('kills');
    expect(s.quest.target).toBe(Math.round(30 * 1.35));
  });
  it('EMA and offline reward with cap', () => {
    const s = createInitialState(0);
    for (let i = 0; i < 3000; i++) updateEma(s, 10, 2, 1);
    expect(s.offline.emaGold).toBeCloseTo(10, 1);
    const r = offlineReward(s, 100 * 3600);
    expect(r.capped).toBe(true);
    expect(r.elapsed).toBe(8 * 3600);
    expect(r.gold).toBeCloseTo(10 * 8 * 3600 * 0.5, -2);
    expect(offlineReward(s, -5).gold).toBe(0);
    s.hero.tier = 4;
    expect(offlineReward(s, 100 * 3600).elapsed).toBe(12 * 3600);
  });
});
