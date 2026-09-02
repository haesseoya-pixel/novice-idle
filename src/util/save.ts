import { BACKUP_KEY_PREFIX, SAVE_KEY, SLOTS, UPGRADE_BY_ID, UPGRADE_IDS, type Slot, type UpgradeId } from '@/game/balance';
import { ACHIEVEMENTS } from '@/game/achievements';
import { JOB_PATHS, SKILL_BY_ID } from '@/game/jobs';
import { MONSTER_BY_ID } from '@/game/monsters';
import { QUEST_ORDER, questTarget } from '@/game/quests';
import { createInitialState, emptySlots, emptyUpgrades, SAVE_VERSION, todayKey, type AchievementId, type GameState, type ItemKey } from '@/game/state';
import { clamp, safeNum } from './math';
import { POTENTIAL_STATS, type PotentialLine, type SlotPotential } from '@/game/potential';
import { ARENA, DUNGEON, POTENTIAL, RAID, TOWER } from '@/game/balance';
import { ARTIFACT_BY_ID, type ArtifactId } from '@/game/artifacts';
import { COMPANION_BY_ID, COMPANION_SLOTS, type CompanionId } from '@/game/companions';
import { MISSIONS, type MissionId } from '@/game/missions';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const EXPORT_PREFIX = 'NOVICE1:';

type AnyObj = Record<string, unknown>;
const isObj = (v: unknown): v is AnyObj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, min = -Infinity, max = Infinity): number => clamp(safeNum(v, fallback), min, max);
const nonNeg = (v: unknown, fallback = 0): number => num(v, fallback, 0, Number.MAX_VALUE);
const bool = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const ACH_IDS = new Set<string>(ACHIEVEMENTS.map((a) => a.id));
const ITEM_KEY_RE = /^(weapon|armor|accessory|pet)_[0-5]$/;

