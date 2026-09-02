import type { Game } from '@/app/game';
import type { JobPath } from '@/game/jobs';
import { GEMS } from '@/game/balance';
import type { Assets } from '@/render/assets';
import { h, qs, toggleClass } from './dom';
import { createAdventureTab } from './tabs/adventureTab';
import { createGearTab } from './tabs/gearTab';
import { createGrowthTab, type TabView } from './tabs/growthTab';
import { createJobTab } from './tabs/jobTab';
import { createRecordTab } from './tabs/recordTab';
import type { RankTabHooks } from './tabs/rankTab';
import { createCompanionTab } from './tabs/companionTab';
import { createSummonTab } from './tabs/summonTab';
import { createSkillTab } from './tabs/skillTab';

export type TabId = 'growth' | 'gear' | 'companion' | 'skill' | 'adventure' | 'summon';
/** 탭바에 없지만 아이콘/모달로 여는 화면 */
export type ViewId = TabId | 'record' | 'job';
const TABS: { id: TabId; label: string; icon: string; sub: string }[] = [
  { id: 'growth', label: '성장', icon: '💪', sub: '돌파 강화 · 유물 · 자동 강화' },
  { id: 'gear', label: '장비', icon: '🎒', sub: '장착 · 합성 · 별빛 단련 · 룬 각인' },
  { id: 'companion', label: '동료', icon: '🐉', sub: '편성 · 동료 소환' },
  { id: 'skill', label: '스킬', icon: '✨', sub: '스킬 강화' },
  { id: 'adventure', label: '모험', icon: '🏰', sub: '던전 · 탑 · 레이드 · 아레나' },
  { id: 'summon', label: '소환', icon: '🎁', sub: '장비 소환 · 확률 · 도감' },
];
/** 탭바에는 없지만 아이콘/캐릭터 카드로 여는 화면 */
const EXTRA_VIEWS: Record<string, { label: string; icon: string; sub: string }> = {
  record: { label: '메뉴', icon: '📜', sub: '미션 · 출석 · 퀘스트 · 도감 · 랭킹 · 통계' },
  job: { label: '전직', icon: '🏅', sub: '1차 → 4차 전직 트리' },
};

export interface PanelHooks {
  openSettings: () => void;
  openAdvance: () => void;
  openReclass: (path: JobPath) => void;
  rank: RankTabHooks;
  onSheet: (open: boolean) => void;
}

/** 하단 탭바 + 올라오는 시트. 같은 탭을 다시 누르면 닫혀 전투 화면이 넓어진다. */
export class Panels {
  private game: Game;
  private views: Record<ViewId, TabView>;
  private tabBtns = new Map<TabId, HTMLButtonElement>();
  private body: HTMLElement;
  private sheet: HTMLElement;
  private head: HTMLElement;
  private badges = new Map<TabId, HTMLElement>();
  private hooks: PanelHooks;
  active: ViewId = 'growth';
  open = true;

  constructor(game: Game, assets: Assets, hooks: PanelHooks) {
    this.game = game;
    this.hooks = hooks;
    this.views = {
      growth: createGrowthTab(game, assets, { openAdvance: hooks.openAdvance }),
      gear: createGearTab(game, assets),
      companion: createCompanionTab(game, assets),
      summon: createSummonTab(game, assets),
      skill: createSkillTab(game),
      job: createJobTab(game, { openAdvance: hooks.openAdvance, openReclass: hooks.openReclass }),
      adventure: createAdventureTab(game, assets),
      record: createRecordTab(game, hooks.rank, { openSettings: hooks.openSettings }),
    };
    this.sheet = qs('#sheet');
    this.head = qs('#sheetHead');
    this.body = qs('#tabBody');
    const bar = qs('#tabbar');
    for (const t of TABS) {
      const badge = h('span', { class: 'badge' });
      badge.hidden = true;
      const icon = h('span', { class: 'tab-icon', text: t.icon });
      const img = assets.image(`tab_${t.id}`);
      if (img) icon.replaceChildren(h('img', { attrs: { src: img.src, alt: '' } }));
      const btn = h('button', { class: 'tab', attrs: { 'data-tab': t.id }, on: { click: () => (this.active === t.id && this.open ? this.close() : this.show(t.id)) } }, icon, h('span', { class: 'tab-label', text: t.label }), badge) as HTMLButtonElement;
      bar.append(btn);
      this.tabBtns.set(t.id, btn);
      this.badges.set(t.id, badge);
    }
    this.show('growth');
  }

  show(id: ViewId, sub?: string): void {
    this.active = id;
    this.open = true;
    const def = TABS.find((t) => t.id === (id as TabId)) ?? EXTRA_VIEWS[id]!;
    for (const [k, b] of this.tabBtns) toggleClass(b, 'active', k === id);
    this.head.replaceChildren(h('div', {}, h('span', { text: `${def.icon} ${def.label}` }), h('span', { class: 'sub', text: def.sub })), h('button', { class: 'sheet-close ghost', text: '✕', attrs: { 'aria-label': '닫기' }, on: { click: () => this.close() } }));
    this.body.replaceChildren(this.views[id].el);
    this.body.scrollTop = 0;
    this.sheet.classList.add('open');
    this.views[id].onShow?.(sub);
    this.views[id].update();
    this.hooks.onSheet(true);
  }

  close(): void {
    this.open = false;
    for (const b of this.tabBtns.values()) b.classList.remove('active');
    this.sheet.classList.remove('open');
    this.hooks.onSheet(false);
  }

  update(): void {
    const s = this.game.state;
    if (this.open) this.views[this.active].update();
    this.badge('growth', this.game.canAdvance());
    this.badge('gear', Object.values(s.inventory).some((v) => (v ?? 0) >= 5));
    this.badge('summon', s.gems >= GEMS.tenPullCost);
    this.badge('companion', s.gems >= GEMS.companionCost);
    this.badge('adventure', this.game.battle.mode === 'stage' && (s.daily.goldTickets > 0 || s.daily.gemTickets > 0 || s.daily.towerTickets > 0 || s.daily.raidTickets > 0) && s.progress.maxStage >= 5);
  }

  private badge(id: TabId, on: boolean): void {
    const b = this.badges.get(id);
    if (b && b.hidden === on) b.hidden = !on;
  }
}
