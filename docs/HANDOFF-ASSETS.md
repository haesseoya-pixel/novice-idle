# 초보자 키우기: 전직의 대륙 — 에셋 제작 인계문

이 문서 하나만 보고 에셋을 전부 만들 수 있게 썼습니다. 게임 코드는 **에셋이 하나도 없어도 그대로 돌아갑니다**(벡터 폴백). 파일을 넣고 `manifest.json`에 등록하면 그 자리부터 그림이 바뀝니다. 몇 장씩 나눠 넣어도 됩니다.

- 프로젝트: `C:\Users\user\Desktop\novice-idle`
- 개발 서버: `npm run dev` (기본 5175 포트), 타입체크 `npx tsc --noEmit -p .`, 테스트 `npm test`
- 에셋 루트: `public/assets/`
- 슬롯 목록 출력: `node tools/asset-list.mjs` (사람용) / `--json` (기계용) / `--manifest` (매니페스트 뼈대)
- **총 410 슬롯 / 파일 1162장** (움직이는 것은 전부 프레임 애니메이션, UI 스킨·투사체·스킬/적 공격/상태이상/보상 이펙트·던전 배경 포함)

---

## 1. 폴더 구조와 manifest

```
public/assets/
  manifest.json          ← 이 파일이 있어야 로드됨 (없으면 전부 벡터 폴백)
  sprites/               ← 캐릭터·몬스터·펫·동료 (애니메이션 프레임)
  bg/                    ← 배경 원경/근경/땅
  icons/                 ← 장비·스킬·유물·동료 아이콘
  ui/                    ← 재화·탭·퀵버튼·포탈·표지판·로고
  fx/                    ← 이펙트
```

`manifest.json` 형식 (실제 로더 `src/render/assets.ts` 기준):

```jsonc
{
  "version": 1,
  "sprites": {
    "hero_warrior_2": {
      "frames": {
        "idle":   ["sprites/hero_warrior_2_idle.png"],
        "walk":   ["sprites/hero_warrior_2_walk_0.png", "sprites/hero_warrior_2_walk_1.png"],
        "attack": ["sprites/hero_warrior_2_attack.png"],
        "hit":    ["sprites/hero_warrior_2_hit.png"]
      },
      "height": 64,            // 게임 안에서의 논리 높이(px). 이 높이에 맞춰 자동 축소됨
      "anchor": [0.5, 1],      // 생략 시 하단 중앙(발끝). 공중 몬스터도 그대로 두세요
      "fps": { "walk": 6, "attack": 10 }
    }
  },
  "images": {
    "icon_weapon_warrior_4": "icons/icon_weapon_warrior_4.png",
    "bg_meadow_far": "bg/bg_meadow_far.png"
  }
}
```

규칙
- `frames`에 없는 애니메이션은 자동 대체됩니다: `cast→attack`, `death→hit`, `walk↔idle`. 그래서 **최소 `idle` 하나만 있어도** 동작합니다.
- `walk`에 2장을 넣으면 걷는 느낌이 납니다. `attack`은 1장이면 충분(코드가 잔상·이펙트를 얹습니다).
- 파일이 없거나 로드 실패하면 그 슬롯만 벡터 폴백으로 그려집니다. 게임은 안 죽습니다.
- 뼈대 만들기: `node tools/asset-list.mjs --manifest > public/assets/manifest.json` 후, 실제로 만든 파일만 남기고 나머지 항목은 지우세요.

---

## 2. 공통 아트 디렉션

한국 모바일 방치형 RPG(메이플 키우기 / 쿠키런 크럼블) 톤.

- **치비 2등신**, 큰 머리·큰 눈, 두꺼운 어두운 외곽선, 플랫 셀셰이딩 + 약한 하이라이트
- 채도 높은 밝은 색, 그림자 없음, **배경 투명(PNG)**, 텍스트·워터마크 없음
- 캐릭터는 **오른쪽을 봄**, 몬스터는 **왼쪽을 봄** (코드가 반전하지 않습니다)
- 앵커는 발끝(하단 중앙). 여백은 트림하고 캔버스 중앙 하단에 발이 닿게
- **주인공은 전부 여성 캐릭터**입니다 (초보자 포함 17종 전부)
- UI 팔레트: 배경 `#120c22`, 패널 `#1e1636`, 강조/골드 `#ffd166`, 별점(젬) `#c78bff`, HP `#6ff0a8`, EXP `#64b5f6`, 위험 `#ff6b6b`

