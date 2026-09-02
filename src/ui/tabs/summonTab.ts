import type { Game } from '@/app/game';
import { ARTIFACTS, artifactLevel, artifactValue, upgradeCost } from '@/game/artifacts';
import { GEMS, RARITY_COLORS, RARITY_NAMES } from '@/game/balance';
import { COMPANIONS, COMPANION_SLOTS, PASSIVE_NAMES, companionLevel, companionPower, type CompanionId } from '@/game/companions';
import { h, N, setText, toggleClass } from '../dom';
import type { TabView } from './growthTab';

export function createSummonTab(game: Game): TabView {
  const one = h('button', { class: 'purple', text: `동료 소환 1회 · ${GEMS.companionCost}★`, on: { click: () => game.summonCompanion(1) } }) as HTMLButtonElement;
  const ten = h('button', { class: 'primary', text: `10회 · ${GEMS.companionTenCost}★`, on: { click: () => game.summonCompanion(10) } }) as HTMLButtonElement;
  const slots: HTMLElement[] = [];
  const slotWrap = h('div', { class: 'comp-slots' });
  for (let i = 0; i < COMPANION_SLOTS; i++) {
    const el = h('div', { class: 'comp-slot' });
    slots.push(el);
    slotWrap.append(el);
  }
  const list = h('div', { class: 'comp-grid' });
  const compEls = new Map<CompanionId, { root: HTMLElement; lv: HTMLElement; eff: HTMLElement; btn: HTMLButtonElement }>();
  for (const c of COMPANIONS) {
    const lv = h('span', { class: 'row-lv' });
    const eff = h('div', { class: 'tiny muted' });
    const btn = h('button', { class: 'small-btn blue', text: '장착', on: { click: () => { const s = game.state; const slot = s.companions.equipped.indexOf(null); game.equipCompanion(c.id, slot >= 0 ? slot : 0); } } }) as HTMLButtonElement;
    const root = h('div', { class: 'comp-card', style: `--rc:${RARITY_COLORS[c.rarity]}` }, h('div', { class: 'row' }, h('span', { class: 'comp-icon', text: c.icon }), h('div', { style: 'flex:1;min-width:0' }, h('div', { class: 'row' }, h('b', { text: c.name, style: `color:${RARITY_COLORS[c.rarity]}` }), lv), h('div', { class: 'tiny muted', text: `${RARITY_NAMES[c.rarity]} · ${c.desc}` }), eff)), btn);
    list.append(root);
    compEls.set(c.id, { root, lv, eff, btn });
  }
  const artList = h('div', { class: 'rows' });
  const artEls = new Map<string, { lv: HTMLElement; val: HTMLElement; btn: HTMLButtonElement; root: HTMLElement }>();
  for (const a of ARTIFACTS) {
    const lv = h('span', { class: 'row-lv' });
    const val = h('span', { class: 'row-val' });
    const btn = h('button', { class: 'buy', on: { click: () => (artifactLevel(game.state, a.id) < 0 ? game.unlockArtifact(a.id) : game.upgradeArtifact(a.id)) } }) as HTMLButtonElement;
    const root = h('div', { class: 'row-card' }, h('div', { class: 'row-icon', text: a.icon }), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: a.name }), lv), h('div', { class: 'row-sub' }, h('span', { class: 'muted', text: a.desc }), val)), btn);
    artList.append(root);
    artEls.set(a.id, { lv, val, btn, root });
  }
  const el = h(
    'div',
    {},
    h('div', { class: 'section-title' }, h('span', { text: '동료 (3슬롯 장착 · 패시브 + 주기 공격)' })),
    slotWrap,
    h('div', { class: 'card' }, h('div', { class: 'row', style: 'gap:8px' }, one, ten), h('div', { class: 'tiny muted', style: 'margin-top:4px', text: '희귀 70% · 영웅 25% · 전설 5%. 10연은 영웅 이상 1명 보장. 중복은 동료 레벨업(패시브 증가).' })),
    list,
    h('div', { class: 'section-title' }, h('span', { text: '유물 (별점으로 획득 · 골드로 강화)' })),
    artList,
  );

  function update(): void {
    const s = game.state;
    one.disabled = s.gems < GEMS.companionCost;
    ten.disabled = s.gems < GEMS.companionTenCost;
    s.companions.equipped.forEach((id, i) => {
      const el = slots[i]!;
      if (!id) {
        el.replaceChildren(h('span', { class: 'muted tiny', text: `슬롯 ${i + 1}` }));
        el.style.setProperty('--rc', 'var(--line2)');
        return;
      }
      const c = COMPANIONS.find((x) => x.id === id)!;
      const lv = companionLevel(s, id);
      el.style.setProperty('--rc', RARITY_COLORS[c.rarity]);
      el.replaceChildren(h('span', { class: 'comp-icon', text: c.icon }), h('b', { class: 'tiny', text: c.name }), h('span', { class: 'tiny muted', text: `Lv${lv} · ${PASSIVE_NAMES[c.passive]} +${(companionPower(c, lv) * 100).toFixed(0)}%` }));
    });
    for (const c of COMPANIONS) {
      const e = compEls.get(c.id)!;
      const lv = companionLevel(s, c.id);
      const eq = s.companions.equipped.includes(c.id);
      toggleClass(e.root, 'owned', lv > 0);
      toggleClass(e.root, 'equipped', eq);
      setText(e.lv, lv > 0 ? `Lv ${lv}` : '미보유');
      setText(e.eff, lv > 0 ? `${PASSIVE_NAMES[c.passive]} +${(companionPower(c, lv) * 100).toFixed(0)}% · 공격 ×${c.strikeMult} / ${c.strikeEvery}s` : `${PASSIVE_NAMES[c.passive]} +${(c.passivePer * 100).toFixed(0)}%/Lv`);
      e.btn.disabled = lv <= 0 || eq;
      setText(e.btn, eq ? '장착 중' : '장착');
    }
    for (const a of ARTIFACTS) {
      const e = artEls.get(a.id)!;
      const lv = artifactLevel(s, a.id);
      if (lv < 0) {
        setText(e.lv, '미획득');
        setText(e.val, a.format(a.per));
        e.btn.replaceChildren(h('span', { class: 'count', text: '획득' }), h('span', { class: 'cost', text: `${a.unlockGems}★` }));
        e.btn.disabled = s.gems < a.unlockGems;
      } else {
        const maxed = lv >= a.max;
        setText(e.lv, `Lv ${lv + 1}${maxed ? ' (MAX)' : ''}`);
        setText(e.val, `${a.format(artifactValue(s, a.id))}${maxed ? '' : ` → ${a.format(a.per * (lv + 2))}`}`);
        const cost = upgradeCost(s, a.id);
        e.btn.replaceChildren(h('span', { class: 'count', text: maxed ? '' : '+1' }), h('span', { class: 'cost', text: maxed ? 'MAX' : `${N(cost)} G` }));
        e.btn.disabled = maxed || s.gold < cost;
      }
      toggleClass(e.root, 'affordable', !e.btn.disabled);
    }
  }
  return { el, update };
}
