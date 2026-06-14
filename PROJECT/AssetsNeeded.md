# 추가 필요 에셋 정리 (Assets Needed)

작성일: 2026-06-13
용도: 메인 허브 + 멀티 챕터 작업에서 **나중에 한꺼번에** 채울 이미지/스프라이트 목록.
현재는 전부 절차적/틴트/잠금 표시로 대체해 동작하므로, 아래는 "진짜 에셋으로 업그레이드" 대상이다.

> 메이플 스프라이트는 maple MCP 파이프라인으로 `public/data/maple/*.json` 렌더 플랜을 생성해야 함 (현재 세션엔 파이프라인 없음).
> 일반 UI 아이콘은 `lucide-react`(설치됨)로 대체 가능.

---

## 1. 메소 코인 (드랍 아이템)
- **무엇**: 몹이 떨어뜨리는 메소 코인 스프라이트.
- **쓰임**: 인게임 드랍 렌더 (`DropItem type:'meso'`).
- **형식**: 작은 스프라이트(코인) 1~2프레임, 또는 메이플 메소 아이콘.
- **임시 대체**: 절차적 금색 코인 원 렌더.
- **우선순위**: 낮음 (절차적으로 충분).

## 2. Ch2~5 신규 몹 스프라이트
- **무엇**: Victoria Island progression chapter mobs. Ch2~5 are playable now, but mobs without sprite plans render as colored-circle fallback using each `ED` color.
- **쓰임**: `catalog.ts` chapter `mobPool`, `constants.ts` `ED`, `public/data/maple/mob_<KEY>.json`.
- **형식**: Maple mob render plan JSON (stand/move/hit1/die1). When a real plan is added as `mob_<KEY>.json`, the fallback circle should be replaced by the sprite.
- **우선순위**: 높음.

| chapter | ED key | monster | typical monster ID | target data file |
|---------|--------|---------|--------------------|------------------|
| Ch2 Henesys | `SL` | Slime / 슬라임 | confirm on fetch | `public/data/maple/mob_SL.json` |
| Ch2 Henesys | `ST` | Stump / 나무인형 | confirm on fetch | `public/data/maple/mob_ST.json` |
| Ch2 Henesys | `GM` | Green Mushroom / 초록버섯 | confirm on fetch | `public/data/maple/mob_GM.json` |
| Ch2 Henesys | `PG` | Pig / 돼지 | confirm on fetch | `public/data/maple/mob_PG.json` |
| Ch3 Ellinia | `CE` | Curse Eye / 저주받은 눈 | confirm on fetch | `public/data/maple/mob_CE.json` |
| Ch3 Ellinia | `EE` | Evil Eye / 이블아이 | confirm on fetch | `public/data/maple/mob_EE.json` |
| Ch3 Ellinia | `JN` | Jr. Necki / 주니어 네키 | confirm on fetch | `public/data/maple/mob_JN.json` |
| Ch3 Ellinia | `WM` | Wooden Mask / 나무가면 | confirm on fetch | `public/data/maple/mob_WM.json` |
| Ch4 Perion | `WB` | Wild Boar / 멧돼지 | confirm on fetch | `public/data/maple/mob_WB.json` |
| Ch4 Perion | `FB` | Fire Boar / 파이어보어 | confirm on fetch | `public/data/maple/mob_FB.json` |
| Ch4 Perion | `SG` | Stone Golem / 스톤골렘 | confirm on fetch | `public/data/maple/mob_SG.json` |
| Ch4 Perion | `DS` | Dark Stump / 다크 나무인형 | confirm on fetch | `public/data/maple/mob_DS.json` |
| Ch5 Kerning City | `OC` | Octopus / 옥토퍼스 | confirm on fetch | `public/data/maple/mob_OC.json` |
| Ch5 Kerning City | `BB` | Bubbling / 버블링 | confirm on fetch | `public/data/maple/mob_BB.json` |
| Ch5 Kerning City | `LG` | Ligator / 라이거 | confirm on fetch | `public/data/maple/mob_LG.json` |
| Ch5 Kerning City | `WK` | Wild Kargo / 와일드 카고 | confirm on fetch | `public/data/maple/mob_WK.json` |

## 3. Ch2~5 신규 보스 스프라이트
- **무엇**: Chapter boss sprite plans. Ch2 uses the existing Mushmom plan now; Ch3~5 currently render as colored-circle fallback until sprite plans are fetched.
- **쓰임**: `catalog.ts` chapter `boss`, `constants.ts` `ED`, `public/data/maple/mob_<KEY>.json`.
- **형식**: Maple boss render plan JSON.
- **우선순위**: 높음.