프롬프트 접미사(스프라이트):
```
cute chibi 2D mobile RPG game sprite, Korean mobile idle-RPG art style, big head small body,
big shiny eyes, thick dark outline, flat cel shading with soft highlights, bright saturated colors,
side view, full body, centered, transparent background, no text, no watermark, no ground shadow
```
아이콘: `cute cartoon RPG game item icon, single object, thick dark outline, flat cel shading, glossy highlight, centered, transparent background, no text`
배경: `2D side-scrolling mobile RPG background art, cute cartoon style, painterly flat shading, vibrant colors, no characters, no text, no UI`

---

## 3. 슬롯 목록 (요약 · 정확한 전체 목록은 `node tools/asset-list.mjs`)

| 그룹 | 개수 | id 형식 | 권장 해상도 | 프레임 | 논리 높이 |
|---|---|---|---|---|---|
| 주인공 | 17 | `hero_novice`, `hero_{warrior\|mage\|archer\|thief}_{1..4}` | 256×256 | idle×2 walk×4 attack×3 cast×2 hit×1 death×3 | 64 |
| 몬스터 | 20 | `fluff`, `acornspirit`, … (테마당 1종) | 256×256 | idle×2 walk×2 attack×2 hit×1 death×2 | 64 |
| 보스 | 20 | `fluffking`, `guardiantree`, … (테마당 1종) | 320×320 | idle×2 walk×2 attack×3 hit×1 death×3 | 72 |
| 레이드/아레나 | 2 | `raidlord`, `ghost` | 320×320 | 보스와 동일 | 72 |
| 펫 | 6 | `pet_0` … `pet_5` (등급순) | 128×128 | idle×2 | 34 |
| 동료 | 30 | `companion_{id}` + 아이콘 `companion_icon_{id}` · 희귀10·영웅8·전설6·신화4·초월2 | 128×128 | idle×2 attack×2 | 30 |
| 배경(테마 20) | 60 | `bg_{theme}_far` / `bg_{theme}_near` / `ground_{theme}` | 1024×576 / 1024×384 / 512×256 | – | – |
| 콘텐츠 배경·배너 | 14 | `bg_dungeon_gold`, `bg_tower`, `bg_raid`, `bg_arena`, `banner_*` | 1024×576 / 768×256 | – | – |
| 장비 아이콘 | 48 | `icon_weapon_{job}_{0..5}`, `icon_{armor\|accessory\|pet}_{0..5}` | 128×128 | – | – |
| 스킬 아이콘 | 17 | `skill_{skillId}` | 128×128 | – | – |
| 유물 | 6 | `artifact_{id}` | 128×128 | – | – |
| 탭/퀵 아이콘 | 12 | `tab_{id}`, `quick_{id}` | 96×96 | – | – |
| UI 기타 | 9 | `ui_gold`, `ui_gem`, `ui_ticket`, `ui_cube`, `ui_star`, `ui_logo`, `ui_portal`, `ui_signpost`, `ui_platform`, `ui_rope` | 96~768 | – | – |
| 투사체 | 4 | `proj_{arrow\|orb\|shuriken\|bolt}` | 128×64 | idle×2 | 14 |
| 스킬 이펙트 | 17 | `skillfx_{skillId}` | 256×256 | attack×3 | 90 |
| UI 스킨 | 20 | `ui_panel`, `ui_btn_*`, `ui_bar_*`, `ui_tabbar`, `ui_modal_frame` … | 64~512 | – | – |
| 등급 테두리 | 6 | `ui_rarity_{0..5}` | 128×128 | – | – |
| 강화 아이콘 | 7 | `ui_stat_{atk\|hp\|def\|crit\|critdmg\|aspd\|regen}` | 96×96 | – | – |
| 이펙트 | 64 | `fx_{id}` | 256×256 | – | – |

테마 20종(= 몬스터 1 + 보스 1 + 배경 3장 세트). **챕터 3개가 테마 하나를 색조만 바꿔 공유**하므로, 이 20세트로 챕터 60개(1200 스테이지)가 만들어집니다. 챕터를 더 늘리고 싶으면 테마만 추가하면 됩니다.

