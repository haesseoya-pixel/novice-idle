import type { Game } from '@/app/game';
import { GEMS, PITY, RARITY_COLORS, RARITY_NAMES, SLOTS, SLOT_NAMES } from '@/game/balance';
import { COMPANIONS, COMPANION_RARITY_COLORS, COMPANION_RARITY_NAMES, type CompanionRarity } from '@/game/companions';
import { itemKey } from '@/game/equipment';
import { parseItemKey } from '@/game/stats';
import type { Assets } from '@/render/assets';
import { h, setText, toggleClass } from '../dom';
import type { TabView } from './growthTab';
import { itemIcon } from './gearTab';

const COMPANION_RATES_UI: [CompanionRarity, number][] = [
  [6, 0.002],
  [5, 0.018],
  [4, 0.075],
  [3, 0.245],
  [2, 0.66],
];

/** 소환 탭(상점 역할): 장비 소환과 동료 소환을 여기 한 곳에 모은다. */
export function createSummonTab(game: Game, assets: Assets): TabView {
  const seg = h('div', { class: 'seg' });
  const segBtns = new Map<string, HTMLButtonElement>();
  const body = h('div');
  let active = 'gear';

  const banner = (id: string, color: string, title: string, sub: string) => {
    const el2 = h('div', { class: 'shop-banner', style: `--dc:${color}` }, h('div', { class: 'shop-banner-title' }, h('b', { text: title }), h('span', { class: 'tiny', text: sub })));
    const img = assets.image(`banner_${id}`);
    if (img) el2.style.backgroundImage = `url(${img.src})`;
    return el2;
  };

  // ---------- 장비 소환 ----------
  const gearOne = h('button', { class: 'purple', text: `1회 소환 · ${GEMS.pullCost}★`, on: { click: () => game.gacha(1) } }) as HTMLButtonElement;
  const gearTen = h('button', { class: 'primary', text: `10회 소환 · ${GEMS.tenPullCost}★`, on: { click: () => game.gacha(10) } }) as HTMLButtonElement;
  const gearPity = h('div', { class: 'tiny muted', style: 'margin-top:6px' });
  const gearPityBar = h('div', { class: 'bar-fill quest' });
  const gearRates = h('div', { class: 'rate-rows' });
  for (let r = 5; r >= 0; r--) {
    const rate = [0.4, 0.3, 0.17, 0.09, 0.032, 0.008][r]!;
    gearRates.append(h('div', { class: 'rate-row' }, h('span', { style: `color:${RARITY_COLORS[r]}`, text: RARITY_NAMES[r] }), h('span', { class: 'muted', text: `${(rate * 100).toFixed(1)}%` })));
  }
  const inv = h('div', { class: 'inv-grid' });
  const cells = new Map<string, { root: HTMLElement; lv: HTMLElement }>();
  for (const slot of SLOTS) {
    inv.append(h('div', { class: 'inv-label', text: SLOT_NAMES[slot] }));
    for (let r = 0; r < 6; r++) {
      const key = itemKey(slot, r as 0);
      const lv = h('span', { class: 'inv-lv' });
      const root = h('div', { class: 'inv-cell', style: `--rc:${RARITY_COLORS[r]}` }, h('span', { class: 'inv-icon' }, itemIcon(assets, game, slot, r as 0)), lv);
      inv.append(root);
      cells.set(key, { root, lv });
    }
  }
  const gearPane = h(
    'div',
    {},
    banner('gear_gacha', '#ffd166', '장비 소환', '무기 · 방어구 · 장신구 · 펫 · 6등급'),
    h('div', { class: 'card' }, h('div', { class: 'row', style: 'gap:8px' }, gearOne, gearTen), h('div', { class: 'bar', style: 'margin-top:8px' }, gearPityBar), gearPity),
    h('div', { class: 'section-title' }, h('span', { text: '등급 확률' })),
    gearRates,
    h('div', { class: 'tiny muted', style: 'margin-top:4px', text: '10회 소환은 희귀 이상 1개 보장. 30회마다 영웅 이상, 100회마다 전설 이상 확정. 중복은 장비 레벨업(+8%). 펫도 여기서 나옵니다.' }),
    h('div', { class: 'section-title' }, h('span', { text: '장비 도감' })),
    inv,
    h('div', { class: 'tiny muted', style: 'margin-top:6px', text: '장착 · 합성 · 별빛 단련 · 룬 각인은 장비 탭에서 합니다.' }),
  );

  // ---------- 동료 소환 ----------
  const compOne = h('button', { class: 'purple', text: `1회 소환 · ${GEMS.companionCost}★`, on: { click: () => game.summonCompanion(1) } }) as HTMLButtonElement;
  const compTen = h('button', { class: 'primary', text: `10회 소환 · ${GEMS.companionTenCost}★`, on: { click: () => game.summonCompanion(10) } }) as HTMLButtonElement;
  const compRates = h('div', { class: 'rate-rows' });
  for (const [r, rate] of COMPANION_RATES_UI) {
    const count = COMPANIONS.filter((c) => c.rarity === r).length;
    compRates.append(h('div', { class: 'rate-row' }, h('span', { style: `color:${COMPANION_RARITY_COLORS[r]}`, text: `${COMPANION_RARITY_NAMES[r]} (${count}종)` }), h('span', { class: 'muted', text: `${(rate * 100).toFixed(1)}%` })));
  }
  const compOwned = h('div', { class: 'tiny muted', style: 'margin-top:6px' });
  const compPane = h(
    'div',
    {},
    banner('companion_gacha', '#c78bff', '동료 소환', `총 ${COMPANIONS.length}종 · 상위 등급일수록 종류도 적습니다`),
    h('div', { class: 'card' }, h('div', { class: 'row', style: 'gap:8px' }, compOne, compTen), compOwned),
    h('div', { class: 'section-title' }, h('span', { text: '등급 확률' })),
    compRates,
    h('div', { class: 'tiny muted', style: 'margin-top:4px', text: '10회 소환은 영웅 이상 1명 보장. 중복은 동료 레벨업. 편성은 동료 탭에서 합니다.' }),
  );

  const panes: Record<string, HTMLElement> = { gear: gearPane, companion: compPane };
  for (const [id, label] of [['gear', '장비 소환'], ['companion', '동료 소환']] as const) {
    const btn = h('button', { text: label, on: { click: () => show(id) } }) as HTMLButtonElement;
    segBtns.set(id, btn);
    seg.append(btn);
  }
  function show(id: string): void {
    active = id;
    for (const [k, b] of segBtns) toggleClass(b, 'active', k === id);
    body.replaceChildren(panes[id]!);
    update();
  }
  const el = h('div', {}, seg, body);

  function update(): void {
    const s = game.state;
    if (active === 'gear') {
      gearOne.disabled = s.gems < GEMS.pullCost;
      gearTen.disabled = s.gems < GEMS.tenPullCost;
      const toHero = Math.max(0, PITY.heroEvery - s.pity.sinceHero);
      setText(gearPity, `보유 ${s.gems}★ · 영웅 보장까지 ${toHero}회 · 전설 보장까지 ${Math.max(0, PITY.legendEvery - s.pity.sinceLegend)}회 · 누적 ${s.pity.pulls}회`);
      gearPityBar.style.width = `${(((PITY.heroEvery - toHero) / PITY.heroEvery) * 100).toFixed(0)}%`;
      for (const [key, c] of cells) {
        const lv = s.inventory[key as 'weapon_0'] ?? 0;
        const { slot } = parseItemKey(key as 'weapon_0');
        toggleClass(c.root, 'owned', lv > 0);
        toggleClass(c.root, 'equipped', s.hero.equipped[slot] === key);
        setText(c.lv, lv > 0 ? `×${lv}` : '');
      }
    } else {
      compOne.disabled = s.gems < GEMS.companionCost;
      compTen.disabled = s.gems < GEMS.companionTenCost;
      const owned = COMPANIONS.filter((c) => (s.companions.owned[c.id] ?? 0) > 0).length;
      setText(compOwned, `보유 ${owned}/${COMPANIONS.length}종 · 누적 소환 ${s.stats.companionPulls}회 · 보유 ${s.gems}★`);
    }
  }
  show('gear');
  return { el, update, onShow: (sub?: string) => { if (sub && panes[sub]) show(sub); } };
}
