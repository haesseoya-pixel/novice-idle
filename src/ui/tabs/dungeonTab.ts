import type { Game } from '@/app/game';
import { ARENA, DUNGEON, OFFLINE, RAID, TOWER } from '@/game/balance';
import { raidPar, type ArenaOpponent } from '@/game/battle';
import { offlineCapSec } from '@/game/state';
import { sweepEstimate } from '@/game/sweep';
import { fetchTop, getPlayerId } from '@/rank/leaderboard';
import { formatTime } from '@/util/format';
import { h, N, setText } from '../dom';
import type { TabView } from './growthTab';

export function createDungeonTab(game: Game): TabView {
  const goldBtn = h('button', { class: 'primary', text: '입장', on: { click: () => game.enterDungeon('gold') } }) as HTMLButtonElement;
  const goldSweep = h('button', { class: 'ghost small-btn', text: '소탕', on: { click: () => game.sweep('gold') } }) as HTMLButtonElement;
  const gemBtn = h('button', { class: 'purple', text: '입장', on: { click: () => game.enterDungeon('gem') } }) as HTMLButtonElement;
  const gemSweep = h('button', { class: 'ghost small-btn', text: '소탕', on: { click: () => game.sweep('gem') } }) as HTMLButtonElement;
  const towerBtn = h('button', { class: 'red', text: '도전', on: { click: () => game.enterTower() } }) as HTMLButtonElement;
  const raidBtn = h('button', { class: 'red', text: '도전', on: { click: () => game.enterRaid() } }) as HTMLButtonElement;
  const goldTickets = h('span', { class: 'ticket' });
  const gemTickets = h('span', { class: 'ticket' });
  const towerTickets = h('span', { class: 'ticket' });
  const raidTickets = h('span', { class: 'ticket' });
  const arenaTickets = h('span', { class: 'ticket' });
  const towerInfo = h('div', { class: 'tiny muted' });
  const raidInfo = h('div', { class: 'tiny muted' });
  const goldInfo = h('div', { class: 'tiny muted' });
  const gemInfo = h('div', { class: 'tiny muted' });
  const arenaInfo = h('div', { class: 'tiny muted' });
  const arenaList = h('div', { class: 'rows' });
  const offline = h('div', { class: 'small' });
  const card = (cls: string, color: string, title: string, desc: string, ticket: HTMLElement, btns: HTMLElement[], extra?: HTMLElement) =>
    h('div', { class: `card dungeon ${cls}`, style: `--dc:${color}` }, h('div', { class: 'row' }, h('div', { style: 'min-width:0' }, h('b', { text: title }), h('div', { class: 'tiny muted', text: desc }), extra ?? null), h('div', { style: 'display:flex;flex-direction:column;align-items:flex-end;gap:4px' }, ticket, h('div', { style: 'display:flex;gap:4px' }, ...btns))));
  const el = h(
    'div',
    {},
    h('div', { class: 'section-title' }, h('span', { text: '도전 콘텐츠' })),
    card('tower', '#ff6b6b', '무한의 탑', `층마다 보스 1마리, ${TOWER.timer}초 안에 처치. 최고 층 갱신마다 별점.`, towerTickets, [towerBtn], towerInfo),
    card('raid', '#ff4f6d', '보스 레이드', `${RAID.duration}초 동안 심연의 군주에게 최대한 피해. 딜량에 따라 별점 (최대 80).`, raidTickets, [raidBtn], raidInfo),
    h('div', { class: 'card dungeon arena', style: '--dc:#c78bff' }, h('div', { class: 'row' }, h('div', {}, h('b', { text: '아레나' }), h('div', { class: 'tiny muted', text: `랭킹 유저의 고스트와 ${ARENA.duration}초 대결. 승리 시 별점 ${ARENA.winGems} + 레이팅.` }), arenaInfo), arenaTickets), arenaList),
    h('div', { class: 'section-title' }, h('span', { text: '일일 던전 (입장 또는 소탕)' })),
    card('gold', '#ffd166', '골드 던전', `${DUNGEON.gold.duration}초 동안 약한 몬스터가 쏟아집니다. 골드 ×${DUNGEON.gold.goldMult}.`, goldTickets, [goldSweep, goldBtn], goldInfo),
    card('gem', '#b388ff', '별점 던전', `${DUNGEON.gem.duration}초 동안 처치마다 별점 +${DUNGEON.gem.gemPerKill} (최대 ${DUNGEON.gem.gemCap}).`, gemTickets, [gemSweep, gemBtn], gemInfo),
    h('div', { class: 'tiny muted', text: '입장권은 매일 자정에 충전. 소탕은 현재 전투력 기준 예상 보상의 80%를 즉시 지급.' }),
    h('div', { class: 'section-title' }, h('span', { text: '방치 보상' })),
    h('div', { class: 'card' }, offline),
  );

  let opps: ArenaOpponent[] = [];
  let oppLoaded = 0;
  async function loadOpponents(): Promise<void> {
    oppLoaded = performance.now();
    try {
      const entries = await fetchTop('novice-stage', 30);
      const me = getPlayerId();
      const mine = game.state.progress.maxStage;
      const list = entries.filter((e) => e.pid !== me).map((e) => ({ name: e.name, stage: Number(e.meta.stage ?? e.score), level: Number(e.meta.level ?? 1) }));
      list.sort((a, b) => Math.abs(a.stage - mine) - Math.abs(b.stage - mine));
      opps = list.slice(0, 3);
    } catch {
      opps = [];
    }
    if (opps.length < 3) {
      const mine = Math.max(1, game.state.progress.maxStage);
      const ghosts = [
        { name: '유령 검사', stage: Math.max(1, Math.round(mine * 0.8)), level: game.state.hero.level },
        { name: '유령 마법사', stage: mine, level: game.state.hero.level + 2 },
        { name: '유령 궁수', stage: Math.round(mine * 1.25) + 1, level: game.state.hero.level + 5 },
      ];
      for (const g of ghosts) if (opps.length < 3) opps.push(g);
    }
    renderOpps();
  }
  function renderOpps(): void {
    arenaList.replaceChildren(
      ...opps.map((o) =>
        h('div', { class: 'row-card' }, h('div', { class: 'row-icon', text: '👤' }), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: o.name }), h('span', { class: 'row-lv', text: `Lv.${o.level}` })), h('div', { class: 'row-sub' }, h('span', { text: `스테이지 ${o.stage}` }))), h('button', { class: 'purple small-btn arena-btn', text: '대결', on: { click: () => game.enterArena(o) } })),
      ),
    );
  }

  function update(): void {
    const s = game.state;
    const busy = game.battle.mode !== 'stage';
    setText(goldTickets, `입장권 ${s.daily.goldTickets}/${DUNGEON.gold.tickets}`);
    setText(gemTickets, `입장권 ${s.daily.gemTickets}/${DUNGEON.gem.tickets}`);
    setText(towerTickets, `도전권 ${s.daily.towerTickets}/${TOWER.tickets}`);
    setText(raidTickets, `도전권 ${s.daily.raidTickets}/${RAID.tickets}`);
    setText(arenaTickets, `도전권 ${s.daily.arenaTickets}/${ARENA.tickets}`);
    goldBtn.disabled = busy || s.daily.goldTickets <= 0;
    goldSweep.disabled = s.daily.goldTickets <= 0;
    gemBtn.disabled = busy || s.daily.gemTickets <= 0;
    gemSweep.disabled = s.daily.gemTickets <= 0;
    towerBtn.disabled = busy || s.daily.towerTickets <= 0;
    raidBtn.disabled = busy || s.daily.raidTickets <= 0;
    for (const b of arenaList.querySelectorAll<HTMLButtonElement>('.arena-btn')) b.disabled = busy || s.daily.arenaTickets <= 0;
    setText(towerBtn, busy ? '진행 중' : `${s.tower.bestFloor + 1}층 도전`);
    setText(raidBtn, busy ? '진행 중' : '도전');
    setText(towerInfo, `최고 ${s.tower.bestFloor}층 · 다음 층 보상 별점 +${TOWER.gems(s.tower.bestFloor + 1)}`);
    setText(raidInfo, `최고 딜량 ${N(s.raid.bestDamage)} · 기준 딜량 ${N(raidPar(s))} (기준 ×1 = 별점 ${RAID.gems(1)})`);
    setText(arenaInfo, `레이팅 ${s.arena.rating} · ${s.arena.wins}승 ${s.arena.losses}패`);
    const eg = sweepEstimate(s, game.stats, 'gold');
    const em = sweepEstimate(s, game.stats, 'gem');
    setText(goldInfo, `소탕 예상: 약 ${eg.kills}마리 · 골드 +${N(eg.gold)}`);
    setText(gemInfo, `소탕 예상: 약 ${em.kills}마리 · 별점 +${em.gems}`);
    setText(offline, `게임을 닫아도 최근 수입의 ${OFFLINE.efficiency * 100}%가 쌓입니다 (최대 ${formatTime(offlineCapSec(s))}, 4차 전직 시 ${OFFLINE.capHoursJob4}시간). 초당 골드 ${N(s.offline.emaGold)} · 경험치 ${N(s.offline.emaExp)}. 최장 방치 ${formatTime(s.stats.longestOfflineSec)}.`);
    if (performance.now() - oppLoaded > 120000) void loadOpponents();
  }
  return { el, update, onShow: () => { if (performance.now() - oppLoaded > 30000) void loadOpponents(); } };
}
