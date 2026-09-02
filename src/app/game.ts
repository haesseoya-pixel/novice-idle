import { advanceJob, canAdvance, reclass } from '@/game/advance';
import { AUTOSAVE_INTERVAL, MAX_TICKS_PER_FRAME, OFFLINE, TICK, type Slot, type UpgradeId } from '@/game/balance';
import { attemptBoss, castSkill, createBattle, gainExp, selectStage, startArena, startDungeon, startRaid, startTower, tapAttack, type ArenaOpponent, type BattleEvent, type BattleState } from '@/game/battle';
import { equip, fuse, fuseAll, pull, starforce } from '@/game/equipment';
import { cube } from '@/game/potential';
import { unlockArtifact, upgradeArtifact, type ArtifactId } from '@/game/artifacts';
import { equipCompanion, summon, type CompanionId } from '@/game/companions';
import { claimAttendance, claimMission, type MissionId } from '@/game/missions';
import { sweep } from '@/game/sweep';
import { todayKey } from '@/game/state';
import { SKILL_BY_ID, type JobPath, type JobTier } from '@/game/jobs';
import { offlineReward } from '@/game/offline';
import { advanceQuest } from '@/game/quests';
import { upgradeSkill } from '@/game/skills';
import { computeStats, type HeroStats } from '@/game/stats';
import { createInitialState, type GameState, type ItemKey } from '@/game/state';
import { checkDaily, simulate, type GameEvent } from '@/game/tick';
import { affordableCount, autoUpgrade, buyUpgrade } from '@/game/upgrades';
import { advanceQuest as _aq } from '@/game/quests';
import { missionProgress } from '@/game/missions';
import { clearSave, exportString, getLocalStorage, importString, loadState, saveState, type StorageLike } from '@/util/save';
import { Emitter, type AppEvents } from './events';

type FrameFn = (dt: number, ts: number) => void;

/**
 * Owns the persistent state, the battle simulation and the frame loop.
 * Simulation runs at a fixed 20 Hz with Date.now() catch-up; long gaps become offline rewards.
 */
export class Game {
  state: GameState;
  battle: BattleState;
  stats: HeroStats;
  readonly events = new Emitter<AppEvents>();
  readonly storage: StorageLike | null;
  readonly storageOk: boolean;
  readonly loadedFresh: boolean;
  readonly loadCorrupt: boolean;

  private acc = 0;
  private saveTimer = 0;
  private autoTimer = 0;
  private frameFns: FrameFn[] = [];
  private lastFrameTs = 0;
  private running = false;
  private rafId = 0;

  constructor() {
    this.storage = getLocalStorage();
    this.storageOk = this.storage !== null;
    const loaded = loadState(this.storage);
    this.state = loaded.state;
    this.loadedFresh = loaded.fresh;
    this.loadCorrupt = loaded.corrupt;
    this.stats = computeStats(this.state);
    this.battle = createBattle(this.state, this.stats);
  }

  boot(): void {
    const now = Date.now();
    const gap = (now - this.state.lastTick) / 1000;
    checkDaily(this.state, now);
    if (gap > OFFLINE.minElapsed) this.applyOffline(gap, now);
    this.state.lastTick = now;
    this.stats = computeStats(this.state);
  }

