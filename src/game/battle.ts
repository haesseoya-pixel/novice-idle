import { ARENA, BOSS, BOSS_EVERY, DUNGEON, GEMS, HERO, JOB_LEVELS, MONSTER, RAID, TOWER, expReq } from './balance';
import { equippedCompanions } from './companions';
import { missionProgress } from './missions';
import type { SkillDef } from './jobs';
import { ARENA_GHOST, RAID_BOSS, REGIONS, bossAtk, bossHp, isBossStage, monsterAtk, monsterExp, monsterGold, monsterHp, pickMonster, stageInfo, type MonsterType } from './monsters';
import { skillLevel, skillMultiplier, unlockedSkills } from './skills';
import { damageTaken, type HeroStats } from './stats';
import type { GameState } from './state';
import type { JobTier } from './jobs';
import { advanceQuest } from './quests';

export const ARENA_W = 360;

export interface Monster {
  id: number;
  type: MonsterType;
  x: number;
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  atkCd: number;
  boss: boolean;
  burn: { dps: number; t: number } | null;
  scale: number;
  dead: boolean;
  deathT: number;
  hitT: number;
  attackT: number;
  bob: number;
}

export interface Projectile {
  x: number;
  y: number;
  targetId: number;
  speed: number;
  dmg: number;
  crit: boolean;
  kind: 'arrow' | 'orb' | 'shuriken' | 'bolt';
  skill: boolean;
}

export interface DamageNumber {
  x: number;
  y: number;
  value: number;
  kind: 'normal' | 'crit' | 'skill' | 'tap' | 'heal' | 'burn' | 'hurt';
  t: number;
}

export type BattleEvent =
  | { type: 'hit'; x: number; crit: boolean; skill: boolean }
  | { type: 'kill'; x: number; boss: boolean; gold: number; typeId: string }
  | { type: 'bossStart'; stage: number }
  | { type: 'bossWin'; stage: number; gems: number; first: boolean }
  | { type: 'bossFail'; stage: number; reason: 'timer' | 'death' }
  | { type: 'heroDie' }
  | { type: 'heroRespawn'; stage: number }
  | { type: 'stageClear'; stage: number; next: number }
  | { type: 'milestone'; stage: number; gems: number }
  | { type: 'skill'; id: string; fx: SkillDef['fx']; x: number }
  | { type: 'levelUp'; level: number }
  | { type: 'jobReady'; tier: JobTier }
  | { type: 'heroHit'; dmg: number }
  | { type: 'dungeonEnd'; kind: 'gold' | 'gem'; gold: number; gems: number; kills: number }
  | { type: 'towerFloor'; floor: number; gems: number }
  | { type: 'towerEnd'; floor: number; gems: number; reason: 'timer' | 'death' }
  | { type: 'raidEnd'; damage: number; gems: number; best: boolean }
  | { type: 'arenaEnd'; won: boolean; opponent: string; gems: number; rating: number }
  | { type: 'companion'; id: string; x: number }
  | { type: 'tap' };

export type BattleMode = 'stage' | 'dungeonGold' | 'dungeonGem' | 'tower' | 'raid' | 'arena';

export interface ArenaOpponent {
  name: string;
  stage: number;
  level: number;
}

export interface BattleState {
  mode: BattleMode;
  stage: number;
  monsters: Monster[];
  projectiles: Projectile[];
  waveTotal: number;
  waveSpawned: number;
  waveKilled: number;
  spawnT: number;
  bossTimer: number;
  heroHp: number;
  heroMaxHp: number;
  heroDead: boolean;
  respawnT: number;
  heroAtkCd: number;
  tapCd: number;
  skillCd: Record<string, number>;
  shieldT: number;
  shieldReduce: number;
  invulnT: number;
  transitionT: number;
  farmRetryT: number;
  dungeonT: number;
  dungeonKills: number;
  dungeonGold: number;
  dungeonGems: number;
  towerFloor: number;
  towerTimer: number;
  raidDamage: number;
  arenaOpp: ArenaOpponent | null;
  companionCd: Record<string, number>;
  dmgNumbers: DamageNumber[];
  heroAttackT: number;
  heroCastT: number;
  heroHurtT: number;
  /** 몬스터가 등장하는 필드 폭 (화면이 넓으면 늘어난다) */
  arenaW: number;
  time: number;
  nextId: number;
  seed: number;
  lastKillX: number;
}

function rng(b: BattleState): number {
  // xorshift32 on the battle seed (visual-only randomness)
  let x = b.seed | 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  b.seed = x >>> 0;
  return b.seed / 4294967296;
}

