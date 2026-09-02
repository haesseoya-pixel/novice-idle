import type { Game } from '@/app/game';
import { COMPANIONS, COMPANION_RARITY_COLORS as RARITY_COLORS, COMPANION_RARITY_NAMES as RARITY_NAMES, COMPANION_SLOTS, PASSIVE_NAMES, companionLevel, companionPower, type CompanionId, type CompanionRarity } from '@/game/companions';
import type { Assets } from '@/render/assets';
import { h, setText, toggleClass } from '../dom';
import type { TabView } from './growthTab';

/** 동료 탭: 3슬롯 편성 + 동료 소환 + 보유 목록 (등급 필터). */
export function createCompanionTab(game: Game, assets: Assets): TabView {
  const slots: HTMLElement[] = [];
  const slotWrap = h('div', { class: 'comp-slots' });
  for (let i = 0; i < COMPANION_SLOTS; i++) {
    const el2 = h('div', { class: 'comp-slot' });
    slots.push(el2);
    slotWrap.append(el2);
  }
  const totals = h('div', { class: 'tiny muted', style: 'margin:2px 0 8px' });

  const seg = h('div', { class: 'seg' });
  const segBtns = new Map<string, HTMLButtonElement>();
  let filter: 'all' | CompanionRarity = 'all';
  for (const [k, label] of [['all', '전체'], ['6', '초월'], ['5', '신화'], ['4', '전설'], ['3', '영웅'], ['2', '희귀']] as const) {
    const btn = h('button', { text: label, on: { click: () => { filter = k === 'all' ? 'all' : (Number(k) as CompanionRarity); for (const [kk, b] of segBtns) toggleClass(b, 'active', kk === k); render(); } } }) as HTMLButtonElement;
    segBtns.set(k, btn);
    seg.append(btn);
  }
  segBtns.get('all')!.classList.add('active');

  const list = h('div', { class: 'comp-grid' });
  const cells = new Map<CompanionId, { root: HTMLElement; lv: HTMLElement; eff: HTMLElement; btn: HTMLButtonElement }>();
  function render(): void {
    list.replaceChildren();
    cells.clear();
    const pool = COMPANIONS.filter((c) => filter === 'all' || c.rarity === filter).sort((a, b) => b.rarity - a.rarity || companionLevel(game.state, b.id) - companionLevel(game.state, a.id));
    for (const c of pool) {
      const lv = h('span', { class: 'row-lv' });
      const eff = h('div', { class: 'tiny muted' });
      const icon = h('span', { class: 'comp-icon', text: c.icon });
      const cimg = assets.image(`companion_icon_${c.id}`);
      if (cimg) icon.replaceChildren(h('img', { attrs: { src: cimg.src, alt: '' } }));
      const btn = h('button', { class: 'small-btn blue', text: '장착', on: { click: () => { const slot = game.state.companions.equipped.indexOf(null); game.equipCompanion(c.id, slot >= 0 ? slot : 0); render(); } } }) as HTMLButtonElement;
      const root = h('div', { class: 'comp-card', style: `--rc:${RARITY_COLORS[c.rarity]}` }, h('div', { class: 'row' }, icon, h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 'row' }, h('b', { text: c.name, style: `color:${RARITY_COLORS[c.rarity]}` }), lv), h('div', { class: 'tiny muted', text: `${RARITY_NAMES[c.rarity]} · ${c.desc}` }), eff)), btn);
      list.append(root);
      cells.set(c.id, { root, lv, eff, btn });
    }
    update();
  }

  const el = h(
    'div',
    {},
    h('div', { class: 'section-title' }, h('span', { text: '편성 (3슬롯)' })),
    slotWrap,
    totals,
    h('div', { class: 'tiny muted', style: 'margin-bottom:8px', text: '동료는 소환 탭에서 얻습니다. 중복은 동료 레벨업(패시브 증가)이고, 가장 강한 3명이 자동 편성됩니다.' }),
    h('div', { class: 'section-title' }, h('span', { text: '보유 동료' }), seg),
    list,
  );

  function update(): void {
    const s = game.state;
    s.companions.equipped.forEach((id, i) => {
      const el2 = slots[i]!;
      if (!id) {
        el2.replaceChildren(h('span', { class: 'muted tiny', text: `슬롯 ${i + 1}` }));
        el2.style.setProperty('--rc', 'var(--line2)');
        return;
      }
      const c = COMPANIONS.find((x) => x.id === id)!;
      const lv = companionLevel(s, id);
      el2.style.setProperty('--rc', RARITY_COLORS[c.rarity]);
      el2.replaceChildren(h('span', { class: 'comp-icon', text: c.icon }), h('b', { class: 'tiny', text: c.name }), h('span', { class: 'tiny muted', text: `Lv${lv} · ${PASSIVE_NAMES[c.passive]} +${(companionPower(c, lv) * 100).toFixed(0)}%` }));
    });
    const owned = COMPANIONS.filter((c) => companionLevel(s, c.id) > 0).length;
    setText(totals, `보유 ${owned}/${COMPANIONS.length}종 · 누적 소환 ${s.stats.companionPulls}회`);
    for (const [id, e] of cells) {
      const lv = companionLevel(s, id);
      const eq = s.companions.equipped.includes(id);
      const c = COMPANIONS.find((x) => x.id === id)!;
      toggleClass(e.root, 'owned', lv > 0);
      toggleClass(e.root, 'equipped', eq);
      setText(e.lv, lv > 0 ? `Lv ${lv}` : '미보유');
      setText(e.eff, lv > 0 ? `${PASSIVE_NAMES[c.passive]} +${(companionPower(c, lv) * 100).toFixed(0)}% · 공격 ×${c.strikeMult} / ${c.strikeEvery}s` : `${PASSIVE_NAMES[c.passive]} +${(c.passivePer * 100).toFixed(0)}%/Lv`);
      e.btn.disabled = lv <= 0 || eq;
      setText(e.btn, eq ? '편성 중' : '편성');
    }
  }
  render();
  return { el, update };
}
