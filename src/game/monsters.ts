import { BOSS, MAX_STAGE, MONSTER, REGION_COUNT, STAGES_PER_REGION } from './balance';

export interface MonsterType {
  id: string;
  name: string;
  hp: number;
  atk: number;
  speed: number;
  color: string;
  /** visual archetype for the fallback drawer and animation feel */
  shape: 'blob' | 'hopper' | 'flyer' | 'walker' | 'floater' | 'crawler' | 'golem';
}

export interface Region {
  index: number; // 0-based
  id: string;
  name: string;
  sky: string;
  ground: string;
  accent: string;
  monsters: [MonsterType, MonsterType, MonsterType];
  boss: MonsterType & { title: string };
}

const m = (id: string, name: string, hp: number, atk: number, speed: number, color: string, shape: MonsterType['shape']): MonsterType => ({ id, name, hp, atk, speed, color, shape });

export const REGIONS: readonly Region[] = [
  {
    index: 0, id: 'meadow', name: '초록 초원', sky: '#9fe3ff', ground: '#7bc96f', accent: '#ffd166',
    monsters: [m('fluff', '털뭉치', 1.0, 0.8, 1.0, '#f4d9a6', 'blob'), m('hopbun', '깡총토끼', 0.7, 0.9, 1.5, '#ffb7c5', 'hopper'), m('bee', '꿀벌', 0.6, 1.0, 1.6, '#ffd23f', 'flyer')],
    boss: { ...m('fluffking', '거대 털뭉치', 1, 1, 1, '#f1c27d', 'blob'), title: '초원의 주인' },
  },
  {
    index: 1, id: 'fireflyforest', name: '반딧불 숲', sky: '#2f4b3a', ground: '#3f7a4a', accent: '#c8ff6b',
    monsters: [m('acornspirit', '도토리 정령', 1.1, 0.9, 0.9, '#b5763d', 'walker'), m('mossgolem', '이끼 골렘', 1.6, 0.8, 0.6, '#5f9b4e', 'golem'), m('fireflyfairy', '반딧불 요정', 0.6, 1.2, 1.5, '#d8ff8a', 'flyer')],
    boss: { ...m('guardiantree', '숲의 수호목', 1, 1, 1, '#4c7a3b', 'golem'), title: '숲의 수호자' },
  },
  {
    index: 2, id: 'shellbeach', name: '소라 해변', sky: '#8fd3ff', ground: '#f2d7a0', accent: '#4fc3f7',
    monsters: [m('hermit', '소라게', 1.3, 0.9, 0.7, '#ff9f68', 'crawler'), m('droplet', '물방울 정령', 0.8, 1.0, 1.2, '#7fd7ff', 'floater'), m('jelly', '해파리', 0.9, 1.1, 0.9, '#d9a7ff', 'floater')],
    boss: { ...m('kingcrab', '왕소라게', 1, 1, 1, '#ff7a45', 'crawler'), title: '해변의 폭군' },
  },
  {
    index: 3, id: 'candlehouse', name: '촛불 폐가', sky: '#2b2540', ground: '#4a3d5c', accent: '#ffb347',
    monsters: [m('candleghost', '촛불 유령', 0.7, 1.1, 1.3, '#fff0b3', 'floater'), m('olddoll', '낡은 인형', 1.0, 1.0, 1.0, '#c9a0dc', 'walker'), m('dustspider', '먼지 거미', 0.9, 1.2, 1.4, '#6d6a75', 'crawler')],
    boss: { ...m('puppeteer', '인형사 유령', 1, 1, 1, '#b39ddb', 'floater'), title: '폐가의 주인' },
  },
  {
    index: 4, id: 'frostpeak', name: '서리 산', sky: '#cfe9ff', ground: '#e8f4ff', accent: '#7fb8ff',
    monsters: [m('snowman', '눈사람', 1.5, 0.8, 0.6, '#f7fbff', 'walker'), m('icefox', '얼음 여우', 0.8, 1.2, 1.5, '#a9d6ff', 'hopper'), m('frostowl', '서리 올빼미', 0.7, 1.1, 1.4, '#cfd8ff', 'flyer')],
    boss: { ...m('frostqueen', '서리 여왕 여우', 1, 1, 1, '#8ec5ff', 'hopper'), title: '서리 산의 여왕' },
  },
  {
    index: 5, id: 'sanddune', name: '모래 사막', sky: '#ffd89b', ground: '#e0b76a', accent: '#ff7043',
    monsters: [m('cactus', '선인장 괴물', 1.4, 0.9, 0.7, '#6fbf5a', 'walker'), m('scorpion', '모래 전갈', 1.0, 1.3, 1.1, '#c98c3a', 'crawler'), m('sandworm', '모래 벌레', 1.2, 1.1, 0.9, '#d9a066', 'crawler')],
    boss: { ...m('greatworm', '거대 모래벌레', 1, 1, 1, '#b8773a', 'crawler'), title: '사막의 포식자' },
  },
  {
    index: 6, id: 'ruins', name: '고대 유적', sky: '#6b6b8a', ground: '#8d8d9c', accent: '#64ffda',
    monsters: [m('statue', '석상 병사', 1.6, 1.0, 0.7, '#9aa0a6', 'walker'), m('ruinbeetle', '유적 딱정벌레', 0.9, 1.2, 1.3, '#4f5b62', 'crawler'), m('runegolem', '룬 골렘', 1.8, 0.9, 0.5, '#7b8fa1', 'golem')],
    boss: { ...m('colossus', '유적 거신', 1, 1, 1, '#78909c', 'golem'), title: '잠들었던 거신' },
  },
  {
    index: 7, id: 'skygarden', name: '하늘 정원', sky: '#a8e6ff', ground: '#ffffff', accent: '#ffe082',
    monsters: [m('cloudsheep', '구름양', 1.0, 0.9, 1.0, '#ffffff', 'blob'), m('windspirit', '바람 정령', 0.6, 1.3, 1.7, '#b3f0ff', 'floater'), m('paperbird', '종이새', 0.7, 1.1, 1.5, '#fff59d', 'flyer')],
    boss: { ...m('stormwhale', '폭풍 구름고래', 1, 1, 1, '#90caf9', 'floater'), title: '하늘의 지배자' },
  },
  {
    index: 8, id: 'dragonnest', name: '용의 둥지', sky: '#4a1c1c', ground: '#6d2f2f', accent: '#ff5252',
    monsters: [m('egglizard', '알 도마뱀', 1.0, 1.2, 1.0, '#ff8a65', 'hopper'), m('firebat', '화염 박쥐', 0.6, 1.4, 1.7, '#ff7043', 'flyer'), m('lizardmerc', '용병 도마뱀', 1.3, 1.3, 0.9, '#c62828', 'walker')],
    boss: { ...m('reddragon', '붉은 드래곤', 1, 1, 1, '#e53935', 'flyer'), title: '둥지의 군주' },
  },
  {
    index: 9, id: 'abyss', name: '심연', sky: '#0d0b1e', ground: '#1f1a3a', accent: '#b388ff',
    monsters: [m('eyeball', '눈알 괴물', 0.9, 1.3, 1.2, '#ce93d8', 'floater'), m('shade', '그림자', 0.6, 1.6, 1.8, '#3a2f5a', 'floater'), m('tentacle', '공허 촉수', 1.5, 1.2, 0.6, '#5e35b1', 'golem')],
    boss: { ...m('abysseye', '심연의 눈', 1, 1, 1, '#7e57c2', 'floater'), title: '심연 그 자체' },
  },
];

