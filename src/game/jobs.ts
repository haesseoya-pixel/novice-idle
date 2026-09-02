import { JOB_LEVELS, JOB_MULT } from './balance';

export type JobPath = 'warrior' | 'mage' | 'archer' | 'thief';
export const JOB_PATHS: readonly JobPath[] = ['warrior', 'mage', 'archer', 'thief'];
/** tier 0 = 초보자, 1..4 = 1차..4차 */
export type JobTier = 0 | 1 | 2 | 3 | 4;

export type SkillEffect =
  | { kind: 'single'; mult: number }
  | { kind: 'all'; mult: number }
  | { kind: 'burn'; multPerSec: number; duration: number }
  | { kind: 'heal'; fraction: number }
  | { kind: 'shield'; reduce: number; duration: number }
  | { kind: 'invuln'; duration: number };

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  cooldown: number;
  costK: number;
  effect: SkillEffect;
  /** visual effect key for the renderer */
  fx: 'slash' | 'quake' | 'shield' | 'ultWarrior' | 'fireball' | 'lightning' | 'firefield' | 'meteor' | 'doubleShot' | 'arrowRain' | 'poison' | 'ultArcher' | 'assassinate' | 'shuriken' | 'stealth' | 'ultThief' | 'basic';
  /** true = projectile travels to the target (ranged jobs) */
  projectile?: 'arrow' | 'orb' | 'shuriken' | 'bolt';
  crit?: 'always';
}

export interface JobDef {
  path: JobPath;
  name: string;
  /** names per tier 1..4 */
  tiers: [string, string, string, string];
  weapon: string;
  color: string;
  description: string;
  hpMult: number;
  defMult: number;
  skillMult: number;
  aspdMult: number;
  critBonus: number;
  critDmgBonus: number;
  ranged: boolean;
  skills: [SkillDef, SkillDef, SkillDef, SkillDef];
}

export const NOVICE_SKILL: SkillDef = { id: 'novice_strike', name: '힘껏 치기', description: '기본 무기로 2배 피해를 줍니다.', cooldown: 5, costK: 1, effect: { kind: 'single', mult: 2.0 }, fx: 'basic' };

