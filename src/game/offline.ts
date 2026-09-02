import { OFFLINE } from './balance';
import { offlineCapSec, type GameState } from './state';
import { clamp } from '@/util/math';

export interface OfflineReport {
  elapsed: number;
  requested: number;
  capped: boolean;
  gold: number;
  exp: number;
}

/** Update exponential moving averages of gold/exp income (per second). */
export function updateEma(s: GameState, goldGained: number, expGained: number, dt: number): void {
  if (dt <= 0) return;
  const k = 1 - Math.exp(-dt / OFFLINE.tau);
  s.offline.emaGold += (goldGained / dt - s.offline.emaGold) * k;
  s.offline.emaExp += (expGained / dt - s.offline.emaExp) * k;
  if (!Number.isFinite(s.offline.emaGold)) s.offline.emaGold = 0;
  if (!Number.isFinite(s.offline.emaExp)) s.offline.emaExp = 0;
}

export function offlineReward(s: GameState, requestedSec: number): OfflineReport {
  const cap = offlineCapSec(s);
  const req = clamp(Number.isFinite(requestedSec) ? requestedSec : 0, 0, OFFLINE.maxElapsedDays * 86400);
  const elapsed = Math.min(req, cap);
  const gold = s.offline.emaGold * elapsed * OFFLINE.efficiency;
  const exp = s.offline.emaExp * elapsed * OFFLINE.efficiency;
  return { elapsed, requested: req, capped: req > cap, gold, exp };
}
