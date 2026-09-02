import { UPGRADES, UPGRADE_BY_ID, type UpgradeId } from './balance';
import type { GameState } from './state';

export interface CostCurve {
  base: number;
  growth: number;
  max: number;
}

export function costOf(def: CostCurve, level: number): number {
  return def.base * Math.pow(def.growth, level);
}

/** Total cost of n levels starting at `level` (geometric closed form). */
export function costOfN(def: CostCurve, level: number, n: number): number {
  if (n <= 0) return 0;
  const g = def.growth;
  if (Math.abs(g - 1) < 1e-9) return def.base * n;
  return (def.base * Math.pow(g, level) * (Math.pow(g, n) - 1)) / (g - 1);
}

export function maxAffordable(def: CostCurve, level: number, budget: number): number {
  const remaining = def.max === Infinity ? Infinity : Math.max(0, def.max - level);
  if (remaining === 0 || budget <= 0) return 0;
  const first = costOf(def, level);
  if (budget < first) return 0;
  const g = def.growth;
  let n = Math.abs(g - 1) < 1e-9 ? Math.floor(budget / def.base) : Math.floor(Math.log(1 + (budget * (g - 1)) / first) / Math.log(g));
  while (n > 0 && costOfN(def, level, n) > budget) n--;
  while (costOfN(def, level, n + 1) <= budget && n + 1 <= remaining) n++;
  return Math.min(n, remaining);
}

export function affordableCount(s: GameState, id: UpgradeId, amount: 1 | 10 | 100 | 'max'): number {
  const def = UPGRADE_BY_ID[id];
  const level = s.hero.upgrades[id];
  const cap = Math.max(0, def.max - level);
  if (amount === 'max') return maxAffordable(def, level, s.gold);
  const want = Math.min(amount, cap);
  return want > 0 && costOfN(def, level, want) <= s.gold ? want : 0;
}

/** Buys the cheapest affordable upgrades (up to `maxBuys`), the way the auto-upgrade toggle does. */
export function autoUpgrade(s: GameState, maxBuys = 20): number {
  let bought = 0;
  for (let i = 0; i < maxBuys; i++) {
    let best: UpgradeId | null = null;
    let bestCost = Infinity;
    for (const u of UPGRADES) {
      const lv = s.hero.upgrades[u.id];
      if (lv >= u.max) continue;
      const c = costOf(u, lv);
      if (c <= s.gold && c < bestCost) {
        best = u.id;
        bestCost = c;
      }
    }
    if (!best) break;
    if (buyUpgrade(s, best, 1) <= 0) break;
    bought++;
  }
  return bought;
}

export function buyUpgrade(s: GameState, id: UpgradeId, n: number): number {
  const def = UPGRADE_BY_ID[id];
  const level = s.hero.upgrades[id];
  const count = Math.min(n, Math.max(0, def.max - level));
  if (count <= 0) return 0;
  const cost = costOfN(def, level, count);
  if (s.gold < cost) return 0;
  s.gold -= cost;
  s.hero.upgrades[id] = level + count;
  s.stats.upgradesBought += count;
  return count;
}
