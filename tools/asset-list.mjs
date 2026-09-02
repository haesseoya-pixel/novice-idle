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
  ['mushcave', '버섯 동굴', 'glowing mushroom cave, giant pink caps, dripping water, bioluminescent spores'],
  ['clockwork', '태엽 공방', 'clockwork workshop, giant brass gears, steam pipes, warm lamplight'],
  ['stormsea', '폭풍 바다', 'stormy sea cliffs, crashing waves, rain, lightning over dark water'],
  ['boneyard', '뼈의 무덤', 'graveyard of giant bones, cracked tombstones, pale fog, dim violet sky'],
  ['crystalvale', '수정 계곡', 'crystal valley, huge blue crystals, refracted light beams, starry sky'],
  ['ashwaste', '잿빛 황야', 'ashen wasteland, burnt trees, falling ash, dull red horizon'],
  ['moonshrine', '달빛 신전', 'moonlit shrine, marble pillars, floating lanterns, deep blue night'],
  ['thornmaze', '가시 미궁', 'overgrown thorn maze, giant brambles, glowing green pollen, dense hedges'],
  ['voidgate', '공허의 문', 'void gate ruins, floating black monoliths, purple rift in the sky'],
  ['dawnpeak', '여명의 봉우리', 'dawn mountain peak above clouds, golden sunrise, warm light rays'],
];