`meadow 초록 초원` · `fireflyforest 반딧불 숲` · `shellbeach 소라 해변` · `candlehouse 촛불 폐가` · `frostpeak 서리 산` · `sanddune 모래 사막` · `ruins 고대 유적` · `skygarden 하늘 정원` · `dragonnest 용의 둥지` · `abyss 심연` · `mushcave 버섯 동굴` · `clockwork 태엽 공방` · `stormsea 폭풍 바다` · `boneyard 뼈의 무덤` · `crystalvale 수정 계곡` · `ashwaste 잿빛 황야` · `moonshrine 달빛 신전` · `thornmaze 가시 미궁` · `voidgate 공허의 문` · `dawnpeak 여명의 봉우리`

직업 4종과 차수별 콘셉트
- 전사(빨강 `#ff7a59`) 검사 → 파수병 → 강철심장 → 불굴의 용장
- 마법사(보라 `#7f8cff`) 견습술사 → 원소술사 → 비전학자 → 별빛 마도사
- 궁수(초록 `#7ed957`) 사냥꾼 → 순찰자 → 매의 눈 → 바람길잡이
- 도적(연보라 `#c78bff`) 도둑 → 그림자꾼 → 밤의 손 → 무영각
- 차수가 오를수록: 1차 가벼운 장비 → 2차 어깨 갑옷+짧은 망토 → 3차 화려한 망토+빛나는 무기 → 4차 금색 서클릿 + 오라 + 거대 무기

등급 색(장비 6등급 공통): 일반 회색 → 고급 초록 → 희귀 파랑 → 영웅 보라 → 전설 금색 → 신화 붉은금색

---

## 4. 배경 3레이어 규칙 (중요)

한 지역당 3장입니다. 게임은 이렇게 씁니다.

1. `bg_{region}_far` — 하늘/먼 산. **가로로 이어 붙여 반복**되고 스크롤 속도 0.2배. 좌우 끝이 이어지게(seamless).
2. `bg_{region}_near` — 나무·바위 같은 근경만. **하늘은 투명**, 스크롤 0.5배, 역시 가로 반복.
3. `ground_{region}` — 땅 타일 스트립. 맨 윗줄이 캐릭터가 서는 지면, 아래는 흙/단면. 가로 반복 1.0배.

캐릭터는 지면선 위에 서고, 화면 오른쪽 끝에는 `ui_portal`(다음 스테이지 포탈), 왼쪽에는 `ui_signpost`(지역·스테이지 표지판)가 그려집니다. 두 오브젝트는 배경에 그리지 말고 별도 PNG로 주세요.

---

## 5. 게임 시스템 (에셋이 어디에 쓰이는지)

표정: `hit` 프레임은 눈을 찡그리고, `attack`은 이를 앙다문 표정, `death`는 눈 감김 — 표정 변화가 프레임에 들어가야 합니다.

전투 화면(HUD)
- 좌상단: 주인공 초상화(`hero_*`의 idle을 얼굴만 크롭해서 자동 사용) + 레벨·전투력, 그 아래 골드(`ui_gold`)·별점(`ui_gem`)
- 상단 중앙: 지역명 + `Stage n/10` + 진행 게이지 + 보스 도전/전직 버튼
- 좌측: 가이드 퀘스트 카드, 우측: 퀵 버튼 5개(`quick_attend/mission/dungeon/raid/rank`)
- 하단: HP/EXP 바, 스킬 아이콘(`skill_*`), 자동 진행/자동 강화 토글, 다음 스테이지 버튼
- 하단 탭바 6개(`tab_growth/gear/companion/skill/adventure/summon`) · 우측 퀵 5개(출석·미션·퀘스트·도감·랭킹) · 우상단 3개(모험·통계·설정)

성장/콘텐츠
- **돌파 강화**: 골드로 공격력·체력·방어력·치명타·치명타 피해·공격 속도·재생·골드 획득 8종 (×1/×10/×100/MAX, 자동 강화 토글)
- **전직**: Lv10/30/60/100에 1~4차, 1차에서 전사·마법사·궁수·도적 선택, 별점 300으로 전환 가능
- **장비**: 4슬롯(무기·방어구·장신구·펫) × 6등급, 별점 뽑기(10연 희귀+ 보장, 30회 영웅, 100회 전설), 같은 장비 5개 → 상위 등급 **합성**, **별빛 단련** ★25까지, **룬석**로 룬 각인 3줄(레어→에픽→유니크→레전드리)
- **동료**: 8종 소환(희귀 70 / 영웅 25 / 전설 5%), 3슬롯 장착, 패시브 + 주기 공격
- **유물** 6종: 별점으로 획득, 골드로 강화 (골드·공격·체력·쿨감·치명피해·경험치)
- **던전**: 골드 던전, 별점 던전 (입장 or **소탕**), **무한의 탑**(층당 40초), **보스 레이드**(60초 딜량 경쟁), **아레나**(랭킹 유저 고스트와 대결)
- **일일**: 출석 7일 보상, 일일 미션 6종 + 전체 완료 보너스, 던전 입장권 자정 리셋
- **방치 보상**: 접속 중 평균 수입의 50%, 최대 8시간(4차 전직 시 12시간)
- 퀘스트 체인, 업적 16종, 몬스터 도감 40종, 전세계 랭킹(스테이지·레벨)

