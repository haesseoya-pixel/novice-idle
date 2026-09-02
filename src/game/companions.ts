import { GEMS } from './balance';
import type { GameState } from './state';
import { mulberry32 } from '@/util/rng';

export type CompanionId =
  | 'slimeknight' | 'foxspirit' | 'owlsage' | 'mossbunny' | 'pebblecrab' | 'bubblefish' | 'sproutcat' | 'dustmoth'
  | 'emberbat' | 'frostcat' | 'stonepup' | 'thunderferret' | 'sandhound' | 'gustfalcon' | 'inkoctopus' | 'runeturtle'
  | 'mossbear' | 'shadowraven'
  | 'stardragon' | 'moonrabbit' | 'sunphoenix' | 'voidserpent' | 'crystalunicorn' | 'stormwyrm'
  | 'astralkirin' | 'eclipsehound' | 'tidesovereign' | 'embertitan'
  | 'worldtree' | 'timelesswyrm';
export type CompanionPassive = 'atkPct' | 'hpPct' | 'critDmg' | 'goldPct' | 'bossDmg' | 'skillPct';
export type CompanionRarity = 2 | 3 | 4 | 5 | 6; // 희귀 · 영웅 · 전설 · 신화 · 초월

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
  // 희귀 10
  { id: 'slimeknight', name: '슬라임 기사', icon: '🟢', color: '#7ed957', rarity: 2, passive: 'hpPct', passivePer: 0.04, strikeMult: 1.2, strikeEvery: 4, desc: '체력 증가 · 방패 돌진' },
  { id: 'foxspirit', name: '여우 정령', icon: '🦊', color: '#ff9f43', rarity: 2, passive: 'goldPct', passivePer: 0.05, strikeMult: 1.0, strikeEvery: 4, desc: '골드 획득 증가 · 불꽃 돌진' },
  { id: 'owlsage', name: '올빼미 현자', icon: '🦉', color: '#9ad8ff', rarity: 2, passive: 'skillPct', passivePer: 0.04, strikeMult: 1.5, strikeEvery: 5, desc: '스킬 피해 증가 · 마법탄' },
  { id: 'mossbunny', name: '이끼 토끼', icon: '🐇', color: '#a8d98a', rarity: 2, passive: 'hpPct', passivePer: 0.035, strikeMult: 1.1, strikeEvery: 4, desc: '체력 증가 · 박치기' },
  { id: 'pebblecrab', name: '조약돌 게', icon: '🦀', color: '#c08457', rarity: 2, passive: 'atkPct', passivePer: 0.03, strikeMult: 1.3, strikeEvery: 5, desc: '공격력 증가 · 집게 강타' },
  { id: 'bubblefish', name: '물방울 물고기', icon: '🐟', color: '#7fd7ff', rarity: 2, passive: 'goldPct', passivePer: 0.04, strikeMult: 1.0, strikeEvery: 4, desc: '골드 획득 증가 · 물대포' },
  { id: 'sproutcat', name: '새싹 고양이', icon: '🌱', color: '#9be86b', rarity: 2, passive: 'skillPct', passivePer: 0.035, strikeMult: 1.2, strikeEvery: 5, desc: '스킬 피해 증가 · 덩굴 할퀴기' },
  { id: 'dustmoth', name: '먼지 나방', icon: '🦋', color: '#cfc6b8', rarity: 2, passive: 'critDmg', passivePer: 0.05, strikeMult: 1.1, strikeEvery: 4, desc: '치명타 피해 증가 · 인분 뿌리기' },
  { id: 'inkoctopus', name: '먹물 문어', icon: '🐙', color: '#8f6bff', rarity: 2, passive: 'hpPct', passivePer: 0.045, strikeMult: 1.2, strikeEvery: 5, desc: '체력 증가 · 먹물 분사' },
  { id: 'runeturtle', name: '룬 거북', icon: '🐢', color: '#6bd6a8', rarity: 2, passive: 'bossDmg', passivePer: 0.035, strikeMult: 1.3, strikeEvery: 5, desc: '보스 피해 증가 · 룬 방패' },
  // 영웅 8
  { id: 'emberbat', name: '잉걸 박쥐', icon: '🦇', color: '#ff5252', rarity: 3, passive: 'atkPct', passivePer: 0.045, strikeMult: 2.0, strikeEvery: 4, desc: '공격력 증가 · 화염 급습' },
  { id: 'frostcat', name: '서리 고양이', icon: '🐱', color: '#a9d6ff', rarity: 3, passive: 'critDmg', passivePer: 0.09, strikeMult: 2.2, strikeEvery: 5, desc: '치명타 피해 증가 · 얼음 발톱' },
  { id: 'stonepup', name: '돌 강아지', icon: '🐶', color: '#b0a08a', rarity: 3, passive: 'bossDmg', passivePer: 0.06, strikeMult: 1.8, strikeEvery: 4, desc: '보스 피해 증가 · 바위 박치기' },
  { id: 'thunderferret', name: '번개 족제비', icon: '⚡', color: '#ffe066', rarity: 3, passive: 'atkPct', passivePer: 0.05, strikeMult: 2.1, strikeEvery: 4, desc: '공격력 증가 · 전격 돌진' },
  { id: 'sandhound', name: '모래 사냥개', icon: '🐕', color: '#d9a066', rarity: 3, passive: 'goldPct', passivePer: 0.08, strikeMult: 1.7, strikeEvery: 4, desc: '골드 획득 증가 · 모래 폭풍' },
  { id: 'gustfalcon', name: '질풍 매', icon: '🦅', color: '#bfe9ff', rarity: 3, passive: 'skillPct', passivePer: 0.065, strikeMult: 2.0, strikeEvery: 5, desc: '스킬 피해 증가 · 급강하' },
  { id: 'mossbear', name: '이끼 곰', icon: '🐻', color: '#7fa86b', rarity: 3, passive: 'hpPct', passivePer: 0.08, strikeMult: 1.9, strikeEvery: 5, desc: '체력 증가 · 곰 발톱' },
  { id: 'shadowraven', name: '그림자 큰까마귀', icon: '🐦', color: '#8f7fc9', rarity: 3, passive: 'critDmg', passivePer: 0.085, strikeMult: 2.1, strikeEvery: 5, desc: '치명타 피해 증가 · 어둠 강습' },
  // 전설 6
  { id: 'stardragon', name: '별 드래곤', icon: '🐉', color: '#ffd166', rarity: 4, passive: 'atkPct', passivePer: 0.08, strikeMult: 4.0, strikeEvery: 6, desc: '공격력 크게 증가 · 별빛 브레스' },
  { id: 'moonrabbit', name: '달 토끼', icon: '🌙', color: '#e0c3ff', rarity: 4, passive: 'bossDmg', passivePer: 0.12, strikeMult: 3.5, strikeEvery: 6, desc: '보스 피해 크게 증가 · 달빛 참격' },
  { id: 'sunphoenix', name: '태양 불사조', icon: '🔥', color: '#ff8a3d', rarity: 4, passive: 'atkPct', passivePer: 0.075, strikeMult: 3.8, strikeEvery: 6, desc: '공격력 크게 증가 · 화염 폭풍' },
  { id: 'voidserpent', name: '공허 뱀', icon: '🐍', color: '#a06bff', rarity: 4, passive: 'critDmg', passivePer: 0.16, strikeMult: 3.6, strikeEvery: 6, desc: '치명타 피해 크게 증가 · 공허 물기' },
  { id: 'crystalunicorn', name: '수정 유니콘', icon: '🦄', color: '#a8e6ff', rarity: 4, passive: 'hpPct', passivePer: 0.12, strikeMult: 3.2, strikeEvery: 6, desc: '체력 크게 증가 · 수정 돌진' },
  { id: 'stormwyrm', name: '폭풍 비룡', icon: '🌪', color: '#7fc8ff', rarity: 4, passive: 'skillPct', passivePer: 0.1, strikeMult: 3.7, strikeEvery: 6, desc: '스킬 피해 크게 증가 · 폭풍 강타' },
  // 신화 4
  { id: 'astralkirin', name: '천공 기린', icon: '🦌', color: '#ff4f6d', rarity: 5, passive: 'atkPct', passivePer: 0.14, strikeMult: 6.0, strikeEvery: 7, desc: '공격력 대폭 증가 · 천공 강림' },
  { id: 'eclipsehound', name: '월식 사냥개', icon: '🌑', color: '#ff6f8f', rarity: 5, passive: 'bossDmg', passivePer: 0.2, strikeMult: 5.5, strikeEvery: 7, desc: '보스 피해 대폭 증가 · 월식 물기' },
  { id: 'tidesovereign', name: '조수의 지배자', icon: '🌊', color: '#ff5c7a', rarity: 5, passive: 'goldPct', passivePer: 0.24, strikeMult: 5.0, strikeEvery: 7, desc: '골드 획득 대폭 증가 · 해일' },
  { id: 'embertitan', name: '잿불 거신', icon: '🌋', color: '#ff7a5c', rarity: 5, passive: 'hpPct', passivePer: 0.2, strikeMult: 5.2, strikeEvery: 7, desc: '체력 대폭 증가 · 대지 붕괴' },
  // 초월 2
  { id: 'worldtree', name: '세계수의 화신', icon: '🌳', color: '#7cf5b3', rarity: 6, passive: 'hpPct', passivePer: 0.32, strikeMult: 9.0, strikeEvery: 8, desc: '체력 극대 증가 · 세계수의 뿌리' },
  { id: 'timelesswyrm', name: '영겁의 용', icon: '🐲', color: '#9cffd6', rarity: 6, passive: 'atkPct', passivePer: 0.28, strikeMult: 10.0, strikeEvery: 8, desc: '공격력 극대 증가 · 시간 붕괴' },
];
export const COMPANION_BY_ID: Record<CompanionId, CompanionDef> = Object.fromEntries(COMPANIONS.map((c) => [c.id, c])) as Record<CompanionId, CompanionDef>;
export const COMPANION_SLOTS = 3;
/** 상위 등급일수록 종류도 적고 확률도 급감 (희귀10 · 영웅8 · 전설6 · 신화4 · 초월2) */
export const COMPANION_RATES: Record<CompanionRarity, number> = { 2: 0.66, 3: 0.245, 4: 0.075, 5: 0.018, 6: 0.002 };
export const COMPANION_RARITY_NAMES: Record<CompanionRarity, string> = { 2: '희귀', 3: '영웅', 4: '전설', 5: '신화', 6: '초월' };
export const COMPANION_RARITY_COLORS: Record<CompanionRarity, string> = { 2: '#4fa8ff', 3: '#c26bff', 4: '#ffb02e', 5: '#ff4f6d', 6: '#7cf5b3' };
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
    let acc = 0;
    let rarity: CompanionRarity = 2;
    for (const rr of [6, 5, 4, 3] as CompanionRarity[]) {
      acc += COMPANION_RATES[rr];
      if (r1 < acc) {
        rarity = rr;
        break;
      }
    }
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
