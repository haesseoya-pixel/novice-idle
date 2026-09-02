/**
 * Single source of truth for every tunable number.
 * Formulas follow the approved balance design (no rebirth; growth via upgrades, jobs, gear, star force).
 */
export const SAVE_KEY = 'novice-idle:save';
export const BACKUP_KEY_PREFIX = 'novice-idle:backup:v';
export const TICK = 0.05; // battle tick seconds (20 Hz)
export const MAX_TICKS_PER_FRAME = 100; // 5 s of catch-up per frame
export const AUTOSAVE_INTERVAL = 10;
export const MAX_STAGE = 3000;
export const STAGES_PER_REGION = 10;
export const REGION_COUNT = 10;

export type UpgradeId = 'atk' | 'hp' | 'def' | 'crit' | 'critDmg' | 'aspd' | 'regen' | 'gold';
export const UPGRADE_IDS: readonly UpgradeId[] = ['atk', 'hp', 'def', 'crit', 'critDmg', 'aspd', 'regen', 'gold'];

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  base: number;
  growth: number;
  max: number;
  value: (level: number) => number;
  format: (value: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const UPGRADES: readonly UpgradeDef[] = [
  { id: 'atk', name: '공격력', description: '기본 공격력. 모든 피해의 바탕입니다.', base: 10, growth: 1.1, max: 3000, value: (L) => 10 * (1 + 0.2 * L) * Math.pow(1.06, L), format: (v) => v.toFixed(0) },
  { id: 'hp', name: '체력', description: '최대 체력. 죽으면 한 스테이지 물러납니다.', base: 8, growth: 1.1, max: 3000, value: (L) => 100 * (1 + 0.2 * L) * Math.pow(1.06, L), format: (v) => v.toFixed(0) },
  { id: 'def', name: '방어력', description: '받는 피해 ×100/(100+방어력).', base: 15, growth: 1.12, max: 400, value: (L) => 5 * L, format: (v) => v.toFixed(0) },
  { id: 'crit', name: '치명타 확률', description: '치명타 시 치명타 피해 배율 적용.', base: 40, growth: 1.18, max: 90, value: (L) => 0.05 + 0.005 * L, format: pct },
  { id: 'critDmg', name: '치명타 피해', description: '치명타 배율.', base: 50, growth: 1.15, max: 200, value: (L) => 1.5 + 0.05 * L, format: pct },
  { id: 'aspd', name: '공격 속도', description: '초당 기본 공격 횟수.', base: 60, growth: 1.16, max: 100, value: (L) => 1 + 0.02 * L, format: (v) => `${v.toFixed(2)}/s` },
  { id: 'regen', name: '체력 재생', description: '초당 최대 체력 비율 회복.', base: 30, growth: 1.15, max: 100, value: (L) => 0.01 + 0.001 * L, format: (v) => `${(v * 100).toFixed(1)}%/s` },
  { id: 'gold', name: '골드 획득', description: '처치 골드 증가.', base: 25, growth: 1.14, max: 300, value: (L) => 0.03 * L, format: (v) => `+${Math.round(v * 100)}%` },
];
export const UPGRADE_BY_ID: Record<UpgradeId, UpgradeDef> = Object.fromEntries(UPGRADES.map((u) => [u.id, u])) as Record<UpgradeId, UpgradeDef>;

export const MONSTER = {
  hpBase: 80,
  hpGrowth: (n: number) => (n <= 30 ? 1.15 : n <= 100 ? 1.17 : 1.19),
  atkBase: 1.0,
  atkGrowth: (n: number) => (n <= 100 ? 1.1 : 1.11),
  goldBase: 2,
  goldGrowth: (n: number) => (n <= 100 ? 1.07 : 1.09),
  expBase: 2,
  expGrowth: 1.08,
  speed: 90, // px/s on a 360px logical width
  attackInterval: 1.5,
  meleeOffset: 36,
  waveSize: (n: number) => 5 + Math.floor(n / 10),
  maxOnScreen: 3,
  spawnInterval: 1.2,
  loopHpBonus: 0.05, // per extra continent loop
} as const;

export const BOSS = {
  hpMult: (n: number) => 5 + n / 10,
  atkMult: 2.5,
  attackInterval: 2.0,
  speedMult: 0.7,
  scale: 1.8,
  timer: 30,
  goldMult: 12,
  expMult: 10,
  autoRetryInterval: 60,
} as const;

export const HERO = {
  x: 80,
  attackRange: 70,
  rangedRange: 260,
  tapMult: 0.5,
  tapCooldown: 0.15,
  respawnDelay: 3,
  retreatOnDeath: 1,
  levelStatBonus: 0.01,
  baseAtkSpeed: 1.0,
} as const;

/** EXP required to go from level L to L+1. */
export const expReq = (L: number): number => 5 * L * Math.pow(1.07, L);

export const GEMS = {
  bossFirstClear: (n: number) => 5 + Math.floor(n / 4),
  bossRepeat: 1,
  milestone: (n: number) => 5 + Math.floor(n / 10),
  questReward: (cycle: number) => Math.min(25, 3 + 2 * cycle),
  pullCost: 10,
  tenPullCost: 90,
  reclassCost: 300,
  statResetCost: 50,
  companionCost: 30,
  companionTenCost: 270,
} as const;

export type Rarity = 0 | 1 | 2 | 3 | 4 | 5;
export const RARITY_NAMES = ['일반', '고급', '희귀', '영웅', '전설', '신화'] as const;
export const RARITY_COLORS = ['#b8c2cc', '#7ed957', '#4fa8ff', '#c26bff', '#ffb02e', '#ff4f6d'] as const;
export const RARITY_BASE = [0.1, 0.25, 0.5, 1.0, 2.0, 4.0] as const;
export const RARITY_RATES = [0.4, 0.3, 0.17, 0.09, 0.032, 0.008] as const;
export const ITEM_LEVEL_BONUS = 0.08;
export const ITEM_MAX_LEVEL = 100;
export const COLLECTION_PER_LEVEL = 0.005;
export const PITY = { tenPullMinRarity: 2 as Rarity, heroEvery: 30, legendEvery: 100 } as const;

export type Slot = 'weapon' | 'armor' | 'accessory' | 'pet';
export const SLOTS: readonly Slot[] = ['weapon', 'armor', 'accessory', 'pet'];
export const SLOT_NAMES: Record<Slot, string> = { weapon: '무기', armor: '방어구', accessory: '장신구', pet: '펫' };

export const STARFORCE = { maxStars: 25, perStar: 0.06, costGrowth: 1.35 } as const;
export const FUSION = { need: 5 } as const;
export const POTENTIAL = { cubeCost: 10, lines: 3, grades: ['레어', '에픽', '유니크', '레전드리'] as const, gradeColors: ['#4fa8ff', '#c26bff', '#ffb02e', '#7cf5b3'] as const, gradeMult: [1, 1.6, 2.5, 4] as const, upgradeChance: [0.12, 0.06, 0.025] as const } as const;
export const RAID = { tickets: 1, duration: 60, atkMult: 1.5, scale: 2.2, gems: (ratio: number) => Math.min(80, Math.floor(6 * Math.log2(1 + ratio * 4))) } as const;
export const ARENA = { tickets: 5, duration: 45, hpMult: 30, atkMult: 2.5, winGems: 8, loseGems: 2, ratingWin: 20, ratingLose: 10 } as const;
export const TOWER = { tickets: 2, timer: 40, hpMult: (floor: number) => 2.5 * Math.pow(1.12, floor - 1), atkMult: (floor: number) => 1.2 * Math.pow(1.05, floor - 1), gems: (floor: number) => 2 + Math.floor(floor / 5) } as const;

export const DUNGEON = {
  gold: { duration: 60, tickets: 3, hpMult: 0.5, atkMult: 0.3, spawnInterval: 0.8, maxOnScreen: 4, goldMult: 8 },
  gem: { duration: 45, tickets: 1, hpMult: 0.05, atkMult: 0, spawnInterval: 0.6, maxOnScreen: 4, gemPerKill: 1, gemCap: 60 },
} as const;

export const OFFLINE = {
  tau: 300,
  minElapsed: 5,
  modalThreshold: 300,
  toastThreshold: 60,
  efficiency: 0.5,
  capHours: 8,
  capHoursJob4: 12,
  maxElapsedDays: 30,
} as const;

export const JOB_MULT = [1, 1.5, 2.2, 3.5, 6] as const;
export const JOB_LEVELS = [1, 10, 30, 60, 100] as const;

export const SKILL_LEVEL_BONUS = 0.15;
export const SKILL_MAX_LEVEL = 100;
export const skillCost = (k: number, lv: number): number => 50 * k * Math.pow(1.25, lv - 1);
