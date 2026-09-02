import type { Game } from '@/app/game';
import { h, setText } from './dom';

interface Hint {
  id: string;
  text: string;
  when: (g: Game, t: number) => boolean;
}

const HINTS: Hint[] = [
  { id: 'idle', text: '영웅은 알아서 싸우고 스테이지를 넘어갑니다. 골드가 모이면 강화하세요.', when: (_g, t) => t > 3 },
  { id: 'buy', text: '골드가 모였어요! 성장 탭에서 공격력을 강화하세요.', when: (g) => g.state.gold >= 10 && g.state.stats.upgradesBought === 0 },
  { id: 'gacha', text: '별점 10개로 장비를 뽑을 수 있어요. 장비 탭!', when: (g) => g.state.gems >= 10 && g.state.pity.pulls === 0 },
  { id: 'boss', text: '보스 스테이지! 30초 안에 처치하세요. 실패하면 직전 스테이지에서 강해져서 다시 도전.', when: (g) => g.state.progress.stage >= 10 && g.state.progress.bossMode },
  { id: 'job', text: 'Lv 10 달성! 전직 탭에서 직업을 고르면 훨씬 강해집니다.', when: (g) => g.canAdvance() },
  { id: 'star', text: '스타포스: 장비 탭에서 장착 장비를 골드로 강화할 수 있어요.', when: (g) => g.state.progress.maxStage >= 15 && Object.values(g.state.hero.stars).every((v) => v === 0) && g.state.hero.equipped.weapon !== null },
  { id: 'dungeon', text: '던전 탭에서 일일 골드 던전에 입장해 보세요.', when: (g) => g.state.progress.maxStage >= 8 && g.state.daily.goldTickets === 3 },
];

export class Tutorial {
  private game: Game;
  private el: HTMLElement;
  private text: HTMLElement;
  private shownAt = 0;
  private currentId: string | null = null;

  constructor(game: Game, el: HTMLElement) {
    this.game = game;
    this.el = el;
    this.text = h('span');
    el.append(h('span', { class: 'hint-icon', text: '💡' }), this.text, h('button', { class: 'hint-close', text: '✕', attrs: { 'aria-label': '닫기' }, on: { click: () => this.dismiss() } }));
  }

  private dismiss(): void {
    if (this.currentId) this.game.markTutorial(this.currentId);
    this.currentId = null;
    this.el.hidden = true;
  }

  update(t: number): void {
    if (this.currentId) {
      if (t - this.shownAt > 9) this.dismiss();
      return;
    }
    const seen = this.game.state.tutorialSeen;
    for (const hnt of HINTS) {
      if (seen.includes(hnt.id)) continue;
      if (!hnt.when(this.game, t)) continue;
      this.currentId = hnt.id;
      this.shownAt = t;
      setText(this.text, hnt.text);
      this.el.hidden = false;
      return;
    }
  }
}