export function createBattle(gs: GameState, stats: HeroStats): BattleState {
  const b: BattleState = {
    mode: 'stage',
    stage: gs.progress.stage,
    monsters: [],
    projectiles: [],
    waveTotal: 0,
    waveSpawned: 0,
    waveKilled: 0,
    spawnT: 0.4,
    bossTimer: -1,
    heroHp: stats.hp,
    heroMaxHp: stats.hp,
    heroDead: false,
    respawnT: 0,
    heroAtkCd: 0,
    tapCd: 0,
    skillCd: {},
    shieldT: 0,
    shieldReduce: 0,
    invulnT: 0,
    transitionT: 0,
    farmRetryT: 0,
    dungeonT: 0,
    dungeonKills: 0,
    dungeonGold: 0,
    dungeonGems: 0,
    towerFloor: 0,
    towerTimer: 0,
    raidDamage: 0,
    arenaOpp: null,
    companionCd: {},
    dmgNumbers: [],
    heroAttackT: 99,
    heroCastT: 99,
    heroHurtT: 99,
    arenaW: ARENA_W,
    time: 0,
    nextId: 1,
    seed: (gs.pity.seed ^ 0x5bd1e995) >>> 0 || 1,
    lastKillX: 200,
  };
  setupStage(gs, b);
  return b;
}

export function setupStage(gs: GameState, b: BattleState): void {
  b.stage = gs.progress.stage;
  b.monsters = [];
  b.projectiles = [];
  b.waveSpawned = 0;
  b.waveKilled = 0;
  b.spawnT = 0.4;
  const boss = isBossStage(b.stage) && gs.progress.bossMode;
  if (boss) {
    b.waveTotal = 1;
    b.bossTimer = BOSS.timer;
  } else {
    b.waveTotal = MONSTER.waveSize(b.stage);
    b.bossTimer = -1;
  }
}

/** Move the hero to any cleared stage (1..maxStage). Below the frontier the stage is farmed on repeat. */
export function selectStage(gs: GameState, b: BattleState, n: number): boolean {
  if (b.mode !== 'stage') return false;
  const target = Math.max(1, Math.min(gs.progress.maxStage, Math.floor(n)));
  gs.progress.stage = target;
  if (target < gs.progress.maxStage) {
    gs.progress.farmStage = target;
    gs.progress.bossMode = false;
  } else {
    gs.progress.farmStage = null;
    gs.progress.bossMode = isBossStage(target);
  }
  b.farmRetryT = 0;
  b.heroDead = false;
  b.heroHp = Math.max(b.heroHp, b.heroMaxHp * 0.5);
  setupStage(gs, b);
  b.transitionT = 0.6;
  return true;
}

/** True when the hero can challenge the next boss from the current farming stage. */
export function canChallengeBoss(gs: GameState): boolean {
  return gs.progress.farmStage !== null && isBossStage(gs.progress.farmStage + 1) && gs.progress.farmStage + 1 <= gs.progress.maxStage;
}

/** Enter the boss attempt on the current boss stage (from farming). */
export function attemptBoss(gs: GameState, b: BattleState): boolean {
  const target = gs.progress.farmStage !== null ? gs.progress.farmStage + 1 : gs.progress.stage;
  if (!isBossStage(target)) return false;
  gs.progress.stage = target;
  gs.progress.bossMode = true;
  gs.progress.farmStage = null;
  gs.stats.bossAttempts++;
  advanceQuest(gs, 'bossAttempts', 1);
  missionProgress(gs, 'boss', 1);
  b.farmRetryT = 0;
  setupStage(gs, b);
  b.transitionT = 0.6;
  return true;
}

function spawnMonster(gs: GameState, b: BattleState): void {
  const n = b.stage;
  const dungeon = b.mode !== 'stage';
  const tower = b.mode === 'tower';
  const raid = b.mode === 'raid';
  const arena = b.mode === 'arena';
  const boss = tower || raid || (b.mode === 'stage' && isBossStage(n) && gs.progress.bossMode);
  const { region } = stageInfo(n);
  const towerRegion = REGIONS[Math.max(0, b.towerFloor - 1) % REGIONS.length]!;
  const type = raid ? RAID_BOSS : arena ? { ...ARENA_GHOST, name: b.arenaOpp?.name ?? '도전자' } : tower ? towerRegion.boss : boss ? region.boss : pickMonster(n, rng(b));
  let hp = boss ? bossHp(n) : monsterHp(n) * type.hp;
  let atk = boss ? bossAtk(n) : monsterAtk(n) * type.atk;
  if (raid) {
    hp = monsterHp(n) * 1e9;
    atk = monsterAtk(n) * RAID.atkMult;
  } else if (arena) {
    const os = Math.max(1, b.arenaOpp?.stage ?? n);
    hp = monsterHp(os) * ARENA.hpMult;
    atk = monsterAtk(os) * ARENA.atkMult;
  } else if (tower) {
    hp = monsterHp(n) * TOWER.hpMult(b.towerFloor);
    atk = monsterAtk(n) * BOSS.atkMult * TOWER.atkMult(b.towerFloor);
  } else if (b.mode === 'dungeonGold') {
    hp *= DUNGEON.gold.hpMult;
    atk *= DUNGEON.gold.atkMult;
  } else if (b.mode === 'dungeonGem') {
    hp *= DUNGEON.gem.hpMult;
    atk *= DUNGEON.gem.atkMult;
  }
  const speed = MONSTER.speed * (boss ? BOSS.speedMult : type.speed);
  b.monsters.push({
    id: b.nextId++,
    type,
    x: b.arenaW + 40 + rng(b) * 30,
    hp,
    maxHp: hp,
    atk,
    speed,
    atkCd: boss ? BOSS.attackInterval * 0.5 : MONSTER.attackInterval * (0.4 + rng(b) * 0.6),
    boss,
    burn: null,
    scale: raid ? RAID.scale : arena ? 1.1 : boss ? (tower ? 1.5 : BOSS.scale) : 1,
    dead: false,
    deathT: 0,
    hitT: 99,
    attackT: 99,
    bob: rng(b) * 6.28,
  });
  b.waveSpawned++;
  if (!dungeon && boss) b.bossTimer = BOSS.timer;
}

