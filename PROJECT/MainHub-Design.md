# 설계 — 성장 대시보드 메인 허브 + 멀티 챕터

작성일: 2026-06-13
상태: 브레인스토밍 완료, 구현 대기 (Codex 위임 예정)

## 0. 개요

"한 판 하고 끝"이던 구조에, 판과 판 사이에 성장하는 **거점(홈)** 을 추가한다.
메인 화면은 **성장 대시보드** 컨셉: 내 전투력·진척·다음 목표가 한눈에 보인다.

### 핵심 루프
```
메소 벌기(게임) → 강화로 전투력↑ → 챕터 보스 클리어 → 다음 챕터 해금
   → 더 센 적/보상 → 또 강화
```

### 브레인스토밍 결정 요약
- **메인 화면 컨셉**: 성장 대시보드형 (B)
- **챕터 구분**: 테마 + 전용 몹/보스, **보스 클리어로 다음 챕터 해금** (A). 목표 ~5개.
- **콘텐츠 범위**: A2 — 챕터 시스템 + **Ch1만 실제 플레이**(현재 게임), Ch2~5는 잠금/준비중. 새 에셋은 나중에.
- **진행 게이트**: 보스 클리어만으로 해금. **전투력(CP)은 대시보드 참고 숫자**(입장 제한엔 미사용).
- **유저 구분**: 로컬 멀티 프로필 (localStorage), 로그인 없음.
- **장비**: 도감이 아니라 **강화** 시스템. 강화가 인게임 스탯에 반영.
- **코디**: 잠금/해제·장착. 외형은 컬러 틴트가 아니라 **캔버스로 직접(대강) 그린 장식 오버레이**(모자·망토·날개·왕관 등).
- **메소**: 몹에서 **확률 드랍**(B) — 잡몹 ~30% 확률로 한 번에 큰 양. 자석 획득. 런 종료 시 적립.
- **UI**: 메뉴/허브는 **React/HTML 오버레이**, 게임은 기존 canvas 유지.

> 추가가 필요한 이미지/에셋은 전부 `PROJECT/AssetsNeeded.md`에 정리. 본 설계는 에셋 0개 추가로 동작하도록 절차적 렌더(직접 그리기)를 사용한다.

---

## 1. 화면 / Phase 구조

기존 phase: `title | skillpick | playing | paused | levelup | result`

신규 메뉴 화면은 React/HTML 오버레이로 추가한다. canvas 게임 화면(`skillpick/playing/paused/levelup/result`)은 그대로 둔다.

오버레이 뷰(메뉴):
- `home` — 대시보드 (기존 `title` 역할 대체)
- `chapters` — 챕터 선택
- `enhance` — 강화
- `wardrobe` — 코디
- `profiles` — 프로필 선택/생성/전환/삭제

흐름:
```
home ──[챕터 도전]──> (chapters) ──[Ch 선택]──> skillpick → playing → result
result ──[홈으로]──> home   (이때 메소 적립 + 챕터 진척 + 해금 평가)
home ─ [강화]/[코디]/[프로필] ─> 각 오버레이 ─ [뒤로] ─> home
```

구현 메모: App.tsx에 `menuView` 상태(또는 phase 확장)를 두고, 게임 canvas 위/대신 오버레이를 조건부 렌더. 게임 루프(rAF)는 `playing` 등에서만 캔버스를 그리고, 메뉴 중엔 정지 또는 배경만.

---

## 2. 데이터 모델 (localStorage)

키:
- `sr_profiles` — Profile[] (JSON)
- `sr_active_profile` — 활성 프로필 id
- (마이그레이션) 기존 `sr_best` → 기본 프로필 생성 후 Ch1 기록으로 이전, 이후 `sr_best`는 사용 안 함(보존만).

```ts
interface Profile {
  id: string;            // uuid/timestamp
  name: string;
  createdAt: number;
  mesos: number;         // 보유 메소 (강화에 사용)
  enhance: {             // 0~10강
    weapon: number;
    top: number;
    bottom: number;
    shoes: number;
  };
  chapters: {            // 챕터별 진척
    [chapterId: string]: {
      cleared: boolean;
      bestScore: number;
      bestGrade: string;
      bestTime: number;
    };
  };
  unlockedCosmetics: string[];  // 해금된 코디 id
  equippedCosmetic: string;     // 현재 장착 코디 id (기본 'default')
  stats: {               // 해금 조건 평가용 누적치
    plays: number;
    totalKills: number;
    bossKills: number;
    maxLevel: number;
    totalMesosEarned: number;
  };
}
```

`profile.ts` 책임: 로드/세이브, 활성 프로필 get/set, 생성/삭제, 마이그레이션, result 결과 반영(메소 적립·stats 갱신·챕터 진척·해금 평가), CP 계산.

---

## 3. 강화 시스템

슬롯 4종 → 플레이어 스탯 매핑 (게임 시작 시 1회 적용):

