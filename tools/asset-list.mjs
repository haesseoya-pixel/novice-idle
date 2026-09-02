#!/usr/bin/env node
/**
 * Prints every asset slot the game can load, with size / anchor / prompt hints.
 *
 *   node tools/asset-list.mjs            # human readable table
 *   node tools/asset-list.mjs --json     # machine readable (for a generator script)
 *   node tools/asset-list.mjs --manifest # skeleton public/assets/manifest.json
 *
 * The renderer works without any of these files (it falls back to vector drawing),
 * so assets can be added a few at a time. Anything present in manifest.json wins.
 */

const REGIONS = [
  ['meadow', '초록 초원', 'bright green meadow, rolling hills, flowers, round trees, blue sky with fluffy clouds'],
  ['fireflyforest', '반딧불 숲', 'dark enchanted forest at night, giant trees, glowing green fireflies, mushrooms, moonlight'],
  ['shellbeach', '소라 해변', 'sunny tropical beach, seashells, palm trees, turquoise waves, white sand'],
  ['candlehouse', '촛불 폐가', 'spooky abandoned mansion at night, candles, cobwebs, purple moonlight, broken windows'],
  ['frostpeak', '서리 산', 'snowy mountain peaks, snow-covered pines, pale blue sky, falling snow, aurora'],
  ['sanddune', '모래 사막', 'golden desert dunes at sunset, cacti, distant ruins, orange sky'],
  ['ruins', '고대 유적', 'ancient overgrown stone ruins, broken pillars, glowing cyan runes, misty gray sky'],
  ['skygarden', '하늘 정원', 'floating sky garden above the clouds, white marble arches, golden flowers, bright cyan sky'],
  ['dragonnest', '용의 둥지', 'volcanic dragon nest, lava rivers, dark red rock, giant dragon eggs, embers'],
  ['abyss', '심연', 'dark abyss void, floating purple crystals, giant eyes in the dark, purple mist, stars'],
];

