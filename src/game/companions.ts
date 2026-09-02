import { GEMS } from './balance';
import type { GameState } from './state';
import { mulberry32 } from '@/util/rng';

export type CompanionId = 'slimeknight' | 'foxspirit' | 'owlsage' | 'emberbat' | 'frostcat' | 'stonepup' | 'stardragon' | 'moonrabbit';
export type CompanionPassive = 'atkPct' | 'hpPct' | 'critDmg' | 'goldPct' | 'bossDmg' | 'skillPct';
export type CompanionRarity = 2 | 3 | 4; // 희귀 · 영웅 · 전설

export interface CompanionDef {
  id: CompanionId;
  name: string;
  icon: string;
  color: string;
  rarity: CompanionRarity;
  passive: CompanionPassive;
  passivePer: number; // per level (level 1 = base)
  strikeMult: number; // damage multiple of hero ATK
  strikeEvery: number; // seconds
  desc: string;
}

export const COMPANIONS: readonly CompanionDef[] = [
  { id: 'slimeknight', name: '슬라임 기사', icon: '🟢', color: '#7ed957', rarity: 2, passive: 'hpPct', passivePer: 0.04, strikeMult: 1.2, strikeEvery: 4, desc: '체력 증가. 방패로 돌진' },
  { id: 'foxspirit', name: '여우 정령', icon: '🦊', color: '#ff9f43', rarity: 2, passive: 'goldPct', passivePer: 0.05, strikeMult: 1.0, strikeEvery: 4, desc: '골드 획득 증가. 불꽃 돌진' },
  { id: 'owlsage', name: '올빼미 현자', icon: '🦉', color: '#9ad8ff', rarity: 2, passive: 'skillPct', passivePer: 0.04, strikeMult: 1.5, strikeEvery: 5, desc: '스킬 피해 증가. 마법탄' },
  { id: 'emberbat', name: '잉걸 박쥐', icon: '🦇', color: '#ff5252', rarity: 3, passive: 'atkPct', passivePer: 0.04, strikeMult: 2.0, strikeEvery: 4, desc: '공격력 증가. 화염 급습' },
  { id: 'frostcat', name: '서리 고양이', icon: '🐱', color: '#a9d6ff', rarity: 3, passive: 'critDmg', passivePer: 0.08, strikeMult: 2.2, strikeEvery: 5, desc: '치명타 피해 증가. 얼음 발톱' },
  { id: 'stonepup', name: '돌 강아지', icon: '🐶', color: '#b0a08a', rarity: 3, passive: 'bossDmg', passivePer: 0.06, strikeMult: 1.8, strikeEvery: 4, desc: '보스 피해 증가. 바위 박치기' },
  { id: 'stardragon', name: '별 드래곤', icon: '🐉', color: '#ffd166', rarity: 4, passive: 'atkPct', passivePer: 0.08, strikeMult: 4.0, strikeEvery: 6, desc: '공격력 크게 증가. 별빛 브레스' },
  { id: 'moonrabbit', name: '달 토끼', icon: '🐰', color: '#e0c3ff', rarity: 4, passive: 'bossDmg', passivePer: 0.12, strikeMult: 3.5, strikeEvery: 6, desc: '보스 피해 크게 증가. 달빛 참격' },
];
export const COMPANION_BY_ID: Record<CompanionId, CompanionDef> = Object.fromEntries(COMPANIONS.map((c) => [c.id, c])) as Record<CompanionId, CompanionDef>;
export const COMPANION_SLOTS = 3;
export const COMPANION_RATES: Record<CompanionRarity, number> = { 2: 0.7, 3: 0.25, 4: 0.05 };
export const PASSIVE_NAMES: Record<CompanionPassive, string> = { atkPct: '공격력', hpPct: '체력', critDmg: '치명타 피해', goldPct: '골드 획득', bossDmg: '보스 피해', skillPct: '스킬 피해' };