export function gainExp(gs: GameState, amount: number, events: BattleEvent[]): void {
  gs.hero.exp += amount;
  let req = expReq(gs.hero.level);
  let leveled = false;
  while (gs.hero.exp >= req && gs.hero.level < 9999) {
    gs.hero.exp -= req;
    gs.hero.level++;
    leveled = true;
    req = expReq(gs.hero.level);
  }
  if (leveled) {
    events.push({ type: 'levelUp', level: gs.hero.level });
    const nextTier = (gs.hero.tier + 1) as JobTier;
    if (nextTier <= 4 && gs.hero.level >= JOB_LEVELS[nextTier]) events.push({ type: 'jobReady', tier: nextTier });
  }
}

function addNumber(b: BattleState, x: number, value: number, kind: DamageNumber['kind']): void {
  b.dmgNumbers.push({ x, y: 0, value, kind, t: b.time });
  if (b.dmgNumbers.length > 60) b.dmgNumbers.shift();
}

function dealDamage(gs: GameState, b: BattleState, m: Monster, dmg: number, kind: DamageNumber['kind'], events: BattleEvent[], stats: HeroStats): void {
  if (m.dead) return;
  if (m.boss && stats.bossDmg > 0) dmg *= 1 + stats.bossDmg;
  if (b.mode === 'raid') b.raidDamage += dmg;
  m.hp -= dmg;
  m.hitT = 0;
  gs.stats.totalDamage += dmg;
  addNumber(b, m.x, dmg, kind);
  events.push({ type: 'hit', x: m.x, crit: kind === 'crit', skill: kind === 'skill' });
  if (m.hp <= 0) killMonster(gs, b, m, events, stats);
}

function killMonster(gs: GameState, b: BattleState, m: Monster, events: BattleEvent[], stats: HeroStats): void {
  m.dead = true;
  m.deathT = 0;
  m.hp = 0;
  b.waveKilled++;
  b.lastKillX = m.x;
  const n = b.stage;
  let gold = 0;
  let gems = 0;
  if (b.mode === 'stage') {
    gold = monsterGold(n) * stats.goldMult * (m.boss ? BOSS.goldMult : 1);
    const exp = monsterExp(n) * stats.expMult * (m.boss ? BOSS.expMult : 1);
    gs.gold += gold;
    gs.stats.totalGold += gold;
    gainExp(gs, exp, events);
    gs.progress.kills++;
    gs.stats.totalKills++;
    gs.codex[m.type.id] = (gs.codex[m.type.id] ?? 0) + 1;
    advanceQuest(gs, 'kills', 1);
    missionProgress(gs, 'kills', 1);
    advanceQuest(gs, 'gold', gold);
  } else if (b.mode === 'dungeonGold') {
    gold = monsterGold(n) * stats.goldMult * DUNGEON.gold.goldMult;
    gs.gold += gold;
    gs.stats.totalGold += gold;
    b.dungeonGold += gold;
    b.dungeonKills++;
  } else if (b.mode === 'arena') {
    b.dungeonKills++;
    events.push({ type: 'kill', x: m.x, boss: false, gold: 0, typeId: m.type.id });
    endArena(gs, b, stats, true, events);
    return;
  } else if (b.mode === 'tower') {
    b.dungeonKills++;
    const floor = b.towerFloor;
    let gems = 0;
    if (floor > gs.tower.bestFloor) {
      gs.tower.bestFloor = floor;
      gems = TOWER.gems(floor);
      gs.gems += gems;
      b.dungeonGems += gems;
    }
    events.push({ type: 'towerFloor', floor, gems });
    b.towerFloor++;
    b.towerTimer = TOWER.timer;
    b.waveSpawned = 0;
    b.waveKilled = 0;
    b.spawnT = 0.9;
    b.transitionT = 0.9;
  } else {
    if (b.dungeonGems < DUNGEON.gem.gemCap) {
      gems = DUNGEON.gem.gemPerKill;
      gs.gems += gems;
      b.dungeonGems += gems;
    }
    b.dungeonKills++;
  }
  events.push({ type: 'kill', x: m.x, boss: m.boss, gold, typeId: m.type.id });
  if (m.boss && b.mode === 'stage') bossWin(gs, b, events);
}