---

## 5-1. 해상도 / 화면 모드

세로(기본)와 **가로모드** 둘 다 지원합니다. 가로에서는 전투 화면이 전체 폭을 쓰고 메뉴가 오른쪽 46% 패널로 열립니다. 배경 원경/근경은 **가로로 반복**되므로 좌우 이음새가 반드시 맞아야 합니다(세로 이음새는 필요 없음). 땅 타일도 동일.

## 6. 작업 순서 추천

1. `hero_novice` 4프레임 → 화면에 바로 보임. 매니페스트 등록하고 `npm run dev`로 확인
2. 1지역 세트: `bg_meadow_*`, `ground_meadow`, `fluff/hopbun/bee/fluffking`
3. UI 아이콘(`ui_gold`, `ui_gem`, `tab_*`, `quick_*`) — 화면 인상이 확 바뀝니다
4. 직업 16종 × 4프레임
5. 나머지 지역 9곳 + 몬스터 36종
6. 장비/스킬/유물/동료 아이콘
7. 이펙트 `fx_*` (마지막, 없어도 코드가 그림)

검수: `npm run dev` → 개발자 콘솔에서 `window.novice.setStage(n)`으로 지역 이동, `window.novice.game.state.hero.job='mage'` 등으로 직업 변경, `window.__step(5)`로 5초 진행.

---

## 7. 하면 안 되는 것

- 메이플스토리·쿠키런의 실제 캐릭터/몬스터/UI를 그대로 베끼지 말 것. 톤만 맞추고 디자인은 창작.
- 스프라이트에 그림자·바닥·배경 그리지 말 것(투명 배경).
- 캐릭터 스프라이트에 텍스트·프레임·아이콘 테두리 넣지 말 것.
- 파일명은 위 id와 **정확히 일치**해야 합니다(대소문자·언더스코어 포함).

---

## 8. UI / IA / UX 는 다시 짜도 됩니다 (중요)

현재 화면 구성은 **동작 확인용 뼈대**입니다. 지금 배치를 그대로 따라야 할 이유가 전혀 없습니다.
최신 한국 방치형 RPG(메이플 키우기 · 쿠키런 크럼블 등) 기준으로 **정보 구조(IA)와 화면 흐름(UX)을 새로 설계해 주세요.**

지켜야 하는 것은 다음 뿐입니다.

1. 게임 로직 API (`src/app/game.ts`의 메서드와 `src/game/*`의 순수 함수) — 이건 바꾸지 마세요.
2. 에셋 슬롯 id (아래 목록) — 파일명이 바뀌면 코드가 못 찾습니다.
3. 세로/가로 양쪽에서 동작할 것.

바꿔도 되는 것: 탭 개수와 이름, 화면 계층, 카드/리스트 레이아웃, 색·타이포·아이콘 배치, 애니메이션, 모달 흐름, 튜토리얼, 배너·팝업 구성 전부.

참고할 현대 키우기류 관례
- 전투 화면은 항상 뒤에서 돌아가고, 메뉴는 그 위에 시트/패널로 올라온다
- 상단: 프로필(레벨·전투력·순위) + 재화, 중앙: 챕터/스테이지 진행, 우측: 세로 아이콘 열(출석·미션·우편·랭킹·이벤트)
- 하단 탭 5~6개 이내, 각 탭 안에서 세그먼트로 하위 화면 분기
- 소환(가챠)은 독립 화면, 편성/강화와 분리
- 던전·탑·레이드·아레나는 각각 독립 화면 (한 목록에 섞지 않기)
- 신규 획득·보상 수령은 항상 연출 모달로
- 배지(빨간 점)는 "지금 눌러서 이득 볼 수 있는 곳"에만

## 9. 이번에 추가된 에셋 슬롯 (요약)

