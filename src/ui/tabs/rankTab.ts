import type { Game } from '@/app/game';
import { JOBS, jobTitle } from '@/game/jobs';
import { fetchTop, getPlayerId, getPlayerName, isValidName, setPlayerName, type Entry } from '@/rank/leaderboard';
import { h, setText } from '../dom';
import type { TabView } from './growthTab';

export type NoviceBoard = 'novice-stage' | 'novice-level';
export const BOARD_LABELS: Record<NoviceBoard, string> = { 'novice-stage': '최고 스테이지', 'novice-level': '레벨' };

export interface RankTabHooks {
  submitNow: () => Promise<string>;
}

export function currentScores(game: Game): { stage: number; level: number; job: string; tier: number; title: string } {
  const s = game.state;
  return { stage: s.progress.maxStage, level: s.hero.level, job: s.hero.job ?? 'novice', tier: s.hero.tier, title: jobTitle(s.hero.job, s.hero.tier) };
}

export function createRankTab(game: Game, hooks: RankTabHooks): TabView {
  let board: NoviceBoard = 'novice-stage';
  const nameInput = h('input', { class: 'text-input', attrs: { type: 'text', maxlength: '12', placeholder: '닉네임 (2~12자)' } }) as HTMLInputElement;
  nameInput.value = getPlayerName();
  const nameMsg = h('div', { class: 'small muted', style: 'margin-top:4px;min-height:16px' });
  const saveBtn = h('button', {
    class: 'primary',
    text: '저장 후 등록',
    on: {
      click: () => {
        if (!isValidName(nameInput.value)) {
          setText(nameMsg, '닉네임은 2~12자여야 합니다');
          return;
        }
        setPlayerName(nameInput.value);
        setText(nameMsg, '등록 중…');
        saveBtn.disabled = true;
        void hooks.submitNow().then((m) => {
          setText(nameMsg, m);
          saveBtn.disabled = false;
          void refresh();
        });
      },
    },
  });
  const seg = h('div', { class: 'seg' });
  const segBtns: HTMLButtonElement[] = [];
  for (const b of ['novice-stage', 'novice-level'] as const) {
    const btn = h('button', { text: BOARD_LABELS[b], class: b === board ? 'active' : '' });
    btn.addEventListener('click', () => {
      board = b;
      for (const x of segBtns) x.classList.toggle('active', x === btn);
      void refresh();
    });
    segBtns.push(btn);
    seg.append(btn);
  }
  const status = h('div', { class: 'small muted', style: 'margin:6px 0' });
  const tableWrap = h('div', { class: 'table-wrap' });
  const refreshBtn = h('button', { text: '새로고침', on: { click: () => void refresh() } });
  const mine = h('div', { class: 'small muted', style: 'margin-top:8px' });
  const el = h(
    'div',
    {},
    h('div', { class: 'card' }, h('b', { text: '랭킹 등록' }), h('div', { class: 'muted small', text: '닉네임을 저장하면 최고 스테이지와 레벨이 자동으로 랭킹에 올라갑니다 (보스 처치·레벨업마다, 그리고 주기적으로).' }), h('div', { class: 'row', style: 'gap:8px;margin-top:8px' }, nameInput, saveBtn), nameMsg),
    h('div', { class: 'section-title' }, h('span', { text: '전세계 랭킹' }), seg),
    h('div', { class: 'row' }, status, refreshBtn),
    tableWrap,
    mine,
  );

  let loading = false;
  let lastLoaded = -1e9;
  async function refresh(): Promise<void> {
    if (loading) return;
    loading = true;
    setText(status, '불러오는 중…');
    try {
      const entries = await fetchTop(board, 50);
      renderTable(entries);
      setText(status, `상위 ${entries.length}명`);
      lastLoaded = performance.now();
    } catch {
      setText(status, '랭킹 서버에 연결할 수 없습니다');
    } finally {
      loading = false;
    }
  }

  function renderTable(entries: Entry[]): void {
    tableWrap.replaceChildren();
    if (entries.length === 0) {
      tableWrap.append(h('div', { class: 'muted small', style: 'padding:12px', text: '아직 기록이 없습니다. 첫 번째가 되어 보세요.' }));
      setText(mine, '');
      return;
    }
    const pid = getPlayerId();
    const table = h('table', { class: 'rank-table' });
    table.append(h('tr', {}, th('#'), th('이름'), th(board === 'novice-stage' ? '스테이지' : '레벨'), th('직업')));
    entries.forEach((e, i) => {
      const isMe = e.pid === pid;
      const tr = h('tr', { class: isMe ? 'me' : '' });
      const rankColor = i === 0 ? 'var(--gold)' : i === 1 ? '#d8dee9' : i === 2 ? '#d9a066' : 'var(--muted)';
      const job = String(e.meta.job ?? 'novice');
      const jobName = job in JOBS ? JOBS[job as keyof typeof JOBS].name : '초보자';
      tr.append(td(String(i + 1), `color:${rankColor};font-weight:700`), td(e.name, 'max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap'), td(board === 'novice-stage' ? String(e.meta.stage ?? e.score) : `Lv.${e.meta.level ?? e.score}`, 'font-weight:600'), td(`${jobName} ${Number(e.meta.tier ?? 0)}차`, 'color:var(--muted)'));
      table.append(tr);
    });
    tableWrap.append(table);
    const my = entries.findIndex((e) => e.pid === pid);
    setText(mine, my >= 0 ? `내 순위: ${my + 1}위` : getPlayerName() ? '내 기록은 아직 상위 50위 밖입니다' : '닉네임을 저장하면 내 기록이 등록됩니다');
  }
  const th = (t: string) => h('th', { text: t });
  const td = (t: string, style = '') => h('td', { text: t, style });

  return {
    el,
    update: () => {
      if (performance.now() - lastLoaded > 120000 && !loading) void refresh();
    },
    onShow: () => {
      if (performance.now() - lastLoaded > 15000 && !loading) void refresh();
    },
  };
}