function bossWin(gs: GameState, b: BattleState, events: BattleEvent[]): void {
  const n = b.stage;
  gs.progress.bossKills++;
  gs.progress.bossMode = false;
  gs.progress.bossFails = 0;
  gs.progress.farmStage = null;
  const first = !gs.progress.firstClears.includes(n);
  const gems = first ? GEMS.bossFirstClear(n) : GEMS.bossRepeat;
  if (first) gs.progress.firstClears.push(n);
  gs.gems += gems;
  events.push({ type: 'bossWin', stage: n, gems, first });
}

function bossFail(gs: GameState, b: BattleState, reason: 'timer' | 'death', events: BattleEvent[]): void {
  const n = b.stage;
  gs.progress.bossFails++;
  gs.progress.bossMode = false;
  gs.progress.farmStage = n - 1;
  gs.progress.stage = Math.max(1, n - 1);
  b.farmRetryT = 0;
  events.push({ type: 'bossFail', stage: n, reason });
  setupStage(gs, b);
  b.transitionT = 0.8;
}

function stageClear(gs: GameState, b: BattleState, events: BattleEvent[]): void {
  const n = b.stage;
  if (gs.progress.farmStage !== null && n === gs.progress.farmStage) {
    // farming: repeat the same stage
    setupStage(gs, b);
    b.transitionT = 0.6;
    return;
  }
  if (!gs.settings.autoAdvance) {
    gs.progress.farmStage = n;
    events.push({ type: 'stageClear', stage: n, next: n });
    setupStage(gs, b);
    b.transitionT = 0.6;
    return;
  }
  const next = n + 1;
  gs.progress.stage = next;
  if (next > gs.progress.maxStage) gs.progress.maxStage = next;
  if (isBossStage(next)) gs.progress.bossMode = true;
  // milestone gems on first arrival at multiples of 10 (after clearing the boss below it)
  if (n % BOSS_EVERY === 0 && !gs.progress.milestones.includes(n)) {
    gs.progress.milestones.push(n);
    const gems = GEMS.milestone(n);
    gs.gems += gems;
    events.push({ type: 'milestone', stage: n, gems });
  }
  events.push({ type: 'stageClear', stage: n, next });
  setupStage(gs, b);
  b.transitionT = 1.0;
}

function heroDie(gs: GameState, b: BattleState, events: BattleEvent[]): void {
  b.heroDead = true;
  b.respawnT = HERO.respawnDelay;
  b.heroHp = 0;
  b.monsters = [];
  b.projectiles = [];
  events.push({ type: 'heroDie' });
}

function heroRespawn(gs: GameState, b: BattleState, stats: HeroStats, events: BattleEvent[]): void {
  b.heroDead = false;
  b.heroHp = stats.hp;
  if (b.mode !== 'stage') {
    // dungeons: just continue
    events.push({ type: 'heroRespawn', stage: b.stage });
    return;
  }
  const wasBoss = isBossStage(b.stage) && gs.progress.bossMode;
  if (wasBoss) {
    bossFail(gs, b, 'death', events);
  } else {
    const back = Math.max(1, b.stage - HERO.retreatOnDeath);
    if (gs.progress.farmStage !== null) gs.progress.farmStage = Math.max(1, gs.progress.farmStage - 1);
    gs.progress.stage = back;
    setupStage(gs, b);
    b.transitionT = 0.8;
  }
  events.push({ type: 'heroRespawn', stage: gs.progress.stage });
}

function nearestTarget(b: BattleState, range: number): Monster | null {
  let best: Monster | null = null;
  for (const m of b.monsters) {
    if (m.dead) continue;
    if (m.x - HERO.x > range) continue;
    if (!best || m.x < best.x) best = m;
  }
  return best;
}

function rollCrit(b: BattleState, stats: HeroStats, force = false): boolean {
  return force || rng(b) < stats.critRate;
}