  onFrame(fn: FrameFn): () => void {
    this.frameFns.push(fn);
    return () => {
      this.frameFns = this.frameFns.filter((f) => f !== fn);
    };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastFrameTs = performance.now();
    const loop = (ts: number) => {
      if (!this.running) return;
      this.frame(ts);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Advances the simulation by real elapsed time; exposed for tests/debug driving. */
  step(seconds: number): void {
    const ticks = Math.min(MAX_TICKS_PER_FRAME, Math.floor(seconds / TICK));
    const now = Date.now();
    for (let i = 0; i < ticks; i++) {
      this.stats = computeStats(this.state);
      const evs = simulate(this.state, this.battle, TICK, now, this.stats);
      if (evs.length) this.dispatch(evs);
    }
  }

  private frame(ts: number): void {
    const frameDt = Math.min(0.25, Math.max(0, (ts - this.lastFrameTs) / 1000));
    this.lastFrameTs = ts;
    const now = Date.now();
    const elapsed = (now - this.state.lastTick) / 1000;
    if (elapsed > OFFLINE.minElapsed) {
      this.applyOffline(elapsed, now);
      this.state.lastTick = now;
      this.acc = 0;
    } else if (elapsed > 0) {
      this.acc += elapsed;
      this.state.lastTick = now;
      let ticks = Math.floor(this.acc / TICK);
      if (ticks > MAX_TICKS_PER_FRAME) ticks = MAX_TICKS_PER_FRAME;
      if (ticks > 0) {
        this.acc -= ticks * TICK;
        for (let i = 0; i < ticks; i++) {
          this.stats = computeStats(this.state);
          const evs = simulate(this.state, this.battle, TICK, now, this.stats);
          if (evs.length) this.dispatch(evs);
        }
      }
    } else if (elapsed < 0) {
      this.state.lastTick = now;
    }
    this.stats = computeStats(this.state);
    this.events.emit('tick', { stats: this.stats, dt: frameDt });
    this.autoTimer += frameDt;
    if (this.autoTimer >= 1) {
      this.autoTimer = 0;
      if (this.state.settings.autoUpgrade) {
        const n = autoUpgrade(this.state);
        if (n > 0) {
          _aq(this.state, 'upgrades', n);
          missionProgress(this.state, 'upgrades', n);
          this.stats = computeStats(this.state);
          this.events.emit('autoBuy', { count: n });
        }
      }
    }
    this.saveTimer += frameDt;
    if (this.saveTimer >= AUTOSAVE_INTERVAL) {
      this.saveTimer = 0;
      this.save();
    }
    for (const fn of this.frameFns) fn(frameDt, ts);
  }

  private dispatch(evs: GameEvent[]): void {
    for (const e of evs) this.events.emit('game', e);
  }

  private applyOffline(elapsed: number, now: number): void {
    const report = offlineReward(this.state, elapsed);
    const evs: BattleEvent[] = [];
    if (report.gold > 0) {
      this.state.gold += report.gold;
      this.state.stats.totalGold += report.gold;
    }
    if (report.exp > 0) gainExp(this.state, report.exp, evs);
    this.state.stats.offlineReturns += 1;
    if (report.elapsed > this.state.stats.longestOfflineSec) this.state.stats.longestOfflineSec = report.elapsed;
    checkDaily(this.state, now);
    this.stats = computeStats(this.state);
    this.events.emit('offline', report);
    this.dispatch(evs);
  }

  // ---- actions -------------------------------------------------------------

  tap(): boolean {
    const evs: BattleEvent[] = [];
    const ok = tapAttack(this.state, this.battle, this.stats, evs);
    if (evs.length) this.dispatch(evs);
    return ok;
  }

  buy(id: UpgradeId): number {
    const count = affordableCount(this.state, id, this.state.settings.buyAmount);
    if (count <= 0) {
      this.events.emit('cannotAfford', { id });
      return 0;
    }
    const bought = buyUpgrade(this.state, id, count);
    if (bought > 0) {
      advanceQuest(this.state, 'upgrades', bought);
      missionProgress(this.state, 'upgrades', bought);
      this.stats = computeStats(this.state);
      this.events.emit('purchase', { kind: 'upgrade', id, count: bought });
    }
    return bought;
  }

  upgradeSkill(id: string): boolean {
    const ok = upgradeSkill(this.state, id);
    if (!ok) {
      this.events.emit('cannotAfford', { id });
      return false;
    }
    this.events.emit('purchase', { kind: 'skill', id, count: 1 });
    return true;
  }

  gacha(count: 1 | 10): boolean {
    const results = pull(this.state, count);
    if (!results) {
      this.events.emit('cannotAfford', { id: 'gacha' });
      return false;
    }
    this.stats = computeStats(this.state);
    this.events.emit('gacha', { results });
    return true;
  }

  starforce(slot: Slot): boolean {
    const ok = starforce(this.state, slot);
    if (!ok) {
      this.events.emit('cannotAfford', { id: `star_${slot}` });
      return false;
    }
    this.stats = computeStats(this.state);
    this.events.emit('purchase', { kind: 'starforce', id: slot, count: 1 });
    return true;
  }

  fuse(key: ItemKey): boolean {
    const next = fuse(this.state, key);
    if (!next) return false;
    this.stats = computeStats(this.state);
    this.events.emit('purchase', { kind: 'fuse', id: next, count: 1 });
    return true;
  }

  fuseAll(): number {
    const n = fuseAll(this.state);
    if (n > 0) {
      this.stats = computeStats(this.state);
      this.events.emit('purchase', { kind: 'fuse', id: 'all', count: n });
    }
    return n;
  }

  cube(slot: Slot): boolean {
    const r = cube(this.state, slot);
    if (!r) {
      this.events.emit('cannotAfford', { id: `cube_${slot}` });
      return false;
    }
    this.stats = computeStats(this.state);
    this.events.emit('cube', { slot, potential: r.potential, upgraded: r.upgraded });
    return true;
  }

  unlockArtifact(id: ArtifactId): boolean {
    const ok = unlockArtifact(this.state, id);
    if (!ok) this.events.emit('cannotAfford', { id });
    else {
      this.stats = computeStats(this.state);
      this.events.emit('purchase', { kind: 'artifact', id, count: 1 });
    }
    return ok;
  }

  upgradeArtifact(id: ArtifactId): boolean {
    const ok = upgradeArtifact(this.state, id);
    if (!ok) this.events.emit('cannotAfford', { id });
    else {
      this.stats = computeStats(this.state);
      this.events.emit('purchase', { kind: 'artifact', id, count: 1 });
    }
    return ok;
  }

  summonCompanion(count: 1 | 10): boolean {
    const results = summon(this.state, count);
    if (!results) {
      this.events.emit('cannotAfford', { id: 'companion' });
      return false;
    }
    this.stats = computeStats(this.state);
    this.events.emit('summon', { results });
    return true;
  }

  equipCompanion(id: CompanionId, slot: number): boolean {
    const ok = equipCompanion(this.state, id, slot);
    if (ok) this.stats = computeStats(this.state);
    return ok;
  }

  claimMission(id: MissionId): number {
    const gems = claimMission(this.state, id);
    if (gems > 0) this.events.emit('reward', { source: 'mission', gems });
    return gems;
  }

  claimAttendance(): number {
    const gems = claimAttendance(this.state, todayKey());
    if (gems > 0) {
      this.events.emit('reward', { source: 'attendance', gems });
      this.save();
    }
    return gems;
  }

  sweep(kind: 'gold' | 'gem'): boolean {
    const r = sweep(this.state, this.stats, kind);
    if (!r) return false;
    missionProgress(this.state, 'dungeon', 1);
    this.events.emit('sweep', r);
    return true;
  }

  enterRaid(): boolean {
    const ok = startRaid(this.state, this.battle, this.stats);
    if (ok) this.events.emit('dungeonStart', { kind: 'raid' });
    return ok;
  }

  enterArena(opp: ArenaOpponent): boolean {
    const ok = startArena(this.state, this.battle, this.stats, opp);
    if (ok) this.events.emit('dungeonStart', { kind: 'arena' });
    return ok;
  }

  enterTower(): boolean {
    const ok = startTower(this.state, this.battle, this.stats);
    if (ok) this.events.emit('dungeonStart', { kind: 'tower' });
    return ok;
  }

  equip(key: ItemKey): boolean {
    const ok = equip(this.state, key);
    if (ok) this.stats = computeStats(this.state);
    return ok;
  }

  canAdvance(): boolean {
    return canAdvance(this.state);
  }

  advance(path?: JobPath): JobTier | null {
    const tier = advanceJob(this.state, path);
    if (tier === null) return null;
    this.stats = computeStats(this.state);
    this.battle.heroHp = this.stats.hp;
    this.events.emit('jobAdvance', { tier, path: this.state.hero.job! });
    this.save();
    return tier;
  }

  reclass(path: JobPath): boolean {
    const ok = reclass(this.state, path);
    if (!ok) return false;
    this.stats = computeStats(this.state);
    this.events.emit('jobAdvance', { tier: this.state.hero.tier, path });
    this.save();
    return true;
  }

  cast(id: string): boolean {
    const def = SKILL_BY_ID[id];
    if (!def) return false;
    const evs: BattleEvent[] = [];
    const ok = castSkill(this.state, this.battle, this.stats, def, evs);
    if (evs.length) this.dispatch(evs);
    return ok;
  }

  selectStage(n: number): boolean {
    const ok = selectStage(this.state, this.battle, n);
    if (ok) this.save();
    return ok;
  }

  challengeBoss(): boolean {
    return attemptBoss(this.state, this.battle);
  }

  enterDungeon(kind: 'gold' | 'gem'): boolean {
    const ok = startDungeon(this.state, this.battle, this.stats, kind);
    if (ok) this.events.emit('dungeonStart', { kind });
    return ok;
  }

  setSetting<K extends keyof GameState['settings']>(key: K, value: GameState['settings'][K]): void {
    this.state.settings[key] = value;
    this.events.emit('settings', { key });
    this.save();
  }

  markTutorial(id: string): void {
    if (!this.state.tutorialSeen.includes(id)) this.state.tutorialSeen.push(id);
  }

  // ---- persistence ---------------------------------------------------------

  save(): boolean {
    const ok = saveState(this.storage, this.state);
    this.events.emit('saved', { ok });
    return ok;
  }

  exportSave(): string {
    return exportString(this.state);
  }

  importSave(text: string): boolean {
    const s = importString(text);
    if (!s) return false;
    this.replaceState(s, 'import');
    return true;
  }

  hardReset(): void {
    clearSave(this.storage);
    this.replaceState(createInitialState(), 'reset');
  }

  private replaceState(s: GameState, reason: 'import' | 'reset'): void {
    this.state = s;
    this.acc = 0;
    this.stats = computeStats(s);
    this.battle = createBattle(s, this.stats);
    this.boot();
    this.save();
    this.events.emit('replaced', { reason });
  }
}