export function sanitize(raw: unknown, now = Date.now()): GameState {
  const d = createInitialState(now);
  if (!isObj(raw)) return d;
  const h = isObj(raw.hero) ? raw.hero : {};
  const upgrades = emptyUpgrades();
  if (isObj(h.upgrades)) for (const id of UPGRADE_IDS) upgrades[id] = Math.floor(num(h.upgrades[id], 0, 0, UPGRADE_BY_ID[id as UpgradeId].max));
  const skills: Record<string, number> = { novice_strike: 1 };
  if (isObj(h.skills)) for (const [k, v] of Object.entries(h.skills)) if (SKILL_BY_ID[k]) skills[k] = Math.floor(num(v, 0, 0, 100));
  const inventory: Partial<Record<ItemKey, number>> = {};
  if (isObj(raw.inventory)) for (const [k, v] of Object.entries(raw.inventory)) if (ITEM_KEY_RE.test(k)) inventory[k as ItemKey] = Math.floor(num(v, 0, 0, 100));
  const equipped = emptySlots<ItemKey | null>(null);
  if (isObj(h.equipped)) for (const s of SLOTS) {
    const v = h.equipped[s];
    if (typeof v === 'string' && ITEM_KEY_RE.test(v) && v.startsWith(s + '_') && inventory[v as ItemKey]) equipped[s as Slot] = v as ItemKey;
  }
  const potential = emptySlots<SlotPotential>({ grade: 0, lines: [] });
  if (isObj(raw.potential)) for (const s of SLOTS) {
    const p = raw.potential[s];
    if (!isObj(p)) continue;
    const grade = Math.floor(num(p.grade, 0, 0, POTENTIAL.gradeMult.length - 1));
    const lines: PotentialLine[] = [];
    if (Array.isArray(p.lines)) for (const l of p.lines.slice(0, POTENTIAL.lines)) if (isObj(l) && typeof l.stat === 'string' && (POTENTIAL_STATS as readonly string[]).includes(l.stat)) lines.push({ stat: l.stat as PotentialLine['stat'], value: num(l.value, 0, 0, 1000) });
    potential[s as Slot] = { grade, lines };
  }
  const tw = isObj(raw.tower) ? raw.tower : {};
  const artifacts: Partial<Record<ArtifactId, number>> = {};
  if (isObj(raw.artifacts)) for (const [k, v] of Object.entries(raw.artifacts)) if (k in ARTIFACT_BY_ID) artifacts[k as ArtifactId] = Math.floor(num(v, 0, 0, ARTIFACT_BY_ID[k as ArtifactId].max));
  const compRaw = isObj(raw.companions) ? raw.companions : {};
  const owned: Partial<Record<CompanionId, number>> = {};
  if (isObj(compRaw.owned)) for (const [k, v] of Object.entries(compRaw.owned)) if (k in COMPANION_BY_ID) owned[k as CompanionId] = Math.floor(num(v, 0, 0, 1e6));
  const compEquipped: (CompanionId | null)[] = [];
  if (Array.isArray(compRaw.equipped)) for (const v of compRaw.equipped.slice(0, COMPANION_SLOTS)) compEquipped.push(typeof v === 'string' && v in COMPANION_BY_ID && owned[v as CompanionId] ? (v as CompanionId) : null);
  while (compEquipped.length < COMPANION_SLOTS) compEquipped.push(null);
  const mi = isObj(raw.missions) ? raw.missions : {};
  const mProgress: Partial<Record<MissionId, number>> = {};
  if (isObj(mi.progress)) for (const m of MISSIONS) if (m.id in mi.progress) mProgress[m.id] = nonNeg(mi.progress[m.id]);
  const mClaimed = Array.isArray(mi.claimed) ? mi.claimed.filter((x): x is MissionId => typeof x === 'string' && MISSIONS.some((m) => m.id === x)) : [];
  const at = isObj(raw.attendance) ? raw.attendance : {};
  const rd = isObj(raw.raid) ? raw.raid : {};
  const ar = isObj(raw.arena) ? raw.arena : {};
  const stars = emptySlots(0);
  if (isObj(h.stars)) for (const s of SLOTS) stars[s as Slot] = Math.floor(num(h.stars[s], 0, 0, 25));
  const job = typeof h.job === 'string' && (JOB_PATHS as readonly string[]).includes(h.job) ? (h.job as GameState['hero']['job']) : null;
  const tier = Math.floor(num(h.tier, 0, 0, 4)) as GameState['hero']['tier'];
  const p = isObj(raw.progress) ? raw.progress : {};
  const maxStage = Math.max(1, Math.floor(num(p.maxStage, 1, 1, 3000)));
  const stage = Math.max(1, Math.min(maxStage, Math.floor(num(p.stage, 1, 1, 3000))));
  const dl = isObj(raw.daily) ? raw.daily : {};
  const q = isObj(raw.quest) ? raw.quest : {};
  const qIndex = Math.floor(num(q.index, 0, 0, QUEST_ORDER.length - 1));
  const qCycle = Math.floor(num(q.cycle, 0, 0, 1e6));
  const achievements: Partial<Record<AchievementId, number>> = {};
  if (isObj(raw.achievements)) for (const [k, v] of Object.entries(raw.achievements)) if (ACH_IDS.has(k)) achievements[k as AchievementId] = nonNeg(v);
  const codex: Record<string, number> = {};
  if (isObj(raw.codex)) for (const [k, v] of Object.entries(raw.codex)) if (MONSTER_BY_ID[k]) codex[k] = Math.floor(nonNeg(v));
  const st = isObj(raw.stats) ? raw.stats : {};
  const se = isObj(raw.settings) ? raw.settings : {};
  const pity = isObj(raw.pity) ? raw.pity : {};
  const off = isObj(raw.offline) ? raw.offline : {};
  return {
    version: SAVE_VERSION,
    createdAt: nonNeg(raw.createdAt, now),
    lastTick: nonNeg(raw.lastTick, now),
    lastSaved: nonNeg(raw.lastSaved, now),
    hero: {
      level: Math.max(1, Math.floor(num(h.level, 1, 1, 9999))),
      exp: nonNeg(h.exp),
      job: tier >= 1 ? job : null,
      tier: job ? tier : 0,
      upgrades,
      skills,
      equipped,
      stars,
    },
    gold: nonNeg(raw.gold),
    gems: Math.floor(nonNeg(raw.gems)),
    inventory,
    potential,
    tower: { bestFloor: Math.floor(nonNeg(tw.bestFloor)), runs: Math.floor(nonNeg(tw.runs)) },
    artifacts,
    companions: { owned, equipped: compEquipped },
    missions: { date: typeof mi.date === 'string' ? mi.date : todayKey(now), progress: mProgress, claimed: mClaimed, bonusClaimed: bool(mi.bonusClaimed, false) },
    attendance: { lastClaim: typeof at.lastClaim === 'string' ? at.lastClaim : '', day: Math.floor(nonNeg(at.day)), total: Math.floor(nonNeg(at.total)) },
    raid: { bestDamage: nonNeg(rd.bestDamage), runs: Math.floor(nonNeg(rd.runs)) },
    arena: { rating: Math.floor(num(ar.rating, 1000, 0, 1e9)), wins: Math.floor(nonNeg(ar.wins)), losses: Math.floor(nonNeg(ar.losses)) },
    pity: { sinceHero: Math.floor(nonNeg(pity.sinceHero)), sinceLegend: Math.floor(nonNeg(pity.sinceLegend)), pulls: Math.floor(nonNeg(pity.pulls)), seed: Math.floor(num(pity.seed, d.pity.seed, 1, 4294967295)) },
    progress: {
      stage,
      maxStage,
      bossMode: bool(p.bossMode, false) && stage % 10 === 0,
      bossFails: Math.floor(nonNeg(p.bossFails)),
      farmStage: typeof p.farmStage === 'number' && Number.isFinite(p.farmStage) ? Math.max(1, Math.floor(p.farmStage)) : null,
      kills: Math.floor(nonNeg(p.kills)),
      bossKills: Math.floor(nonNeg(p.bossKills)),
      firstClears: Array.isArray(p.firstClears) ? p.firstClears.filter((x): x is number => typeof x === 'number').slice(0, 1000) : [],
      milestones: Array.isArray(p.milestones) ? p.milestones.filter((x): x is number => typeof x === 'number').slice(0, 1000) : [],
    },
    daily: { date: typeof dl.date === 'string' ? dl.date : todayKey(now), goldTickets: Math.floor(num(dl.goldTickets, 3, 0, DUNGEON.gold.tickets)), gemTickets: Math.floor(num(dl.gemTickets, 1, 0, DUNGEON.gem.tickets)), towerTickets: Math.floor(num(dl.towerTickets, TOWER.tickets, 0, TOWER.tickets)), raidTickets: Math.floor(num(dl.raidTickets, RAID.tickets, 0, RAID.tickets)), arenaTickets: Math.floor(num(dl.arenaTickets, ARENA.tickets, 0, ARENA.tickets)) },
    quest: { cycle: qCycle, index: qIndex, target: Math.max(1, num(q.target, questTarget(QUEST_ORDER[qIndex]!, qCycle, maxStage), 1, 1e300)), progress: nonNeg(q.progress) },
    achievements,
    codex,
    offline: { emaGold: nonNeg(off.emaGold), emaExp: nonNeg(off.emaExp) },
    stats: {
      totalGold: nonNeg(st.totalGold),
      totalKills: Math.floor(nonNeg(st.totalKills)),
      totalDamage: nonNeg(st.totalDamage),
      playtimeSec: nonNeg(st.playtimeSec),
      upgradesBought: Math.floor(nonNeg(st.upgradesBought)),
      gachaPulls: Math.floor(nonNeg(st.gachaPulls)),
      skillCasts: Math.floor(nonNeg(st.skillCasts)),
      bossAttempts: Math.floor(nonNeg(st.bossAttempts)),
      longestOfflineSec: nonNeg(st.longestOfflineSec),
      offlineReturns: Math.floor(nonNeg(st.offlineReturns)),
      taps: Math.floor(nonNeg(st.taps)),
      fusions: Math.floor(nonNeg(st.fusions)),
      cubes: Math.floor(nonNeg(st.cubes)),
      companionPulls: Math.floor(nonNeg(st.companionPulls)),
      sweeps: Math.floor(nonNeg(st.sweeps)),
    },
    settings: {
      sound: bool(se.sound, true),
      volume: num(se.volume, 0.6, 0, 1),
      numberFormat: se.numberFormat === 'scientific' ? 'scientific' : 'korean',
      autoBoss: bool(se.autoBoss, true),
      reducedMotion: bool(se.reducedMotion, false),
      buyAmount: se.buyAmount === 10 || se.buyAmount === 100 || se.buyAmount === 'max' ? se.buyAmount : 1,
      showDamage: bool(se.showDamage, true),
      autoUpgrade: bool(se.autoUpgrade, false),
      autoAdvance: bool(se.autoAdvance, true),
    },
    tutorialSeen: Array.isArray(raw.tutorialSeen) ? raw.tutorialSeen.filter((x): x is string => typeof x === 'string').slice(0, 64) : [],
  };
}

