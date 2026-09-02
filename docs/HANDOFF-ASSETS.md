# 초보자 키우기: 전직의 대륙 — 에셋 제작 인계문

이 문서 하나만 보고 에셋을 전부 만들 수 있게 썼습니다. 게임 코드는 **에셋이 하나도 없어도 그대로 돌아갑니다**(벡터 폴백). 파일을 넣고 `manifest.json`에 등록하면 그 자리부터 그림이 바뀝니다. 몇 장씩 나눠 넣어도 됩니다.

- 프로젝트: `C:\Users\user\Desktop\novice-idle`
- 개발 서버: `npm run dev` (기본 5175 포트), 타입체크 `npx tsc --noEmit -p .`, 테스트 `npm test`
- 에셋 루트: `public/assets/`
- 슬롯 목록 출력: `node tools/asset-list.mjs` (사람용) / `--json` (기계용) / `--manifest` (매니페스트 뼈대)
- **총 221 슬롯 / 파일 398장**

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
| 주인공 | 17 | `hero_novice`, `hero_{warrior\|mage\|archer\|thief}_{1..4}` | 256×256 | idle/walk/attack/hit | 64 |
| 몬스터 | 30 | `fluff`, `hopbun`, … (지역별 3종 × 10) | 256×256 | idle/walk/attack/hit | 64 |
| 보스 | 10 | `fluffking`, `guardiantree`, … | 320×320 | idle/walk/attack/hit | 72 |
| 레이드/아레나 | 2 | `raidlord`, `ghost` | 320×320 | idle/walk/attack/hit | 72 |
| 펫 | 6 | `pet_0` … `pet_5` (등급순) | 128×128 | idle | 34 |
| 동료 | 8 | `companion_{id}` + 아이콘 `companion_icon_{id}` | 128×128 | idle | 30 |
| 배경 | 30 | `bg_{region}_far` / `bg_{region}_near` / `ground_{region}` | 1024×576 / 1024×384 / 512×256 | – | – |
| 장비 아이콘 | 48 | `icon_weapon_{job}_{0..5}`, `icon_{armor\|accessory\|pet}_{0..5}` | 128×128 | – | – |
| 스킬 아이콘 | 17 | `skill_{skillId}` | 128×128 | – | – |
| 유물 | 6 | `artifact_{id}` | 128×128 | – | – |
| 탭/퀵 아이콘 | 12 | `tab_{id}`, `quick_{id}` | 96×96 | – | – |
| UI 기타 | 9 | `ui_gold`, `ui_gem`, `ui_ticket`, `ui_cube`, `ui_star`, `ui_logo`, `ui_portal`, `ui_signpost`, `ui_platform`, `ui_rope` | 96~768 | – | – |
| 이펙트 | 17 | `fx_{id}` | 256×256 | – | – |

지역 10곳(고정 순서): `meadow 초록 초원` · `fireflyforest 반딧불 숲` · `shellbeach 소라 해변` · `candlehouse 촛불 폐가` · `frostpeak 서리 산` · `sanddune 모래 사막` · `ruins 고대 유적` · `skygarden 하늘 정원` · `dragonnest 용의 둥지` · `abyss 심연`

직업 4종과 차수별 콘셉트
- 전사(빨강 `#ff7a59`) 검사 → 기사 → 성기사 → 검성
- 마법사(보라 `#7f8cff`) 견습 마법사 → 원소술사 → 대마법사 → 아크메이지
- 궁수(초록 `#7ed957`) 사냥꾼 → 레인저 → 저격수 → 신궁
- 도적(연보라 `#c78bff`) 도둑 → 암살자 → 그림자 → 야행자
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

전투 화면(HUD)
- 좌상단: 주인공 초상화(`hero_*`의 idle을 얼굴만 크롭해서 자동 사용) + 레벨·전투력, 그 아래 골드(`ui_gold`)·별점(`ui_gem`)
- 상단 중앙: 지역명 + `Stage n/10` + 진행 게이지 + 보스 도전/전직 버튼
- 좌측: 가이드 퀘스트 카드, 우측: 퀵 버튼 5개(`quick_attend/mission/dungeon/raid/rank`)
- 하단: HP/EXP 바, 스킬 아이콘(`skill_*`), 자동 진행/자동 강화 토글, 다음 스테이지 버튼
- 하단 탭바 7개(`tab_growth/gear/summon/skill/job/dungeon/record`)

성장/콘텐츠
- **돌파 강화**: 골드로 공격력·체력·방어력·치명타·치명타 피해·공격 속도·재생·골드 획득 8종 (×1/×10/×100/MAX, 자동 강화 토글)
- **전직**: Lv10/30/60/100에 1~4차, 1차에서 전사·마법사·궁수·도적 선택, 별점 300으로 전환 가능
- **장비**: 4슬롯(무기·방어구·장신구·펫) × 6등급, 별점 뽑기(10연 희귀+ 보장, 30회 영웅, 100회 전설), 같은 장비 5개 → 상위 등급 **합성**, **스타포스** ★25까지, **큐브**로 잠재능력 3줄(레어→에픽→유니크→레전드리)
- **동료**: 8종 소환(희귀 70 / 영웅 25 / 전설 5%), 3슬롯 장착, 패시브 + 주기 공격
- **유물** 6종: 별점으로 획득, 골드로 강화 (골드·공격·체력·쿨감·치명피해·경험치)
- **던전**: 골드 던전, 별점 던전 (입장 or **소탕**), **무한의 탑**(층당 40초), **보스 레이드**(60초 딜량 경쟁), **아레나**(랭킹 유저 고스트와 대결)
- **일일**: 출석 7일 보상, 일일 미션 6종 + 전체 완료 보너스, 던전 입장권 자정 리셋
- **방치 보상**: 접속 중 평균 수입의 50%, 최대 8시간(4차 전직 시 12시간)
- 퀘스트 체인, 업적 16종, 몬스터 도감 40종, 전세계 랭킹(스테이지·레벨)

---

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
