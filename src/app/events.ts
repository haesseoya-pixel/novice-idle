import type { PullResult } from '@/game/equipment';
import type { JobTier } from '@/game/jobs';
import type { OfflineReport } from '@/game/offline';
import type { HeroStats } from '@/game/stats';
import type { GameState } from '@/game/state';
import type { GameEvent } from '@/game/tick';
import type { Slot } from '@/game/balance';
import type { SlotPotential } from '@/game/potential';
import type { CompanionPull } from '@/game/companions';
import type { SweepResult } from '@/game/sweep';

export type AppEvents = {
  tick: { stats: HeroStats; dt: number };
  game: GameEvent;
  purchase: { kind: 'upgrade' | 'skill' | 'starforce' | 'fuse' | 'artifact'; id: string; count: number };
  autoBuy: { count: number };
  summon: { results: CompanionPull[] };
  reward: { source: 'mission' | 'attendance'; gems: number };
  sweep: SweepResult;
  cube: { slot: Slot; potential: SlotPotential; upgraded: boolean };
  cannotAfford: { id: string };
  gacha: { results: PullResult[] };
  jobAdvance: { tier: JobTier; path: NonNullable<GameState['hero']['job']> };
  offline: OfflineReport;
  replaced: { reason: 'import' | 'reset' };
  settings: { key: keyof GameState['settings'] };
  saved: { ok: boolean };
  dungeonStart: { kind: 'gold' | 'gem' | 'tower' | 'raid' | 'arena' };
};

type Handler<T> = (payload: T) => void;

export class Emitter<E extends Record<string, unknown>> {
  private handlers: { [K in keyof E]?: Set<Handler<E[K]>> } = {};

  on<K extends keyof E>(key: K, fn: Handler<E[K]>): () => void {
    let set = this.handlers[key];
    if (!set) {
      set = new Set();
      this.handlers[key] = set;
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  emit<K extends keyof E>(key: K, payload: E[K]): void {
    const set = this.handlers[key];
    if (!set) return;
    for (const fn of set) {
      try {
        fn(payload);
      } catch (err) {
        console.error(`[events] handler for ${String(key)} failed`, err);
      }
    }
  }
}
