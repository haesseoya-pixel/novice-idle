import type { GameState } from './state';

export type MissionId = 'kills' | 'upgrades' | 'dungeon' | 'skills' | 'boss' | 'gacha';
export interface MissionDef {
  id: MissionId;
  name: string;
  target: number;
  gems: number;
}
export const MISSIONS: readonly MissionDef[] = [
  { id: 'kills', name: '몬스터 200마리 처치', target: 200, gems: 5 },
  { id: 'upgrades', name: '강화 30회', target: 30, gems: 5 },
  { id: 'skills', name: '스킬 60회 사용', target: 60, gems: 5 },
  { id: 'boss', name: '보스 도전 3회', target: 3, gems: 5 },
  { id: 'dungeon', name: '던전·탑 1회 입장', target: 1, gems: 8 },
  { id: 'gacha', name: '장비 뽑기 1회', target: 1, gems: 5 },
];
export const MISSION_ALL_BONUS = 20;
export const ATTENDANCE_REWARDS = [10, 10, 20, 20, 30, 30, 80] as const;

export function missionProgress(s: GameState, id: MissionId, amount: number): void {
  s.missions.progress[id] = (s.missions.progress[id] ?? 0) + amount;
}

export function missionDone(s: GameState, id: MissionId): boolean {
  const def = MISSIONS.find((m) => m.id === id)!;
  return (s.missions.progress[id] ?? 0) >= def.target;
}

export function missionClaimed(s: GameState, id: MissionId): boolean {
  return s.missions.claimed.includes(id);
}

export function claimMission(s: GameState, id: MissionId): number {
  if (!missionDone(s, id) || missionClaimed(s, id)) return 0;
  const def = MISSIONS.find((m) => m.id === id)!;
  s.missions.claimed.push(id);
  s.gems += def.gems;
  let total = def.gems;
  if (MISSIONS.every((m) => s.missions.claimed.includes(m.id)) && !s.missions.bonusClaimed) {
    s.missions.bonusClaimed = true;
    s.gems += MISSION_ALL_BONUS;
    total += MISSION_ALL_BONUS;
  }
  return total;
}

export function resetMissions(s: GameState, date: string): void {
  s.missions = { date, progress: {}, claimed: [], bonusClaimed: false };
}

export function attendanceAvailable(s: GameState, date: string): boolean {
  return s.attendance.lastClaim !== date;
}

/** Claims today's attendance reward; the day index cycles through the 7-day table. */
export function claimAttendance(s: GameState, date: string): number {
  if (!attendanceAvailable(s, date)) return 0;
  const day = s.attendance.day % ATTENDANCE_REWARDS.length;
  const gems = ATTENDANCE_REWARDS[day]!;
  s.gems += gems;
  s.attendance = { lastClaim: date, day: day + 1, total: s.attendance.total + 1 };
  return gems;
}
