import { GEMS, JOB_LEVELS } from './balance';
import { JOBS, JOB_PATHS, type JobPath, type JobTier } from './jobs';
import { unlockedSkills } from './skills';
import type { GameState } from './state';

export function nextTierOf(s: GameState): JobTier | null {
  return s.hero.tier >= 4 ? null : ((s.hero.tier + 1) as JobTier);
}

export function canAdvance(s: GameState): boolean {
  const t = nextTierOf(s);
  if (t === null) return false;
  return s.hero.level >= JOB_LEVELS[t];
}

/** 1차 전직 requires choosing a path; later tiers keep the path. */
export function advanceJob(s: GameState, path?: JobPath): JobTier | null {
  if (!canAdvance(s)) return null;
  const t = nextTierOf(s)!;
  if (t === 1) {
    if (!path || !JOB_PATHS.includes(path)) return null;
    s.hero.job = path;
  }
  if (!s.hero.job) return null;
  s.hero.tier = t;
  unlockedSkills(s);
  return t;
}

export function canReclass(s: GameState): boolean {
  return s.hero.tier >= 1 && s.gems >= GEMS.reclassCost;
}

/** Switches to another path at the same tier; skill levels for the old path are kept in the record but the new path starts at level 1. */
export function reclass(s: GameState, path: JobPath): boolean {
  if (!canReclass(s) || !JOB_PATHS.includes(path) || path === s.hero.job) return false;
  s.gems -= GEMS.reclassCost;
  s.hero.job = path;
  unlockedSkills(s);
  return true;
}

export function jobInfo(path: JobPath) {
  return JOBS[path];
}
