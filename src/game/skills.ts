import { SKILL_LEVEL_BONUS, SKILL_MAX_LEVEL, skillCost } from './balance';
import { availableSkills, SKILL_BY_ID, type SkillDef } from './jobs';
import type { GameState } from './state';

export function skillLevel(s: GameState, id: string): number {
  return s.hero.skills[id] ?? 0;
}

export function skillMultiplier(level: number): number {
  return 1 + SKILL_LEVEL_BONUS * (Math.max(1, level) - 1);
}

export function unlockedSkills(s: GameState): SkillDef[] {
  const list = availableSkills(s.hero.job, s.hero.tier);
  for (const sk of list) if (!s.hero.skills[sk.id]) s.hero.skills[sk.id] = 1;
  return list;
}

export function skillUpgradeCost(id: string, level: number): number {
  const def = SKILL_BY_ID[id];
  if (!def) return Infinity;
  return skillCost(def.costK, level);
}

export function canUpgradeSkill(s: GameState, id: string): boolean {
  const lv = skillLevel(s, id);
  return lv >= 1 && lv < SKILL_MAX_LEVEL && s.gold >= skillUpgradeCost(id, lv);
}

export function upgradeSkill(s: GameState, id: string): boolean {
  if (!canUpgradeSkill(s, id)) return false;
  const lv = skillLevel(s, id);
  s.gold -= skillUpgradeCost(id, lv);
  s.hero.skills[id] = lv + 1;
  return true;
}