const MONSTERS = [
  ['fluff', '털뭉치', 'small round fluffy cream fur ball with tiny feet and big eyes'],
  ['hopbun', '깡총토끼', 'pink hopping bunny with long floppy ears and a mischievous grin'],
  ['bee', '꿀벌', 'chubby yellow and black bee with tiny wings and a stinger'],
  ['fluffking', '거대 털뭉치', 'giant cream fur ball monster king wearing a small golden crown, angry eyebrows'],
  ['acornspirit', '도토리 정령', 'small brown acorn spirit with leaf arms and a cute face'],
  ['mossgolem', '이끼 골렘', 'stocky mossy stone golem covered in green moss and tiny mushrooms'],
  ['fireflyfairy', '반딧불 요정', 'tiny glowing lime-green firefly fairy with a lantern belly'],
  ['guardiantree', '숲의 수호목', 'big ancient tree guardian with a wooden face, branch arms, glowing green eyes'],
  ['hermit', '소라게', 'orange hermit crab inside a spiral seashell'],
  ['droplet', '물방울 정령', 'cute light-blue water droplet spirit with a face'],
  ['jelly', '해파리', 'translucent purple jellyfish with wavy tentacles'],
  ['kingcrab', '왕소라게', 'giant red king hermit crab with huge claws and a crown-shaped shell'],
  ['candleghost', '촛불 유령', 'small cream ghost with a candle flame on its head'],
  ['olddoll', '낡은 인형', 'creepy but cute old porcelain doll with button eyes and stitched patches'],
  ['dustspider', '먼지 거미', 'gray fluffy dust spider with eight small legs'],
  ['puppeteer', '인형사 유령', 'spooky lavender puppeteer ghost holding marionette strings, wearing a top hat'],
  ['snowman', '눈사람', 'round snowman with a carrot nose, coal buttons, angry eyebrows'],
  ['icefox', '얼음 여우', 'light-blue ice fox with frost crystals on its tail'],
  ['frostowl', '서리 올빼미', 'pale blue frost owl with snowflake patterns'],
  ['frostqueen', '서리 여왕 여우', 'elegant ice queen fox with a crystal crown and nine icy tails'],
  ['cactus', '선인장 괴물', 'green cactus monster with a grumpy face and spiky arms'],
  ['scorpion', '모래 전갈', 'sandy brown scorpion with a curled stinger tail'],
  ['sandworm', '모래 벌레', 'tan sand worm bursting from sand with a round toothy mouth'],
  ['greatworm', '거대 모래벌레', 'gigantic armored sand worm boss with a huge toothy maw'],
  ['statue', '석상 병사', 'gray stone statue soldier with a cracked face holding a stone spear'],
  ['ruinbeetle', '유적 딱정벌레', 'dark blue armored beetle with glowing rune markings'],
  ['runegolem', '룬 골렘', 'blue-gray rune golem with glowing cyan runes on its body'],
  ['colossus', '유적 거신', 'colossal ancient stone giant boss with glowing cyan eyes and rune carvings'],
  ['cloudsheep', '구름양', 'fluffy white cloud sheep with a sleepy face'],
  ['windspirit', '바람 정령', 'swirling light-cyan wind spirit with a playful face'],
  ['paperbird', '종이새', 'yellow origami paper bird'],
  ['stormwhale', '폭풍 구름고래', 'storm cloud whale boss with lightning inside its body'],
  ['egglizard', '알 도마뱀', 'small orange lizard hatching from a cracked egg'],
  ['firebat', '화염 박쥐', 'orange fire bat with flaming wings'],
  ['lizardmerc', '용병 도마뱀', 'red lizardman mercenary with a small shield and sword'],
  ['reddragon', '붉은 드래곤', 'fierce red dragon boss with wings breathing fire'],
  ['eyeball', '눈알 괴물', 'floating purple eyeball with tentacle veins'],
  ['shade', '그림자', 'dark shadow wraith with glowing white eyes'],
  ['tentacle', '공허 촉수', 'thick purple void tentacle with an eye at the tip'],
  ['abysseye', '심연의 눈', 'gigantic abyssal eye boss surrounded by dark tendrils and purple energy'],
];
const BOSSES = new Set(['fluffking', 'guardiantree', 'kingcrab', 'puppeteer', 'frostqueen', 'greatworm', 'colossus', 'stormwhale', 'reddragon', 'abysseye']);
const RAID_ARENA = [
  ['raidlord', '심연의 군주', 'towering abyssal overlord boss, dark armor, purple flames, huge sword'],
  ['ghost', '도전자', 'translucent blue ghost duplicate of an adventurer, arena challenger'],
];

const JOBS = [
  ['novice', '초보자', 'plain beginner girl, orange ponytail with a pink ribbon, light blue tunic, short skirt, wooden stick'],
  ['warrior', '전사', 'girl warrior, red ponytail, red and steel plate armor with a skirt, broad sword'],
  ['mage', '마법사', 'girl mage, purple long hair, blue-violet robe and pointed hat, staff with a glowing orb'],
  ['archer', '궁수', 'girl archer, green hooded cape with a red feather, green ranger outfit, wooden bow'],
  ['thief', '도적', 'girl thief, dark hair with a purple bandana, purple assassin outfit, short dagger'],
];
const TIERS = ['', 'novice-grade light gear', 'upgraded gear with metal shoulder pads and a short cape', 'ornate elite gear with a flowing cape and a glowing weapon', 'legendary radiant gear with a golden circlet, glowing aura and an oversized enchanted weapon'];

