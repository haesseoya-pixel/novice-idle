import './styles/main.css';
import { Game } from './app/game';
import { Synth } from './audio/synth';
import { ACHIEVEMENT_BY_ID } from './game/achievements';
import { OFFLINE, RARITY_NAMES } from './game/balance';
import { JOBS, jobTitle } from './game/jobs';
import { isBossStage, stageInfo, stageLabel } from './game/monsters';
import { setupStage } from './game/battle';
import { QUEST_NAMES } from './game/quests';
import { unlockedSkills } from './game/skills';
import { getPlayerName, submitScore } from './rank/leaderboard';
import { Assets } from './render/assets';
import { Scene } from './render/scene';
import { h, isMobile, N, qs, setNumberMode, setText } from './ui/dom';
import { Hud } from './ui/hud';
import { Modals } from './ui/modals';
import { Panels } from './ui/panels';
import { currentScores } from './ui/tabs/rankTab';
import { Toasts } from './ui/toast';
import { Tutorial } from './ui/tutorial';
import { formatTime } from './util/format';

async function boot(): Promise<void> {
  const loading = qs('#loading');
  const loadingBar = qs('#loadingBar');
  const loadingText = qs('#loadingText');
  const assets = new Assets();
  await assets.load((l, t) => {
    loadingBar.style.width = `${t ? (l / t) * 100 : 100}%`;
    setText(loadingText, t ? `에셋 불러오는 중 ${l}/${t}` : '준비 중…');
  });

  const game = new Game();
  setNumberMode(game.state.settings.numberFormat);
  document.body.classList.toggle('reduced', game.state.settings.reducedMotion);

  const synth = new Synth();
  synth.volume = game.state.settings.volume;
  synth.enabled = game.state.settings.sound;

  const canvas = qs<HTMLCanvasElement>('#scene');
  const sceneWrap = qs('#sceneWrap');
  const scene = new Scene(canvas, game, assets);
  const toasts = new Toasts(qs('#toasts'));
  const modals = new Modals(qs('#modalRoot'), game, toasts, assets, {
    onAdvanced: (tier) => {
      scene.jobAdvanceFx();
      synth.jobAdvance();
      const s = game.state;
      toasts.show(`${jobTitle(s.hero.job, tier)}이(가) 되었습니다! 새 스킬: ${unlockedSkills(s).slice(-1)[0]?.name ?? ''}`, 'milestone', `${tier}차 전직 완료`, 5000);
      void submitRanks(true);
    },
  });
  const frame = qs('#frame');
  const hud = new Hud(qs('#hud'), game, assets, {
    cast: (id) => {
      if (game.cast(id)) synth.ui();
    },
    challengeBoss: () => {
      if (game.challengeBoss()) toasts.show('보스에게 도전합니다!', 'info');
    },
    openJob: () => (game.canAdvance() ? modals.openAdvance() : panels.show('job')),
    openSettings: () => modals.openSettings(),
    openQuest: () => panels.show('record', 'quest'),
    selectStage: (n) => {
      if (game.selectStage(n)) synth.ui();
    },
    openMenu: (sub) => panels.show('record', sub),
    openDungeon: () => panels.show('adventure'),
    openTab: (id) => panels.show(id),
  });

  // ---- global ranking -------------------------------------------------------
  let lastSubmitted = { stage: 0, level: 0 };
  async function submitRanks(force = false): Promise<string> {
    const name = getPlayerName();
    if (!name) return '닉네임을 먼저 저장하세요';
    const sc = currentScores(game);
    if (!force && sc.stage <= lastSubmitted.stage && sc.level <= lastSubmitted.level) return '변동 없음';
    const meta = { stage: sc.stage, level: sc.level, job: sc.job, tier: sc.tier, title: sc.title };
    const [a, b] = await Promise.all([submitScore('novice-stage', 'novice', sc.stage, meta, name), submitScore('novice-level', 'novice', sc.level, meta, name)]);
    if (a === 'error' || b === 'error') return '랭킹 서버에 연결할 수 없습니다';
    lastSubmitted = { stage: sc.stage, level: sc.level };
    return a === 'lower' && b === 'lower' ? '기존 기록이 더 높아 그대로입니다' : '랭킹에 등록했습니다';
  }
  const panels = new Panels(game, assets, {
    openSettings: () => modals.openSettings(),
    openAdvance: () => modals.openAdvance(),
    openReclass: (p) => modals.openReclass(p),
    rank: { submitNow: () => submitRanks(true) },
    onSheet: (open) => {
      const land = window.matchMedia('(orientation: landscape)').matches;
      frame.style.setProperty('--hud-bottom', open && !land ? 'var(--sheet-h)' : 'var(--tabbar-h)');
      document.body.classList.toggle('sheet-open', open);
      scene.setGroundFrac(open && !land ? 0.44 : 0.72);
      scene.setViewScale(open && !land ? 0.78 : 1);
      scene.setAnchorFrac(land && open ? 0.2 : 0.34);
      window.setTimeout(() => scene.resize(), 240);
    },
  });
  window.setInterval(() => void submitRanks(), 90000);
  const tutorial = new Tutorial(game, qs('#hint'));

  if (!game.storageOk) qs('#storageWarn').hidden = false;
  if (game.loadCorrupt) toasts.show('저장 데이터를 읽을 수 없어 새로 시작합니다', 'warn');

  // ---- audio unlock ---------------------------------------------------------
  const unlock = () => synth.unlock();
  window.addEventListener('pointerdown', unlock, { passive: true });
  window.addEventListener('keydown', unlock);

  // ---- game events → feedback ----------------------------------------------
  const bootAt = performance.now();
  let lastBossSubmit = 0;
  game.events.on('game', (e) => {
    scene.onEvent(e);
    switch (e.type) {
      case 'hit':
        synth.hit(e.crit, e.skill);
        break;
      case 'kill':
        synth.kill(e.boss);
        break;
      case 'skill':
        synth.skill(e.fx);
        break;
      case 'tap':
        synth.tap();
        break;
      case 'levelUp':
        synth.levelUp();
        break;
      case 'jobReady':
        toasts.show(`Lv ${game.state.hero.level} 달성 — ${e.tier}차 전직이 가능합니다!`, 'milestone', '전직 가능', 5000);
        break;
      case 'bossStart':
        synth.bossStart();
        toasts.show(`${stageInfo(e.stage).region.boss.name} 등장! 30초 안에 처치하세요.`, 'warn', '보스전');
        break;
      case 'bossWin':
        toasts.show(`${stageLabel(e.stage)} 보스 격파! 별점 +${e.gems}${e.first ? ' (첫 클리어)' : ''}`, 'milestone', '승리');
        if (performance.now() - lastBossSubmit > 20000) {
          lastBossSubmit = performance.now();
          void submitRanks();
        }
        break;
      case 'bossFail':
        synth.bossFail();
        toasts.show(e.reason === 'timer' ? '시간 초과. 직전 스테이지에서 강해진 뒤 다시 도전하세요.' : '보스에게 쓰러졌습니다. 체력과 방어력을 올려보세요.', 'warn', '보스 실패', 4500);
        break;
      case 'heroDie':
        synth.heroDie();
        break;
      case 'heroHit':
        if (e.dmg > game.battle.heroMaxHp * 0.1) synth.heroHurt();
        break;
      case 'milestone':
        toasts.show(`${e.stage}스테이지 돌파! 별점 +${e.gems}`, 'milestone', '이정표');
        break;
      case 'stageClear':
        if (stageInfo(e.next).stage === 1 && performance.now() - bootAt > 2000) toasts.show(`${stageInfo(e.next).region.name}에 도착했습니다`, 'info', '새 지역');
        break;
      case 'questDone':
        synth.quest();
        toasts.show(`${QUEST_NAMES[e.reward.type]} 완료: 별점 +${e.reward.gems}, 골드 +${N(e.reward.gold)}`, 'achievement', '퀘스트');
        break;
      case 'achievement': {
        const a = ACHIEVEMENT_BY_ID[e.id];
        synth.achievement();
        toasts.show(`${a.name} — 별점 +${a.gems}`, 'achievement', '업적 달성');
        break;
      }
      case 'dungeonEnd':
        toasts.show(e.kind === 'gold' ? `골드 던전 종료: ${e.kills}마리, 골드 +${N(e.gold)}` : `별점 던전 종료: ${e.kills}마리, 별점 +${e.gems}`, 'milestone', '던전 결과', 5000);
        break;
      case 'towerFloor':
        synth.kill(true);
        if (e.gems > 0) toasts.show(`${e.floor}층 돌파! 별점 +${e.gems}`, 'milestone', '무한의 탑');
        break;
      case 'raidEnd':
        synth.kill(true);
        toasts.show(`딜량 ${N(e.damage)} → 별점 +${e.gems}${e.best ? ' · 최고 기록!' : ''}`, 'milestone', '보스 레이드 종료', 5000);
        break;
      case 'arenaEnd':
        if (e.won) synth.levelUp();
        else synth.bossFail();
        toasts.show(`${e.opponent}에게 ${e.won ? '승리' : '패배'} · 별점 +${e.gems} · 레이팅 ${e.rating}`, e.won ? 'milestone' : 'warn', '아레나', 5000);
        break;
      case 'companion':
        break;
      case 'towerEnd':
        synth.bossFail();
        toasts.show(`${e.floor}층에서 종료 (${e.reason === 'timer' ? '시간 초과' : '전투 불능'}). 별점 +${e.gems}`, 'warn', '무한의 탑', 5000);
        break;
      case 'dailyReset':
        if (performance.now() - bootAt > 2000) toasts.show('던전 입장권이 충전되었습니다', 'info');
        break;
    }
  });
  game.events.on('purchase', (p) => {
    if (p.kind === 'starforce') synth.starforce();
    else if (p.kind === 'fuse') {
      synth.gacha(2);
      toasts.show(p.id === 'all' ? `${p.count}회 합성 완료` : '합성 성공! 상위 등급 장비를 얻었습니다', 'milestone', '장비 합성');
    } else synth.purchase(p.count);
  });
  game.events.on('summon', ({ results }) => {
    synth.gacha(Math.max(...results.map((r) => (r.isNew ? 3 : 1))));
    modals.openSummon(results);
  });
  game.events.on('reward', ({ source, gems }) => {
    synth.quest();
    toasts.show(`별점 +${gems}`, 'achievement', source === 'mission' ? '미션 보상' : '출석 보상');
  });
  game.events.on('sweep', (r) => {
    synth.purchase(3);
    toasts.show(r.kind === 'gold' ? `약 ${r.kills}마리 처치 · 골드 +${N(r.gold)}` : `약 ${r.kills}마리 처치 · 별점 +${r.gems}`, 'milestone', '던전 소탕');
  });
  game.events.on('cube', ({ upgraded, potential }) => {
    synth.gacha(upgraded ? 4 : 1);
    if (upgraded) toasts.show(`룬 각인 등급 상승! ${['레어', '에픽', '유니크', '레전드리'][potential.grade]}`, 'milestone', '룬석');
  });
  game.events.on('cannotAfford', () => synth.cannotAfford());
  game.events.on('gacha', ({ results }) => {
    const best = Math.max(...results.map((r) => r.rarity));
    synth.gacha(best);
    modals.openGacha(results);
    if (best >= 4) toasts.show(`${RARITY_NAMES[best]} 장비 획득!`, 'milestone', '✨');
  });
  game.events.on('offline', (r) => {
    if (r.elapsed >= OFFLINE.modalThreshold) modals.openOffline(r);
    else if (r.elapsed >= OFFLINE.toastThreshold) toasts.show(`부재 중 ${formatTime(r.elapsed)}: 골드 +${N(r.gold)}`, 'info');
  });
  game.events.on('dungeonStart', ({ kind }) => {
    synth.bossStart();
    toasts.show(kind === 'gold' ? '골드 던전 시작! 60초 동안 최대한 처치하세요.' : kind === 'gem' ? '별점 던전 시작! 45초 동안 처치마다 별점.' : kind === 'tower' ? '무한의 탑 입장! 층마다 보스를 40초 안에 잡으세요.' : kind === 'raid' ? '보스 레이드! 60초 동안 최대한 피해를 주세요.' : '아레나 대결 시작! 45초 안에 상대를 쓰러뜨리세요.', 'info');
    panels.close();
  });
  game.events.on('settings', ({ key }) => {
    const s = game.state.settings;
    if (key === 'volume') synth.setVolume(s.volume);
    if (key === 'sound') synth.setEnabled(s.sound);
    if (key === 'numberFormat') setNumberMode(s.numberFormat);
    if (key === 'reducedMotion') document.body.classList.toggle('reduced', s.reducedMotion);
  });
  game.events.on('replaced', () => {
    setNumberMode(game.state.settings.numberFormat);
    document.body.classList.toggle('reduced', game.state.settings.reducedMotion);
    synth.setVolume(game.state.settings.volume);
    synth.setEnabled(game.state.settings.sound);
    if (panels.open) panels.show(panels.active);
  });

  // ---- tapping ----------------------------------------------------------------
  sceneWrap.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if (modals.isOpen) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) return;
    const n = Number(e.key);
    if (n >= 1 && n <= 5) {
      const sk = unlockedSkills(game.state)[n - 1];
      if (sk && game.cast(sk.id)) synth.ui();
    }
  });

  // ---- lifecycle ------------------------------------------------------------
  const ro = new ResizeObserver(() => scene.resize());
  ro.observe(sceneWrap);
  window.addEventListener('resize', () => scene.resize());
  window.visualViewport?.addEventListener('resize', () => scene.resize());
  document.body.classList.add('sheet-open');
  window.addEventListener('orientationchange', () => window.setTimeout(() => scene.resize(), 120));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      game.save();
      synth.suspend();
    } else synth.resume();
  });
  window.addEventListener('pagehide', () => game.save());
  window.addEventListener('beforeunload', () => game.save());

  // ---- per-frame UI -----------------------------------------------------------
  let panelAcc = 0;
  game.onFrame((dt, ts) => {
    scene.frame(dt);
    hud.update();
    panelAcc += dt;
    if (panelAcc >= 0.12) {
      panelAcc = 0;
      panels.update();
      tutorial.update(ts / 1000);
    }
  });

  game.boot();
  loading.classList.add('out');
  window.setTimeout(() => loading.remove(), 500);
  if (game.loadedFresh && !game.loadCorrupt) {
    game.claimAttendance();
    modals.openHelp();
    toasts.show(isMobile() ? '영웅이 알아서 싸웁니다. 골드로 강화하세요.' : '영웅이 알아서 싸웁니다. 숫자키 1~5로 스킬을 바로 쓸 수 있어요.', 'info', '초원에서 시작', 6000);
  }
  game.start();

  const setStage = (n: number) => {
    const p = game.state.progress;
    p.stage = n;
    p.maxStage = Math.max(p.maxStage, n);
    p.bossMode = isBossStage(n);
    p.farmStage = null;
    setupStage(game.state, game.battle);
  };
  const dbg = { game, scene, synth, panels, modals, assets, JOBS, step: (sec: number) => game.step(sec), setStage };
  (window as unknown as { novice: unknown }).novice = dbg;
  (window as unknown as { __step: (s: number) => void }).__step = (sec: number) => {
    game.step(sec);
    scene.frame(1 / 60);
    hud.update();
    panels.update();
  };
  void h;
}

void boot();