function heroAttack(gs: GameState, b: BattleState, stats: HeroStats, target: Monster, mult: number, kind: 'basic' | 'tap', events: BattleEvent[]): void {
  const crit = rollCrit(b, stats);
  const dmg = stats.atk * mult * (crit ? stats.critDmg : 1);
  b.heroAttackT = 0;
  if (stats.ranged) {
    b.projectiles.push({ x: HERO.x + 14, y: -30, targetId: target.id, speed: 620, dmg, crit, kind: gs.hero.job === 'mage' ? 'orb' : 'arrow', skill: false });
  } else {
    dealDamage(gs, b, target, dmg, crit ? 'crit' : kind === 'tap' ? 'tap' : 'normal', events, stats);
  }
}

export function castSkill(gs: GameState, b: BattleState, stats: HeroStats, def: SkillDef, events: BattleEvent[]): boolean {
  if (b.heroDead) return false;
  const cd = b.skillCd[def.id] ?? 0;
  if (cd > 0) return false;
  const lv = skillLevel(gs, def.id);
  if (lv <= 0) return false;
  const alive = b.monsters.filter((m) => !m.dead);
  const target = nearestTarget(b, stats.ranged ? HERO.rangedRange : HERO.attackRange) ?? alive[0] ?? null;
  const e = def.effect;
  if ((e.kind === 'single' || e.kind === 'all' || e.kind === 'burn') && !target) return false;
  if (e.kind === 'heal' && b.heroHp >= b.heroMaxHp) return false;
  const power = stats.atk * skillMultiplier(lv) * stats.skillMult;
  b.skillCd[def.id] = def.cooldown * (1 - stats.cooldown);
  b.heroCastT = 0;
  gs.stats.skillCasts++;
  advanceQuest(gs, 'skills', 1);
  missionProgress(gs, 'skills', 1);
  events.push({ type: 'skill', id: def.id, fx: def.fx, x: target ? target.x : HERO.x + 120 });
  switch (e.kind) {
    case 'single': {
      const crit = rollCrit(b, stats, def.crit === 'always');
      const dmg = power * e.mult * (crit ? stats.critDmg : 1);
      if (def.projectile && target) b.projectiles.push({ x: HERO.x + 14, y: -34, targetId: target.id, speed: 700, dmg, crit, kind: def.projectile, skill: true });
      else if (target) dealDamage(gs, b, target, dmg, 'skill', events, stats);
      break;
    }
    case 'all': {
      for (const m of alive) {
        const crit = rollCrit(b, stats, def.crit === 'always');
        dealDamage(gs, b, m, power * e.mult * (crit ? stats.critDmg : 1), 'skill', events, stats);
      }
      break;
    }
    case 'burn': {
      for (const m of alive) m.burn = { dps: power * e.multPerSec, t: e.duration };
      break;
    }
    case 'heal': {
      const amount = b.heroMaxHp * e.fraction;
      b.heroHp = Math.min(b.heroMaxHp, b.heroHp + amount);
      addNumber(b, HERO.x, amount, 'heal');
      break;
    }
    case 'shield':
      b.shieldT = e.duration;
      b.shieldReduce = e.reduce;
      break;
    case 'invuln':
      b.invulnT = e.duration;
      break;
  }
  return true;
}

export function tapAttack(gs: GameState, b: BattleState, stats: HeroStats, events: BattleEvent[]): boolean {
  if (b.heroDead || b.tapCd > 0) return false;
  const target = nearestTarget(b, stats.ranged ? HERO.rangedRange : HERO.attackRange + 40);
  b.tapCd = HERO.tapCooldown;
  gs.stats.taps++;
  events.push({ type: 'tap' });
  if (!target) {
    b.heroAttackT = 0;
    return true;
  }
  heroAttack(gs, b, stats, target, HERO.tapMult, 'tap', events);
  return true;
}

export function startDungeon(gs: GameState, b: BattleState, stats: HeroStats, kind: 'gold' | 'gem'): boolean {
  if (b.mode !== 'stage') return false;
  if (kind === 'gold') {
    if (gs.daily.goldTickets <= 0) return false;
    gs.daily.goldTickets--;
    b.dungeonT = DUNGEON.gold.duration;
  } else {
    if (gs.daily.gemTickets <= 0) return false;
    gs.daily.gemTickets--;
    b.dungeonT = DUNGEON.gem.duration;
  }
  missionProgress(gs, 'dungeon', 1);
  b.mode = kind === 'gold' ? 'dungeonGold' : 'dungeonGem';
  b.stage = Math.max(1, gs.progress.maxStage);
  b.monsters = [];
  b.projectiles = [];
  b.waveTotal = 9999;
  b.waveSpawned = 0;
  b.waveKilled = 0;
  b.dungeonKills = 0;
  b.dungeonGold = 0;
  b.dungeonGems = 0;
  b.bossTimer = -1;
  b.spawnT = 0.3;
  b.heroHp = stats.hp;
  b.heroDead = false;
  b.transitionT = 0.6;
  return true;
}

