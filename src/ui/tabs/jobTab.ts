import type { Game } from '@/app/game';
import { GEMS, JOB_LEVELS, JOB_MULT } from '@/game/balance';
import { JOBS, JOB_PATHS, jobTitle, type JobPath } from '@/game/jobs';
import { h, setText, toggleClass } from '../dom';
import type { TabView } from './growthTab';

export interface JobTabHooks {
  openAdvance: () => void;
  openReclass: (path: JobPath) => void;
}

export function createJobTab(game: Game, hooks: JobTabHooks): TabView {
  const current = h('div', { class: 'card job-current' });
  const advanceBtn = h('button', { class: 'primary', text: '전직하기', on: { click: () => hooks.openAdvance() } }) as HTMLButtonElement;
  const tree = h('div', { class: 'job-tree' });
  const cards = new Map<JobPath, { root: HTMLElement; tiers: HTMLElement[]; reclass: HTMLButtonElement }>();
  for (const p of JOB_PATHS) {
    const j = JOBS[p];
    const tiers = j.tiers.map((name, i) => h('div', { class: 'job-tier' }, h('span', { class: 'job-tier-lv', text: `Lv${JOB_LEVELS[i + 1]}` }), h('span', { text: `${i + 1}차 ${name}` })));
    const reclass = h('button', { class: 'small-btn', text: `전환 (${GEMS.reclassCost} 별점)`, on: { click: () => hooks.openReclass(p) } }) as HTMLButtonElement;
    const root = h('div', { class: 'job-card', style: `--jc:${j.color}` }, h('div', { class: 'job-head' }, h('b', { text: j.name }), h('span', { class: 'small muted', text: j.weapon })), h('div', { class: 'small', text: j.description }), h('div', { class: 'job-tiers' }, ...tiers), h('div', { class: 'small muted', text: `스킬: ${j.skills.map((s) => s.name).join(' · ')}` }), reclass);
    tree.append(root);
    cards.set(p, { root, tiers, reclass });
  }
  const el = h('div', {}, h('div', { class: 'section-title' }, h('span', { text: '전직' })), current, h('div', { class: 'section-title' }, h('span', { text: '전직 트리' })), tree, h('div', { class: 'muted small', style: 'margin-top:10px', text: `차수 배율(공격력·체력): ${JOB_MULT.map((m, i) => `${i}차 ×${m}`).join(' · ')}. 1차에서 고른 직업은 유지되며, 별점 ${GEMS.reclassCost}으로 같은 차수의 다른 직업으로 전환할 수 있습니다.` }));

  function update(): void {
    const s = game.state;
    const tier = s.hero.tier;
    const next = tier < 4 ? tier + 1 : null;
    const req = next !== null ? JOB_LEVELS[next as 1] : null;
    current.replaceChildren(
      h('div', { class: 'job-current-title', style: s.hero.job ? `color:${JOBS[s.hero.job].color}` : '' }, h('b', { text: `Lv.${s.hero.level} ${jobTitle(s.hero.job, tier)}` }), h('span', { class: 'small muted', text: s.hero.job ? ` ${JOBS[s.hero.job].name} ${tier}차` : ' 초보자' })),
      h('div', { class: 'small', text: next !== null ? `다음: ${next}차 전직 · Lv ${req} 필요 (현재 Lv ${s.hero.level}) · 배율 ×${JOB_MULT[tier]} → ×${JOB_MULT[next as 1]}` : '최종 전직 완료 (4차)' }),
      next !== null ? advanceBtn : h('span'),
    );
    advanceBtn.disabled = !game.canAdvance();
    setText(advanceBtn, next === 1 ? '1차 전직 · 직업 선택' : `${next}차 전직`);
    for (const p of JOB_PATHS) {
      const c = cards.get(p)!;
      const mine = s.hero.job === p;
      toggleClass(c.root, 'active', mine);
      toggleClass(c.root, 'dim', !!s.hero.job && !mine);
      c.tiers.forEach((t, i) => toggleClass(t, 'done', mine && tier >= i + 1));
      c.reclass.hidden = !s.hero.job || mine || tier < 1;
      c.reclass.disabled = s.gems < GEMS.reclassCost;
    }
  }
  return { el, update };
}
