import { OFFLINE, SLOTS, UPGRADE_IDS, type Rarity, type Slot, type UpgradeId } from './balance';
import type { JobPath, JobTier } from './jobs';
import type { SlotPotential } from './potential';
import type { ArtifactId } from './artifacts';
import type { CompanionId } from './companions';
import type { MissionId } from './missions';

export const SAVE_VERSION = 1;

export type AchievementId =
  | 'firstKill'
  | 'kills100'
  | 'kills1k'
  | 'kills10k'
  | 'stage10'
  | 'stage25'
  | 'stage50'
  | 'stage100'
  | 'stage200'
  | 'level10'
  | 'level30'
  | 'upgrades100'
  | 'job1'
  | 'job4'
  | 'gacha10'
  | 'boss10';

export type QuestType = 'kills' | 'upgrades' | 'bossAttempts' | 'skills' | 'gold';

export interface Quest {
  cycle: number;
  index: number; // 0..4 → QuestType order
  target: number;
  progress: number;
}

export type ItemKey = `${Slot}_${Rarity}`;

export interface HeroState {
  level: number;
  exp: number;
  job: JobPath | null;
  tier: JobTier;
  upgrades: Record<UpgradeId, number>;
  skills: Record<string, number>; // skill id → level (≥1 when unlocked)
  equipped: Record<Slot, ItemKey | null>;
  stars: Record<Slot, number>;
}

export interface ProgressState {
  stage: number; // current stage being fought
  maxStage: number; // highest stage reached (cleared previous)
  bossMode: boolean; // currently attempting the boss on a boss stage
  bossFails: number;
  farmStage: number | null; // when walled: stage being farmed
  kills: number;
  bossKills: number;
  firstClears: number[]; // boss stages cleared once (for gems)
  milestones: number[]; // stage milestones rewarded
}

export interface DailyState {
  date: string;
  goldTickets: number;
  gemTickets: number;
  towerTickets: number;
  raidTickets: number;
  arenaTickets: number;
}

export interface GameState {
  version: number;
  createdAt: number;
  lastTick: number;
  lastSaved: number;
  hero: HeroState;
  gold: number;
  gems: number;
  inventory: Partial<Record<ItemKey, number>>; // copies owned (level = copies; 5 copies fuse into the next rarity)
  potential: Record<Slot, SlotPotential>;
  tower: { bestFloor: number; runs: number };
  artifacts: Partial<Record<ArtifactId, number>>;
  companions: { owned: Partial<Record<CompanionId, number>>; equipped: (CompanionId | null)[] };
  missions: { date: string; progress: Partial<Record<MissionId, number>>; claimed: MissionId[]; bonusClaimed: boolean };
  attendance: { lastClaim: string; day: number; total: number };
  raid: { bestDamage: number; runs: number };
  arena: { rating: number; wins: number; losses: number };
  pity: { sinceHero: number; sinceLegend: number; pulls: number; seed: number };
  progress: ProgressState;
  daily: DailyState;
  quest: Quest;
  achievements: Partial<Record<AchievementId, number>>;
  codex: Record<string, number>; // monster id → kills
  offline: { emaGold: number; emaExp: number };
  stats: { totalGold: number; totalKills: number; totalDamage: number; playtimeSec: number; upgradesBought: number; gachaPulls: number; skillCasts: number; bossAttempts: number; longestOfflineSec: number; offlineReturns: number; taps: number; fusions: number; cubes: number; companionPulls: number; sweeps: number };
  settings: { sound: boolean; volume: number; numberFormat: 'korean' | 'scientific'; autoBoss: boolean; reducedMotion: boolean; buyAmount: 1 | 10 | 100 | 'max'; showDamage: boolean; autoUpgrade: boolean; autoAdvance: boolean };
  tutorialSeen: string[];
}

export function emptyUpgrades(): Record<UpgradeId, number> {
  const r = {} as Record<UpgradeId, number>;
  for (const id of UPGRADE_IDS) r[id] = 0;
  return r;
}

export function emptySlots<T>(v: T): Record<Slot, T> {
  const r = {} as Record<Slot, T>;
  for (const s of SLOTS) r[s] = typeof v === 'object' && v !== null ? (JSON.parse(JSON.stringify(v)) as T) : v;
  return r;
}

export function todayKey(now = Date.now()): string {
  const d = new Date(now);
  const p = (n: number) => (n < 10 ? `0${n}` : String(n));
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    lastTick: now,
    lastSaved: now,
    hero: {
      level: 1,
      exp: 0,
      job: null,
      tier: 0,
      upgrades: emptyUpgrades(),
      skills: { novice_strike: 1 },
      equipped: emptySlots<ItemKey | null>(null),
      stars: emptySlots(0),
    },
    gold: 0,
    gems: 0,
    inventory: {},
    potential: emptySlots<SlotPotential>({ grade: 0, lines: [] }),
    tower: { bestFloor: 0, runs: 0 },
    artifacts: {},
    companions: { owned: {}, equipped: [null, null, null] },
    missions: { date: todayKey(now), progress: {}, claimed: [], bonusClaimed: false },
    attendance: { lastClaim: '', day: 0, total: 0 },
    raid: { bestDamage: 0, runs: 0 },
    arena: { rating: 1000, wins: 0, losses: 0 },
    pity: { sinceHero: 0, sinceLegend: 0, pulls: 0, seed: (now % 2147483647) >>> 0 },
    progress: { stage: 1, maxStage: 1, bossMode: false, bossFails: 0, farmStage: null, kills: 0, bossKills: 0, firstClears: [], milestones: [] },
    daily: { date: todayKey(now), goldTickets: 3, gemTickets: 1, towerTickets: 2, raidTickets: 1, arenaTickets: 5 },
    quest: { cycle: 0, index: 0, target: 30, progress: 0 },
    achievements: {},
    codex: {},
    offline: { emaGold: 0, emaExp: 0 },
    stats: { totalGold: 0, totalKills: 0, totalDamage: 0, playtimeSec: 0, upgradesBought: 0, gachaPulls: 0, skillCasts: 0, bossAttempts: 0, longestOfflineSec: 0, offlineReturns: 0, taps: 0, fusions: 0, cubes: 0, companionPulls: 0, sweeps: 0 },
    settings: { sound: true, volume: 0.6, numberFormat: 'korean', autoBoss: true, reducedMotion: false, buyAmount: 1, showDamage: true, autoUpgrade: false, autoAdvance: true },
    tutorialSeen: [],
  };
}

export function offlineCapSec(s: GameState): number {
  return (s.hero.tier >= 4 ? OFFLINE.capHoursJob4 : OFFLINE.capHours) * 3600;
}