| 슬롯 | 메이플 파트 | 효과 (레벨당) | 적용 대상 |
|------|------------|---------------|-----------|
| weapon | STAFF | 공격력 +8% | `P.atkM` |
| top | coat | 최대 HP +20 | `P.maxHp` |
| bottom | pants | 최대 HP +20 | `P.maxHp` |
| shoes | shoes | 이동속도 +3% | `P.spdM` |

> 위 수치는 기본값, `catalog.ts`에서 조정 가능.

- 최대 강화: **10강** (전 슬롯 공통).
- 강화 비용(다음 레벨): `cost(lv) = round(50 * 1.55^lv)` (Lv0→1: 50 … Lv9→10: ~2550). 기본값.
- **실패/파괴 없음** (첫 버전). 메소 충분하면 항상 성공.
- 적용 시점: `resetGameState()` 또는 게임 시작 직전에 활성 프로필 `enhance`를 읽어 P 초기 스탯에 합산. (기존 `P.atk/atkM/maxHp/spd/spdM` 초기화 직후 보너스 적용)

### 전투력 (CP)
대시보드 표시용 단일 숫자. 입장 제한엔 사용 안 함.
```
CP = weaponLv*10 + topLv*6 + bottomLv*6 + shoesLv*5   // 기본 가중치, 조정 가능
```

---

## 4. 메소 (몹 확률 드랍, B방식)

기존 `DropItem` 자석 획득 시스템 재사용 (`updDrops`, `P.magR`).

- 타입 추가: `DropItem.type`에 `'meso'` 추가.
- `addMeso(x, y, v)` — 메소 드랍 스폰 (절차적 금색 코인 렌더).
- 몹 사망 시 드랍 규칙 (B = 확률 드랍, 기본값):

| 대상 | 드랍 확률 | 드랍 메소(주울 때) |
|------|-----------|--------------------|
| 잡몹(달팽이/버섯) | ~30% | 5~10 |
| 중간보스(머쉬맘류) | 100% | 40~80 |
| 보스(주르발록) | 100% | 300~500 |

- **챕터 클리어 보너스**: 보스 처치 시 챕터별 고정 메소 추가 (예: Ch1 +100). 기본값.
- 획득 처리: `updDrops`에서 `'meso'` 픽업 시 **런 메소 카운터**(`runMesos`) 증가, 코인 sfx, 플로팅 텍스트.
- HUD: 플레이 중 현재 런 메소를 캔버스 HUD에 표시.
- 적립: **주운 메소만** 런 종료(result)에서 프로필 `mesos`에 합산. 안 주우면 손해(뱀서 손맛). 기존 "점수/50" 적립 공식은 **폐기**.

---

## 5. 챕터 시스템 (A2)

`catalog.ts`에 챕터 데이터 정의:
```ts
interface ChapterDef {
  id: string;            // 'ch1'...
  name: { en: string; ko: string };
  theme: string;         // 배경/색 테마 키
  mobPool: string[];     // 등장 몹 id (Ch1 = 현재 몹들)
  boss: string;          // 보스 몹 id
  duration: number;      // 보스 등장까지 시간(초)
  difficultyMult: number;// 적 HP/뎀 배수
  clearBonus: number;    // 클리어 메소 보너스
  playable: boolean;     // Ch1=true, Ch2~5=false (준비중)
}
```
- **Ch1**: 현재 게임 그대로 (리스항구, 달팽이/버섯, 주르발록 8분). `playable: true`.
- **Ch2~5**: 데이터만 정의(테마·이름·권장 정도), `playable: false` → 챕터 선택 화면에서 "준비중/잠금" 표시. 진짜 에셋은 `AssetsNeeded.md` 참조 후 채움.
- **해금**: 이전 챕터 `cleared === true`면 다음 챕터 도전 가능(단, playable한 것만 실제 진입). Ch1 클리어해도 Ch2는 `playable:false`라 "곧 공개".
- 챕터별 진척: `Profile.chapters[id]`에 클리어 여부·최고기록 저장.
- **선택 UI = 지도(스테이지 맵) 형식**: 5개 챕터 노드가 길(path)로 이어진 맵. 노드 상태별 표시 — 현재 도전 가능=강조, 잠김=회색+자물쇠, 클리어=금색+체크. 노드 클릭 시 해당 챕터 진입(playable+해금된 것만). 선택 노드에 테마·보스·클리어·최고기록 표시. 에셋 없이 HTML/CSS + SVG path로 절차적 구현(맵 배경 이미지는 추후 `AssetsNeeded.md`).

---

## 6. 코디 (절차적으로 그린 외형 오버레이, 잠금/해제)

> 컬러 틴트가 아니라 **캔버스 도형으로 외형을 직접(대강) 그린다.** 모자·망토·날개·왕관 같은 장식을 캐릭터 위에 절차적으로 오버레이. 폴리시보다 "딱 봐도 구분되는 실루엣"이 목표.