export const RAID_BOSS: MonsterType = m('raidlord', '심연의 군주', 1, 1, 0.5, '#ff4f6d', 'golem');
export const ARENA_GHOST: MonsterType = m('ghost', '도전자', 1, 1, 1, '#c78bff', 'walker');

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

/** Stage index n (1-based) → region (loops after the last one) and stage within region (1..10). */
export function stageInfo(n: number): { region: Region; stage: number; loop: number; isBoss: boolean } {
  const idx = Math.max(1, Math.floor(n)) - 1;
  const perLoop = REGION_COUNT * STAGES_PER_REGION;
  const loop = Math.floor(idx / perLoop);
  const within = idx % perLoop;
  const region = REGIONS[Math.floor(within / STAGES_PER_REGION)]!;
  const stage = (within % STAGES_PER_REGION) + 1;
  return { region, stage, loop, isBoss: stage === STAGES_PER_REGION };
}

export function stageLabel(n: number): string {
  const info = stageInfo(n);
  const loopTag = info.loop > 0 ? ` (${info.loop + 1}회차)` : '';
  return `${info.region.name} ${info.stage}${loopTag}`;
}

export function isBossStage(n: number): boolean {
  return stageInfo(n).isBoss;
}

// ---- precomputed scaling tables ------------------------------------------------
const hpTable = new Float64Array(MAX_STAGE + 2);
const atkTable = new Float64Array(MAX_STAGE + 2);
const goldTable = new Float64Array(MAX_STAGE + 2);
const expTable = new Float64Array(MAX_STAGE + 2);
{
  let hp = MONSTER.hpBase;
  let atk = MONSTER.atkBase;
  let gold = MONSTER.goldBase;
  let exp = MONSTER.expBase;
  for (let n = 1; n <= MAX_STAGE + 1; n++) {
    hpTable[n] = hp;
    atkTable[n] = atk;
    goldTable[n] = gold;
    expTable[n] = exp;
    hp *= MONSTER.hpGrowth(n);
    atk *= MONSTER.atkGrowth(n);
    gold *= MONSTER.goldGrowth(n);
    exp *= MONSTER.expGrowth;
  }
}

const clampStage = (n: number) => Math.min(MAX_STAGE, Math.max(1, Math.floor(n)));

export function monsterHp(n: number): number {
  const info = stageInfo(n);
  return hpTable[clampStage(n)]! * (1 + MONSTER.loopHpBonus * info.loop);
}
export function monsterAtk(n: number): number {
  return atkTable[clampStage(n)]!;
}
export function monsterGold(n: number): number {
  return goldTable[clampStage(n)]!;
}
export function monsterExp(n: number): number {
  return expTable[clampStage(n)]!;
}
export function bossHp(n: number): number {
  return monsterHp(n) * BOSS.hpMult(n);
}
export function bossAtk(n: number): number {
  return monsterAtk(n) * BOSS.atkMult;
}

export function pickMonster(n: number, roll: number): MonsterType {
  const { region } = stageInfo(n);
  const i = Math.min(2, Math.floor(roll * 3));
  return region.monsters[i]!;
}

export const ALL_MONSTER_TYPES: readonly MonsterType[] = REGIONS.flatMap((r) => [...r.monsters, r.boss]);
export const MONSTER_BY_ID: Record<string, MonsterType> = Object.fromEntries(ALL_MONSTER_TYPES.map((t) => [t.id, t]));