export const JOBS: Record<JobPath, JobDef> = {
  warrior: {
    path: 'warrior',
    name: '전사',
    tiers: ['검사', '기사', '성기사', '검성'],
    weapon: '검',
    color: '#ff7a59',
    description: '튼튼한 근접 전투가. 체력과 방어력이 높고 강타로 단일 적을 부숩니다.',
    hpMult: 1.3,
    defMult: 1.3,
    skillMult: 1.0,
    aspdMult: 1.0,
    critBonus: 0,
    critDmgBonus: 0,
    ranged: false,
    skills: [
      { id: 'w_slash', name: '강타', description: '단일 대상에 3배 피해.', cooldown: 4, costK: 1, effect: { kind: 'single', mult: 3.0 }, fx: 'slash' },
      { id: 'w_quake', name: '대지 가르기', description: '화면 전체에 1.6배 피해.', cooldown: 9, costK: 1.5, effect: { kind: 'all', mult: 1.6 }, fx: 'quake' },
      { id: 'w_shield', name: '방패 방어', description: '5초 동안 받는 피해 50% 감소.', cooldown: 15, costK: 1, effect: { kind: 'shield', reduce: 0.5, duration: 5 }, fx: 'shield' },
      { id: 'w_ult', name: '검기 폭발', description: '화면 전체에 6배 피해.', cooldown: 25, costK: 2, effect: { kind: 'all', mult: 6.0 }, fx: 'ultWarrior' },
    ],
  },
  mage: {
    path: 'mage',
    name: '마법사',
    tiers: ['견습 마법사', '원소술사', '대마법사', '아크메이지'],
    weapon: '지팡이',
    color: '#7f8cff',
    description: '원거리 광역 마법사. 스킬 피해가 높고 여러 적을 한 번에 태웁니다.',
    hpMult: 0.85,
    defMult: 0.9,
    skillMult: 1.3,
    aspdMult: 0.9,
    critBonus: 0,
    critDmgBonus: 0,
    ranged: true,
    skills: [
      { id: 'm_fireball', name: '화염구', description: '단일 대상에 2.5배 피해.', cooldown: 4, costK: 1, effect: { kind: 'single', mult: 2.5 }, fx: 'fireball', projectile: 'orb' },
      { id: 'm_lightning', name: '번개', description: '화면 전체에 1.4배 피해.', cooldown: 8, costK: 1.5, effect: { kind: 'all', mult: 1.4 }, fx: 'lightning' },
      { id: 'm_firefield', name: '화염 장판', description: '5초 동안 초당 0.6배 화상.', cooldown: 12, costK: 2, effect: { kind: 'burn', multPerSec: 0.6, duration: 5 }, fx: 'firefield' },
      { id: 'm_meteor', name: '메테오', description: '화면 전체에 5배 피해.', cooldown: 25, costK: 2, effect: { kind: 'all', mult: 5.0 }, fx: 'meteor' },
    ],
  },
  archer: {
    path: 'archer',
    name: '궁수',
    tiers: ['사냥꾼', '레인저', '저격수', '신궁'],
    weapon: '활',
    color: '#7ed957',
    description: '빠른 원거리 딜러. 공격 속도가 높고 화살비로 무리를 쓸어냅니다.',
    hpMult: 0.95,
    defMult: 1.0,
    skillMult: 1.0,
    aspdMult: 1.25,
    critBonus: 0.05,
    critDmgBonus: 0,
    ranged: true,
    skills: [
      { id: 'a_double', name: '이중 사격', description: '단일 대상에 2.2배 피해.', cooldown: 3, costK: 1, effect: { kind: 'single', mult: 2.2 }, fx: 'doubleShot', projectile: 'arrow' },
      { id: 'a_rain', name: '화살비', description: '화면 전체에 1.2배 피해.', cooldown: 8, costK: 1.5, effect: { kind: 'all', mult: 1.2 }, fx: 'arrowRain' },
      { id: 'a_poison', name: '독화살', description: '6초 동안 초당 0.5배 중독.', cooldown: 12, costK: 2, effect: { kind: 'burn', multPerSec: 0.5, duration: 6 }, fx: 'poison', projectile: 'arrow' },
      { id: 'a_ult', name: '천공의 화살', description: '화면 전체에 5배 피해.', cooldown: 22, costK: 2, effect: { kind: 'all', mult: 5.0 }, fx: 'ultArcher' },
    ],
  },
  thief: {
    path: 'thief',
    name: '도적',
    tiers: ['도둑', '암살자', '그림자', '야행자'],
    weapon: '단검',
    color: '#c78bff',
    description: '치명타 특화 근접 딜러. 은신으로 위기를 넘기고 암살로 큰 피해를 줍니다.',
    hpMult: 0.9,
    defMult: 0.9,
    skillMult: 1.0,
    aspdMult: 1.1,
    critBonus: 0.15,
    critDmgBonus: 0.5,
    ranged: false,
    skills: [
      { id: 't_assassin', name: '암살', description: '단일 대상에 3.5배 피해, 치명타 확정.', cooldown: 4, costK: 1, effect: { kind: 'single', mult: 3.5 }, fx: 'assassinate', crit: 'always' },
      { id: 't_shuriken', name: '표창 난무', description: '화면 전체에 1.3배 피해.', cooldown: 8, costK: 1.5, effect: { kind: 'all', mult: 1.3 }, fx: 'shuriken', projectile: 'shuriken' },
      { id: 't_stealth', name: '은신', description: '3초 동안 무적.', cooldown: 18, costK: 1, effect: { kind: 'invuln', duration: 3 }, fx: 'stealth' },
      { id: 't_ult', name: '그림자 처형', description: '단일 대상에 6배 피해, 치명타 확정.', cooldown: 22, costK: 2, effect: { kind: 'single', mult: 6.0 }, fx: 'ultThief', crit: 'always' },
    ],
  },
};

export function jobMult(tier: JobTier): number {
  return JOB_MULT[tier];
}

export function tierRequirement(tier: JobTier): number {
  return JOB_LEVELS[tier];
}

export function jobTitle(path: JobPath | null, tier: JobTier): string {
  if (!path || tier === 0) return '초보자';
  return JOBS[path].tiers[tier - 1] ?? '초보자';
}

/** Skills available at a given tier: novice strike + first `tier` job skills. */
export function availableSkills(path: JobPath | null, tier: JobTier): SkillDef[] {
  const out: SkillDef[] = [NOVICE_SKILL];
  if (path) for (let i = 0; i < tier; i++) out.push(JOBS[path].skills[i]!);
  return out;
}

export function nextTier(tier: JobTier): JobTier | null {
  return tier >= 4 ? null : ((tier + 1) as JobTier);
}

export const ALL_SKILLS: SkillDef[] = [NOVICE_SKILL, ...JOB_PATHS.flatMap((p) => JOBS[p].skills)];
export const SKILL_BY_ID: Record<string, SkillDef> = Object.fromEntries(ALL_SKILLS.map((s) => [s.id, s]));