export function startTower(gs: GameState, b: BattleState, stats: HeroStats): boolean {
  if (b.mode !== 'stage' || gs.daily.towerTickets <= 0) return false;
  gs.daily.towerTickets--;
  gs.tower.runs++;
  missionProgress(gs, 'dungeon', 1);
  b.mode = 'tower';
  b.stage = Math.max(1, gs.progress.maxStage);
  b.towerFloor = gs.tower.bestFloor + 1;
  b.towerTimer = TOWER.timer;
  b.monsters = [];
  b.projectiles = [];
  b.waveTotal = 1;
  b.waveSpawned = 0;
  b.waveKilled = 0;
  b.dungeonKills = 0;
  b.dungeonGold = 0;
  b.dungeonGems = 0;
  b.bossTimer = -1;
  b.spawnT = 0.5;
  b.heroHp = stats.hp;
  b.heroDead = false;
  b.transitionT = 0.6;
  return true;
}

export function startRaid(gs: GameState, b: BattleState, stats: HeroStats): boolean {
  if (b.mode !== 'stage' || gs.daily.raidTickets <= 0) return false;
  gs.daily.raidTickets--;
  gs.raid.runs++;
  missionProgress(gs, 'dungeon', 1);
  b.mode = 'raid';
  b.stage = Math.max(1, gs.progress.maxStage);
  b.raidDamage = 0;
  b.dungeonT = RAID.duration;
  b.monsters = [];
  b.projectiles = [];
  b.waveTotal = 1;
  b.waveSpawned = 0;
  b.waveKilled = 0;
  b.dungeonKills = 0;
  b.dungeonGold = 0;
  b.dungeonGems = 0;
  b.bossTimer = -1;
  b.spawnT = 0.4;
  b.heroHp = stats.hp;
  b.heroDead = false;
  b.transitionT = 0.6;
  return true;
}

/** Par damage: what a hero at the frontier is expected to deal in a raid. */
export function raidPar(gs: GameState): number {
  const n = Math.max(1, gs.progress.maxStage);
  return bossHp(n) * 3;
}

function endRaid(gs: GameState, b: BattleState, stats: HeroStats, events: BattleEvent[]): void {
  const ratio = b.raidDamage / Math.max(1, raidPar(gs));
  const gems = RAID.gems(ratio);
  gs.gems += gems;
  const best = b.raidDamage > gs.raid.bestDamage;
  if (best) gs.raid.bestDamage = b.raidDamage;
  events.push({ type: 'raidEnd', damage: b.raidDamage, gems, best });
  b.mode = 'stage';
  b.heroHp = Math.max(b.heroHp, stats.hp * 0.5);
  b.heroDead = false;
  setupStage(gs, b);
  b.transitionT = 0.8;
}

export function startArena(gs: GameState, b: BattleState, stats: HeroStats, opp: ArenaOpponent): boolean {
  if (b.mode !== 'stage' || gs.daily.arenaTickets <= 0) return false;
  gs.daily.arenaTickets--;
  missionProgress(gs, 'dungeon', 1);
  b.mode = 'arena';
  b.arenaOpp = opp;
  b.stage = Math.max(1, gs.progress.maxStage);
  b.dungeonT = ARENA.duration;
  b.monsters = [];
  b.projectiles = [];
  b.waveTotal = 1;
  b.waveSpawned = 0;
  b.waveKilled = 0;
  b.dungeonKills = 0;
  b.dungeonGold = 0;
  b.dungeonGems = 0;
  b.bossTimer = -1;
  b.spawnT = 0.4;
  b.heroHp = stats.hp;
  b.heroDead = false;
  b.transitionT = 0.6;
  return true;
}

function endArena(gs: GameState, b: BattleState, stats: HeroStats, won: boolean, events: BattleEvent[]): void {
  const gems = won ? ARENA.winGems : ARENA.loseGems;
  gs.gems += gems;
  if (won) {
    gs.arena.wins++;
    gs.arena.rating += ARENA.ratingWin;
  } else {
    gs.arena.losses++;
    gs.arena.rating = Math.max(0, gs.arena.rating - ARENA.ratingLose);
  }
  events.push({ type: 'arenaEnd', won, opponent: b.arenaOpp?.name ?? '도전자', gems, rating: gs.arena.rating });
  b.mode = 'stage';
  b.arenaOpp = null;
  b.heroHp = Math.max(b.heroHp, stats.hp * 0.5);
  b.heroDead = false;
  setupStage(gs, b);
  b.transitionT = 0.8;
}

