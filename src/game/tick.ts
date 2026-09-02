import { evaluateAchievements } from './achievements';
import { battleTick, type BattleEvent, type BattleState } from './battle';
import { updateEma } from './offline';
import { claimQuest, questDone, type QuestReward } from './quests';
import { computeStats, type HeroStats } from './stats';
import { todayKey, type AchievementId, type GameState } from './state';
import { ARENA, DUNGEON, RAID, TOWER } from './balance';
import { resetMissions } from './missions';

export type GameEvent = BattleEvent | { type: 'questDone'; reward: QuestReward } | { type: 'achievement'; id: AchievementId } | { type: 'dailyReset' };

/** Resets dungeon tickets when the local date changes. Returns true if reset happened. */
export function checkDaily(s: GameState, now: number): boolean {
  const key = todayKey(now);
  if (s.daily.date === key) return false;
  s.daily = { date: key, goldTickets: DUNGEON.gold.tickets, gemTickets: DUNGEON.gem.tickets, towerTickets: TOWER.tickets, raidTickets: RAID.tickets, arenaTickets: ARENA.tickets };
  if (s.missions.date !== key) resetMissions(s, key);
  return true;
}

let achAcc = 0;

/** One simulation step (dt seconds). */
export function simulate(s: GameState, b: BattleState, dt: number, now: number, stats: HeroStats = computeStats(s)): GameEvent[] {
  const events: GameEvent[] = [];
  if (checkDaily(s, now)) events.push({ type: 'dailyReset' });
  const gold0 = s.gold;
  const exp0 = s.hero.exp;
  const lvl0 = s.hero.level;
  for (const e of battleTick(s, b, stats, dt)) events.push(e);
  // EMA income sampling (stage mode only, exclude purchases which never happen inside a tick)
  if (b.mode === 'stage') {
    const goldGain = Math.max(0, s.gold - gold0);
    const expGain = lvl0 === s.hero.level ? Math.max(0, s.hero.exp - exp0) : Math.max(0, s.hero.exp);
    updateEma(s, goldGain, expGain, dt);
  }
  s.stats.playtimeSec += dt;
  if (questDone(s)) {
    const reward = claimQuest(s);
    if (reward) events.push({ type: 'questDone', reward });
  }
  achAcc += dt;
  if (achAcc >= 1) {
    achAcc = 0;
    for (const id of evaluateAchievements(s, now)) events.push({ type: 'achievement', id });
  }
  return events;
}
