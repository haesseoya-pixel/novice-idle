import { describe, expect, it } from 'vitest';
import { POTENTIAL, TOWER } from '@/game/balance';
import { createBattle, battleTick, selectStage, startTower, canChallengeBoss } from '@/game/battle';
import { canFuse, fuse, fuseAll } from '@/game/equipment';
import { cube, potentialTotals } from '@/game/potential';
import { computeStats } from '@/game/stats';
import { createInitialState } from '@/game/state';
import { deserialize, serialize } from '@/util/save';

function run(gs: ReturnType<typeof createInitialState>, b: ReturnType<typeof createBattle>, seconds: number) {
  const events: ReturnType<typeof battleTick> = [];
  for (let i = 0; i < Math.round(seconds / 0.05); i++) events.push(...battleTick(gs, b, computeStats(gs), 0.05));
  return events;
}

describe('fusion', () => {
  it('fuses 5 copies into the next rarity and re-equips', () => {
    const s = createInitialState(0);
    s.inventory.weapon_0 = 6;
    s.hero.equipped.weapon = 'weapon_0';
    expect(canFuse(s, 'weapon_0')).toBe(true);
    expect(fuse(s, 'weapon_0')).toBe('weapon_1');
    expect(s.inventory.weapon_0).toBe(1);
    expect(s.inventory.weapon_1).toBe(1);
    expect(s.hero.equipped.weapon).toBe('weapon_1');
    expect(canFuse(s, 'weapon_0')).toBe(false);
    s.inventory.armor_4 = 10;
    s.inventory.pet_5 = 10;
    expect(fuseAll(s)).toBe(2);
    expect(s.inventory.armor_5).toBe(2);
    expect(s.inventory.armor_4).toBeUndefined();
    expect(s.inventory.pet_5).toBe(10);
    expect(s.stats.fusions).toBe(3);
  });
});

describe('potential', () => {
  it('cube rerolls lines, costs gems, can upgrade grade, and affects stats', () => {
    const s = createInitialState(0);
    s.inventory.weapon_0 = 1;
    s.hero.equipped.weapon = 'weapon_0';
    expect(cube(s, 'armor')).toBeNull();
    s.gems = 5;
    expect(cube(s, 'weapon')).toBeNull();
    s.gems = POTENTIAL.cubeCost * 300;
    let upgrades = 0;
    for (let i = 0; i < 300; i++) {
      const r = cube(s, 'weapon')!;
      expect(r.potential.lines.length).toBe(POTENTIAL.lines);
      if (r.upgraded) upgrades++;
    }
    expect(s.gems).toBe(0);
    expect(upgrades).toBeGreaterThan(0);
    expect(s.potential.weapon.grade).toBeGreaterThanOrEqual(1);
    const t = potentialTotals(s);
    const base = computeStats({ ...s, potential: createInitialState(0).potential });
    const withPot = computeStats(s);
    if (t.atkPct > 0) expect(withPot.atk).toBeGreaterThan(base.atk);
    expect(s.stats.cubes).toBe(300);
    // potentials on an empty slot do nothing
    s.hero.equipped.weapon = null;
    expect(potentialTotals(s).atkPct).toBe(0);
    // roundtrip through save
    expect(deserialize(serialize(s), 0)).toEqual(s);
  });
});

describe('stage select', () => {
  it('moves to a cleared stage and farms it; frontier resumes progress', () => {
    const s = createInitialState(0);
    s.progress.maxStage = 25;
    s.progress.stage = 25;
    const b = createBattle(s, computeStats(s));
    expect(selectStage(s, b, 12)).toBe(true);
    expect(s.progress.stage).toBe(12);
    expect(s.progress.farmStage).toBe(12);
    expect(selectStage(s, b, 99)).toBe(true);
    expect(s.progress.stage).toBe(25);
    expect(s.progress.farmStage).toBeNull();
    expect(selectStage(s, b, 9)).toBe(true);
    expect(canChallengeBoss(s)).toBe(true);
    expect(selectStage(s, b, 8)).toBe(true);
    expect(canChallengeBoss(s)).toBe(false);
  });
});

describe('tower', () => {
  it('runs floors, rewards gems once per floor, ends on timer', () => {
    const s = createInitialState(0);
    s.hero.upgrades.atk = 400;
    s.hero.upgrades.hp = 100;
    const b = createBattle(s, computeStats(s));
    expect(startTower(s, b, computeStats(s))).toBe(true);
    expect(s.daily.towerTickets).toBe(TOWER.tickets - 1);
    expect(b.mode).toBe('tower');
    const events = run(s, b, 60);
    const floors = events.filter((e) => e.type === 'towerFloor');
    expect(floors.length).toBeGreaterThan(1);
    expect(s.tower.bestFloor).toBe(floors.length);
    expect(s.gems).toBeGreaterThan(0);
    // second run: floors already cleared give no gems until surpassing best
    s.hero.upgrades.atk = 0;
    if (b.mode === 'tower') run(s, b, TOWER.timer + 5);
    expect(b.mode).toBe('stage');
    expect(startTower(s, b, computeStats(s))).toBe(true);
    expect(b.towerFloor).toBe(s.tower.bestFloor + 1);
    const gems0 = s.gems;
    const ev2 = run(s, b, TOWER.timer + 5);
    expect(ev2.some((e) => e.type === 'towerEnd')).toBe(true);
    expect(b.mode).toBe('stage');
    expect(s.gems).toBe(gems0);
    expect(startTower(s, b, computeStats(s))).toBe(false);
  });
});
