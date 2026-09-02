import { COLLECTION_PER_LEVEL, HERO, ITEM_LEVEL_BONUS, RARITY_BASE, STARFORCE, UPGRADE_BY_ID, type Rarity, type Slot } from './balance';
import { JOBS, jobMult } from './jobs';
import type { GameState, ItemKey } from './state';
import { potentialTotals } from './potential';
import { artifactTotals } from './artifacts';
import { companionTotals } from './companions';

export interface HeroStats {
  atk: number;
  hp: number;
  def: number;
  critRate: number;
  critDmg: number;
  atkSpeed: number;
  regen: number; // fraction of max HP per second
  goldMult: number;
  expMult: number;
  skillMult: number;
  critMult: number;
  dps: number;
  ranged: boolean;
  power: number;
  bossDmg: number;
  cooldown: number;
}

export function parseItemKey(key: ItemKey): { slot: Slot; rarity: Rarity } {
  const [slot, r] = key.split('_') as [Slot, string];
  return { slot, rarity: Number(r) as Rarity };
}

/** Effective primary value (fraction) of an item at a level, before star force. */
export function itemValue(rarity: Rarity, level: number): number {
  return RARITY_BASE[rarity] * (1 + ITEM_LEVEL_BONUS * (Math.max(1, level) - 1));
}

export function itemValueWithStars(rarity: Rarity, level: number, stars: number): number {
  return itemValue(rarity, level) * (1 + STARFORCE.perStar * stars);
}

/** +1% ATK/HP per discovered monster type (max 40 types). */
export function codexBonus(s: GameState): number {
  return 0.01 * Math.min(40, Object.keys(s.codex).length);
}

export function collectionBonus(s: GameState): number {
  let total = 0;
  for (const lv of Object.values(s.inventory)) total += lv ?? 0;
  return COLLECTION_PER_LEVEL * total;
}

export function equippedValue(s: GameState, slot: Slot): number {
  const key = s.hero.equipped[slot];
  if (!key) return 0;
  const lv = s.inventory[key] ?? 0;
  if (lv <= 0) return 0;
  const { rarity } = parseItemKey(key);
  return itemValueWithStars(rarity, lv, s.hero.stars[slot]);
}

export function computeStats(s: GameState): HeroStats {
  const h = s.hero;
  const L = h.upgrades;
  const job = h.job ? JOBS[h.job] : null;
  const jm = jobMult(h.tier);
  const lvBonus = 1 + HERO.levelStatBonus * (h.level - 1);
  const coll = (1 + collectionBonus(s)) * (1 + codexBonus(s));
  const weapon = equippedValue(s, 'weapon');
  const armor = equippedValue(s, 'armor');
  const acc = equippedValue(s, 'accessory');
  const pet = equippedValue(s, 'pet');
  const pot = potentialTotals(s);
  const art = artifactTotals(s);
  const comp = companionTotals(s);

  const atk = UPGRADE_BY_ID.atk.value(L.atk) * (1 + weapon) * coll * lvBonus * jm * (1 + pot.atkPct + art.atkPct + comp.atkPct);
  const hp = UPGRADE_BY_ID.hp.value(L.hp) * (1 + armor) * coll * lvBonus * jm * (job?.hpMult ?? 1) * (1 + pot.hpPct + art.hpPct + comp.hpPct);
  const def = UPGRADE_BY_ID.def.value(L.def) * (job?.defMult ?? 1) + pot.defFlat;
  const critRate = Math.min(0.95, UPGRADE_BY_ID.crit.value(L.crit) + (job?.critBonus ?? 0) + pot.critRate);
  const critDmg = UPGRADE_BY_ID.critDmg.value(L.critDmg) + acc + (job?.critDmgBonus ?? 0) + pot.critDmg + art.critDmg + comp.critDmg;
  const atkSpeed = UPGRADE_BY_ID.aspd.value(L.aspd) * (job?.aspdMult ?? 1);
  const regen = UPGRADE_BY_ID.regen.value(L.regen);
  const goldMult = 1 + UPGRADE_BY_ID.gold.value(L.gold) + pet + pot.goldPct + art.goldPct + comp.goldPct;
  const expMult = 1 + pet + pot.expPct + art.expPct;
  const skillMult = (1 + acc / 2 + pot.skillPct + comp.skillPct) * (job?.skillMult ?? 1);
  const critMult = 1 + critRate * (critDmg - 1);
  const dps = atk * atkSpeed * critMult;
  const power = Math.round(dps * Math.sqrt(hp));
  return { atk, hp, def, critRate, critDmg, atkSpeed, regen, goldMult, expMult, skillMult, critMult, dps, ranged: job?.ranged ?? false, power, bossDmg: comp.bossDmg, cooldown: art.cooldown };
}

export function damageTaken(raw: number, def: number): number {
  return (raw * 100) / (100 + Math.max(0, def));
}
