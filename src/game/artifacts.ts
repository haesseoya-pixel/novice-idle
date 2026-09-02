import { MONSTER } from './balance';
import { monsterGold } from './monsters';
import type { GameState } from './state';

export type ArtifactId = 'compass' | 'crest' | 'lifegem' | 'hourglass' | 'luckycoin' | 'scroll';
export type ArtifactEffect = 'goldPct' | 'atkPct' | 'hpPct' | 'cooldown' | 'critDmg' | 'expPct';

export interface ArtifactDef {
  id: ArtifactId;
  name: string;
  icon: string;
  desc: string;
  effect: ArtifactEffect;
  per: number;
  max: number;
  unlockGems: number;
  format: (v: number) => string;
}

export const ARTIFACTS: readonly ArtifactDef[] = [
  { id: 'compass', name: '황금 나침반', icon: '🧭', desc: '처치 골드 증가', effect: 'goldPct', per: 0.06, max: 50, unlockGems: 30, format: (v) => `골드 +${(v * 100).toFixed(0)}%` },
  { id: 'crest', name: '용사의 문장', icon: '🛡️', desc: '공격력 증가', effect: 'atkPct', per: 0.04, max: 50, unlockGems: 40, format: (v) => `공격력 +${(v * 100).toFixed(0)}%` },
  { id: 'lifegem', name: '생명의 보석', icon: '💎', desc: '최대 체력 증가', effect: 'hpPct', per: 0.05, max: 50, unlockGems: 40, format: (v) => `체력 +${(v * 100).toFixed(0)}%` },
  { id: 'hourglass', name: '시간의 모래', icon: '⏳', desc: '스킬 쿨타임 감소', effect: 'cooldown', per: 0.01, max: 40, unlockGems: 60, format: (v) => `쿨타임 -${(v * 100).toFixed(0)}%` },
  { id: 'luckycoin', name: '행운의 동전', icon: '🪙', desc: '치명타 피해 증가', effect: 'critDmg', per: 0.04, max: 50, unlockGems: 50, format: (v) => `치명타 피해 +${(v * 100).toFixed(0)}%` },
  { id: 'scroll', name: '현자의 두루마리', icon: '📜', desc: '경험치 획득 증가', effect: 'expPct', per: 0.06, max: 50, unlockGems: 30, format: (v) => `경험치 +${(v * 100).toFixed(0)}%` },
];
export const ARTIFACT_BY_ID: Record<ArtifactId, ArtifactDef> = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a])) as Record<ArtifactId, ArtifactDef>;

/** Level -1 = locked, 0 = owned at base, n = upgraded n times. Effect value uses (level + 1). */
export function artifactLevel(s: GameState, id: ArtifactId): number {
  return s.artifacts[id] ?? -1;
}

export function artifactValue(s: GameState, id: ArtifactId): number {
  const lv = artifactLevel(s, id);
  if (lv < 0) return 0;
  return ARTIFACT_BY_ID[id].per * (lv + 1);
}

export function upgradeCost(s: GameState, id: ArtifactId): number {
  const n = Math.max(1, s.progress.maxStage);
  const base = monsterGold(n) * MONSTER.waveSize(n) * 6;
  return base * Math.pow(1.22, artifactLevel(s, id));
}

export function canUnlock(s: GameState, id: ArtifactId): boolean {
  return artifactLevel(s, id) < 0 && s.gems >= ARTIFACT_BY_ID[id].unlockGems;
}

export function unlockArtifact(s: GameState, id: ArtifactId): boolean {
  if (!canUnlock(s, id)) return false;
  s.gems -= ARTIFACT_BY_ID[id].unlockGems;
  s.artifacts[id] = 0;
  return true;
}

export function canUpgrade(s: GameState, id: ArtifactId): boolean {
  const lv = artifactLevel(s, id);
  return lv >= 0 && lv < ARTIFACT_BY_ID[id].max && s.gold >= upgradeCost(s, id);
}

export function upgradeArtifact(s: GameState, id: ArtifactId): boolean {
  if (!canUpgrade(s, id)) return false;
  s.gold -= upgradeCost(s, id);
  s.artifacts[id] = artifactLevel(s, id) + 1;
  return true;
}

export function artifactTotals(s: GameState): Record<ArtifactEffect, number> {
  const t: Record<ArtifactEffect, number> = { goldPct: 0, atkPct: 0, hpPct: 0, cooldown: 0, critDmg: 0, expPct: 0 };
  for (const a of ARTIFACTS) t[a.effect] += artifactValue(s, a.id);
  t.cooldown = Math.min(0.4, t.cooldown);
  return t;
}
