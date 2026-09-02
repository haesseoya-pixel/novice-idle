import { BOSS, BOSS_EVERY, CHAPTERS_PER_THEME, CHAPTER_COUNT, MAX_STAGE, MONSTER, STAGES_PER_CHAPTER, THEME_COUNT } from './balance';

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
  /** 챕터당 잡몹 1종 (에셋 절약, 챕터 확장 용이). 보스는 별도. */
  monsters: [MonsterType];
  boss: MonsterType & { title: string };
}

const m = (id: string, name: string, hp: number, atk: number, speed: number, color: string, shape: MonsterType['shape']): MonsterType => ({ id, name, hp, atk, speed, color, shape });

export const REGIONS: readonly Region[] = [
  {
    index: 0, id: 'meadow', name: '초록 초원', sky: '#9fe3ff', ground: '#7bc96f', accent: '#ffd166',
    monsters: [m('fluff', '털뭉치', 1.0, 0.8, 1.0, '#f4d9a6', 'blob')],
    boss: { ...m('fluffking', '거대 털뭉치', 1, 1, 1, '#f1c27d', 'blob'), title: '초원의 주인' },
  },
  {
    index: 1, id: 'fireflyforest', name: '반딧불 숲', sky: '#2f4b3a', ground: '#3f7a4a', accent: '#c8ff6b',
    monsters: [m('acornspirit', '도토리 정령', 1.1, 0.9, 0.9, '#b5763d', 'walker')],
    boss: { ...m('guardiantree', '숲의 수호목', 1, 1, 1, '#4c7a3b', 'golem'), title: '숲의 수호자' },
  },
  {
    index: 2, id: 'shellbeach', name: '소라 해변', sky: '#8fd3ff', ground: '#f2d7a0', accent: '#4fc3f7',
    monsters: [m('hermit', '소라게', 1.3, 0.9, 0.7, '#ff9f68', 'crawler')],
    boss: { ...m('kingcrab', '왕소라게', 1, 1, 1, '#ff7a45', 'crawler'), title: '해변의 폭군' },
  },
  {
    index: 3, id: 'candlehouse', name: '촛불 폐가', sky: '#2b2540', ground: '#4a3d5c', accent: '#ffb347',
    monsters: [m('candleghost', '촛불 유령', 0.7, 1.1, 1.3, '#fff0b3', 'floater')],
    boss: { ...m('puppeteer', '인형사 유령', 1, 1, 1, '#b39ddb', 'floater'), title: '폐가의 주인' },
  },
  {
    index: 4, id: 'frostpeak', name: '서리 산', sky: '#cfe9ff', ground: '#e8f4ff', accent: '#7fb8ff',
    monsters: [m('snowman', '눈사람', 1.5, 0.8, 0.6, '#f7fbff', 'walker')],
    boss: { ...m('frostqueen', '서리 여왕 여우', 1, 1, 1, '#8ec5ff', 'hopper'), title: '서리 산의 여왕' },
  },
  {
    index: 5, id: 'sanddune', name: '모래 사막', sky: '#ffd89b', ground: '#e0b76a', accent: '#ff7043',
    monsters: [m('cactus', '선인장 괴물', 1.4, 0.9, 0.7, '#6fbf5a', 'walker')],
    boss: { ...m('greatworm', '거대 모래벌레', 1, 1, 1, '#b8773a', 'crawler'), title: '사막의 포식자' },
  },
  {
    index: 6, id: 'ruins', name: '고대 유적', sky: '#6b6b8a', ground: '#8d8d9c', accent: '#64ffda',
    monsters: [m('statue', '석상 병사', 1.6, 1.0, 0.7, '#9aa0a6', 'walker')],
    boss: { ...m('colossus', '유적 거신', 1, 1, 1, '#78909c', 'golem'), title: '잠들었던 거신' },
  },
  {
    index: 7, id: 'skygarden', name: '하늘 정원', sky: '#a8e6ff', ground: '#ffffff', accent: '#ffe082',
    monsters: [m('cloudsheep', '구름양', 1.0, 0.9, 1.0, '#ffffff', 'blob')],
    boss: { ...m('stormwhale', '폭풍 구름고래', 1, 1, 1, '#90caf9', 'floater'), title: '하늘의 지배자' },
  },
  {
    index: 8, id: 'dragonnest', name: '용의 둥지', sky: '#4a1c1c', ground: '#6d2f2f', accent: '#ff5252',
    monsters: [m('egglizard', '알 도마뱀', 1.0, 1.2, 1.0, '#ff8a65', 'hopper')],
    boss: { ...m('reddragon', '붉은 드래곤', 1, 1, 1, '#e53935', 'flyer'), title: '둥지의 군주' },
  },
  {
    index: 9, id: 'abyss', name: '심연', sky: '#0d0b1e', ground: '#1f1a3a', accent: '#b388ff',
    monsters: [m('eyeball', '눈알 괴물', 0.9, 1.3, 1.2, '#ce93d8', 'floater')],
    boss: { ...m('abysseye', '심연의 눈', 1, 1, 1, '#7e57c2', 'floater'), title: '심연 그 자체' },
  },
  {
    index: 10, id: 'mushcave', name: '버섯 동굴', sky: '#2a1f3d', ground: '#4b3a5c', accent: '#ff7ac6',
    monsters: [m('sporecap', '포자갓', 1.2, 1.1, 0.9, '#ff9ecb', 'blob')],
    boss: { ...m('sporequeen', '포자 여왕', 1, 1, 1, '#ff6fb5', 'floater'), title: '동굴의 어머니' },
  },
  {
    index: 11, id: 'clockwork', name: '태엽 공방', sky: '#3a2f22', ground: '#6b5a3a', accent: '#ffcf6b',
    monsters: [m('cogbug', '톱니 벌레', 1.1, 1.2, 1.1, '#c9a227', 'crawler')],
    boss: { ...m('greatgear', '거대 태엽정', 1, 1, 1, '#d4a017', 'golem'), title: '멈추지 않는 톱니' },
  },
  {
    index: 12, id: 'stormsea', name: '폭풍 바다', sky: '#1b3a5c', ground: '#2f6b8f', accent: '#7fe3ff',
    monsters: [m('waverider', '파도 정령', 1.0, 1.2, 1.3, '#63c9ff', 'floater')],
    boss: { ...m('krakenling', '어린 크라켄', 1, 1, 1, '#2f8fc4', 'floater'), title: '바다의 성난 손' },
  },
  {
    index: 13, id: 'boneyard', name: '뼈의 무덤', sky: '#241d2e', ground: '#4a4250', accent: '#d9d2c5',
    monsters: [m('rattler', '덜그럭 해골', 0.9, 1.3, 1.2, '#e8e0d0', 'walker')],
    boss: { ...m('boneking', '백골 군주', 1, 1, 1, '#efe7d5', 'walker'), title: '잠들지 못한 왕' },
  },
  {
    index: 14, id: 'crystalvale', name: '수정 계곡', sky: '#2b3b6e', ground: '#5f6fae', accent: '#9fd4ff',
    monsters: [m('shardling', '수정 조각', 1.1, 1.2, 1.1, '#a8e6ff', 'blob')],
    boss: { ...m('prismlord', '프리즘 군주', 1, 1, 1, '#8fb8ff', 'golem'), title: '빛을 삼킨 결정' },
  },
  {
    index: 15, id: 'ashwaste', name: '잿빛 황야', sky: '#3d2b2b', ground: '#6b5450', accent: '#ff8a5c',
    monsters: [m('cindercrow', '잿까마귀', 0.8, 1.5, 1.6, '#6b4a45', 'flyer')],
    boss: { ...m('cinderbeast', '잿불 야수', 1, 1, 1, '#ff5722', 'walker'), title: '꺼지지 않는 불씨' },
  },
  {
    index: 16, id: 'moonshrine', name: '달빛 신전', sky: '#1e2a4d', ground: '#4e5a86', accent: '#e5d5ff',
    monsters: [m('moonpriest', '달 사제', 1.2, 1.3, 1.0, '#d9c9ff', 'walker')],
    boss: { ...m('moonoracle', '달의 신탁', 1, 1, 1, '#c9b8ff', 'floater'), title: '차오르는 달' },
  },
  {
    index: 17, id: 'thornmaze', name: '가시 미궁', sky: '#1f3324', ground: '#3f5c3a', accent: '#a8ff6b',
    monsters: [m('thornhound', '가시 사냥개', 1.1, 1.4, 1.4, '#6b8f4a', 'walker')],
    boss: { ...m('thornheart', '가시심장', 1, 1, 1, '#5c8f3a', 'golem'), title: '미궁의 심장' },
  },
  {
    index: 18, id: 'voidgate', name: '공허의 문', sky: '#150e2e', ground: '#2b1f52', accent: '#b06bff',
    monsters: [m('riftspawn', '균열 새끼', 1.2, 1.5, 1.2, '#8f5cff', 'floater')],
    boss: { ...m('gatewarden', '문지기', 1, 1, 1, '#9f6bff', 'golem'), title: '문을 지키는 자' },
  },
  {
    index: 19, id: 'dawnpeak', name: '여명의 봉우리', sky: '#ffb37a', ground: '#c98f5c', accent: '#fff3b0',
    monsters: [m('sunhawk', '태양매', 0.8, 1.7, 1.8, '#ffb347', 'flyer')],
    boss: { ...m('dawnsovereign', '여명의 군주', 1, 1, 1, '#ffd166', 'walker'), title: '첫 빛의 주인' },
  },
];