const SKILLS = [
  ['novice_strike', '힘껏 치기', 'a wooden stick striking with impact lines'],
  ['w_slash', '강타', 'a sword slash with a red impact arc'],
  ['w_quake', '대지 가르기', 'a cracking earth shockwave'],
  ['w_shield', '방패 방어', 'a glowing blue shield'],
  ['w_ult', '검기 폭발', 'an exploding sword energy burst'],
  ['m_fireball', '화염구', 'a fireball'],
  ['m_lightning', '번개', 'a lightning bolt'],
  ['m_firefield', '화염 장판', 'a burning fire field on the ground'],
  ['m_meteor', '메테오', 'a falling meteor'],
  ['a_double', '이중 사격', 'two arrows shot together'],
  ['a_rain', '화살비', 'a rain of arrows from the sky'],
  ['a_poison', '독화살', 'a green poison-tipped arrow'],
  ['a_ult', '천공의 화살', 'a radiant sky arrow of light'],
  ['t_assassin', '암살', 'a dagger backstab with a red spark'],
  ['t_shuriken', '표창 난무', 'spinning throwing stars'],
  ['t_stealth', '은신', 'a shadowy cloaked figure vanishing in smoke'],
  ['t_ult', '그림자 처형', 'a dark shadow execution slash'],
];

const COMPANIONS = [
  ['slimeknight', '슬라임 기사', 'tiny green slime knight with a shield'],
  ['foxspirit', '여우 정령', 'small orange fox spirit with flame tails'],
  ['owlsage', '올빼미 현자', 'small blue owl sage with tiny glasses and a book'],
  ['emberbat', '잉걸 박쥐', 'small red ember bat with burning wings'],
  ['frostcat', '서리 고양이', 'small icy blue cat with frost whiskers'],
  ['stonepup', '돌 강아지', 'small stone puppy with moss patches'],
  ['stardragon', '별 드래곤', 'small golden star dragon hatchling with sparkles'],
  ['moonrabbit', '달 토끼', 'small lavender moon rabbit with a crescent charm'],
];

const ARTIFACTS = [
  ['compass', '황금 나침반', 'ornate golden compass'],
  ['crest', '용사의 문장', "hero's crest emblem shield"],
  ['lifegem', '생명의 보석', 'glowing green life gem'],
  ['hourglass', '시간의 모래', 'blue hourglass with glowing sand'],
  ['luckycoin', '행운의 동전', 'shiny four-leaf-clover gold coin'],
  ['scroll', '현자의 두루마리', 'ancient sage scroll with runes'],
];

const RARITIES = ['plain wooden common (gray)', 'sturdy iron uncommon (green)', 'polished blue steel rare (blue)', 'ornate epic with gems (purple)', 'glowing golden legendary (gold)', 'radiant red-and-gold mythic with a divine aura (red)'];
const WEAPON_KIND = { novice: 'wooden training stick', warrior: 'sword', mage: 'magic staff', archer: 'bow', thief: 'dagger' };
const TABS = [['growth', '강화', 'muscled arm / up arrow'], ['gear', '장비', 'backpack'], ['summon', '동료', 'baby dragon'], ['skill', '스킬', 'sparkles'], ['job', '전직', 'medal'], ['dungeon', '던전', 'castle gate'], ['record', '메뉴', 'scroll list']];
const QUICK = [['attend', '출석', 'calendar'], ['mission', '미션', 'clipboard'], ['dungeon', '던전', 'castle'], ['raid', '레이드', 'demon head'], ['rank', '랭킹', 'trophy']];

const SPRITE_STYLE = 'cute chibi 2D mobile RPG game sprite, Korean mobile idle-RPG art style, big head small body, big shiny eyes, thick dark outline, flat cel shading with soft highlights, bright saturated colors, side view, full body, centered, transparent background, no text, no watermark, no ground shadow';
const ICON_STYLE = 'cute cartoon RPG game item icon, single object, thick dark outline, flat cel shading, glossy highlight, centered, transparent background, no text';
const BG_STYLE = '2D side-scrolling mobile RPG background art, cute cartoon style, painterly flat shading, vibrant colors, no characters, no text, no UI';

