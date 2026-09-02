import type { Game } from '@/app/game';
import { GEMS, JOB_LEVELS, JOB_MULT, RARITY_COLORS, RARITY_NAMES, SLOT_NAMES } from '@/game/balance';
import type { PullResult } from '@/game/equipment';
import { COMPANION_BY_ID, COMPANION_RARITY_COLORS, COMPANION_RARITY_NAMES, type CompanionPull } from '@/game/companions';
import { JOBS, JOB_PATHS, jobTitle, type JobPath, type JobTier } from '@/game/jobs';
import type { OfflineReport } from '@/game/offline';
import { formatTime } from '@/util/format';
import { heroSpriteId, type Assets } from '@/render/assets';
import { drawHero } from '@/render/fallback';
import { drawSprite } from '@/render/sprites';
import { h, N, setNumberMode } from './dom';
import type { Toasts } from './toast';

export interface ModalHooks {
  onAdvanced: (tier: JobTier) => void;
}

export class Modals {
  private root: HTMLElement;
  private game: Game;
  private toasts: Toasts;
  private assets: Assets;
  private hooks: ModalHooks;
  private current: HTMLElement | null = null;

  constructor(root: HTMLElement, game: Game, toasts: Toasts, assets: Assets, hooks: ModalHooks) {
    this.root = root;
    this.game = game;
    this.toasts = toasts;
    this.assets = assets;
    this.hooks = hooks;
    root.addEventListener('click', (e) => {
      if (e.target === root) this.close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.current) this.close();
    });
  }

  get isOpen(): boolean {
    return this.current !== null;
  }

  private open(modal: HTMLElement): void {
    this.close();
    this.current = modal;
    this.root.replaceChildren(modal);
    this.root.hidden = false;
  }

  close(): void {
    if (!this.current) return;
    this.current = null;
    this.root.hidden = true;
    this.root.replaceChildren();
  }

  private preview(job: JobPath | null, tier: JobTier, size = 96): HTMLCanvasElement {
    const c = h('canvas', { class: 'job-preview', attrs: { width: String(size * 2), height: String(size * 2) } }) as HTMLCanvasElement;
    const ctx = c.getContext('2d')!;
    const t0 = performance.now();
    let attached = false;
    const draw = () => {
      if (c.isConnected) attached = true;
      else if (attached || performance.now() - t0 > 3000) return;
      const t = (performance.now() - t0) / 1000;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.clearRect(0, 0, size, size);
      const anim = t % 3 < 2.2 ? 'idle' : 'attack';
      const at = anim === 'attack' ? (t % 3) - 2.2 : t;
      if (!drawSprite(ctx, this.assets, heroSpriteId(job, tier), anim, at, size / 2, size - 10, { scale: 1.1 })) drawHero(ctx, job, tier, anim, at, t, size / 2, size - 10, 1.1);
      requestAnimationFrame(draw);
    };
    draw();
    return c;
  }

  openAdvance(): void {
    const s = this.game.state;
    if (!this.game.canAdvance()) return;
    const next = (s.hero.tier + 1) as JobTier;
    if (next === 1) {
      const cards = JOB_PATHS.map((p) => {
        const j = JOBS[p];
        return h(
          'button',
          {
            class: 'job-pick',
            style: `--jc:${j.color}`,
            on: {
              click: () => {
                const t = this.game.advance(p);
                this.close();
                if (t !== null) this.hooks.onAdvanced(t);
              },
            },
          },
          this.preview(p, 1, 110),
          h('b', { text: j.name }),
          h('span', { class: 'small', text: j.tiers.join(' → ') }),
          h('span', { class: 'small muted', text: j.description }),
          h('span', { class: 'small', text: `첫 스킬: ${j.skills[0].name}` }),
        );
      });
      this.open(h('div', { class: 'modal wide' }, h('h2', { text: '1차 전직 · 직업을 고르세요' }), h('p', { class: 'muted small', text: `모든 직업은 공격력·체력 ×${JOB_MULT[1]}. 선택은 유지되며 나중에 별점 ${GEMS.reclassCost}으로 전환할 수 있습니다.` }), h('div', { class: 'job-picks' }, ...cards), h('div', { class: 'modal-actions' }, h('button', { text: '나중에', on: { click: () => this.close() } }))));
      return;
    }
    const job = s.hero.job!;
    const j = JOBS[job];
    const newSkill = j.skills[next - 1]!;
    this.open(
      h(
        'div',
        { class: 'modal' },
        h('h2', { text: `${next}차 전직 · ${j.tiers[next - 1]}` }),
        h('div', { class: 'advance-preview' }, h('div', {}, this.preview(job, s.hero.tier), h('div', { class: 'small muted', style: 'text-align:center', text: jobTitle(job, s.hero.tier) })), h('div', { class: 'arrow', text: '→' }), h('div', {}, this.preview(job, next), h('div', { class: 'small', style: `text-align:center;color:${j.color}`, text: j.tiers[next - 1] }))),
        h('ul', { class: 'small' }, h('li', { text: `공격력·체력 배율 ×${JOB_MULT[s.hero.tier]} → ×${JOB_MULT[next]}` }), h('li', { text: `새 스킬: ${newSkill.name} — ${newSkill.description}` }), next === 4 ? h('li', { text: '방치 보상 상한 8시간 → 12시간' }) : null),
        h('div', { class: 'modal-actions' }, h('button', { text: '나중에', on: { click: () => this.close() } }), h('button', { class: 'primary', text: '전직!', on: { click: () => { const t = this.game.advance(); this.close(); if (t !== null) this.hooks.onAdvanced(t); } } })),
      ),
    );
  }

  openReclass(path: JobPath): void {
    const s = this.game.state;
    const j = JOBS[path];
    this.open(
      h(
        'div',
        { class: 'modal' },
        h('h2', { text: `${j.name}(으)로 전환` }),
        this.preview(path, s.hero.tier),
        h('p', { class: 'small', text: `${jobTitle(s.hero.job, s.hero.tier)} → ${jobTitle(path, s.hero.tier)}. 차수와 레벨은 유지되고, ${j.name} 스킬 ${s.hero.tier}개가 열립니다. 이전 직업의 스킬 레벨은 보관됩니다. 비용 별점 ${GEMS.reclassCost} (보유 ${s.gems}).` }),
        h('div', { class: 'modal-actions' }, h('button', { text: '취소', on: { click: () => this.close() } }), h('button', { class: 'primary', text: '전환', on: { click: () => { if (this.game.reclass(path)) { this.close(); this.hooks.onAdvanced(this.game.state.hero.tier); } else this.toasts.show('별점이 부족합니다', 'warn'); } } })),
      ),
    );
  }

  openGacha(results: PullResult[]): void {
    const s = this.game.state;
    const cells = results.map((r, i) =>
      h('div', { class: `gacha-cell r${r.rarity}`, style: `--rc:${RARITY_COLORS[r.rarity]};animation-delay:${i * 90}ms` }, h('span', { class: 'gacha-icon', text: r.slot === 'weapon' ? '⚔️' : r.slot === 'armor' ? '🛡️' : r.slot === 'accessory' ? '💍' : '🐾' }), h('b', { text: RARITY_NAMES[r.rarity] }), h('span', { class: 'small', text: SLOT_NAMES[r.slot] }), h('span', { class: 'small tag', text: r.isNew ? 'NEW' : `Lv ${r.level}` }), r.pity !== 'none' ? h('span', { class: 'small pity', text: r.pity === 'ten' ? '10연 보장' : r.pity === 'hero' ? '영웅 보장' : '전설 보장' }) : null),
    );
    const best = Math.max(...results.map((r) => r.rarity));
    const again = h('button', { class: 'primary', text: results.length === 10 ? `다시 10회 (${GEMS.tenPullCost} ★)` : `다시 1회 (${GEMS.pullCost} ★)`, on: { click: () => this.game.gacha(results.length === 10 ? 10 : 1) } }) as HTMLButtonElement;
    again.disabled = s.gems < (results.length === 10 ? GEMS.tenPullCost : GEMS.pullCost);
    this.open(h('div', { class: `modal gacha best${best}` }, h('h2', { text: best >= 4 ? '✨ 대박!' : '장비 뽑기 결과' }), h('div', { class: 'gacha-grid' }, ...cells), h('div', { class: 'small muted', text: '가장 좋은 장비가 자동 장착됩니다. 중복은 장비 레벨업(+8%).' }), h('div', { class: 'modal-actions' }, h('button', { text: '닫기', on: { click: () => this.close() } }), again)));
  }

  openSummon(results: CompanionPull[]): void {
    const cells = results.map((r, i) => {
      const c = COMPANION_BY_ID[r.id];
      return h('div', { class: `gacha-cell r${Math.min(5, c.rarity)}`, style: `--rc:${COMPANION_RARITY_COLORS[c.rarity]};animation-delay:${i * 90}ms` }, h('span', { class: 'gacha-icon', text: c.icon }), h('b', { text: c.name }), h('span', { class: 'small', text: COMPANION_RARITY_NAMES[c.rarity] }), h('span', { class: 'small tag', text: r.isNew ? 'NEW' : `Lv ${r.level}` }));
    });
    const best = Math.max(...results.map((r) => COMPANION_BY_ID[r.id].rarity));
    const again = h('button', { class: 'primary', text: results.length === 10 ? `다시 10회 (${GEMS.companionTenCost} ★)` : `다시 1회 (${GEMS.companionCost} ★)`, on: { click: () => this.game.summonCompanion(results.length === 10 ? 10 : 1) } }) as HTMLButtonElement;
    again.disabled = this.game.state.gems < (results.length === 10 ? GEMS.companionTenCost : GEMS.companionCost);
    this.open(h('div', { class: `modal gacha best${best}` }, h('h2', { text: best >= 6 ? '🌟 초월 동료!!' : best >= 5 ? '✨ 신화 동료!' : best >= 4 ? '✨ 전설 동료!' : '동료 소환 결과' }), h('div', { class: 'gacha-grid' }, ...cells), h('div', { class: 'small muted', text: '가장 강한 동료 3명이 자동 장착됩니다. 중복은 동료 레벨업.' }), h('div', { class: 'modal-actions' }, h('button', { text: '닫기', on: { click: () => this.close() } }), again)));
  }

  openOffline(r: OfflineReport): void {
    this.open(
      h(
        'div',
        { class: 'modal' },
        h('h2', { text: '다시 오셨군요!' }),
        h('p', { class: 'small', text: `${formatTime(r.elapsed)} 동안 자리를 비우셨습니다${r.capped ? ` (상한 적용, 실제 ${formatTime(r.requested)})` : ''}.` }),
        h('div', { class: 'breakdown' }, h('div', {}, h('span', { text: '골드' }), h('span', { text: `+${N(r.gold)} G` })), h('div', {}, h('span', { text: '경험치' }), h('span', { text: `+${N(r.exp)}` }))),
        h('p', { class: 'small muted', text: '방치 보상은 접속 중 평균 수입의 50%입니다. 4차 전직 시 상한이 12시간으로 늘어납니다.' }),
        h('div', { class: 'modal-actions' }, h('button', { class: 'primary', text: '받기', on: { click: () => this.close() } })),
      ),
    );
  }

  openSettings(): void {
    const g = this.game;
    const s = g.state.settings;
    const row = (label: string, ctrl: HTMLElement) => h('label', { class: 'setting-row' }, h('span', { text: label }), ctrl);
    const check = (key: 'sound' | 'autoBoss' | 'reducedMotion' | 'showDamage') => {
      const c = h('input', { attrs: { type: 'checkbox' } }) as HTMLInputElement;
      c.checked = s[key];
      c.addEventListener('change', () => g.setSetting(key, c.checked));
      return c;
    };
    const vol = h('input', { attrs: { type: 'range', min: '0', max: '1', step: '0.05' } }) as HTMLInputElement;
    vol.value = String(s.volume);
    vol.addEventListener('input', () => g.setSetting('volume', Number(vol.value)));
    const fmt = h('select', {}, h('option', { text: '한국식 (만·억)', attrs: { value: 'korean' } }), h('option', { text: '지수 (1.2e6)', attrs: { value: 'scientific' } })) as HTMLSelectElement;
    fmt.value = s.numberFormat;
    fmt.addEventListener('change', () => {
      g.setSetting('numberFormat', fmt.value as 'korean' | 'scientific');
      setNumberMode(fmt.value as 'korean' | 'scientific');
    });
    const exportArea = h('textarea', { attrs: { readonly: 'true', rows: '3' } }) as HTMLTextAreaElement;
    exportArea.value = g.exportSave();
    const copyBtn = h('button', { text: '복사', on: { click: () => { void navigator.clipboard?.writeText(exportArea.value).then(() => this.toasts.show('저장 코드를 복사했습니다', 'info')); exportArea.select(); } } });
    const importArea = h('textarea', { attrs: { rows: '3', placeholder: 'NOVICE1:… 저장 코드를 붙여넣으세요' } }) as HTMLTextAreaElement;
    const importBtn = h('button', { text: '불러오기', on: { click: () => { if (!importArea.value.trim()) return; if (!confirm('현재 진행 상황을 덮어씁니다. 계속할까요?')) return; if (g.importSave(importArea.value.trim())) { this.toasts.show('저장 코드를 불러왔습니다', 'info'); this.close(); } else this.toasts.show('저장 코드가 올바르지 않습니다', 'warn'); } } });
    let resetArmed = false;
    const resetBtn = h('button', { class: 'danger', text: '전체 초기화' });
    resetBtn.addEventListener('click', () => {
      if (!resetArmed) {
        resetArmed = true;
        resetBtn.textContent = '정말 초기화할까요? (다시 클릭)';
        window.setTimeout(() => { resetArmed = false; resetBtn.textContent = '전체 초기화'; }, 4000);
        return;
      }
      g.hardReset();
      this.close();
      this.toasts.show('처음부터 다시 시작합니다', 'info');
    });
    this.open(
      h(
        'div',
        { class: 'modal' },
        h('h2', { text: '설정' }),
        row('효과음', check('sound')),
        row('볼륨', vol),
        row('숫자 표기', fmt),
        row('보스 자동 재도전 (60초마다)', check('autoBoss')),
        row('데미지 숫자 표시', check('showDamage')),
        row('움직임 줄이기', check('reducedMotion')),
        h('h3', { text: '저장 코드 내보내기' }),
        exportArea,
        h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:4px' }, copyBtn),
        h('h3', { text: '저장 코드 불러오기' }),
        importArea,
        h('div', { class: 'row', style: 'justify-content:flex-end;margin-top:4px' }, importBtn),
        h('h3', { text: '위험 구역' }),
        h('div', { class: 'row' }, h('span', { class: 'small muted', text: '모든 진행·장비·전직이 삭제됩니다.' }), resetBtn),
        h('div', { class: 'modal-actions' }, h('button', { class: 'primary', text: '닫기', on: { click: () => this.close() } })),
      ),
    );
  }

  openHelp(): void {
    this.open(
      h(
        'div',
        { class: 'modal' },
        h('h2', { text: '초보자 키우기: 전직의 대륙' }),
        h('ul', { class: 'small help' },
          h('li', { text: '영웅은 자동으로 싸우고 스테이지를 넘어갑니다. 화면 위 ◀ ▶로 사냥터(스테이지)를 고를 수 있어요.' }),
          h('li', { text: '골드로 8가지 능력을 강화하고, 별점으로 장비를 뽑습니다. 중복 장비는 레벨업.' }),
          h('li', { text: `Lv ${JOB_LEVELS[1]}·${JOB_LEVELS[2]}·${JOB_LEVELS[3]}·${JOB_LEVELS[4]}에 1~4차 전직. 1차에서 전사·마법사·궁수·도적 중 선택, 차수마다 스킬 1개와 큰 배율.` }),
          h('li', { text: '10번째 스테이지마다 보스. 30초 안에 못 잡으면 직전 스테이지에서 농사하며 자동 재도전.' }),
          h('li', { text: '별빛 단련: 장착 장비를 골드로 별 25개까지 강화 (별당 +6%).' }),
          h('li', { text: '던전 입장권은 매일 충전. 게임을 꺼도 방치 보상이 쌓입니다 (최대 8시간).' }),
        ),
        h('div', { class: 'modal-actions' }, h('button', { class: 'primary', text: '시작!', on: { click: () => this.close() } })),
      ),
    );
  }
}
