import type { Game } from '@/app/game';
import { ARENA, DUNGEON, OFFLINE, RAID, TOWER } from '@/game/balance';
import { raidPar, type ArenaOpponent } from '@/game/battle';
import { offlineCapSec } from '@/game/state';
import { sweepEstimate } from '@/game/sweep';
import { fetchTop, getPlayerId } from '@/rank/leaderboard';
import type { Assets } from '@/render/assets';
import { formatTime } from '@/util/format';
import { h, N, setText, toggleClass } from '../dom';
import type { TabView } from './growthTab';

/**
 * 모험 탭. 던전 / 무한의 탑 / 보스 레이드 / 아레나는 각각 독립 화면이고
 * 상단 세그먼트로만 이동한다 (한 목록에 섞지 않는다).
 */
export function createAdventureTab(game: Game, assets: Assets): TabView {
  const seg = h('div', { class: 'seg' });
  const segBtns = new Map<string, HTMLButtonElement>();
  const body = h('div');
  let active = 'dungeon';

  const banner = (id: string, color: string, title: string, sub: string) => {
    const el2 = h('div', { class: 'shop-banner', style: `--dc:${color}` }, h('div', { class: 'shop-banner-title' }, h('b', { text: title }), h('span', { class: 'tiny', text: sub })));
    const img = assets.image(`banner_${id}`);
    if (img) el2.style.backgroundImage = `url(${img.src})`;
    return el2;
  };

  // ---------- 던전 ----------
  const goldBtn = h('button', { class: 'primary', text: '입장', on: { click: () => game.enterDungeon('gold') } }) as HTMLButtonElement;
  const goldSweep = h('button', { class: 'ghost small-btn', text: '소탕', on: { click: () => game.sweep('gold') } }) as HTMLButtonElement;
  const gemBtn = h('button', { class: 'purple', text: '입장', on: { click: () => game.enterDungeon('gem') } }) as HTMLButtonElement;
  const gemSweep = h('button', { class: 'ghost small-btn', text: '소탕', on: { click: () => game.sweep('gem') } }) as HTMLButtonElement;
  const goldTicket = h('span', { class: 'ticket' });
  const gemTicket = h('span', { class: 'ticket' });
  const goldInfo = h('div', { class: 'tiny muted' });
  const gemInfo = h('div', { class: 'tiny muted' });
  const offline = h('div', { class: 'small' });
  const dungeonPane = h(
    'div',
    {},
    banner('dungeon', '#ffd166', '성장 던전', '매일 입장권이 충전됩니다'),
    h('div', { class: 'adv-card', style: '--dc:#ffd166' }, h('div', { class: 'adv-body' }, h('div', { class: 'row' }, h('b', { text: '골드 던전' }), goldTicket), h('div', { class: 'tiny muted', text: `${DUNGEON.gold.duration}초 동안 약한 몬스터가 쏟아집니다. 처치 골드 ×${DUNGEON.gold.goldMult}.` }), goldInfo, h('div', { class: 'adv-actions' }, goldSweep, goldBtn))),
    h('div', { class: 'adv-card', style: '--dc:#b388ff' }, h('div', { class: 'adv-body' }, h('div', { class: 'row' }, h('b', { text: '별점 던전' }), gemTicket), h('div', { class: 'tiny muted', text: `${DUNGEON.gem.duration}초 동안 처치마다 별점 +${DUNGEON.gem.gemPerKill} (최대 ${DUNGEON.gem.gemCap}). 몬스터는 공격하지 않습니다.` }), gemInfo, h('div', { class: 'adv-actions' }, gemSweep, gemBtn))),
    h('div', { class: 'tiny muted', text: '소탕은 현재 전투력 기준 예상 보상의 80%를 즉시 지급합니다.' }),
    h('div', { class: 'section-title' }, h('span', { text: '방치 보상' })),
    h('div', { class: 'card' }, offline),
  );

  // ---------- 무한의 탑 ----------
  const towerBtn = h('button', { class: 'red', on: { click: () => game.enterTower() } }) as HTMLButtonElement;
  const towerTicket = h('span', { class: 'ticket' });
  const towerInfo = h('div', { class: 'small' });
  const towerList = h('div', { class: 'rows' });
  const towerPane = h(
    'div',
    {},
    banner('tower', '#ff6b6b', '무한의 탑', `층마다 보스 1마리 · ${TOWER.timer}초 제한`),
    h('div', { class: 'card' }, h('div', { class: 'row' }, towerInfo, towerTicket), h('div', { class: 'adv-actions' }, towerBtn)),
    h('div', { class: 'section-title' }, h('span', { text: '다음 층 보상' })),
    towerList,
    h('div', { class: 'tiny muted', style: 'margin-top:6px', text: '최고 층을 갱신할 때만 별점을 받습니다. 제한 시간 안에 못 잡거나 쓰러지면 종료됩니다.' }),
  );

  // ---------- 보스 레이드 ----------
  const raidBtn = h('button', { class: 'red', text: '도전', on: { click: () => game.enterRaid() } }) as HTMLButtonElement;
  const raidTicket = h('span', { class: 'ticket' });
  const raidInfo = h('div', { class: 'small' });
  const raidTable = h('div', { class: 'rows' });
  const raidPane = h(
    'div',
    {},
    banner('raid', '#ff4f6d', '보스 레이드', `${RAID.duration}초 동안 딜량 경쟁`),
    h('div', { class: 'card' }, h('div', { class: 'row' }, raidInfo, raidTicket), h('div', { class: 'adv-actions' }, raidBtn)),
    h('div', { class: 'section-title' }, h('span', { text: '딜량 보상표' })),
    raidTable,
  );

  // ---------- 아레나 ----------
  const arenaInfo = h('div', { class: 'small' });
  const arenaTicket = h('span', { class: 'ticket' });
  const arenaList = h('div', { class: 'rows' });
  const arenaRefresh = h('button', { class: 'ghost small-btn', text: '상대 새로고침', on: { click: () => void loadOpponents() } });
  const arenaPane = h(
    'div',
    {},
    banner('arena', '#c78bff', '아레나', `랭킹 유저의 고스트와 ${ARENA.duration}초 대결`),
    h('div', { class: 'card' }, h('div', { class: 'row' }, arenaInfo, arenaTicket)),
    h('div', { class: 'section-title' }, h('span', { text: '도전 상대' }), arenaRefresh),
    arenaList,
    h('div', { class: 'tiny muted', style: 'margin-top:6px', text: `승리 시 별점 ${ARENA.winGems} + 레이팅 ${ARENA.ratingWin}, 패배 시 별점 ${ARENA.loseGems} · 레이팅 -${ARENA.ratingLose}.` }),
  );

  const panes: Record<string, HTMLElement> = { dungeon: dungeonPane, tower: towerPane, raid: raidPane, arena: arenaPane };
  for (const [id, label] of [['dungeon', '던전'], ['tower', '무한의 탑'], ['raid', '레이드'], ['arena', '아레나']] as const) {
    const btn = h('button', { text: label, on: { click: () => show(id) } }) as HTMLButtonElement;
    segBtns.set(id, btn);
    seg.append(btn);
  }
  function show(id: string): void {
    active = id;
    for (const [k, b] of segBtns) toggleClass(b, 'active', k === id);
    body.replaceChildren(panes[id]!);
    if (id === 'arena' && performance.now() - oppLoaded > 30000) void loadOpponents();
    update();
  }
  const el = h('div', {}, seg, body);

  let opps: ArenaOpponent[] = [];
  let oppLoaded = -1e9;
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
      for (const g of [
        { name: '유령 검사', stage: Math.max(1, Math.round(mine * 0.8)), level: game.state.hero.level },
        { name: '유령 마법사', stage: mine, level: game.state.hero.level + 2 },
        { name: '유령 궁수', stage: Math.round(mine * 1.25) + 1, level: game.state.hero.level + 5 },
      ]) if (opps.length < 3) opps.push(g);
    }
    arenaList.replaceChildren(
      ...opps.map((o) =>
        h('div', { class: 'row-card' }, h('div', { class: 'row-icon', text: '👤' }), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: o.name }), h('span', { class: 'row-lv', text: `Lv.${o.level}` })), h('div', { class: 'row-sub' }, h('span', { text: `스테이지 ${o.stage}` }))), h('button', { class: 'purple small-btn arena-btn', text: '대결', on: { click: () => game.enterArena(o) } })),
      ),
    );
    update();
  }

  function update(): void {
    const s = game.state;
    const busy = game.battle.mode !== 'stage';
    if (active === 'dungeon') {
      setText(goldTicket, `입장권 ${s.daily.goldTickets}/${DUNGEON.gold.tickets}`);
      setText(gemTicket, `입장권 ${s.daily.gemTickets}/${DUNGEON.gem.tickets}`);
      goldBtn.disabled = busy || s.daily.goldTickets <= 0;
      gemBtn.disabled = busy || s.daily.gemTickets <= 0;
      goldSweep.disabled = s.daily.goldTickets <= 0;
      gemSweep.disabled = s.daily.gemTickets <= 0;
      const eg = sweepEstimate(s, game.stats, 'gold');
      const em = sweepEstimate(s, game.stats, 'gem');
      setText(goldInfo, `소탕 예상: 약 ${eg.kills}마리 · 골드 +${N(eg.gold)}`);
      setText(gemInfo, `소탕 예상: 약 ${em.kills}마리 · 별점 +${em.gems}`);
      setText(offline, `게임을 닫아도 최근 수입의 ${OFFLINE.efficiency * 100}%가 쌓입니다 (최대 ${formatTime(offlineCapSec(s))}, 4차 전직 시 ${OFFLINE.capHoursJob4}시간). 초당 골드 ${N(s.offline.emaGold)} · 경험치 ${N(s.offline.emaExp)}. 최장 방치 ${formatTime(s.stats.longestOfflineSec)}.`);
    } else if (active === 'tower') {
      setText(towerTicket, `도전권 ${s.daily.towerTickets}/${TOWER.tickets}`);
      setText(towerInfo, `최고 ${s.tower.bestFloor}층 · 도전 ${s.tower.runs}회`);
      towerBtn.disabled = busy || s.daily.towerTickets <= 0;
      setText(towerBtn, busy ? '진행 중' : `${s.tower.bestFloor + 1}층 도전`);
      towerList.replaceChildren(
        ...[0, 1, 2, 3, 4].map((i) => {
          const f = s.tower.bestFloor + 1 + i;
          return h('div', { class: 'row-card' }, h('div', { class: 'row-icon', text: '🗼' }), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: `${f}층` }), h('span', { class: 'row-lv', text: `별점 +${TOWER.gems(f)}` })), h('div', { class: 'row-sub' }, h('span', { class: 'muted', text: `보스 체력 ×${TOWER.hpMult(f).toFixed(1)} · 공격력 ×${TOWER.atkMult(f).toFixed(2)}` }))));
        }),
      );
    } else if (active === 'raid') {
      setText(raidTicket, `도전권 ${s.daily.raidTickets}/${RAID.tickets}`);
      setText(raidInfo, `최고 딜량 ${N(s.raid.bestDamage)} · 도전 ${s.raid.runs}회`);
      raidBtn.disabled = busy || s.daily.raidTickets <= 0;
      setText(raidBtn, busy ? '진행 중' : '도전');
      const par = raidPar(s);
      raidTable.replaceChildren(
        ...[0.5, 1, 2, 4, 8].map((r) =>
          h('div', { class: 'row-card' }, h('div', { class: 'row-icon', text: '👹' }), h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, h('b', { text: `딜량 ${N(par * r)}` }), h('span', { class: 'row-lv', text: `기준 ×${r}` })), h('div', { class: 'row-sub' }, h('span', { class: 'gem', text: `별점 +${RAID.gems(r)}` })))),
        ),
      );
    } else {
      setText(arenaTicket, `도전권 ${s.daily.arenaTickets}/${ARENA.tickets}`);
      setText(arenaInfo, `레이팅 ${s.arena.rating} · ${s.arena.wins}승 ${s.arena.losses}패`);
      for (const b of arenaList.querySelectorAll<HTMLButtonElement>('.arena-btn')) b.disabled = busy || s.daily.arenaTickets <= 0;
    }
  }
  show('dungeon');
  return { el, update, onShow: (sub?: string) => { if (sub && panes[sub]) show(sub); } };
}