const rows = [];
/** frames: null(단일 이미지) 또는 { 애니메이션이름: 장수 } */
const add = (id, kind, w, h, frames, prompt, note) => rows.push({ id, kind, w, h, frames, prompt, note });
const HERO_ANIM = { idle: 2, walk: 4, attack: 3, cast: 2, hit: 1, death: 3 };
const MON_ANIM = { idle: 2, walk: 2, attack: 2, hit: 1, death: 2 };
const BOSS_ANIM = { idle: 2, walk: 2, attack: 3, hit: 1, death: 3 };

// ---- heroes: 17 sprites × 4 animations -------------------------------------
for (const [job, koJob, look] of JOBS) {
  const tiers = job === 'novice' ? [0] : [1, 2, 3, 4];
  for (const t of tiers) {
    const id = job === 'novice' ? 'hero_novice' : `hero_${job}_${t}`;
    const tierLook = t === 0 ? '' : `, ${TIERS[t]}`;
    add(id, 'sprite', 256, 256, HERO_ANIM, `${look}${tierLook}, facing right, ${SPRITE_STYLE}`, `${koJob}${t ? ` ${t}차` : ''} · 여성 주인공 · 논리 높이 64px · 발끝 앵커 · idle 숨쉬기2 / walk 4보 / attack 예비-타격-복귀3 / cast 2 / hit 1 / death 쓰러짐3`);
  }
}
// ---- monsters --------------------------------------------------------------
for (const [id, ko, desc] of MONSTERS) {
  const boss = BOSSES.has(id);
  add(id, 'sprite', boss ? 320 : 256, boss ? 320 : 256, boss ? BOSS_ANIM : MON_ANIM, `${boss ? 'large imposing boss monster, ' : 'small monster, '}${desc}, facing left, ${SPRITE_STYLE}`, `${ko}${boss ? ' (보스)' : ''} · 논리 높이 ${boss ? 72 : 64}px · 왼쪽을 봄 · attack은 앞으로 달려드는 모션 · death는 넘어지며 사라짐`);
}
for (const [id, ko, desc] of RAID_ARENA) add(id, 'sprite', 320, 320, BOSS_ANIM, `${desc}, facing left, ${SPRITE_STYLE}`, `${ko} · 레이드/아레나 전용 · 논리 높이 72px`);
// ---- pets & companions ------------------------------------------------------
for (let r = 0; r < 6; r++) add(`pet_${r}`, 'sprite', 128, 128, { idle: 2 }, `tiny cute pet companion creature, ${RARITIES[r]} quality, floating beside the hero, ${SPRITE_STYLE}`, `펫 ${r}등급 · 논리 높이 34px · idle 2장으로 위아래 둥실`);
for (const [id, ko, desc] of COMPANIONS) {
  add(`companion_${id}`, 'sprite', 128, 128, { idle: 2, attack: 2 }, `${desc}, floating, ${SPRITE_STYLE}`, `동료 ${ko} · 주인공 뒤를 둥실 따라다니다 주기적으로 돌진 · 논리 높이 30px`);
  add(`companion_icon_${id}`, 'image', 128, 128, null, `${desc}, portrait bust, ${ICON_STYLE}`, `동료 ${ko} 아이콘 (동료 탭 카드)`);
}
// ---- backgrounds ------------------------------------------------------------
for (const [id, ko, scene] of REGIONS) {
  add(`bg_${id}_far`, 'image', 1024, 576, null, `${scene}, far parallax layer, horizontally tileable, ${BG_STYLE}`, `${ko} 원경 (스크롤 0.2배, 가로 반복)`);
  add(`bg_${id}_near`, 'image', 1024, 384, null, `${scene}, near parallax layer with trees/rocks/props only and a transparent sky, horizontally tileable, ${BG_STYLE}`, `${ko} 근경 (스크롤 0.5배, 투명 배경)`);
  add(`ground_${id}`, 'image', 512, 256, null, `seamless horizontally tileable ground texture strip matching ${scene}, top edge is the walkable surface, ${BG_STYLE}`, `${ko} 땅 타일 (가로 반복)`);
}
// ---- item icons -------------------------------------------------------------
for (const [job] of JOBS) for (let r = 0; r < 6; r++) add(`icon_weapon_${job}_${r}`, 'image', 128, 128, null, `${WEAPON_KIND[job]}, ${RARITIES[r]}, ${ICON_STYLE}`, `${job} 무기 ${r}등급`);
for (const [slot, ko, thing] of [['armor', '방어구', 'chest armor'], ['accessory', '장신구', 'ring or amulet'], ['pet', '펫', 'pet egg']]) for (let r = 0; r < 6; r++) add(`icon_${slot}_${r}`, 'image', 128, 128, null, `${thing}, ${RARITIES[r]}, ${ICON_STYLE}`, `${ko} ${r}등급`);
// ---- skills, artifacts, ui ---------------------------------------------------
for (const [id, ko, desc] of SKILLS) add(`skill_${id}`, 'image', 128, 128, null, `square RPG skill icon with a rounded dark frame, ${desc}, ${ICON_STYLE}`, `스킬 아이콘 ${ko}`);
for (const [id, ko, desc] of ARTIFACTS) add(`artifact_${id}`, 'image', 128, 128, null, `${desc}, ${ICON_STYLE}`, `유물 ${ko}`);
for (const [id, ko, desc] of TABS) add(`tab_${id}`, 'image', 96, 96, null, `game menu tab icon, ${desc}, ${ICON_STYLE}`, `하단 탭 아이콘 ${ko}`);
for (const [id, ko, desc] of QUICK) add(`quick_${id}`, 'image', 96, 96, null, `game HUD quick button icon, ${desc}, ${ICON_STYLE}`, `우측 퀵버튼 아이콘 ${ko}`);
add('ui_gold', 'image', 96, 96, null, `shiny gold coin with a star emblem, ${ICON_STYLE}`, '골드 재화 아이콘');
add('ui_gem', 'image', 96, 96, null, `glowing purple star-shaped gem, ${ICON_STYLE}`, '별점 재화 아이콘');
add('ui_ticket', 'image', 96, 96, null, `golden dungeon entry ticket, ${ICON_STYLE}`, '입장권 아이콘');
add('ui_cube', 'image', 96, 96, null, `glowing purple magic cube, ${ICON_STYLE}`, '큐브(잠재능력) 아이콘');
add('ui_star', 'image', 96, 96, null, `golden five point star with sparkle, ${ICON_STYLE}`, '스타포스 아이콘');
add('ui_logo', 'image', 768, 384, null, `fantasy Korean mobile game logo emblem: golden shield with a sword and a rising star, ornate, ${ICON_STYLE}`, '로딩/타이틀 로고');
add('ui_portal', 'image', 256, 384, null, `glowing blue magic portal gate, side view, ${ICON_STYLE}`, '스테이지 오른쪽 포탈');
add('ui_signpost', 'image', 192, 192, null, `wooden RPG signpost, side view, ${ICON_STYLE}`, '스테이지 왼쪽 표지판');
add('ui_platform', 'image', 256, 96, null, `floating wooden platform / foothold with grass on top, side view, horizontally tileable center, ${ICON_STYLE}`, '공중 발판 (가로 늘려서 사용)');
add('ui_rope', 'image', 64, 256, null, `hanging rope ladder, vertical, tileable, ${ICON_STYLE}`, '발판 밧줄 (세로 반복)');
// ---- effects ----------------------------------------------------------------
// ---- 투사체 -------------------------------------------------------------------
const PROJECTILES = [
  ['arrow', '화살', 'glowing wooden arrow with green fletching, motion trail'],
  ['orb', '마법구', 'glowing blue-purple magic orb with a sparkle trail'],
  ['shuriken', '표창', 'silver four point throwing star, spinning'],
  ['bolt', '전격탄', 'crackling yellow lightning bolt projectile'],
];
for (const [id, ko, desc] of PROJECTILES) add(`proj_${id}`, 'sprite', 128, 64, { idle: 2 }, `${desc}, side view pointing right, ${SPRITE_STYLE}`, `투사체 ${ko} · 논리 높이 14px · 좌우 반전해 사용 · idle 2장 반짝임`);

