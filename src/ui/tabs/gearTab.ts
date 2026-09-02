import type { Game } from '@/app/game';
import { FUSION, GEMS, PITY, POTENTIAL, RARITY_COLORS, RARITY_NAMES, SLOTS, SLOT_NAMES, STARFORCE, type Rarity, type Slot } from '@/game/balance';
import { canFuse, itemKey, starforceCost } from '@/game/equipment';
import { JOBS } from '@/game/jobs';
import { formatLine } from '@/game/potential';
import { codexBonus, collectionBonus, equippedValue, itemValueWithStars, parseItemKey } from '@/game/stats';
import type { ItemKey } from '@/game/state';
import type { Assets } from '@/render/assets';
import { h, N, setText, toggleClass } from '../dom';
import type { TabView } from './growthTab';

const SLOT_EFFECT: Record<Slot, string> = { weapon: '공격력', armor: '체력', accessory: '치명타 피해·스킬', pet: '골드·경험치' };
export const SLOT_ICON: Record<Slot, string> = { weapon: '⚔️', armor: '🛡️', accessory: '💍', pet: '🐾' };

export function weaponLabel(game: Game): string {
  const job = game.state.hero.job;
  return job ? JOBS[job].weapon : '나무 막대';
}

export function itemIcon(assets: Assets, game: Game, slot: Slot, rarity: Rarity): HTMLElement {
  const job = game.state.hero.job ?? 'novice';
  const img = assets.image(slot === 'weapon' ? `icon_weapon_${job}_${rarity}` : `icon_${slot}_${rarity}`);
  if (img) return h('img', { attrs: { src: img.src, alt: '' } });
  return h('span', { text: SLOT_ICON[slot] });
}