| 그룹 | 슬롯 | 비고 |
|---|---|---|
| 콘텐츠 배경 | `bg_dungeon`, `bg_dungeon_gold`, `bg_dungeon_gem`, `bg_tower`, `bg_raid`, `bg_arena` | 각 1024×576, 가로 반복. 해당 모드 진입 시 지역 배경 대신 사용 |
| 콘텐츠 배너 | `banner_dungeon`, `banner_dungeon_gold`, `banner_dungeon_gem`, `banner_tower`, `banner_raid`, `banner_arena` | 768×256, 메뉴 카드 상단 |
| 소환 배너 | `banner_gear_gacha`, `banner_companion_gacha` | 768×256 |
| 투사체 | `proj_arrow`, `proj_orb`, `proj_shuriken`, `proj_bolt` | 128×64, idle×2, 논리 높이 14px |
| 스킬 이펙트 | `skillfx_{스킬id}` 17종 | 256×256, attack×3 (발생-절정-소멸), 논리 높이 90px |
| UI 스킨 | `ui_panel`, `ui_panel_dark`, `ui_btn_gold/gold_press/purple/red/green/gray`, `ui_bar_frame`, `ui_bar_hp/exp/boss/stage`, `ui_tabbar`, `ui_tab_active`, `ui_modal_frame`, `ui_portrait_frame`, `ui_slot_empty`, `ui_badge_new`, `ui_toast` | 9슬라이스 기준 모서리 32px |
| 등급 테두리 | `ui_rarity_0` ~ `ui_rarity_5` | 아이콘 뒤에 깔림 |
| 강화 아이콘 | `ui_stat_atk/hp/def/crit/critdmg/aspd/regen` | 96×96 |
| 동료 | `companion_{id}` 30종 + `companion_icon_{id}` 30종 | 희귀10·영웅8·전설6·신화4·초월2 (상위일수록 종류도 적음) |
| 테마 | 몬스터 20 + 보스 20 + 배경 60 | 챕터 3개가 한 테마를 색조만 바꿔 공유 |

전체 정확한 목록: `node tools/asset-list.mjs` (사람용) / `--json` (기계용) / `--manifest` (매니페스트 뼈대)

## 10. 현재 밸런스 요약 (UI 재설계 시 참고)

- 챕터 60개 × 스테이지 20 = **1200 스테이지 / 회차**, 10스테이지마다 보스(30초 제한)
- 초반은 퍼줌: 스테이지 40까지 약 14분, 1차 전직 8분, 2차 16분
- 중반부터 벽: 스테이지 100 약 43분, 3차 전직 32분, 4차 전직 100분
- 후반은 계단식: 몬스터 체력 성장률이 1.12 → 1.175 → 1.21 → 1.24로 단계 상승,
  레벨업 요구 경험치는 `5L × 1.093^L`로 급격히 무거워짐 → 무과금은 하루 단위 사냥/방치로 한 칸씩 넘는 구조

## 11. 이펙트 전체 목록 (64종, 빠짐없이)

`fx_{id}` · 256×256 · 투명 배경 · 가산합성으로 그려지므로 검은 배경 금지, 발광체 위주.

- **타격/피격** `hit` `hit_heavy` `crit` `blocked` `hurt` `guard`
- **적 공격** `enemy_bite` `enemy_claw` `enemy_smash` `enemy_spit` `enemy_shock` `enemy_wind` `enemy_charge`
- **사망/처치** `deathpoof` `death_soul` `boss_death`
- **등장/경고** `boss_intro` `boss_warning` `spawn` `portal_flash`
- **스킬 공통** `slash` `slash_big` `fireball` `explosion` `lightning` `arrow` `arrow_rain` `shuriken` `poison` `meteor` `quake` `heal` `shield` `stealth` `smoke`
- **상태이상/버프** `burn` `poisoned` `slow` `stun` `buff_atk` `buff_def`
- **보상/성장** `coin` `gem_pop` `exp_orb` `levelup` `jobaura` `job_burst` `star_up` `rune_glow` `fuse_flash`
- **소환 연출** `summon_circle` `summon_beam` `rarity_common` `rarity_rare` `rarity_epic` `rarity_legend` `rarity_myth` `rarity_transcend`
- **환경 파티클** `dust` `leaf` `snowflake` `ember` `bubble` `spark_trail`

여기에 더해 **스킬별 전용 이펙트 애니메이션** `skillfx_{스킬id}` 17종(3프레임)이 따로 있습니다. 위 `fx_*`는 공용 연출, `skillfx_*`는 각 스킬 고유 연출입니다.