// ---- 스킬 발동 이펙트 (스킬마다 3프레임) -----------------------------------------
for (const [id, ko, desc] of SKILLS) add(`skillfx_${id}`, 'sprite', 256, 256, { attack: 3 }, `2D game skill effect animation, ${desc}, cartoon anime style, glowing, centered, transparent background, no text`, `스킬 이펙트 ${ko} · 3프레임(발생-절정-소멸) · 논리 높이 90px · 가산합성`);

// ---- UI 스킨 (패널/버튼/게이지/탭바/모달) -----------------------------------------
const UI_SKIN = [
  ['ui_panel', 512, 512, 'rounded dark purple game panel with a light border and soft inner glow', '시트·카드 배경 (9슬라이스, 모서리 32px)'],
  ['ui_panel_dark', 512, 512, 'darker rounded inset panel for list rows', '리스트 행 배경 (9슬라이스)'],
  ['ui_btn_gold', 256, 128, 'golden rounded glossy game button with a thick border, empty center', '주요 버튼 (강화·전직·수령)'],
  ['ui_btn_gold_press', 256, 128, 'the same golden button in a pressed darker state', '주요 버튼 눌림'],
  ['ui_btn_purple', 256, 128, 'purple rounded glossy game button', '뽑기·큐브 버튼'],
  ['ui_btn_red', 256, 128, 'red rounded glossy game button', '보스·레이드 버튼'],
  ['ui_btn_green', 256, 128, 'green rounded glossy game button', '합성·자동 ON 버튼'],
  ['ui_btn_gray', 256, 128, 'gray flat disabled rounded game button', '비활성 버튼'],
  ['ui_bar_frame', 256, 64, 'empty rounded gauge frame with a dark inner groove', 'HP·EXP·보스 게이지 테두리 (9슬라이스)'],
  ['ui_bar_hp', 256, 64, 'green glossy gauge fill', 'HP 채움'],
  ['ui_bar_exp', 256, 64, 'blue glossy gauge fill', 'EXP 채움'],
  ['ui_bar_boss', 256, 64, 'red glossy gauge fill', '보스 HP 채움'],
  ['ui_bar_stage', 256, 64, 'golden glossy gauge fill', '스테이지 진행 채움'],
  ['ui_tabbar', 512, 128, 'bottom tab bar background strip, dark purple with a bright top edge', '하단 탭바 배경'],
  ['ui_tab_active', 128, 128, 'glowing rounded highlight plate behind the selected tab', '선택된 탭 배경'],
  ['ui_modal_frame', 512, 512, 'ornate fantasy dialog frame with golden corners, empty center', '모달 테두리 (9슬라이스)'],
  ['ui_portrait_frame', 128, 128, 'golden rounded portrait frame, empty center', '캐릭터 초상화 테두리'],
  ['ui_slot_empty', 128, 128, 'empty dark equipment slot with a dashed inner border', '빈 장비·동료 슬롯'],
  ['ui_badge_new', 64, 64, 'small red NEW notification dot with a glow', '알림 뱃지'],
  ['ui_toast', 512, 128, 'rounded translucent notification banner plate', '토스트 배경 (9슬라이스)'],
];
for (const [id, w, hh, desc, note] of UI_SKIN) add(id, 'image', w, hh, null, `${desc}, Korean mobile RPG UI element, clean vector look, thick outline, transparent background, no text`, note);
for (let r = 0; r < 6; r++) add(`ui_rarity_${r}`, 'image', 128, 128, null, `equipment slot frame border in ${RARITIES[r]} rarity color, empty center, transparent background, no text`, `등급 테두리 ${r} (아이콘 뒤에 깔림)`);
const STAT_ICON = [['atk', '공격력', 'crossed swords'], ['hp', '체력', 'red heart'], ['def', '방어력', 'blue shield'], ['crit', '치명타 확률', 'target with an arrow'], ['critdmg', '치명타 피해', 'explosion burst'], ['aspd', '공격 속도', 'lightning bolt'], ['regen', '체력 재생', 'green cross with sparkles']];
for (const [id, ko, desc] of STAT_ICON) add(`ui_stat_${id}`, 'image', 96, 96, null, `game stat icon, ${desc}, ${ICON_STYLE}`, `돌파 강화 아이콘 ${ko}`);