export interface CompanionPull {
  id: CompanionId;
  level: number;
  isNew: boolean;
}

export function companionLevel(s: GameState, id: CompanionId): number {
  return s.companions.owned[id] ?? 0;
}

export function companionPower(def: CompanionDef, level: number): number {
  return def.passivePer * level;
}

export function canSummon(s: GameState, count: 1 | 10): boolean {
  return s.gems >= (count === 10 ? GEMS.companionTenCost : GEMS.companionCost);
}

export function summon(s: GameState, count: 1 | 10): CompanionPull[] | null {
  if (!canSummon(s, count)) return null;
  s.gems -= count === 10 ? GEMS.companionTenCost : GEMS.companionCost;
  const out: CompanionPull[] = [];
  for (let i = 0; i < count; i++) {
    const rng = mulberry32(s.pity.seed);
    const r1 = rng();
    const r2 = rng();
    s.pity.seed = (Math.floor(rng() * 4294967296) ^ 0x51ed27) >>> 0 || 1;
    let rarity: CompanionRarity = r1 < COMPANION_RATES[4] ? 4 : r1 < COMPANION_RATES[4] + COMPANION_RATES[3] ? 3 : 2;
    if (count === 10 && i === 9 && !out.some((p) => COMPANION_BY_ID[p.id].rarity >= 3)) rarity = 3;
    const pool = COMPANIONS.filter((c) => c.rarity === rarity);
    const def = pool[Math.min(pool.length - 1, Math.floor(r2 * pool.length))]!;
    const prev = companionLevel(s, def.id);
    s.companions.owned[def.id] = prev + 1;
    out.push({ id: def.id, level: prev + 1, isNew: prev === 0 });
  }
  s.stats.companionPulls += count;
  autoEquipCompanions(s);
  return out;
}

function score(s: GameState, id: CompanionId): number {
  const def = COMPANION_BY_ID[id];
  return def.rarity * 10 + companionLevel(s, id) * 0.5 + def.strikeMult;
}

export function autoEquipCompanions(s: GameState): void {
  const owned = (Object.keys(s.companions.owned) as CompanionId[]).filter((id) => companionLevel(s, id) > 0);
  owned.sort((a, b) => score(s, b) - score(s, a));
  const best = owned.slice(0, COMPANION_SLOTS);
  const current = s.companions.equipped.filter((id): id is CompanionId => id !== null && companionLevel(s, id) > 0);
  const merged: CompanionId[] = [];
  for (const id of [...current, ...best]) if (!merged.includes(id)) merged.push(id);
  const chosen = merged.sort((a, b) => score(s, b) - score(s, a)).slice(0, COMPANION_SLOTS);
  s.companions.equipped = [chosen[0] ?? null, chosen[1] ?? null, chosen[2] ?? null];
}

export function equipCompanion(s: GameState, id: CompanionId, slot: number): boolean {
  if (companionLevel(s, id) <= 0 || slot < 0 || slot >= COMPANION_SLOTS) return false;
  const existing = s.companions.equipped.indexOf(id);
  if (existing >= 0) s.companions.equipped[existing] = s.companions.equipped[slot] ?? null;
  s.companions.equipped[slot] = id;
  return true;
}

export function companionTotals(s: GameState): Record<CompanionPassive, number> {
  const t: Record<CompanionPassive, number> = { atkPct: 0, hpPct: 0, critDmg: 0, goldPct: 0, bossDmg: 0, skillPct: 0 };
  for (const id of s.companions.equipped) {
    if (!id) continue;
    const lv = companionLevel(s, id);
    if (lv <= 0) continue;
    const def = COMPANION_BY_ID[id];
    t[def.passive] += companionPower(def, lv);
  }
  return t;
}

export function equippedCompanions(s: GameState): CompanionDef[] {
  return s.companions.equipped.filter((id): id is CompanionId => id !== null && companionLevel(s, id) > 0).map((id) => COMPANION_BY_ID[id]);
}