type Migration = (raw: AnyObj) => AnyObj;
const migrations: Record<number, Migration> = { 0: (raw) => ({ ...raw, version: 1 }) };

export function migrate(raw: unknown): AnyObj | null {
  if (!isObj(raw)) return null;
  let obj: AnyObj = raw;
  let v = typeof obj.version === 'number' ? obj.version : 0;
  while (v < SAVE_VERSION) {
    const m = migrations[v];
    if (!m) return null;
    obj = m(obj);
    v = typeof obj.version === 'number' ? obj.version : v + 1;
  }
  return obj;
}

export const serialize = (s: GameState): string => JSON.stringify(s);

export function deserialize(json: string, now = Date.now()): GameState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  const migrated = migrate(parsed);
  return migrated ? sanitize(migrated, now) : null;
}

function utf8ToBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return btoa(bin);
}
function base64ToUtf8(b64: string): string {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export const exportString = (s: GameState): string => EXPORT_PREFIX + utf8ToBase64(serialize(s));

export function importString(text: string, now = Date.now()): GameState | null {
  const t = text.trim();
  if (!t.startsWith(EXPORT_PREFIX)) return null;
  try {
    return deserialize(base64ToUtf8(t.slice(EXPORT_PREFIX.length)), now);
  } catch {
    return null;
  }
}

export interface LoadResult {
  state: GameState;
  fresh: boolean;
  corrupt: boolean;
}

export function loadState(storage: StorageLike | null, now = Date.now()): LoadResult {
  if (!storage) return { state: createInitialState(now), fresh: true, corrupt: false };
  let raw: string | null = null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return { state: createInitialState(now), fresh: true, corrupt: false };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { state: createInitialState(now), fresh: true, corrupt: true };
  }
  const fromVersion = isObj(parsed) && typeof parsed.version === 'number' ? parsed.version : 0;
  if (fromVersion < SAVE_VERSION) {
    try {
      storage.setItem(BACKUP_KEY_PREFIX + fromVersion, raw);
    } catch {
      /* ignore */
    }
  }
  const migrated = migrate(parsed);
  if (!migrated) return { state: createInitialState(now), fresh: true, corrupt: true };
  return { state: sanitize(migrated, now), fresh: false, corrupt: false };
}

export function saveState(storage: StorageLike | null, s: GameState, now = Date.now()): boolean {
  if (!storage) return false;
  s.lastSaved = now;
  try {
    storage.setItem(SAVE_KEY, serialize(s));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike | null): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}

export function getLocalStorage(): StorageLike | null {
  try {
    const ls = globalThis.localStorage;
    ls.setItem('__novice_probe__', '1');
    ls.removeItem('__novice_probe__');
    return ls;
  } catch {
    return null;
  }
}