const FX = [['hit', 'white and yellow star-shaped impact spark'], ['crit', 'bright orange critical hit burst with stars'], ['slash', 'curved white and orange sword slash arc'], ['fireball', 'round glowing orange fireball with a flame trail'], ['explosion', 'orange and yellow explosion burst'], ['lightning', 'jagged blue-white lightning bolt'], ['arrow', 'glowing green magic arrow'], ['shuriken', 'silver four point throwing star'], ['poison', 'bubbling green poison cloud'], ['meteor', 'flaming meteor rock with a fire trail'], ['heal', 'green sparkling healing light'], ['shield', 'translucent blue hexagonal energy shield bubble'], ['smoke', 'gray smoke puff'], ['levelup', 'golden rising light rays with sparkles'], ['jobaura', 'radiant golden transformation aura pillar'], ['coin', 'spinning gold coin'], ['deathpoof', 'white and gray defeat poof cloud']];
for (const [id, desc] of FX) add(`fx_${id}`, 'image', 256, 256, null, `2D game visual effect sprite, ${desc}, cartoon anime style, glowing, centered, transparent background, no text`, `이펙트 ${id} (가산합성으로 그려짐)`);

const total = rows.length;
const files = rows.reduce((n, r) => n + (r.frames ? Object.values(r.frames).reduce((a, b) => a + b, 0) : 1), 0);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ total, files, rows }, null, 1));
} else if (process.argv.includes('--manifest')) {
  const sprites = {};
  const images = {};
  for (const r of rows) {
    if (r.kind === 'sprite') {
      const frames = {};
      for (const [anim, count] of Object.entries(r.frames)) frames[anim] = Array.from({ length: count }, (_, i) => `sprites/${r.id}_${anim}${count > 1 ? '_' + i : ''}.png`);
      const mh = /논리 높이 (\d+)px/.exec(r.note);
      sprites[r.id] = { frames, height: mh ? Number(mh[1]) : 64, fps: { idle: 3, walk: 8, attack: 12, cast: 8, death: 6 } };
    } else {
      images[r.id] = `${r.id.startsWith('bg_') || r.id.startsWith('ground_') ? 'bg' : r.id.startsWith('icon_') || r.id.startsWith('skill_') || r.id.startsWith('artifact_') || r.id.startsWith('companion_icon_') ? 'icons' : r.id.startsWith('fx_') ? 'fx' : 'ui'}/${r.id}.png`;
    }
  }
  console.log(JSON.stringify({ version: 1, sprites, images }, null, 1));
} else {
  console.log(`# 에셋 슬롯 ${total}종 · 파일 ${files}장\n`);
  let kind = '';
  for (const r of rows) {
    const k = r.id.split('_')[0];
    if (k !== kind) {
      kind = k;
      console.log('');
    }
    const fr = r.frames ? Object.entries(r.frames).map(([a, n]) => a + '×' + n).join(' ') : '-';
    console.log(`${r.id.padEnd(24)} ${r.kind.padEnd(6)} ${String(r.w).padStart(4)}x${String(r.h).toString().padEnd(4)} ${fr.padEnd(46)} ${r.note}`);
  }
  console.log(`\n총 ${total} 슬롯 / ${files} 파일`);
}
