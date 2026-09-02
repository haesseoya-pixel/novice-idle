import { describe, expect, it } from 'vitest';
import { advanceJob, canAdvance } from '@/game/advance';
import { UPGRADES, UPGRADE_BY_ID, type UpgradeId } from '@/game/balance';
import { createBattle } from '@/game/battle';
import { pull } from '@/game/equipment';
import { computeStats } from '@/game/stats';
import { createInitialState } from '@/game/state';
import { simulate } from '@/game/tick';
import { affordableCount, buyUpgrade, costOfN } from '@/game/upgrades';

/**
 * Greedy idle bot: every second buys the cheapest useful upgrade whose cost is below 60 s of income,
 * ten-pulls when it has 90 gems, advances jobs when possible (warrior). Reports milestones in minutes.
 */
function runBot(minutes: number) {
  const gs = createInitialState(0);
  const b = createBattle(gs, computeStats(gs));
  const dt = 0.05;
  const steps = Math.round((minutes * 60) / dt);
  const milestones: Record<string, number> = {};
  let lastBuy = 0;
  let maxGap = 0;
  const priorities: UpgradeId[] = ['atk', 'hp', 'atk', 'atk', 'hp', 'def', 'crit', 'critDmg', 'aspd', 'regen', 'gold'];
  let pIdx = 0;
  for (let i = 0; i < steps; i++) {
    const t = i * dt;
    simulate(gs, b, dt, t * 1000);
    if (i % 20 === 0) {
      // once per second: shopping
      let bought = false;
      for (let k = 0; k < priorities.length; k++) {
        const id = priorities[(pIdx + k) % priorities.length]!;
        const def = UPGRADE_BY_ID[id];
        const lv = gs.hero.upgrades[id];
        if (lv >= def.max) continue;
        if (costOfN(def, lv, 1) <= gs.gold) {
          const n = Math.max(1, Math.min(affordableCount(gs, id, 'max'), 10));
          buyUpgrade(gs, id, n);
          bought = true;
          pIdx = (pIdx + k + 1) % priorities.length;
          break;
        }
      }
      if (bought) {
        if (t < 900) maxGap = Math.max(maxGap, t - lastBuy);
        lastBuy = t;
      }
      if (gs.gems >= 90) pull(gs, 10);
      if (canAdvance(gs)) advanceJob(gs, 'warrior');
      for (const s of [10, 20, 30, 40, 50, 75, 100]) if (gs.progress.maxStage > s && milestones[`stage${s}`] === undefined) milestones[`stage${s}`] = t / 60;
      for (const tier of [1, 2, 3, 4]) if (gs.hero.tier >= tier && milestones[`job${tier}`] === undefined) milestones[`job${tier}`] = t / 60;
    }
  }
  return { gs, milestones, maxGap };
}

describe.skipIf(!process.env.PACING)('pacing bot', () => {
  it('reaches design targets', () => {
    const { gs, milestones, maxGap } = runBot(120);
    console.log('milestones (min):', JSON.stringify(milestones), 'maxGap', maxGap.toFixed(0), 'level', gs.hero.level, 'maxStage', gs.progress.maxStage, 'gems', gs.gems, 'upgrades', JSON.stringify(gs.hero.upgrades));
    // 초반은 퍼주고, 뒤로 갈수록 벽이 생기는 곡선
    expect(milestones.stage10).toBeLessThan(10);
    expect(milestones.job1).toBeLessThan(12);
    expect(milestones.stage40).toBeLessThan(25);
    expect(milestones.stage100).toBeGreaterThan(30);
    expect(gs.progress.maxStage).toBeLessThan(200);
    expect(maxGap).toBeLessThan(75);
    for (const u of UPGRADES) expect(gs.hero.upgrades[u.id]).toBeLessThanOrEqual(u.max);
  }, 120000);
});
