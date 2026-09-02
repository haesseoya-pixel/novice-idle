import type { Game } from '@/app/game';
import type { JobPath } from '@/game/jobs';
import type { Assets } from '@/render/assets';
import { h, qs, setText, toggleClass } from './dom';
import { createDungeonTab } from './tabs/dungeonTab';
import { createGearTab } from './tabs/gearTab';
import { createGrowthTab, type TabView } from './tabs/growthTab';
import { createJobTab } from './tabs/jobTab';
import { createRecordTab } from './tabs/recordTab';
import type { RankTabHooks } from './tabs/rankTab';
import { createSkillTab } from './tabs/skillTab';
import { createSummonTab } from './tabs/summonTab';

export type TabId = 'growth' | 'gear' | 'summon' | 'skill' | 'job' | 'dungeon' | 'record';
const TABS: { id: TabId; label: string; icon: string; sub: string }[] = [
  { id: 'growth', label: '강화', icon: '💪', sub: '돌파 강화 · 자동 강화' },
  { id: 'gear', label: '장비', icon: '🎒', sub: '뽑기 · 합성 · 스타포스 · 잠재능력' },
  { id: 'summon', label: '동료', icon: '🐉', sub: '동료 소환 · 유물' },
  { id: 'skill', label: '스킬', icon: '✨', sub: '스킬 강화' },
  { id: 'job', label: '전직', icon: '🏅', sub: '1차 → 4차 전직' },
  { id: 'dungeon', label: '던전', icon: '🏰', sub: '던전 · 무한의 탑 · 방치 보상' },
  { id: 'record', label: '메뉴', icon: '📜', sub: '미션 · 출석 · 퀘스트 · 도감 · 랭킹' },
];

export interface PanelHooks {
  openSettings: () => void;
  openAdvance: () => void;
  openReclass: (path: JobPath) => void;
  rank: RankTabHooks;
  onSheet: (open: boolean) => void;
}

/** Bottom sheet + tab bar. Tapping the active tab closes the sheet so the battle fills the screen. */
export class Panels {
  private game: Game;
  private views: Record<TabId, TabView>;
  private tabBtns = new Map<TabId, HTMLButtonElement>();
  private body: HTMLElement;
  private sheet: HTMLElement;
  private head: HTMLElement;
  private badges = new Map<TabId, HTMLElement>();
  private hooks: PanelHooks;
  active: TabId = 'growth';
  open = true;

  constructor(game: Game, assets: Assets, hooks: PanelHooks) {
    this.game = game;
    this.hooks = hooks;
    this.views = {
      growth: createGrowthTab(game, assets, { openAdvance: hooks.openAdvance }),
      gear: createGearTab(game, assets),
      summon: createSummonTab(game),
      skill: createSkillTab(game),
      job: createJobTab(game, { openAdvance: hooks.openAdvance, openReclass: hooks.openReclass }),
      dungeon: createDungeonTab(game),
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

  show(id: TabId, sub?: string): void {
    this.active = id;
    this.open = true;
    const def = TABS.find((t) => t.id === id)!;
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
    this.badge('job', this.game.canAdvance());
    this.badge('gear', s.gems >= 10 || Object.values(s.inventory).some((v) => (v ?? 0) >= 5));
    this.badge('dungeon', this.game.battle.mode === 'stage' && (s.daily.goldTickets > 0 || s.daily.gemTickets > 0 || s.daily.towerTickets > 0 || s.daily.raidTickets > 0) && s.progress.maxStage >= 5);
    this.badge('summon', s.gems >= 30);
    this.badge('growth', this.game.canAdvance());
  }

  private badge(id: TabId, on: boolean): void {
    const b = this.badges.get(id);
    if (b && b.hidden === on) b.hidden = !on;
  }

  setStatus(text: string): void {
    void setText;
    void text;
  }
}
