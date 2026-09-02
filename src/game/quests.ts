import { GEMS, MONSTER } from './balance';
import { monsterGold } from './monsters';
import type { GameState, QuestType } from './state';

export const QUEST_ORDER: readonly QuestType[] = ['kills', 'upgrades', 'bossAttempts', 'skills', 'gold'];

export const QUEST_NAMES: Record<QuestType, string> = {
  kills: '몬스터 처치',
  upgrades: '강화 구매',
  bossAttempts: '보스 도전',
  skills: '스킬 사용',
  gold: '골드 획득',
};

export function questTarget(type: QuestType, cycle: number, maxStage: number): number {
  switch (type) {
    case 'kills':
      return Math.round(30 * Math.pow(1.35, cycle));
    case 'upgrades':
      return Math.round(15 * Math.pow(1.3, cycle));
    case 'bossAttempts':
      return Math.round(3 * Math.pow(1.25, cycle));
    case 'skills':
      return Math.round(20 * Math.pow(1.35, cycle));
    case 'gold':
      return Math.round(40 * MONSTER.waveSize(maxStage) * monsterGold(maxStage) * (1 + 0.1 * cycle));
  }
}

export function questType(s: GameState): QuestType {
  return QUEST_ORDER[s.quest.index % QUEST_ORDER.length]!;
}

export function questGoldReward(s: GameState): number {
  const n = Math.max(1, s.progress.maxStage);
  return 5 * MONSTER.waveSize(n) * monsterGold(n);
}

export function advanceQuest(s: GameState, type: QuestType, amount: number): void {
  if (questType(s) !== type) return;
  s.quest.progress += amount;
}

export function questDone(s: GameState): boolean {
  return s.quest.progress >= s.quest.target;
}

export interface QuestReward {
  gems: number;
  gold: number;
  type: QuestType;
  target: number;
}

/** Claims the current quest if complete and starts the next one. */
export function claimQuest(s: GameState): QuestReward | null {
  if (!questDone(s)) return null;
  const type = questType(s);
  const gems = GEMS.questReward(s.quest.cycle);
  const gold = questGoldReward(s);
  s.gems += gems;
  s.gold += gold;
  s.stats.totalGold += gold;
  const reward: QuestReward = { gems, gold, type, target: s.quest.target };
  const nextIndex = s.quest.index + 1;
  const cycle = s.quest.cycle + (nextIndex % QUEST_ORDER.length === 0 ? 1 : 0);
  s.quest = { cycle, index: nextIndex % QUEST_ORDER.length, target: questTarget(QUEST_ORDER[nextIndex % QUEST_ORDER.length]!, cycle, s.progress.maxStage), progress: 0 };
  return reward;
}
