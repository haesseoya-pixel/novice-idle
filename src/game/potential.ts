import { POTENTIAL, SLOTS, type Slot } from './balance';
import type { GameState } from './state';
import { mulberry32 } from '@/util/rng';

export type PotentialStat = 'atkPct' | 'hpPct' | 'critRate' | 'critDmg' | 'goldPct' | 'expPct' | 'skillPct' | 'defFlat';
export interface PotentialLine {
  stat: PotentialStat;
  value: number;
}
export interface SlotPotential {
  grade: number; // 0 레어 .. 3 레전드리
  lines: PotentialLine[];
}

export const POTENTIAL_STATS: readonly PotentialStat[] = ['atkPct', 'hpPct', 'critRate', 'critDmg', 'goldPct', 'expPct', 'skillPct', 'defFlat'];
export const POTENTIAL_NAMES: Record<PotentialStat, string> = { atkPct: '공격력', hpPct: '체력', critRate: '치명타 확률', critDmg: '치명타 피해', goldPct: '골드 획득', expPct: '경험치 획득', skillPct: '스킬 피해', defFlat: '방어력' };
const BASE: Record<PotentialStat, number> = { atkPct: 0.06, hpPct: 0.06, critRate: 0.015, critDmg: 0.12, goldPct: 0.06, expPct: 0.06, skillPct: 0.06, defFlat: 12 };

export function formatLine(l: PotentialLine): string {
  const name = POTENTIAL_NAMES[l.stat];
  if (l.stat === 'defFlat') return `${name} +${Math.round(l.value)}`;
  return `${name} +${(l.value * 100).toFixed(1)}%`;
}

export function emptyPotential(): SlotPotential {
  return { grade: 0, lines: [] };
}

function rollLines(rng: () => number, grade: number): PotentialLine[] {
  const out: PotentialLine[] = [];
  for (let i = 0; i < POTENTIAL.lines; i++) {
    const stat = POTENTIAL_STATS[Math.min(POTENTIAL_STATS.length - 1, Math.floor(rng() * POTENTIAL_STATS.length))]!;
    const roll = 0.6 + rng() * 0.4;
    const v = BASE[stat] * POTENTIAL.gradeMult[grade]! * roll;
    out.push({ stat, value: stat === 'defFlat' ? Math.round(v) : Math.round(v * 1000) / 1000 });
  }
  return out;
}

export function canCube(s: GameState, slot: Slot): boolean {
  return s.hero.equipped[slot] !== null && s.gems >= POTENTIAL.cubeCost;
}

/** Rerolls a slot's potential with a cube. Returns the new potential and whether the grade rose. */
export function cube(s: GameState, slot: Slot): { potential: SlotPotential; upgraded: boolean } | null {
  if (!canCube(s, slot)) return null;
  s.gems -= POTENTIAL.cubeCost;
  const rng = mulberry32(s.pity.seed);
  s.pity.seed = (Math.floor(rng() * 4294967296) ^ 0x9e3779b9) >>> 0 || 1;
  const cur = s.potential[slot] ?? emptyPotential();
  let grade = cur.grade;
  let upgraded = false;
  if (grade < POTENTIAL.gradeMult.length - 1 && rng() < POTENTIAL.upgradeChance[grade]!) {
    grade++;
    upgraded = true;
  }
  const potential = { grade, lines: rollLines(rng, grade) };
  s.potential[slot] = potential;
  s.stats.cubes++;
  return { potential, upgraded };
}

/** Sum of all potential lines across equipped slots (slots without an item contribute nothing). */
export function potentialTotals(s: GameState): Record<PotentialStat, number> {
  const t = { atkPct: 0, hpPct: 0, critRate: 0, critDmg: 0, goldPct: 0, expPct: 0, skillPct: 0, defFlat: 0 };
  for (const slot of SLOTS) {
    if (!s.hero.equipped[slot]) continue;
    const p = s.potential[slot];
    if (!p) continue;
    for (const l of p.lines) t[l.stat] += l.value;
  }
  return t;
}
