import type { Game } from '@/app/game';
import { JOB_LEVELS, JOB_MULT, UPGRADES, UPGRADE_BY_ID, type UpgradeId } from '@/game/balance';
import { JOBS, jobTitle } from '@/game/jobs';
import { affordableCount, costOfN } from '@/game/upgrades';
import type { Assets } from '@/render/assets';
import { h, N, setText, toggleClass } from '../dom';

export interface TabView {
  el: HTMLElement;
  update: () => void;
  onShow?: (sub?: string) => void;
}

const AMOUNTS: (1 | 10 | 100 | 'max')[] = [1, 10, 100, 'max'];
const UPGRADE_ICON: Record<UpgradeId, string> = { atk: '⚔️', hp: '❤️', def: '🛡️', crit: '🎯', critDmg: '💥', aspd: '⚡', regen: '💚', gold: '🪙' };
/** asset slot ids for the upgrade icons (optional; emoji is the fallback) */
const UPGRADE_ASSET: Record<UpgradeId, string> = { atk: 'ui_stat_atk', hp: 'ui_stat_hp', def: 'ui_stat_def', crit: 'ui_stat_crit', critDmg: 'ui_stat_critdmg', aspd: 'ui_stat_aspd', regen: 'ui_stat_regen', gold: 'ui_gold' };

export function createGrowthTab(game: Game, assets: Assets, hooks: { openAdvance: () => void }): TabView {
  // ---- job strip -----------------------------------------------------------
  const jobTitleEl = h('b');
  const jobSub = h('div', { class: 'tiny muted' });
  const advanceBtn = h('button', { class: 'primary small-btn', text: '전직', on: { click: () => hooks.openAdvance() } }) as HTMLButtonElement;
  const jobCard = h('div', { class: 'card row', style: 'padding:8px 10px' }, h('div', { style: 'min-width:0' }, jobTitleEl, jobSub), advanceBtn);

  // ---- power upgrades ------------------------------------------------------
  const seg = h('div', { class: 'seg' });
  const segBtns = new Map<string, HTMLButtonElement>();
  for (const a of AMOUNTS) {
    const btn = h('button', { text: a === 'max' ? 'MAX' : `×${a}` });
    btn.addEventListener('click', () => game.setSetting('buyAmount', a));
    segBtns.set(String(a), btn);
    seg.append(btn);
  }
  const autoBtn = h('button', { class: 'small-btn toggle', text: '자동 강화', on: { click: () => game.setSetting('autoUpgrade', !game.state.settings.autoUpgrade) } }) as HTMLButtonElement;
  const statLine = h('div', { class: 'stat-grid' });
  const rows = new Map<UpgradeId, { root: HTMLElement; lv: HTMLElement; val: HTMLElement; next: HTMLElement; btn: HTMLButtonElement; cost: HTMLElement; count: HTMLElement }>();
  const list = h('div', { class: 'rows' });
  for (const u of UPGRADES) {
    const lv = h('span', { class: 'row-lv' });
    const val = h('span', { class: 'row-val' });
    const next = h('span', { class: 'row-next' });
    const cost = h('span', { class: 'cost' });
    const count = h('span', { class: 'count' });
    const btn = h('button', { class: 'buy', on: { click: () => game.buy(u.id) } }, count, cost) as HTMLButtonElement;
    const icon = h('div', { class: 'row-icon', text: UPGRADE_ICON[u.id] });
    const img = assets.image(UPGRADE_ASSET[u.id]);
    if (img) icon.replaceChildren(h('img', { attrs: { src: img.src, alt: '' } }));
    const root = h('div', { class: 'row-card', title: u.description }, icon, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: u.name }), lv), h('div', { class: 'row-sub' }, val, next)), btn);
    list.append(root);
    rows.set(u.id, { root, lv, val, next, btn, cost, count });
  }
  const el = h(
    'div',
    {},
    jobCard,
    h('div', { class: 'section-title' }, h('span', { text: '돌파 강화' }), h('span', { style: 'display:flex;gap:6px;align-items:center' }, autoBtn, seg)),
    statLine,
    list,
    h('div', { class: 'tiny muted', style: 'margin-top:8px', text: '레벨업은 자동으로 공격력·체력을 올려줍니다. 능력치는 골드 강화와 장비·룬 각인·동료·유물로 키우세요.' }),
  );

  function stat(k: string, v: string): HTMLElement {
    return h('div', { class: 'stat' }, h('span', { class: 'k', text: k }), h('span', { class: 'v', text: v }));
  }

  function update(): void {
    const s = game.state;
    const st = game.stats;
    const job = s.hero.job;
    setText(jobTitleEl, `Lv.${s.hero.level} ${jobTitle(job, s.hero.tier)}${job ? ` · ${JOBS[job].name} ${s.hero.tier}차` : ''}`);
    const next = s.hero.tier < 4 ? s.hero.tier + 1 : null;
    setText(jobSub, next !== null ? `다음 전직 Lv ${JOB_LEVELS[next as 1]} · 배율 ×${JOB_MULT[s.hero.tier]} → ×${JOB_MULT[next as 1]}` : '최종 전직 완료 · 배율 ×6');
    advanceBtn.disabled = !game.canAdvance();
    setText(advanceBtn, game.canAdvance() ? `${next}차 전직!` : next !== null ? `${next}차 전직` : '완료');
    toggleClass(advanceBtn, 'pulse', game.canAdvance());
    for (const [k, b] of segBtns) toggleClass(b, 'active', k === String(s.settings.buyAmount));
    toggleClass(autoBtn, 'on', s.settings.autoUpgrade);
    setText(autoBtn, s.settings.autoUpgrade ? '자동 강화 ON' : '자동 강화 OFF');
    statLine.replaceChildren(
      stat('공격력', N(st.atk)),
      stat('체력', N(st.hp)),
      stat('방어력', st.def.toFixed(0)),
      stat('치명타', `${(st.critRate * 100).toFixed(0)}% / ×${st.critDmg.toFixed(2)}`),
      stat('공속', `${st.atkSpeed.toFixed(2)}/s`),
      stat('DPS', N(st.dps)),
      stat('골드 획득', `×${st.goldMult.toFixed(2)}`),
      stat('전투력', N(st.power)),
    );
    for (const u of UPGRADES) {
      const r = rows.get(u.id)!;
      const lv = s.hero.upgrades[u.id];
      const maxed = lv >= u.max;
      setText(r.lv, `Lv ${lv}${maxed ? ' (MAX)' : ''}`);
      setText(r.val, u.format(u.value(lv)));
      const n = affordableCount(s, u.id, s.settings.buyAmount);
      const want = s.settings.buyAmount === 'max' ? Math.max(1, n) : Math.min(s.settings.buyAmount, Math.max(0, u.max - lv));
      setText(r.next, maxed ? '' : `→ ${u.format(u.value(lv + Math.max(1, want)))}`);
      const costV = costOfN(UPGRADE_BY_ID[u.id], lv, Math.max(1, want));
      setText(r.cost, maxed ? 'MAX' : `${N(costV)} G`);
      setText(r.count, maxed ? '' : `+${Math.max(1, want)}`);
      r.btn.disabled = maxed || n <= 0;
      toggleClass(r.root, 'affordable', !maxed && n > 0);
    }
  }
  return { el, update };
}
