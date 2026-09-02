# 초보자 키우기: 전직의 대륙

초보자로 시작해 **4차 전직**까지 키우는 한국식 방치형 RPG. 웹에서 바로 플레이합니다.

- 플레이: https://novice-idle.web.app
- 형제 게임: [STELLA 별 키우기](https://stella-idle.web.app) · [ECHO 소리로 보는 던전](https://echo-sonar.web.app)

## 게임 시스템

| 분류 | 내용 |
|---|---|
| 전투 | 완전 자동. 지역 10곳 × 스테이지 10 = 100 스테이지 후 회차 반복 (최대 3000) |
| 사냥터 | ◀ ▶ 로 이미 뚫은 스테이지 선택, 죽으면 직전 스테이지로 후퇴 |
| 보스 | 10스테이지마다 30초 제한, 실패 시 직전 스테이지 반복 사냥 + 자동 재도전 |
| 전직 | Lv10/30/60/100 → 1~4차. 1차에서 전사·마법사·궁수·도적 선택, 별점 300으로 전환 |
| 돌파 강화 | 골드로 8종 능력치 강화 (×1/×10/×100/MAX, 자동 강화) |
| 장비 | 4슬롯 × 6등급 뽑기, 5개 합성 → 상위 등급, 별빛 단련 ★25, 룬석 룬 각인 3줄 |
| 동료 | 8종 소환, 3슬롯 장착, 패시브 + 주기 공격 |
| 유물 | 6종, 별점 획득 + 골드 강화 |
| 스킬 | 직업당 4종 + 초보자 기본기, 자동 시전 + 수동 시전, 골드로 레벨업 |
| 던전 | 골드/별점 던전(입장 또는 소탕), 무한의 탑, 보스 레이드, 아레나 |
| 일일 | 출석 7일, 일일 미션 6종 + 전체 보너스, 입장권 자정 리셋 |
| 방치 | 접속 중 평균 수입의 50%, 최대 8시간(4차 전직 12시간) |
| 기록 | 퀘스트 체인, 업적 16, 몬스터 도감 40, 전세계 랭킹(스테이지·레벨) |

## 개발

```bash
npm install
npm run dev      # http://localhost:5175
npm test         # vitest
npm run build    # tsc --noEmit && vite build
npm run deploy   # Firebase Hosting (novice 타깃)
```

디버그: 개발 모드에서 `window.novice` 로 `game / scene / panels / modals` 접근, `window.novice.setStage(n)` 으로 스테이지 이동, `window.__step(sec)` 로 시뮬레이션 진행.

페이싱 봇: `PACING=1 npx vitest run tests/pacing.test.ts`

## 구조

```
src/game/     순수 로직 (밸런스·전투·장비·잠재·동료·유물·던전·미션·저장) — 전부 테스트됨
src/app/      게임 컨트롤러 (20Hz 고정 틱, 오프라인 보상, 자동저장, 이벤트 버스)
src/render/   캔버스 렌더 (배경 패럴랙스·스프라이트·이펙트·벡터 폴백)
src/ui/       HUD + 하단 시트 탭 7종 + 모달
src/rank/     Firestore REST 랭킹 클라이언트
tools/        asset-list.mjs (에셋 슬롯 목록/매니페스트 생성)
docs/         HANDOFF-ASSETS.md (에셋 제작 인계문)
```

## 에셋

현재는 **코드 벡터 드로잉**으로 그려집니다. `public/assets/manifest.json` 과 이미지가 들어오면 해당 슬롯부터 자동으로 교체됩니다. 슬롯 정의 221종 / 파일 398장의 상세 규격은 [docs/HANDOFF-ASSETS.md](docs/HANDOFF-ASSETS.md) 참고.

```bash
node tools/asset-list.mjs            # 슬롯 목록
node tools/asset-list.mjs --manifest # manifest.json 뼈대
```
