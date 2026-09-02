import { DUNGEON } from './balance';
import { monsterGold, monsterHp } from './monsters';
import type { HeroStats } from './stats';
import type { GameState } from './state';

export interface SweepResult {
  kind: 'gold' | 'gem';
  kills: number;
  gold: number;
  gems: number;
}

/** Estimates what a dungeon run would yield at the current DPS and grants 80% of it instantly. */
export function sweepEstimate(s: GameState, stats: HeroStats, kind: 'gold' | 'gem'): SweepResult {
  const n = Math.max(1, s.progress.maxStage);
  if (kind === 'gold') {
    const d = DUNGEON.gold;
    const hp = monsterHp(n) * d.hpMult;
    const killRate = Math.min(d.maxOnScreen / d.spawnInterval, stats.dps / Math.max(1, hp));
    const kills = Math.max(1, Math.floor(d.duration * killRate * 0.8));
    return { kind, kills, gold: kills * monsterGold(n) * stats.goldMult * d.goldMult, gems: 0 };
  }
  const d = DUNGEON.gem;
  const hp = monsterHp(n) * d.hpMult;
  const killRate = Math.min(d.maxOnScreen / d.spawnInterval, stats.dps / Math.max(1, hp));
  const kills = Math.max(1, Math.floor(d.duration * killRate * 0.8));
  return { kind, kills, gold: 0, gems: Math.min(d.gemCap, kills) * d.gemPerKill };
}

export function canSweep(s: GameState, kind: 'gold' | 'gem'): boolean {
  return kind === 'gold' ? s.daily.goldTickets > 0 : s.daily.gemTickets > 0;
}

export function sweep(s: GameState, stats: HeroStats, kind: 'gold' | 'gem'): SweepResult | null {
  if (!canSweep(s, kind)) return null;
  const r = sweepEstimate(s, stats, kind);
  if (kind === 'gold') s.daily.goldTickets--;
  else s.daily.gemTickets--;
  s.gold += r.gold;
  s.stats.totalGold += r.gold;
  s.gems += r.gems;
  s.stats.sweeps++;
  return r;
}