const MONSTERS = [
  ['fluff', '털뭉치', '털뭉치 monster, original design fitting 초록 초원'],
  ['fluffking', '거대 털뭉치', '거대 털뭉치 boss monster, original design fitting 초록 초원'],
  ['acornspirit', '도토리 정령', '도토리 정령 monster, original design fitting 반딧불 숲'],
  ['guardiantree', '숲의 수호목', '숲의 수호목 boss monster, original design fitting 반딧불 숲'],
  ['hermit', '소라게', '소라게 monster, original design fitting 소라 해변'],
  ['kingcrab', '왕소라게', '왕소라게 boss monster, original design fitting 소라 해변'],
  ['candleghost', '촛불 유령', '촛불 유령 monster, original design fitting 촛불 폐가'],
  ['puppeteer', '인형사 유령', '인형사 유령 boss monster, original design fitting 촛불 폐가'],
  ['snowman', '눈사람', '눈사람 monster, original design fitting 서리 산'],
  ['frostqueen', '서리 여왕 여우', '서리 여왕 여우 boss monster, original design fitting 서리 산'],
  ['cactus', '선인장 괴물', '선인장 괴물 monster, original design fitting 모래 사막'],
  ['greatworm', '거대 모래벌레', '거대 모래벌레 boss monster, original design fitting 모래 사막'],
  ['statue', '석상 병사', '석상 병사 monster, original design fitting 고대 유적'],
  ['colossus', '유적 거신', '유적 거신 boss monster, original design fitting 고대 유적'],
  ['cloudsheep', '구름양', '구름양 monster, original design fitting 하늘 정원'],
  ['stormwhale', '폭풍 구름고래', '폭풍 구름고래 boss monster, original design fitting 하늘 정원'],
  ['egglizard', '알 도마뱀', '알 도마뱀 monster, original design fitting 용의 둥지'],
  ['reddragon', '붉은 드래곤', '붉은 드래곤 boss monster, original design fitting 용의 둥지'],
  ['eyeball', '눈알 괴물', '눈알 괴물 monster, original design fitting 심연'],
  ['abysseye', '심연의 눈', '심연의 눈 boss monster, original design fitting 심연'],
  ['sporecap', '포자갓', '포자갓 monster, original design fitting 버섯 동굴'],
  ['sporequeen', '포자 여왕', '포자 여왕 boss monster, original design fitting 버섯 동굴'],
  ['cogbug', '톱니 벌레', '톱니 벌레 monster, original design fitting 태엽 공방'],
  ['greatgear', '거대 태엽정', '거대 태엽정 boss monster, original design fitting 태엽 공방'],
  ['waverider', '파도 정령', '파도 정령 monster, original design fitting 폭풍 바다'],
  ['krakenling', '어린 크라켄', '어린 크라켄 boss monster, original design fitting 폭풍 바다'],
  ['rattler', '덜그럭 해골', '덜그럭 해골 monster, original design fitting 뼈의 무덤'],
  ['boneking', '백골 군주', '백골 군주 boss monster, original design fitting 뼈의 무덤'],
  ['shardling', '수정 조각', '수정 조각 monster, original design fitting 수정 계곡'],
  ['prismlord', '프리즘 군주', '프리즘 군주 boss monster, original design fitting 수정 계곡'],
  ['cindercrow', '잿까마귀', '잿까마귀 monster, original design fitting 잿빛 황야'],
  ['cinderbeast', '잿불 야수', '잿불 야수 boss monster, original design fitting 잿빛 황야'],
  ['moonpriest', '달 사제', '달 사제 monster, original design fitting 달빛 신전'],
  ['moonoracle', '달의 신탁', '달의 신탁 boss monster, original design fitting 달빛 신전'],
  ['thornhound', '가시 사냥개', '가시 사냥개 monster, original design fitting 가시 미궁'],
  ['thornheart', '가시심장', '가시심장 boss monster, original design fitting 가시 미궁'],
  ['riftspawn', '균열 새끼', '균열 새끼 monster, original design fitting 공허의 문'],
  ['gatewarden', '문지기', '문지기 boss monster, original design fitting 공허의 문'],
  ['sunhawk', '태양매', '태양매 monster, original design fitting 여명의 봉우리'],
  ['dawnsovereign', '여명의 군주', '여명의 군주 boss monster, original design fitting 여명의 봉우리'],
];
const BOSSES = new Set(['fluffking', 'guardiantree', 'kingcrab', 'puppeteer', 'frostqueen', 'greatworm', 'colossus', 'stormwhale', 'reddragon', 'abysseye', 'sporequeen', 'greatgear', 'krakenling', 'boneking', 'prismlord', 'cinderbeast', 'moonoracle', 'thornheart', 'gatewarden', 'dawnsovereign']);
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
  ['slimeknight', '슬라임 기사', '슬라임 기사 companion creature, rarity 2'],
  ['foxspirit', '여우 정령', '여우 정령 companion creature, rarity 2'],
  ['owlsage', '올빼미 현자', '올빼미 현자 companion creature, rarity 2'],
  ['mossbunny', '이끼 토끼', '이끼 토끼 companion creature, rarity 2'],
  ['pebblecrab', '조약돌 게', '조약돌 게 companion creature, rarity 2'],
  ['bubblefish', '물방울 물고기', '물방울 물고기 companion creature, rarity 2'],
  ['sproutcat', '새싹 고양이', '새싹 고양이 companion creature, rarity 2'],
  ['dustmoth', '먼지 나방', '먼지 나방 companion creature, rarity 2'],
  ['inkoctopus', '먹물 문어', '먹물 문어 companion creature, rarity 2'],
  ['runeturtle', '룬 거북', '룬 거북 companion creature, rarity 2'],
  ['emberbat', '잉걸 박쥐', '잉걸 박쥐 companion creature, rarity 3'],
  ['frostcat', '서리 고양이', '서리 고양이 companion creature, rarity 3'],
  ['stonepup', '돌 강아지', '돌 강아지 companion creature, rarity 3'],
  ['thunderferret', '번개 족제비', '번개 족제비 companion creature, rarity 3'],
  ['sandhound', '모래 사냥개', '모래 사냥개 companion creature, rarity 3'],
  ['gustfalcon', '질풍 매', '질풍 매 companion creature, rarity 3'],
  ['mossbear', '이끼 곰', '이끼 곰 companion creature, rarity 3'],
  ['shadowraven', '그림자 큰까마귀', '그림자 큰까마귀 companion creature, rarity 3'],
  ['stardragon', '별 드래곤', '별 드래곤 companion creature, rarity 4'],
  ['moonrabbit', '달 토끼', '달 토끼 companion creature, rarity 4'],
  ['sunphoenix', '태양 불사조', '태양 불사조 companion creature, rarity 4'],
  ['voidserpent', '공허 뱀', '공허 뱀 companion creature, rarity 4'],
  ['crystalunicorn', '수정 유니콘', '수정 유니콘 companion creature, rarity 4'],
  ['stormwyrm', '폭풍 비룡', '폭풍 비룡 companion creature, rarity 4'],
  ['astralkirin', '천공 기린', '천공 기린 companion creature, rarity 5'],
  ['eclipsehound', '월식 사냥개', '월식 사냥개 companion creature, rarity 5'],
  ['tidesovereign', '조수의 지배자', '조수의 지배자 companion creature, rarity 5'],
  ['embertitan', '잿불 거신', '잿불 거신 companion creature, rarity 5'],
  ['worldtree', '세계수의 화신', '세계수의 화신 companion creature, rarity 6'],
  ['timelesswyrm', '영겁의 용', '영겁의 용 companion creature, rarity 6'],
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
add('ui_cube', 'image', 96, 96, null, `glowing purple magic cube, ${ICON_STYLE}`, '룬석(룬 각인) 아이콘');
add('ui_star', 'image', 96, 96, null, `golden five point star with sparkle, ${ICON_STYLE}`, '별빛 단련 아이콘');
add('ui_logo', 'image', 768, 384, null, `fantasy Korean mobile game logo emblem: golden shield with a sword and a rising star, ornate, ${ICON_STYLE}`, '로딩/타이틀 로고');
add('ui_portal', 'image', 256, 384, null, `glowing blue magic portal gate, side view, ${ICON_STYLE}`, '스테이지 오른쪽 포탈');
add('ui_signpost', 'image', 192, 192, null, `wooden RPG signpost, side view, ${ICON_STYLE}`, '스테이지 왼쪽 표지판');
add('ui_platform', 'image', 256, 96, null, `floating wooden platform / foothold with grass on top, side view, horizontally tileable center, ${ICON_STYLE}`, '공중 발판 (가로 늘려서 사용)');
add('ui_rope', 'image', 64, 256, null, `hanging rope ladder, vertical, tileable, ${ICON_STYLE}`, '발판 밧줄 (세로 반복)');
// ---- effects ----------------------------------------------------------------
// ---- 던전 · 탑 · 레이드 · 아레나 배경/배너 -----------------------------------
const CONTENT_BG = [
  ['dungeon', '성장 던전', 'treasure-filled dungeon hall with gold piles and torches'],
  ['dungeon_gold', '골드 던전', 'vault room overflowing with gold coins and chests'],
  ['dungeon_gem', '별점 던전', 'crystal cavern glowing with purple star gems'],
  ['tower', '무한의 탑', 'endless dark tower interior with a spiral staircase and glowing runes'],
  ['raid', '보스 레이드', 'apocalyptic arena before a giant abyssal overlord, purple flames'],
  ['arena', '아레나', 'colosseum arena with cheering crowd and banners'],
];
for (const [id, ko, desc] of CONTENT_BG) {
  add(`bg_${id}`, 'image', 1024, 576, null, `${desc}, ${BG_STYLE}`, `${ko} 전투 배경 (가로 반복)`);
  add(`banner_${id}`, 'image', 768, 256, null, `${desc}, wide banner composition, ${BG_STYLE}`, `${ko} 메뉴 배너`);
}
add('banner_gear_gacha', 'image', 768, 256, null, `treasure chest bursting with glowing weapons and armor, wide banner, ${BG_STYLE}`, '장비 소환 배너');
add('banner_companion_gacha', 'image', 768, 256, null, `magic summoning circle with cute companion creatures appearing, wide banner, ${BG_STYLE}`, '동료 소환 배너');

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
  ['ui_btn_purple', 256, 128, 'purple rounded glossy game button', '뽑기·룬석 버튼'],
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