export function createGearTab(game: Game, assets: Assets): TabView {
  const pullOne = h('button', { class: 'purple', text: `1회 뽑기 · ${GEMS.pullCost}★`, on: { click: () => game.gacha(1) } }) as HTMLButtonElement;
  const pullTen = h('button', { class: 'primary', text: `10회 뽑기 · ${GEMS.tenPullCost}★`, on: { click: () => game.gacha(10) } }) as HTMLButtonElement;
  const pity = h('div', { class: 'tiny muted', style: 'margin-top:6px' });
  const slotCards = new Map<Slot, { root: HTMLElement; name: HTMLElement; val: HTMLElement; stars: HTMLElement; star: HTMLButtonElement; cubeBtn: HTMLButtonElement; icon: HTMLElement; pot: HTMLElement; iconKey: string }>();
  const slotsWrap = h('div', { class: 'slot-grid' });
  for (const slot of SLOTS) {
    const name = h('div', { class: 'slot-name' });
    const val = h('div', { class: 'tiny muted' });
    const stars = h('div', { class: 'slot-stars' });
    const icon = h('div', { class: 'slot-icon' }, h('span', { text: SLOT_ICON[slot] }));
    const pot = h('div', { class: 'pot' });
    const star = h('button', { class: 'primary', on: { click: () => game.starforce(slot) } }) as HTMLButtonElement;
    const cubeBtn = h('button', { class: 'purple', on: { click: () => game.cube(slot) } }) as HTMLButtonElement;
    const root = h('div', { class: 'slot-card' }, h('div', { class: 'slot-head' }, icon, h('div', { style: 'min-width:0' }, h('div', { class: 'tiny muted', text: `${SLOT_NAMES[slot]} · ${SLOT_EFFECT[slot]}` }), name, val)), stars, pot, h('div', { class: 'slot-btns' }, star, cubeBtn));
    slotsWrap.append(root);
    slotCards.set(slot, { root, name, val, stars, star, cubeBtn, icon, pot, iconKey: '' });
  }
  const bonus = h('div', { class: 'tiny muted', style: 'margin:6px 0' });
  const fuseAllBtn = h('button', { class: 'green small-btn', text: '전체 합성', on: { click: () => game.fuseAll() } }) as HTMLButtonElement;
  const inv = h('div', { class: 'inv-grid' });
  const cells = new Map<ItemKey, { root: HTMLButtonElement; lv: HTMLElement; icon: HTMLElement; iconKey: string }>();
  for (const slot of SLOTS) {
    inv.append(h('div', { class: 'inv-label', text: SLOT_NAMES[slot] }));
    for (let r = 0; r < 6; r++) {
      const key = itemKey(slot, r as Rarity);
      const lv = h('span', { class: 'inv-lv' });
      const icon = h('span', { class: 'inv-icon', text: SLOT_ICON[slot] });
      const root = h('button', { class: 'inv-cell', title: `${RARITY_NAMES[r]} ${SLOT_NAMES[slot]} — 클릭: 장착, ${FUSION.need}개 이상이면 합성`, style: `--rc:${RARITY_COLORS[r]}`, on: { click: () => (canFuse(game.state, key) && game.state.hero.equipped[slot] === key ? game.fuse(key) : game.equip(key)) } }, icon, lv) as HTMLButtonElement;
      inv.append(root);
      cells.set(key, { root, lv, icon, iconKey: '' });
    }
  }
  const el = h(
    'div',
    {},
    h('div', { class: 'section-title' }, h('span', { text: '장착 장비 · 스타포스 · 잠재능력' })),
    slotsWrap,
    h('div', { class: 'section-title' }, h('span', { text: '장비 뽑기' })),
    h('div', { class: 'card' }, h('div', { class: 'row', style: 'gap:8px' }, pullOne, pullTen), pity, h('div', { class: 'tiny muted', style: 'margin-top:4px', text: '일반 40% · 고급 30% · 희귀 17% · 영웅 9% · 전설 3.2% · 신화 0.8%. 10연은 희귀 이상 보장, 30회마다 영웅, 100회마다 전설 보장. 중복은 장비 레벨업(+8%).' })),
    h('div', { class: 'section-title' }, h('span', { text: '인벤토리 · 합성' }), fuseAllBtn),
    bonus,
    inv,
    h('div', { class: 'tiny muted', style: 'margin-top:6px', text: `같은 장비 ${FUSION.need}개를 모으면 다음 등급 1개로 합성됩니다. 셀을 누르면 장착, 장착 중인 장비를 다시 누르면 합성.` }),
  );

  function update(): void {
    const s = game.state;
    pullOne.disabled = s.gems < GEMS.pullCost;
    pullTen.disabled = s.gems < GEMS.tenPullCost;
    setText(pity, `보유 ${s.gems}★ · 영웅 보장까지 ${Math.max(0, PITY.heroEvery - s.pity.sinceHero)}회 · 전설 보장까지 ${Math.max(0, PITY.legendEvery - s.pity.sinceLegend)}회 · 누적 ${s.pity.pulls}회`);
    for (const slot of SLOTS) {
      const c = slotCards.get(slot)!;
      const key = s.hero.equipped[slot];
      const stars = s.hero.stars[slot];
      const p = s.potential[slot];
      if (!key) {
        setText(c.name, '비어 있음');
        c.name.style.color = 'var(--muted)';
        setText(c.val, '뽑기로 장비를 얻으세요');
        setText(c.stars, '');
        c.root.style.setProperty('--rc', 'var(--line2)');
        c.star.disabled = true;
        setText(c.star, '★ 스타포스');
        c.cubeBtn.disabled = true;
        setText(c.cubeBtn, '◆ 큐브');
        c.pot.replaceChildren(h('span', { class: 'muted', text: '잠재능력 없음' }));
        continue;
      }
      const { rarity } = parseItemKey(key);
      const lv = s.inventory[key] ?? 1;
      const iconKey = `${key}_${s.hero.job}`;
      if (c.iconKey !== iconKey) {
        c.iconKey = iconKey;
        c.icon.replaceChildren(itemIcon(assets, game, slot, rarity));
        c.icon.style.setProperty('--rc', RARITY_COLORS[rarity]);
      }
      setText(c.name, `${RARITY_NAMES[rarity]} ${slot === 'weapon' ? weaponLabel(game) : SLOT_NAMES[slot]} +${lv - 1}`);
      c.name.style.color = RARITY_COLORS[rarity];
      const v = equippedValue(s, slot);
      setText(c.val, `+${(v * 100).toFixed(1)}% (기본 ${(itemValueWithStars(rarity, lv, 0) * 100).toFixed(0)}% · 별 +${(stars * STARFORCE.perStar * 100).toFixed(0)}%)`);
      setText(c.stars, `★ ${stars} / ${STARFORCE.maxStars}`);
      const maxed = stars >= STARFORCE.maxStars;
      const cost = starforceCost(s, slot);
      c.star.disabled = maxed || s.gold < cost;
      setText(c.star, maxed ? '★ MAX' : `★${stars + 1} · ${N(cost)}G`);
      c.cubeBtn.disabled = s.gems < POTENTIAL.cubeCost;
      setText(c.cubeBtn, `◆ 큐브 ${POTENTIAL.cubeCost}★`);
      const gradeColor = POTENTIAL.gradeColors[p.grade] ?? '#fff';
      c.pot.replaceChildren(h('b', { text: `[${POTENTIAL.grades[p.grade]}]`, style: `color:${gradeColor}` }), ...(p.lines.length ? p.lines.map((l) => h('div', { text: formatLine(l) })) : [h('div', { class: 'muted', text: '큐브로 잠재능력을 뽑으세요' })]));
    }
    setText(bonus, `도감 보유 효과: 공격력·체력 +${(collectionBonus(s) * 100).toFixed(1)}% (장비 레벨 합 × 0.5%) · 몬스터 도감 +${(codexBonus(s) * 100).toFixed(0)}%`);
    let fusable = false;
    for (const [key, c] of cells) {
      const lv = s.inventory[key] ?? 0;
      const { slot, rarity } = parseItemKey(key);
      toggleClass(c.root, 'owned', lv > 0);
      toggleClass(c.root, 'equipped', s.hero.equipped[slot] === key);
      const cf = canFuse(s, key);
      toggleClass(c.root, 'fusable', cf);
      if (cf) fusable = true;
      setText(c.lv, lv > 0 ? `×${lv}` : '');
      c.root.disabled = lv <= 0;
      const iconKey = `${key}_${s.hero.job}`;
      if (lv > 0 && c.iconKey !== iconKey) {
        c.iconKey = iconKey;
        c.icon.replaceChildren(itemIcon(assets, game, slot, rarity));
      }
    }
    fuseAllBtn.disabled = !fusable;
  }
  return { el, update };
}