| chapter | ED key | boss | typical monster ID | target data file |
|---------|--------|------|--------------------|------------------|
| Ch2 Henesys | `MM` | Mushmom / 머쉬맘 | confirm on fetch; existing `mob_MUSHMOM.json` is wired now | `public/data/maple/mob_MUSHMOM.json` |
| Ch3 Ellinia | `FA` | Faust / 파우스트 | confirm on fetch | `public/data/maple/mob_FA.json` |
| Ch4 Perion | `STP` | Stumpy / 스텀피 | confirm on fetch | `public/data/maple/mob_STP.json` |
| Ch5 Kerning City | `DY` | Dyle / 다일 | confirm on fetch | `public/data/maple/mob_DY.json` |

## 4. Ch2~5 맵 배경 / 타일
- **무엇**: 챕터별 맵 배경/바닥 테마.
- **쓰임**: 게임 배경 렌더 (현재 Ch1 = 리스항구 나무판자 절차 패턴).
- **형식**: 타일 이미지 또는 메이플 맵 타일셋.
- **임시 대체**: 절차적 바닥 패턴 + 색 테마 변경.
- **우선순위**: 중간.

## 5. 코디(외형) 변형 에셋 — 실제 메이플 장비
- **무엇**: `catalog.ts`의 코디 5종(기본 제외)에 대응하는 실제 MapleStory 장비 스프라이트.
- **쓰임**: 현재는 `CosmeticDef.draw()`가 캔버스 도형으로 임시 오버레이를 그린다. 추후 실제 장비 렌더 플랜을 로드해 같은 코디 id에 붙인다.
- **형식**: MapleStory 장비 렌더 플랜 JSON (부위별, stand1/walk1 등).
- **주의**: 아래 KO 이름은 근사 번역이며, 실제 가져올 때 KMS 명칭을 다시 확인해야 한다.

| cosmetic id | EN name | KO name(approx) | itemId | slot | MSU CDN path pattern | target data file |
|-------------|---------|-----------------|--------|------|----------------------|------------------|
| `mage` | Magician Hat | 매지션 모자 | 1001128 | Cap | `Character/Cap/01001128/...` | `public/data/maple/cap_1001128.json` |
| `knight` | Zakum Helmet | 자쿰의 투구 | 1002357 | Cap | `Character/Cap/01002357/...` | `public/data/maple/cap_1002357.json` |
| `ninja` | Black Bandana | 검은 두건 | 1002083 | Cap | `Character/Cap/01002083/...` | `public/data/maple/cap_1002083.json` |
| `angel` | Baby Angel Wings | 베이비 엔젤 윙 | 1102005 | Cape | `Character/Cape/01102005/...` | `public/data/maple/cape_1102005.json` |
| `king` | Royal Crown | 로얄 크라운 | 1003084 | Cap | `Character/Cap/01003084/...` | `public/data/maple/cap_1003084.json` |

- **채우는 절차**: maple 파이프라인을 위 itemId/slot으로 실행 → 렌더 플랜을 target data file의 assetKey(`cap_1001128` 등)로 저장 → `spriteCache` 로딩 대상에 추가 → 해당 코디의 절차적 `draw()`를 실제 장비 스프라이트 조립으로 교체.
- **우선순위**: 낮음. 현재 절차적 오버레이로 동작하며, 실제 스프라이트는 폴리시 단계에서 교체.

## 6. 챕터 선택 카드 아트 (선택)
- **무엇**: 챕터 선택 화면 카드 썸네일/일러스트.
- **쓰임**: `ChapterSelect.tsx`.
- **형식**: 이미지 5장 (챕터별).
- **임시 대체**: 색 테마 박스 + 텍스트 + 보스 아이콘.
- **우선순위**: 낮음.

## 7. UI 아이콘 (선택)
- **무엇**: 메소 아이콘, 강화 슬롯 아이콘(무기/상의/하의/신발), 자물쇠 등.
- **쓰임**: 허브/강화/코디 오버레이.
- **형식**: 일반 아이콘.
- **임시 대체**: `lucide-react` 아이콘 + 절차적.
- **우선순위**: 낮음.

---

## 채울 때 절차 (메이플 스프라이트)
1. 챕터 테마/외형 아이템의 메이플 ID 목록 확정.
2. maple MCP로 각 ID의 렌더 플랜 생성 → `public/data/maple/*.json` 저장.
3. `spriteCache.ts` 로더에 신규 JSON 등록(또는 자동 로드 패턴 확인).
4. `catalog.ts`에서 placeholder를 실제 id로 교체, `playable:true`로 전환.