function endTower(gs: GameState, b: BattleState, stats: HeroStats, reason: 'timer' | 'death', events: BattleEvent[]): void {
  events.push({ type: 'towerEnd', floor: Math.max(0, b.towerFloor - 1), gems: b.dungeonGems, reason });
  b.mode = 'stage';
  b.heroHp = Math.max(b.heroHp, stats.hp * 0.5);
  b.heroDead = false;
  setupStage(gs, b);
  b.transitionT = 0.8;
}

function endDungeon(gs: GameState, b: BattleState, stats: HeroStats, events: BattleEvent[]): void {
  events.push({ type: 'dungeonEnd', kind: b.mode === 'dungeonGold' ? 'gold' : 'gem', gold: b.dungeonGold, gems: b.dungeonGems, kills: b.dungeonKills });
  b.mode = 'stage';
  b.heroHp = Math.max(b.heroHp, stats.hp * 0.5);
  b.heroDead = false;
  setupStage(gs, b);
  b.transitionT = 0.8;
}

/** One battle tick. Mutates gs (gold/exp/progress/stats) and b. */
export function battleTick(gs: GameState, b: BattleState, stats: HeroStats, dt: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  b.time += dt;
  b.heroMaxHp = stats.hp;
  if (b.heroHp > b.heroMaxHp) b.heroHp = b.heroMaxHp;
  b.heroAttackT += dt;
  b.heroCastT += dt;
  b.heroHurtT += dt;
  if (b.tapCd > 0) b.tapCd -= dt;
  if (b.shieldT > 0) b.shieldT -= dt;
  if (b.invulnT > 0) b.invulnT -= dt;
  for (const id of Object.keys(b.skillCd)) if (b.skillCd[id]! > 0) b.skillCd[id] = Math.max(0, b.skillCd[id]! - dt);
  if (b.dmgNumbers.length && b.time - b.dmgNumbers[0]!.t > 1.2) b.dmgNumbers = b.dmgNumbers.filter((d) => b.time - d.t <= 1.2);

  // dead monsters fade out
  for (const m of b.monsters) {
    if (m.dead) m.deathT += dt;
    else {
      m.hitT += dt;
      m.attackT += dt;
    }
  }
  if (b.monsters.some((m) => m.dead && m.deathT > 0.6)) b.monsters = b.monsters.filter((m) => !(m.dead && m.deathT > 0.6));

  // dungeon timer
  const dungeon = b.mode !== 'stage';
  if (b.mode === 'dungeonGold' || b.mode === 'dungeonGem') {
    b.dungeonT -= dt;
    if (b.dungeonT <= 0) {
      endDungeon(gs, b, stats, events);
      return events;
    }
  } else if (b.mode === 'raid' || b.mode === 'arena') {
    b.dungeonT -= dt;
    if (b.dungeonT <= 0) {
      if (b.mode === 'raid') endRaid(gs, b, stats, events);
      else endArena(gs, b, stats, false, events);
      return events;
    }
  }

  // hero death / respawn
  if (b.heroDead) {
    b.respawnT -= dt;
    if (b.respawnT <= 0) {
      if (b.mode === 'tower') endTower(gs, b, stats, 'death', events);
      else if (b.mode === 'raid') endRaid(gs, b, stats, events);
      else if (b.mode === 'arena') endArena(gs, b, stats, false, events);
      else heroRespawn(gs, b, stats, events);
    }
    return events;
  }

  // tower floor timer (only while the boss is up)
  if (b.mode === 'tower' && b.transitionT <= 0 && b.monsters.some((m) => !m.dead)) {
    b.towerTimer -= dt;
    if (b.towerTimer <= 0) {
      endTower(gs, b, stats, 'timer', events);
      return events;
    }
  }

  // transition (walking to the next stage)
  if (b.transitionT > 0) {
    b.transitionT -= dt;
    b.heroHp = Math.min(b.heroMaxHp, b.heroHp + b.heroMaxHp * stats.regen * dt);
    if (b.transitionT <= 0 && b.mode === 'stage' && isBossStage(b.stage) && gs.progress.bossMode) events.push({ type: 'bossStart', stage: b.stage });
    return events;
  }

  // farming auto-retry
  if (b.mode === 'stage' && gs.progress.farmStage !== null) {
    b.farmRetryT += dt;
    if (gs.settings.autoBoss && b.farmRetryT >= BOSS.autoRetryInterval && b.monsters.every((m) => m.dead)) {
      attemptBoss(gs, b);
      return events;
    }
  }

  // spawning
  const maxOn = b.mode === 'dungeonGold' ? DUNGEON.gold.maxOnScreen : b.mode === 'dungeonGem' ? DUNGEON.gem.maxOnScreen : MONSTER.maxOnScreen;
  const spawnInterval = b.mode === 'dungeonGold' ? DUNGEON.gold.spawnInterval : b.mode === 'dungeonGem' ? DUNGEON.gem.spawnInterval : MONSTER.spawnInterval;
  const alive = b.monsters.filter((m) => !m.dead);
  b.spawnT -= dt;
  if (b.waveSpawned < b.waveTotal && alive.length < maxOn && b.spawnT <= 0) {
    spawnMonster(gs, b);
    b.spawnT = spawnInterval;
  }

  // boss timer
  if (b.bossTimer > 0 && b.mode === 'stage') {
    b.bossTimer -= dt;
    if (b.bossTimer <= 0) {
      bossFail(gs, b, 'timer', events);
      return events;
    }
  }

  // regen
  b.heroHp = Math.min(b.heroMaxHp, b.heroHp + b.heroMaxHp * stats.regen * dt);

  // monsters move & attack
  const stopX = HERO.x + MONSTER.meleeOffset;
  for (const m of b.monsters) {
    if (m.dead) continue;
    const reach = stopX + (m.boss ? 30 : (m.id % 3) * 14);
    if (m.x > reach) {
      m.x = Math.max(reach, m.x - m.speed * dt);
    } else {
      m.atkCd -= dt;
      if (m.atkCd <= 0) {
        m.atkCd = m.boss ? BOSS.attackInterval : MONSTER.attackInterval;
        m.attackT = 0;
        if (b.invulnT <= 0 && m.atk > 0) {
          let dmg = damageTaken(m.atk, stats.def);
          if (b.shieldT > 0) dmg *= 1 - b.shieldReduce;
          b.heroHp -= dmg;
          b.heroHurtT = 0;
          addNumber(b, HERO.x, dmg, 'hurt');
          events.push({ type: 'heroHit', dmg });
          if (b.heroHp <= 0) {
            heroDie(gs, b, events);
            return events;
          }
        }
      }
    }
    if (m.burn) {
      m.burn.t -= dt;
      dealDamage(gs, b, m, m.burn.dps * dt, 'burn', events, stats);
      if (m.burn && m.burn.t <= 0) m.burn = null;
    }
  }

  // projectiles
  if (b.projectiles.length) {
    const keep: Projectile[] = [];
    for (const p of b.projectiles) {
      const target = b.monsters.find((m) => m.id === p.targetId && !m.dead);
      if (!target) continue;
      const dx = target.x - p.x;
      const step = p.speed * dt;
      if (Math.abs(dx) <= step) {
        dealDamage(gs, b, target, p.dmg, p.skill ? 'skill' : p.crit ? 'crit' : 'normal', events, stats);
      } else {
        p.x += Math.sign(dx) * step;
        keep.push(p);
      }
    }
    b.projectiles = keep;
  }

  // hero basic attack
  b.heroAtkCd -= dt;
  if (b.heroAtkCd <= 0) {
    const target = nearestTarget(b, stats.ranged ? HERO.rangedRange : HERO.attackRange);
    if (target) {
      heroAttack(gs, b, stats, target, 1, 'basic', events);
      b.heroAtkCd = 1 / Math.max(0.1, stats.atkSpeed);
    }
  }

  // auto skills
  for (const def of unlockedSkills(gs)) {
    if ((b.skillCd[def.id] ?? 0) <= 0) castSkill(gs, b, stats, def, events);
  }

  // companion strikes
  for (const c of equippedCompanions(gs)) {
    const cd = (b.companionCd[c.id] ?? c.strikeEvery * 0.5) - dt;
    if (cd > 0) {
      b.companionCd[c.id] = cd;
      continue;
    }
    const target = nearestTarget(b, HERO.rangedRange) ?? b.monsters.find((m) => !m.dead) ?? null;
    if (!target) {
      b.companionCd[c.id] = 0;
      continue;
    }
    b.companionCd[c.id] = c.strikeEvery;
    events.push({ type: 'companion', id: c.id, x: target.x });
    dealDamage(gs, b, target, stats.atk * c.strikeMult, 'skill', events, stats);
    if (target.dead && b.mode !== 'stage' && b.mode !== 'dungeonGold' && b.mode !== 'dungeonGem') return events;
  }

  // wave complete
  if (!dungeon && b.waveKilled >= b.waveTotal && b.monsters.every((m) => m.dead) && b.projectiles.length === 0) {
    if (isBossStage(b.stage) && gs.progress.bossMode) {
      // handled in bossWin (mode already reset); fallthrough to clear
    }
    stageClear(gs, b, events);
  }
  return events;
}

/** 화면 가로가 넓으면 필드도 넓게 (몬스터가 화면 밖에서 걸어 들어오도록). */
export function setArenaWidth(b: BattleState, w: number): void {
  b.arenaW = Math.max(ARENA_W, Math.min(1200, Math.round(w)));
}

export function heroHpFraction(b: BattleState): number {
  return b.heroMaxHp > 0 ? Math.max(0, b.heroHp / b.heroMaxHp) : 0;
}

