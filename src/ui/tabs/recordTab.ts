import type { Game } from '@/app/game';
import { ACHIEVEMENTS } from '@/game/achievements';
import { REGIONS } from '@/game/monsters';
import { QUEST_NAMES, questGoldReward, questType } from '@/game/quests';
import { GEMS } from '@/game/balance';
import { ATTENDANCE_REWARDS, MISSIONS, MISSION_ALL_BONUS, attendanceAvailable, missionClaimed, missionDone } from '@/game/missions';
import { todayKey } from '@/game/state';
import { formatTime } from '@/util/format';
import { h, N, setText, toggleClass } from '../dom';
import type { TabView } from './growthTab';
import { createRankTab, type RankTabHooks } from './rankTab';

export function createRecordTab(game: Game, rankHooks: RankTabHooks, hooks: { openSettings: () => void }): TabView {
  const questTitle = h('b');
  const questBar = h('div', { class: 'bar-fill quest' });
  const questText = h('div', { class: 'small muted' });
  const achWrap = h('div', { class: 'ach-grid' });
  const achEls = new Map<string, HTMLElement>();
  for (const a of ACHIEVEMENTS) {
    const el = h('div', { class: 'ach', title: a.description }, h('b', { text: a.name }), h('span', { class: 'small', text: a.description }), h('span', { class: 'small gem', text: `+${a.gems} 별점` }));
    achWrap.append(el);
    achEls.set(a.id, el);
  }
  const codex = h('div', { class: 'codex' });
  const codexEls = new Map<string, { root: HTMLElement; kills: HTMLElement; name: HTMLElement }>();
  for (const r of REGIONS) {
    const grid = h('div', { class: 'codex-grid' });
    for (const m of [...r.monsters, r.boss]) {
      const name = h('b', { text: '???' });
      const kills = h('span', { class: 'small muted' });
      const root = h('div', { class: 'codex-cell', style: `--mc:${m.color}` }, h('span', { class: 'codex-dot' }), name, kills);
      grid.append(root);
      codexEls.set(m.id, { root, kills, name });
    }
    codex.append(h('div', { class: 'codex-region' }, h('div', { class: 'small', style: `color:${r.accent}`, text: r.name }), grid));
  }
  const stats = h('div', { class: 'stat-list' });
  const attendBtn = h('button', { class: 'primary', text: '출석 보상 받기', on: { click: () => game.claimAttendance() } }) as HTMLButtonElement;
  const attendDays = h('div', { class: 'attend-grid' });
  const missionList = h('div', { class: 'rows' });
  const missionEls = new Map<string, { root: HTMLElement; prog: HTMLElement; bar: HTMLElement; btn: HTMLButtonElement }>();
  for (const m of MISSIONS) {
    const prog = h('span', { class: 'row-lv' });
    const bar = h('div', { class: 'bar-fill quest' });
    const btn = h('button', { class: 'small-btn green', text: `+${m.gems}★`, on: { click: () => game.claimMission(m.id) } }) as HTMLButtonElement;
    const root = h('div', { class: 'row-card' }, h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: m.name }), prog), h('div', { class: 'bar', style: 'margin-top:4px;height:8px' }, bar)), btn);
    missionList.append(root);
    missionEls.set(m.id, { root, prog, bar, btn });
  }
  const missionBonus = h('div', { class: 'tiny muted' });
  const attendPane = h('div', {}, h('div', { class: 'section-title' }, h('span', { text: '출석 보상' })), h('div', { class: 'card' }, attendDays, attendBtn), h('div', { class: 'tiny muted', style: 'margin-top:6px', text: '7일 주기로 반복되며 마지막 날 보상이 가장 큽니다.' }));
  const missionPane = h('div', {}, h('div', { class: 'section-title' }, h('span', { text: '일일 미션' }), missionBonus), missionList, h('div', { class: 'tiny muted', style: 'margin-top:6px', text: '매일 자정에 초기화됩니다.' }));
  const rank = createRankTab(game, rankHooks);
  const sub = h('div', { class: 'menu-grid' });
  const sections: Record<string, HTMLElement> = {};
  const subBtns = new Map<string, HTMLButtonElement>();
  let active = 'quest';
  const body = h('div');
  const entries: [string, string, HTMLElement][] = [
    ['attend', '🗓️ 출석', attendPane],
    ['mission', '📋 미션', missionPane],
    ['quest', '🎯 퀘스트', h('div', {}, h('div', { class: 'card quest-card' }, h('div', { class: 'row' }, questTitle, h('span', { class: 'small gem', text: '' })), h('div', { class: 'bar' }, questBar), questText), h('div', { class: 'section-title' }, h('span', { text: '업적' })), achWrap)],
    ['codex', '📖 도감', h('div', {}, h('div', { class: 'small muted', style: 'margin-bottom:6px', text: '몬스터를 처치하면 등록됩니다. 종류당 공격력·체력 +1% (최대 40종).' }), codex)],
    ['stats', '📊 통계', stats],
    ['rank', '🏆 랭킹', rank.el],
  ];
  for (const [id, label, elx] of entries) {
    sections[id] = elx;
    const [ic, ...rest] = label.split(' ');
    const btn = h('button', { on: { click: () => show(id) } }, h('span', { text: ic }), h('span', { text: rest.join(' ') }));
    subBtns.set(id, btn);
    sub.append(btn);
  }
  sub.append(h('button', { on: { click: () => hooks.openSettings() } }, h('span', { text: '⚙️' }), h('span', { text: '설정·저장' })));
  function show(id: string): void {
    active = id;
    for (const [k, b] of subBtns) toggleClass(b, 'active', k === id);
    body.replaceChildren(sections[id]!);
    if (id === 'rank') rank.onShow?.();
  }
  const el = h('div', {}, sub, body);
  show('attend');

  function update(): void {
    const s = game.state;
    if (active === 'attend' || active === 'mission') {
      const today = todayKey();
      const avail = attendanceAvailable(s, today);
      attendBtn.disabled = !avail;
      const day = s.attendance.day % ATTENDANCE_REWARDS.length;
      setText(attendBtn, avail ? `${day + 1}일차 출석 · 별점 +${ATTENDANCE_REWARDS[day]}` : '오늘 출석 완료 (내일 다시)');
      attendDays.replaceChildren(...ATTENDANCE_REWARDS.map((g, i) => h('div', { class: `attend-day${i < day || (!avail && i === day) ? ' done' : ''}${i === day && avail ? ' today' : ''}` }, h('span', { class: 'tiny', text: `${i + 1}일` }), h('b', { text: `${g}★` }))));
      let allDone = true;
      for (const m of MISSIONS) {
        const e = missionEls.get(m.id)!;
        const p = Math.min(m.target, s.missions.progress[m.id] ?? 0);
        const done = missionDone(s, m.id);
        const claimed = missionClaimed(s, m.id);
        if (!claimed) allDone = false;
        setText(e.prog, `${N(p)}/${N(m.target)}`);
        e.bar.style.width = `${((p / m.target) * 100).toFixed(0)}%`;
        e.btn.disabled = !done || claimed;
        setText(e.btn, claimed ? '완료' : `+${m.gems}★`);
        toggleClass(e.root, 'affordable', done && !claimed);
      }
      setText(missionBonus, allDone ? `전체 완료 보너스 +${MISSION_ALL_BONUS}★ 수령` : `전체 완료 시 보너스 +${MISSION_ALL_BONUS}★`);
    } else if (active === 'quest') {
      const type = questType(s);
      setText(questTitle, `${QUEST_NAMES[type]} ${N(Math.min(s.quest.progress, s.quest.target))} / ${N(s.quest.target)}`);
      questBar.style.width = `${Math.min(100, (s.quest.progress / s.quest.target) * 100).toFixed(1)}%`;
      setText(questText, `보상: 별점 ${GEMS.questReward(s.quest.cycle)} + 골드 ${N(questGoldReward(s))} · ${s.quest.cycle + 1}회차 (달성 시 자동 수령)`);
      for (const a of ACHIEVEMENTS) toggleClass(achEls.get(a.id)!, 'done', s.achievements[a.id] !== undefined);
    } else if (active === 'codex') {
      for (const [id, c] of codexEls) {
        const k = s.codex[id] ?? 0;
        const found = k > 0;
        toggleClass(c.root, 'found', found);
        if (found) {
          const m = REGIONS.flatMap((r) => [...r.monsters, r.boss]).find((x) => x.id === id);
          setText(c.name, m?.name ?? id);
          setText(c.kills, `${N(k)}마리`);
        }
      }
    } else if (active === 'stats') {
      const st = s.stats;
      stats.replaceChildren(
        ...[
          ['최고 스테이지', String(s.progress.maxStage)],
          ['플레이 시간', formatTime(st.playtimeSec)],
          ['총 처치', N(st.totalKills)],
          ['보스 처치', N(s.progress.bossKills)],
          ['보스 도전', N(st.bossAttempts)],
          ['누적 골드', N(st.totalGold)],
          ['누적 피해', N(st.totalDamage)],
          ['강화 구매', N(st.upgradesBought)],
          ['장비 뽑기', N(st.gachaPulls)],
          ['스킬 시전', N(st.skillCasts)],
          ['탭 공격', N(st.taps)],
          ['오프라인 복귀', `${st.offlineReturns}회`],
          ['시작일', new Date(s.createdAt).toLocaleDateString()],
        ].map(([k, v]) => h('div', { class: 'stat' }, h('span', { class: 'k', text: k }), h('span', { class: 'v', text: v }))),
      );
    } else rank.update();
  }
  return { el, update, onShow: (id?: string) => { if (id && sections[id]) show(id); } };
}
