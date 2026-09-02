import { FUSION, GEMS, ITEM_MAX_LEVEL, PITY, RARITY_RATES, SLOTS, STARFORCE, type Rarity, type Slot } from './balance';
import { monsterGold } from './monsters';
import { MONSTER } from './balance';
import { itemValueWithStars, parseItemKey } from './stats';
import type { GameState, ItemKey } from './state';
import { mulberry32 } from '@/util/rng';
import { missionProgress } from './missions';

export const itemKey = (slot: Slot, rarity: Rarity): ItemKey => `${slot}_${rarity}`;

export interface PullResult {
  key: ItemKey;
  slot: Slot;
  rarity: Rarity;
  level: number;
  isNew: boolean;
  pity: 'none' | 'ten' | 'hero' | 'legend';
}

function rollRarity(r: number): Rarity {
  let acc = 0;
  for (let i = 0; i < RARITY_RATES.length; i++) {
    acc += RARITY_RATES[i]!;
    if (r < acc) return i as Rarity;
  }
  return 5;
}

/** Performs one pull using the saved seed (deterministic). Does not charge gems. */
export function pullOnce(s: GameState, forceMin: Rarity = 0): PullResult {
  const rng = mulberry32(s.pity.seed);
  const r1 = rng();
  const r2 = rng();
  s.pity.seed = (Math.floor(rng() * 4294967296) ^ (s.pity.pulls + 1)) >>> 0;
  let rarity = rollRarity(r1);
  let pity: PullResult['pity'] = 'none';
  s.pity.pulls++;
  s.pity.sinceHero++;
  s.pity.sinceLegend++;
  if (s.pity.sinceLegend >= PITY.legendEvery && rarity < 4) {
    rarity = 4;
    pity = 'legend';
  } else if (s.pity.sinceHero >= PITY.heroEvery && rarity < 3) {
    rarity = 3;
    pity = 'hero';
  } else if (rarity < forceMin) {
    rarity = forceMin;
    pity = 'ten';
  }
  if (rarity >= 3) s.pity.sinceHero = 0;
  if (rarity >= 4) s.pity.sinceLegend = 0;
  const slot = SLOTS[Math.min(SLOTS.length - 1, Math.floor(r2 * SLOTS.length))]!;
  const key = itemKey(slot, rarity);
  const prev = s.inventory[key] ?? 0;
  const level = Math.min(ITEM_MAX_LEVEL, prev + 1);
  s.inventory[key] = level;
  s.stats.gachaPulls++;
  return { key, slot, rarity, level, isNew: prev === 0, pity };
}

export function canPull(s: GameState, count: 1 | 10): boolean {
  return s.gems >= (count === 10 ? GEMS.tenPullCost : GEMS.pullCost);
}

export function pull(s: GameState, count: 1 | 10): PullResult[] | null {
  if (!canPull(s, count)) return null;
  s.gems -= count === 10 ? GEMS.tenPullCost : GEMS.pullCost;
  missionProgress(s, 'gacha', count);
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    // ten-pull guarantees at least one 희귀+ in the last slot when none rolled yet
    const needGuarantee = count === 10 && i === 9 && !results.some((r) => r.rarity >= PITY.tenPullMinRarity);
    results.push(pullOnce(s, needGuarantee ? PITY.tenPullMinRarity : 0));
  }
  autoEquip(s);
  return results;
}

export function bestForSlot(s: GameState, slot: Slot): ItemKey | null {
  let best: ItemKey | null = null;
  let bestV = -1;
  for (const [k, lv] of Object.entries(s.inventory) as [ItemKey, number][]) {
    if (!lv) continue;
    const p = parseItemKey(k);
    if (p.slot !== slot) continue;
    const v = itemValueWithStars(p.rarity, lv, 0);
    if (v > bestV) {
      bestV = v;
      best = k;
    }
  }
  return best;
}

export function autoEquip(s: GameState): void {
  for (const slot of SLOTS) {
    const best = bestForSlot(s, slot);
    if (best && best !== s.hero.equipped[slot]) s.hero.equipped[slot] = best;
  }
}

export function equip(s: GameState, key: ItemKey): boolean {
  if (!s.inventory[key]) return false;
  const { slot } = parseItemKey(key);
  s.hero.equipped[slot] = key;
  return true;
}

export function canFuse(s: GameState, key: ItemKey): boolean {
  const { rarity } = parseItemKey(key);
  return rarity < 5 && (s.inventory[key] ?? 0) >= FUSION.need;
}

/** Fuses FUSION.need copies of an item into one copy of the next rarity (same slot). */
export function fuse(s: GameState, key: ItemKey): ItemKey | null {
  if (!canFuse(s, key)) return null;
  const { slot, rarity } = parseItemKey(key);
  const next = itemKey(slot, (rarity + 1) as Rarity);
  s.inventory[key] = (s.inventory[key] ?? 0) - FUSION.need;
  if ((s.inventory[key] ?? 0) <= 0) {
    delete s.inventory[key];
    if (s.hero.equipped[slot] === key) s.hero.equipped[slot] = null;
  }
  s.inventory[next] = Math.min(ITEM_MAX_LEVEL, (s.inventory[next] ?? 0) + 1);
  s.stats.fusions++;
  autoEquip(s);
  return next;
}

/** Fuses everything that can be fused, lowest rarity first. Returns number of fusions. */
export function fuseAll(s: GameState): number {
  let n = 0;
  for (let r = 0; r < 5; r++) for (const slot of SLOTS) {
    const key = itemKey(slot, r as Rarity);
    while (canFuse(s, key)) {
      fuse(s, key);
      n++;
    }
  }
  return n;
}

export function starforceCost(s: GameState, slot: Slot): number {
  const n = Math.max(1, s.progress.maxStage);
  const base = monsterGold(n) * MONSTER.waveSize(n) * 2;
  return base * Math.pow(STARFORCE.costGrowth, s.hero.stars[slot]);
}

export function canStarforce(s: GameState, slot: Slot): boolean {
  return s.hero.equipped[slot] !== null && s.hero.stars[slot] < STARFORCE.maxStars && s.gold >= starforceCost(s, slot);
}

export function starforce(s: GameState, slot: Slot): boolean {
  if (!canStarforce(s, slot)) return false;
  s.gold -= starforceCost(s, slot);
  s.hero.stars[slot] += 1;
  return true;
}