export const RAID_BOSS: MonsterType = m('raidlord', '심연의 군주', 1, 1, 0.5, '#ff4f6d', 'golem');
export const ARENA_GHOST: MonsterType = m('ghost', '도전자', 1, 1, 1, '#c78bff', 'walker');

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

/**
 * 챕터 = 스테이지 20개. 테마(몬스터·배경 세트) 하나를 CHAPTERS_PER_THEME 챕터가 나눠 쓰고
 * 색조만 달라지므로, 에셋을 늘리지 않고도 챕터를 아주 멀리까지 만들 수 있다.
 */
export interface StageInfo {
  region: Region;
  /** 0-based 챕터 번호 (회차 안에서) */
  chapter: number;
  /** 화면에 보이는 챕터 이름 */
  chapterName: string;
  /** 같은 테마 안에서 몇 번째 변주인지 (0..CHAPTERS_PER_THEME-1) */
  variant: number;
  /** 변주별 색조 회전값(도) */
  tint: number;
  stage: number;
  loop: number;
  isBoss: boolean;
}

const VARIANT_SUFFIX = ['', ' 심층', ' 최심부'];
const VARIANT_TINT = [0, 22, -20];

export function stageInfo(n: number): StageInfo {
  const idx = Math.max(1, Math.floor(n)) - 1;
  const perLoop = CHAPTER_COUNT * STAGES_PER_CHAPTER;
  const loop = Math.floor(idx / perLoop);
  const within = idx % perLoop;
  const chapter = Math.floor(within / STAGES_PER_CHAPTER);
  const theme = Math.floor(chapter / CHAPTERS_PER_THEME) % THEME_COUNT;
  const variant = chapter % CHAPTERS_PER_THEME;
  const region = REGIONS[theme]!;
  const stage = (within % STAGES_PER_CHAPTER) + 1;
  return {
    region,
    chapter,
    chapterName: `${region.name}${VARIANT_SUFFIX[variant] ?? ''}`,
    variant,
    tint: (VARIANT_TINT[variant] ?? 0) + loop * 35,
    stage,
    loop,
    isBoss: stage % BOSS_EVERY === 0,
  };
}

export function stageLabel(n: number): string {
  const info = stageInfo(n);
  const loopTag = info.loop > 0 ? ` (${info.loop + 1}회차)` : '';
  return `${info.chapterName} ${info.stage}${loopTag}`;
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

export function pickMonster(n: number, _roll: number): MonsterType {
  return stageInfo(n).region.monsters[0];
}

export const ALL_MONSTER_TYPES: readonly MonsterType[] = REGIONS.flatMap((r) => [...r.monsters, r.boss]);
export const MONSTER_BY_ID: Record<string, MonsterType> = Object.fromEntries(ALL_MONSTER_TYPES.map((t) => [t.id, t]));