`catalog.ts`에 코스메틱 카탈로그:
```ts
interface CosmeticDef {
  id: string;
  name: { en: string; ko: string };
  // 캐릭터를 그린 직후 같은 좌표/방향으로 호출되는 절차적 오버레이
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) => void;
  unlock: { type: 'default' | 'chapterClear' | 'bestScore' | 'totalKills' | 'mesosEarned';
            value?: string | number };
}
```
기본 카탈로그(6종, "대강 그림" / 조정 가능):
1. `default` 기본 모험가 — 오버레이 없음 — 기본 해금
2. `mage` 마법사 — 뾰족 모자 + 망토 — Ch1 클리어
3. `knight` 기사 — 투구 + 어깨 갑옷 — 누적 메소 5000
4. `ninja` 닌자 — 두건 + 어두운 천 — 총 처치 1000
5. `angel` 천사 — 날개 + 후광 — 최고 점수 ≥ 10000
6. `king` 왕 — 왕관 + 망토 — Ch2 클리어 (Ch2 공개 후 해금 가능)

- 해금 평가: result 후 stats 기준으로 `unlock` 조건 충족 시 `unlockedCosmetics`에 추가, 토스트.
- 장착: `equippedCosmetic` 1개.
- 적용: 엔진에서 캐릭터를 그린 **직후**, 같은 앵커 좌표·`facing` 기준으로 `cosmetic.draw()` 호출 → 장식을 캔버스 도형(arc/rect/path)으로 그림. 홈 프리뷰(`CharacterPreview`)도 동일 함수 재사용.
- 좌우 반전: 캐릭터와 동일한 변환 컨텍스트에서 그리거나 `facing` 인자로 처리.
- 장점: 진짜 외형 메이플 에셋 없이도 동작. (추후 진짜 외형으로 교체는 선택, `AssetsNeeded.md` 참조)

---

## 7. 파일 영향

신규:
- `src/game/profile.ts` — 프로필 CRUD·영속화·마이그레이션·result 반영·CP·해금 평가
- `src/game/catalog.ts` — 강화 슬롯 정의/비용, 챕터 데이터, 코스메틱 카탈로그
- `src/ui/HomeHub.tsx` — 대시보드
- `src/ui/ChapterSelect.tsx` — 챕터 선택
- `src/ui/EnhancePanel.tsx` — 강화
- `src/ui/Wardrobe.tsx` — 코디
- `src/ui/ProfileSelect.tsx` — 프로필
- `src/ui/CharacterPreview.tsx` — 캐릭터 프리뷰(spriteCache 재사용, 틴트 반영)

수정:
- `src/App.tsx` — 오버레이 라우팅, title→home, result→프로필 갱신, 강화 보너스·선택 챕터를 엔진에 전달
- `src/game/engine.ts` — 메소 드랍/획득(`'meso'`), 런 메소 카운터·HUD, 강화 보너스 적용, 코디 오버레이 렌더(캐릭터 직후 `cosmetic.draw()`), 챕터 설정 수용
- `src/game/types.ts` — `DropItem.type`에 `'meso'`
- `src/game/i18n.ts` — 신규 문자열 EN/KO

---

## 8. 구현 순서 (Codex, 단계별 검증)

1. **프로필 기반**: `profile.ts` + 영속화 + `sr_best` 마이그레이션 + `ProfileSelect` + 최소 `HomeHub` 셸 + App 오버레이 라우팅(title→home). 검증: 프로필 생성/전환, 홈에서 게임 시작.
2. **메소 드랍**: types `'meso'`, `addMeso`, 몹 사망 확률 드랍(B), `updDrops` 픽업, 런 메소 HUD, result 적립. 검증: 인게임에서 메소 줍고 적립.
3. **강화**: `catalog.ts` 강화 정의 + `EnhancePanel` + 시작 시 보너스 적용 + CP. 검증: 강화 후 스탯 반영.
4. **챕터**: `catalog.ts` 챕터 + `ChapterSelect` + Ch1 플레이 + Ch2~5 잠금 + 보스 클리어 해금 + 챕터별 기록. 검증: 게이트 동작.
5. **코디**: 코스메틱 카탈로그 + `Wardrobe` + 해금 평가 + 오버레이 그리기(엔진+프리뷰). 검증: 장착 시 외형(장식) 변화.
6. **대시보드 폴리시**: CP·다음 목표·레이아웃 정리.

---

## 9. 추후 / 미해결

- 실제 신규 에셋(Ch2~5 몹·보스·맵, 진짜 코디 외형, 코인 스프라이트 등) → **`PROJECT/AssetsNeeded.md`** 참조. 파이프라인 붙으면 데이터만 채움.
- 강화 실패/파괴(스타포스류), 매그넷/획득량 업그레이드, 전투력 소프트 게이트 등은 추후 검토.
