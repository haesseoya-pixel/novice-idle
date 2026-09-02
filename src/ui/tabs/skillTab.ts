import type { Game } from '@/app/game';
import { JOB_LEVELS } from '@/game/balance';
import { JOBS, type SkillDef } from '@/game/jobs';
import { skillLevel, skillMultiplier, skillUpgradeCost, unlockedSkills } from '@/game/skills';
import { h, N, setText, toggleClass } from '../dom';
import type { TabView } from './growthTab';

export function createSkillTab(game: Game): TabView {
  const list = h('div', { class: 'rows' });
  const locked = h('div', { class: 'rows', style: 'opacity:0.7' });
  const rows = new Map<string, { root: HTMLElement; lv: HTMLElement; sub: HTMLElement; btn: HTMLButtonElement }>();
  let key = '';
  const el = h('div', {}, h('div', { class: 'section-title' }, h('span', { text: '스킬 (자동 시전)' })), list, h('div', { class: 'section-title' }, h('span', { text: '다음 전직에서 해금' })), locked, h('div', { class: 'muted small', style: 'margin-top:10px', text: '스킬은 쿨타임마다 자동으로 나갑니다. 화면 아래 아이콘을 눌러 즉시 시전할 수도 있습니다. 레벨당 피해 +15%.' }));

  function build(skills: SkillDef[]): void {
    list.replaceChildren();
    rows.clear();
    for (const sk of skills) {
      const lv = h('span', { class: 'row-lv' });
      const sub = h('div', { class: 'row-sub' });
      const btn = h('button', { class: 'buy', on: { click: () => game.upgradeSkill(sk.id) } }) as HTMLButtonElement;
      const root = h('div', { class: 'row-card' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: sk.name }), lv), h('div', { class: 'row-desc small muted', text: `${sk.description} 쿨타임 ${sk.cooldown}s` }), sub), btn);
      list.append(root);
      rows.set(sk.id, { root, lv, sub, btn });
    }
    const s = game.state;
    locked.replaceChildren();
    if (s.hero.job && s.hero.tier < 4) {
      const next = JOBS[s.hero.job].skills[s.hero.tier as 0 | 1 | 2 | 3];
      locked.append(h('div', { class: 'row-card' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: `🔒 ${next.name}` })), h('div', { class: 'row-desc small muted', text: `${next.description} — ${s.hero.tier + 1}차 전직 (Lv ${JOB_LEVELS[(s.hero.tier + 1) as 1]}) 필요` }))));
    } else if (!s.hero.job) {
      locked.append(h('div', { class: 'muted small', text: 'Lv 10에 1차 전직을 하면 직업 스킬이 열립니다. 전사·마법사·궁수·도적마다 스킬 4개.' }));
    } else {
      locked.append(h('div', { class: 'muted small', text: '모든 스킬을 해금했습니다.' }));
    }
  }

  function update(): void {
    const s = game.state;
    const skills = unlockedSkills(s);
    const k = skills.map((x) => x.id).join(',') + s.hero.tier;
    if (k !== key) {
      key = k;
      build(skills);
    }
    for (const sk of skills) {
      const r = rows.get(sk.id);
      if (!r) continue;
      const lv = skillLevel(s, sk.id);
      const cost = skillUpgradeCost(sk.id, lv);
      const mult = skillMultiplier(lv);
      const maxed = lv >= 100;
      setText(r.lv, `Lv ${lv}`);
      const eff = sk.effect;
      const desc = eff.kind === 'single' || eff.kind === 'all' ? `피해 ×${(eff.mult * mult * game.stats.skillMult).toFixed(2)}` : eff.kind === 'burn' ? `초당 ×${(eff.multPerSec * mult * game.stats.skillMult).toFixed(2)} · ${eff.duration}s` : eff.kind === 'shield' ? `피해 -${eff.reduce * 100}% · ${eff.duration}s` : eff.kind === 'invuln' ? `무적 ${eff.duration}s` : `회복 ${eff.fraction * 100}%`;
      setText(r.sub, desc);
      setText(r.btn, maxed ? 'MAX' : `강화 ${N(cost)} G`);
      r.btn.disabled = maxed || s.gold < cost;
      toggleClass(r.root, 'affordable', !maxed && s.gold >= cost);
    }
  }
  return { el, update };
}
