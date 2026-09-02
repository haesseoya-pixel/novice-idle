import type { AchievementId, GameState } from './state';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  description: string;
  gems: number;
  check: (s: GameState) => boolean;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  { id: 'firstKill', name: '첫 처치', description: '몬스터를 처음 쓰러뜨렸다.', gems: 5, check: (s) => s.stats.totalKills >= 1 },
  { id: 'kills100', name: '사냥 입문', description: '몬스터 100마리 처치.', gems: 10, check: (s) => s.stats.totalKills >= 100 },
  { id: 'kills1k', name: '사냥꾼', description: '몬스터 1,000마리 처치.', gems: 20, check: (s) => s.stats.totalKills >= 1000 },
  { id: 'kills10k', name: '학살자', description: '몬스터 10,000마리 처치.', gems: 40, check: (s) => s.stats.totalKills >= 10000 },
  { id: 'stage10', name: '초원 정복', description: '10스테이지 돌파.', gems: 10, check: (s) => s.progress.maxStage > 10 },
  { id: 'stage25', name: '모험가', description: '25스테이지 도달.', gems: 15, check: (s) => s.progress.maxStage >= 25 },
  { id: 'stage50', name: '베테랑', description: '50스테이지 도달.', gems: 30, check: (s) => s.progress.maxStage >= 50 },
  { id: 'stage100', name: '대륙 일주', description: '100스테이지 도달.', gems: 60, check: (s) => s.progress.maxStage >= 100 },
  { id: 'stage200', name: '전설의 모험가', description: '200스테이지 도달.', gems: 120, check: (s) => s.progress.maxStage >= 200 },
  { id: 'level10', name: '전직 자격', description: '레벨 10 달성.', gems: 10, check: (s) => s.hero.level >= 10 },
  { id: 'level30', name: '숙련자', description: '레벨 30 달성.', gems: 20, check: (s) => s.hero.level >= 30 },
  { id: 'upgrades100', name: '강화광', description: '강화 100회 구매.', gems: 10, check: (s) => s.stats.upgradesBought >= 100 },
  { id: 'job1', name: '초보 탈출', description: '1차 전직 완료.', gems: 30, check: (s) => s.hero.tier >= 1 },
  { id: 'job4', name: '정점', description: '4차 전직 완료.', gems: 60, check: (s) => s.hero.tier >= 4 },
  { id: 'gacha10', name: '장비 수집가', description: '장비 뽑기 10회.', gems: 10, check: (s) => s.stats.gachaPulls >= 10 },
  { id: 'boss10', name: '보스 헌터', description: '보스 10회 처치.', gems: 15, check: (s) => s.progress.bossKills >= 10 },
];

export const ACHIEVEMENT_BY_ID: Record<AchievementId, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a])) as Record<AchievementId, AchievementDef>;

/** Unlocks newly satisfied achievements, grants gems, returns ids. */
export function evaluateAchievements(s: GameState, now: number): AchievementId[] {
  const out: AchievementId[] = [];
  for (const a of ACHIEVEMENTS) {
    if (s.achievements[a.id] !== undefined) continue;
    if (a.check(s)) {
      s.achievements[a.id] = now;
      s.gems += a.gems;
      out.push(a.id);
    }
  }
  return out;
}
