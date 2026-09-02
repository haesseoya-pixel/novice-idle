import { describe, expect, it } from 'vitest';
import { SAVE_KEY } from '@/game/balance';
import { createInitialState } from '@/game/state';
import { deserialize, exportString, importString, loadState, sanitize, saveState, serialize, type StorageLike } from '@/util/save';

class Mem implements StorageLike {
  m = new Map<string, string>();
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, v);
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
}

function rich() {
  const s = createInitialState(1000);
  s.gold = 12345.5;
  s.gems = 77;
  s.hero.level = 35;
  s.hero.job = 'archer';
  s.hero.tier = 2;
  s.hero.upgrades.atk = 40;
  s.hero.skills = { novice_strike: 3, a_double: 5, a_rain: 1 };
  s.inventory = { weapon_2: 4, pet_4: 1 };
  s.hero.equipped.weapon = 'weapon_2';
  s.hero.equipped.pet = 'pet_4';
  s.hero.stars.weapon = 3;
  s.progress = { stage: 21, maxStage: 22, bossMode: false, bossFails: 2, farmStage: null, kills: 500, bossKills: 2, firstClears: [10, 20], milestones: [10, 20] };
  s.quest = { cycle: 1, index: 2, target: 4, progress: 1 };
  s.achievements.firstKill = 5;
  s.codex.fluff = 12;
  s.offline = { emaGold: 3.2, emaExp: 1.1 };
  return s;
}

describe('save', () => {
  it('roundtrips', () => {
    const s = rich();
    expect(deserialize(serialize(s), 1000)).toEqual(s);
    const text = exportString(s);
    expect(text.startsWith('NOVICE1:')).toBe(true);
    expect(importString(text, 1000)).toEqual(s);
    expect(importString('nope', 1000)).toBeNull();
  });
  it('sanitizes garbage', () => {
    const s = sanitize({ hero: { level: -3, job: 'ninja', tier: 9, upgrades: { atk: 99999, bogus: 1 }, equipped: { weapon: 'weapon_9' } }, inventory: { weapon_9: 3, 'armor_1': 'x', pet_2: 2 }, progress: { stage: 500, maxStage: 20 }, gold: 'a', gems: -5 }, 7);
    expect(s.hero.level).toBe(1);
    expect(s.hero.job).toBeNull();
    expect(s.hero.tier).toBe(0);
    expect(s.hero.upgrades.atk).toBe(3000);
    expect(s.inventory.pet_2).toBe(2);
    expect((s.inventory as Record<string, unknown>).weapon_9).toBeUndefined();
    expect(s.hero.equipped.weapon).toBeNull();
    expect(s.progress.stage).toBe(20);
    expect(s.gold).toBe(0);
    expect(s.gems).toBe(0);
    expect(sanitize(null).version).toBe(1);
  });
  it('load/save through storage', () => {
    const st = new Mem();
    expect(loadState(st).fresh).toBe(true);
    st.setItem(SAVE_KEY, '{broken');
    expect(loadState(st).corrupt).toBe(true);
    const s = rich();
    expect(saveState(st, s, 2000)).toBe(true);
    expect(loadState(st, 2000).state).toEqual(s);
  });
});
