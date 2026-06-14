import { SkillDef, EnemyDef, PlayerState } from './types';
import * as i18n from './i18n';

export const WW = 2800;
export const WH = 2800;
export const TILE = 80;
export const BOSS_AT = 480; // 8분에 보스 등장
export const BASE_LW = 800;
export const BASE_LH = 600;
export let LW = BASE_LW;
export let LH = BASE_LH;
export function setViewport(w: number, h: number) {
  LW = w;
  LH = h;
}
export const JR = 55;
export const MESO_TRASH_DROP_CHANCE = 0.30;
export const MESO_TRASH_MIN = 5;
export const MESO_TRASH_MAX = 10;
export const MESO_MID_MIN = 40;
export const MESO_MID_MAX = 80;
export const MESO_BOSS_MIN = 300;
export const MESO_BOSS_MAX = 500;
export const CH1_CLEAR_BONUS = 100;

export const SD: Record<string, SkillDef> = {
  POWER: {
    nm: '파워 스트라이크',
    icon: '⚔️',
    rarity: 'common',
    maxLv: 5,
    col: '#e53935',
    lvls: [
      { d: '모든 피해 +20%', fx: (P) => { P.atkM = 1.2; } },
      { d: '모든 피해 +20% (총 +40%)', fx: (P) => { P.atkM = 1.4; } },
      { d: '모든 피해 +20% (총 +60%)', fx: (P) => { P.atkM = 1.6; } },
      { d: '모든 피해 +20% (총 +80%)', fx: (P) => { P.atkM = 1.8; } },
      { d: '💪 모든 피해 +60%p (총 ×2.4)', fx: (P) => { P.atkM = 2.4; } },
    ]
  },
  SPREAD: {
    nm: '스프레드 샷',
    icon: '🏹',
    rarity: 'rare',
    maxLv: 6,
    col: '#1565c0',
    lvls: [
      { d: '투사체 +1 (총 2발)', fx: (P) => { P.pc = 2; } },
      { d: '투사체 +1 (총 3발)', fx: (P) => { P.pc = 3; } },
      { d: '공격 속도 +25%', fx: (P) => { P.atkCd = 0.56; } },
      { d: '투사체 +1 (총 4발)', fx: (P) => { P.pc = 4; } },
      { d: '💪 발사 수 2배 (총 8발)', fx: (P) => { P.pc = 8; } },
      { d: '⭐ 각성: 12발 & 공속 +20% / 황금 대형탄', fx: (P) => { P.pc = 12; P.atkCd = 0.45; P.awk.SPREAD = true; } },
    ]
  },
  ORBS: {
    nm: '매직 오브',
    icon: '🔮',
    rarity: 'rare',
    maxLv: 6,
    col: '#7b1fa2',
    lvls: [
      { d: '궤도 오브 1개 생성', fx: (P) => { P.orbN = 1; } },
      { d: '오브 +1 (총 2개)', fx: (P) => { P.orbN = 2; } },
      { d: '접촉 피해 +50% / 궤도 +15', fx: (P) => { P.orbDmgM = 1.5; P.orbRad = 80; } },
      { d: '오브 +2 (총 4개)', fx: (P) => { P.orbN = 4; } },
      { d: '💪 오브 2배 (총 8개) / 피해 ×2', fx: (P) => { P.orbN = 8; P.orbDmgM = 2.0; } },
      { d: '⭐ 각성: 피해 2배 (×4) / 푸른 오브', fx: (P) => { P.orbDmgM = 4.0; P.awk.ORBS = true; } },
    ]
  },
  NOVA: {
    nm: '에너지 노바',
    icon: '💥',
    rarity: 'epic',
    maxLv: 6,
    col: '#e65100',
    lvls: [
      { d: '반경 115 충격 링 / 2.8s 쿨', fx: (P) => { P.novaOn = true; P.novaR = 115; P.novaCd = 2.8; P.novaDmgM = 1.0; } },
      { d: '링 반경 +35 (총 150)', fx: (P) => { P.novaR = 150; } },
      { d: '링 피해 +100%', fx: (P) => { P.novaDmgM = 2.0; } },
      { d: '쿨 -0.9s / 반경 +35 (총 185)', fx: (P) => { P.novaCd = 1.9; P.novaR = 185; } },
      { d: '💪 피해 2배 (×4) / 반경 +30 / 쿨 -0.4s', fx: (P) => { P.novaDmgM = 4.0; P.novaR = 215; P.novaCd = 1.5; } },
      { d: '⭐ 각성: 피해 2배 (×8) / 붉은 이중 링', fx: (P) => { P.novaDmgM = 8.0; P.awk.NOVA = true; } },
    ]
  },
  HPUP: {
    nm: 'HP 부스트',
    icon: '💊',
    rarity: 'common',
    maxLv: 5,
    col: '#2e7d32',
    lvls: [
      { d: '최대 HP +50', fx: (P) => { P.maxHp += 50; P.hp = Math.min(P.hp + 50, P.maxHp); } },
      { d: '최대 HP +50 (총 +100)', fx: (P) => { P.maxHp += 50; P.hp = Math.min(P.hp + 50, P.maxHp); } },
      { d: '최대 HP +50 & 전체 회복', fx: (P) => { P.maxHp += 50; P.hp = P.maxHp; } },
      { d: '최대 HP +60 (총 +210)', fx: (P) => { P.maxHp += 60; P.hp = Math.min(P.hp + 60, P.maxHp); } },
      { d: '💪 최대 HP +120 & 전체 회복', fx: (P) => { P.maxHp += 120; P.hp = P.maxHp; } },
    ]
  },
  SPEED: {
    nm: '부스터',
    icon: '👟',
    rarity: 'common',
    maxLv: 5,
    col: '#0288d1',
    lvls: [
      { d: '이동 속도 +20%', fx: (P) => { P.spdM = 1.2; } },
      { d: '이동 속도 +20% (총 +40%)', fx: (P) => { P.spdM = 1.4; } },
      { d: '이속 +20% & 자석 범위 +60%', fx: (P) => { P.spdM = 1.6; P.magR = 160; } },
      { d: '이동 속도 +10% (총 +70%)', fx: (P) => { P.spdM = 1.7; } },
      { d: '💪 자석 2배 (320) & 이속 +25%p', fx: (P) => { P.spdM = 1.95; P.magR = 320; } },
    ]
  },
  METEOR: {
    nm: '메테오',
    icon: '🌠',
    rarity: 'epic',
    maxLv: 6,
    col: '#ff6d00',
    lvls: [
      { d: '메테오 1개 낙하 / 4.1s 쿨', fx: (P) => { P.meteorOn = true; P.meteorN = 1; P.meteorCd = 4.1; P.meteorR = 62; P.meteorDmgM = 1.0; } },
      { d: '낙하 +1개 (총 2개)', fx: (P) => { P.meteorN = 2; } },
      { d: '폭발 피해 +100%', fx: (P) => { P.meteorDmgM = 2.0; } },
      { d: '폭발 반경 +25 / 쿨 -1s', fx: (P) => { P.meteorR = 87; P.meteorCd = 3.1; } },
      { d: '💪 낙하 수 2배 (총 6개) / 쿨 -0.6s', fx: (P) => { P.meteorN = 6; P.meteorDmgM = 2.0; P.meteorCd = 2.5; P.meteorR = 94; } },
      { d: '⭐ 각성: 피해 2배 (×4) / 푸른 화염 메테오', fx: (P) => { P.meteorDmgM = 4.0; P.awk.METEOR = true; } },
    ]
  },
  CHAIN: {
    nm: '체인 라이트닝',
    icon: '⚡',
    rarity: 'rare',
    maxLv: 6,
    col: '#29b6f6',
    lvls: [
      { d: '4연쇄 번개 / 2.6s 쿨', fx: (P) => { P.chainOn = true; P.chainCount = 4; P.chainCd = 2.6; P.chainDmgM = 1.0; P.chainRng = 340; } },
      { d: '번개 피해 +50%', fx: (P) => { P.chainDmgM = 1.5; } },
      { d: '연쇄 +4 (총 8) / 점프 범위 +30%', fx: (P) => { P.chainCount = 8; P.chainRng = 440; } },
      { d: '쿨 -0.8s / 피해 +50%p', fx: (P) => { P.chainCd = 1.8; P.chainDmgM = 2.0; } },
      { d: '💪 연쇄 2배 (총 16) / 피해 2배 (×4)', fx: (P) => { P.chainCount = 16; P.chainDmgM = 4.0; P.chainCd = 1.5; } },
      { d: '⭐ 각성: 24연쇄 / 피해 ×6 / 황금 번개', fx: (P) => { P.chainCount = 24; P.chainDmgM = 6.0; P.awk.CHAIN = true; } },
    ]
  },
  POISON: {
    nm: '독안개',
    icon: '☠️',
    rarity: 'rare',
    maxLv: 6,
    col: '#7cb342',
    lvls: [
      { d: '이동 경로에 독구름 (4s 지속)', fx: (P) => { P.poisonOn = true; P.poisonCd = 2.5; P.poisonR = 70; P.poisonDur = 4; P.poisonDmgM = 1.0; } },
      { d: '구름 반경 +30 (총 100)', fx: (P) => { P.poisonR = 100; } },
      { d: '독 피해 +50% / 지속 +2s', fx: (P) => { P.poisonDmgM = 1.5; P.poisonDur = 6; } },
      { d: '생성 주기 -0.9s / 반경 +30', fx: (P) => { P.poisonCd = 1.6; P.poisonR = 130; } },
      { d: '💪 독 피해 2배 (총 ×3)', fx: (P) => { P.poisonDmgM = 3.0; } },
      { d: '⭐ 각성: 맹독 — 피해 2배 (×6) / 보랏빛 구름', fx: (P) => { P.poisonDmgM = 6.0; P.awk.POISON = true; } },
    ]
  },
  HAWK: {
    nm: '실버호크',
    icon: '🦅',
    rarity: 'epic',
    maxLv: 6,
    col: '#78909c',
    lvls: [
      { d: '실버호크 1마리 (고속 박치기)', fx: (P) => { P.hawkN = 1; P.hawkDmgM = 1.0; } },
      { d: '호크 +1마리 / 피해 +50%', fx: (P) => { P.hawkN = 2; P.hawkDmgM = 1.5; } },
      { d: '호크 +1마리 / 피해 +50%p', fx: (P) => { P.hawkN = 3; P.hawkDmgM = 2.0; } },
      { d: '호크 +1마리 / 피해 +50%p', fx: (P) => { P.hawkN = 4; P.hawkDmgM = 2.5; } },
      { d: '💪 호크 수 2배 (총 8마리)', fx: (P) => { P.hawkN = 8; } },
      { d: '⭐ 각성: 골든이글 — 피해 2배 (×5) & 비행속도 +15%', fx: (P) => { P.hawkDmgM = 5.0; P.awk.HAWK = true; } },
    ]
  },
  DRAIN: {
    nm: '드레인',
    icon: '🩸',
    rarity: 'rare',
    maxLv: 5,
    col: '#c62828',
    lvls: [
      { d: '4킬마다 HP +1 회복', fx: (P) => { P.drainEvery = 4; P.drainHp = 1; } },
      { d: '3킬마다 HP +1 회복', fx: (P) => { P.drainEvery = 3; P.drainHp = 1; } },
      { d: '3킬마다 HP +2 회복', fx: (P) => { P.drainEvery = 3; P.drainHp = 2; } },
      { d: '2킬마다 HP +2 회복', fx: (P) => { P.drainEvery = 2; P.drainHp = 2; } },
      { d: '💪 2킬마다 HP +3 회복', fx: (P) => { P.drainEvery = 2; P.drainHp = 3; } },
    ]
  }
};

// 각 스킬의 다음 레벨 설명 채우기
for (const [id, def] of Object.entries(SD)) {
  def.desc = (lv: number) => i18n.skillDesc(id, lv);
}

export const RC: Record<string, string> = {
  common: '#90a4ae',
  rare: '#42a5f5',
  epic: '#ce93d8'
};

export const ED: Record<string, EnemyDef> = {
  SN: { nm: '달팽이', hp: 30, atk: 5, spd: 45, xp: 8, r: 16, col: '#ce93d8' },
  BS: { nm: '파란달팽이', hp: 55, atk: 8, spd: 65, xp: 14, r: 18, col: '#90caf9' },
  MU: { nm: '주황버섯', hp: 110, atk: 12, spd: 70, xp: 22, r: 22, col: '#ef9a9a' },
  ZM: { nm: '좀비버섯', hp: 180, atk: 20, spd: 55, xp: 40, r: 24, col: '#a5d6a7' },
  SP: { nm: '스포아', hp: 45, atk: 8, spd: 55, xp: 12, r: 18, col: '#ce93d8', assetKey: 'mob_SPORE' },
  RS: { nm: '빨간달팽이', hp: 70, atk: 10, spd: 40, xp: 18, r: 18, col: '#ef5350', assetKey: 'mob_REDSNAIL' },
  MA: { nm: '마노', hp: 8000, atk: 300, spd: 60, xp: 500, r: 48, col: '#8d6e63', isBoss: true, assetKey: 'mob_MANO' },
  Faust: { nm: '파우스트', hp: 60000, atk: 235, spd: 70, xp: 3600, r: 55, col: '#ff8a65', isBoss: true, assetKey: 'mob_FAUST' },
  Stumpy: { nm: '스텀피', hp: 7500, atk: 90, spd: 40, xp: 880, r: 50, col: '#8d6e63', isBoss: true, assetKey: 'mob_STUMPY' },
  Dyle: { nm: '다일', hp: 300000, atk: 260, spd: 70, xp: 3900, r: 60, col: '#ce93d8', isBoss: true, assetKey: 'mob_DYLE' },
  BL: { nm: '주니어발록', hp: 12000, atk: 400, spd: 95, xp: 250, r: 44, col: '#ef9a9a', isBoss: true },
  SL: { nm: '슬라임', hp: 40, atk: 6, spd: 78, xp: 10, r: 16, col: '#57d957' },
  ST: { nm: '나무인형', hp: 70, atk: 9, spd: 42, xp: 15, r: 18, col: '#9a6f3a' },
  GM: { nm: '초록버섯', hp: 95, atk: 11, spd: 62, xp: 20, r: 20, col: '#2eaf5d' },
  PG: { nm: '돼지', hp: 75, atk: 10, spd: 82, xp: 18, r: 19, col: '#f48fb1' },
  MM: { nm: '머쉬맘', hp: 9000, atk: 320, spd: 56, xp: 550, r: 54, col: '#f6c152', isBoss: true, assetKey: 'mob_MUSHMOM' },
  CE: { nm: '저주받은 눈', hp: 85, atk: 11, spd: 86, xp: 21, r: 19, col: '#7e57c2' },
  EE: { nm: '이블아이', hp: 115, atk: 14, spd: 76, xp: 28, r: 21, col: '#5e35b1' },
  JN: { nm: '주니어 네키', hp: 70, atk: 12, spd: 102, xp: 20, r: 15, col: '#26a69a' },
  WM: { nm: '나무가면', hp: 135, atk: 17, spd: 54, xp: 32, r: 22, col: '#a1887f' },
  FA: { nm: '파우스트', hp: 10000, atk: 340, spd: 70, xp: 600, r: 52, col: '#7b1fa2', isBoss: true, assetKey: 'mob_FAUST' },
  WB: { nm: '멧돼지', hp: 130, atk: 17, spd: 68, xp: 30, r: 23, col: '#795548' },
  FB: { nm: '파이어보어', hp: 160, atk: 20, spd: 64, xp: 36, r: 24, col: '#d84315' },
  SG: { nm: '스톤골렘', hp: 240, atk: 26, spd: 36, xp: 54, r: 30, col: '#9e9e9e' },
  DS: { nm: '다크 나무인형', hp: 190, atk: 22, spd: 42, xp: 44, r: 25, col: '#4e342e' },
  STP: { nm: '스텀피', hp: 12000, atk: 380, spd: 48, xp: 700, r: 56, col: '#5d4037', isBoss: true, assetKey: 'mob_STUMPY' },
  OC: { nm: '옥토퍼스', hp: 70, atk: 13, spd: 108, xp: 22, r: 19, col: '#ff7043' },
  BB: { nm: '버블링', hp: 60, atk: 12, spd: 122, xp: 20, r: 17, col: '#4dd0e1' },
  LG: { nm: '라이거', hp: 120, atk: 18, spd: 96, xp: 34, r: 23, col: '#66bb6a' },
  WK: { nm: '와일드 카고', hp: 160, atk: 24, spd: 88, xp: 46, r: 25, col: '#455a64' },
  DY: { nm: '다일', hp: 13500, atk: 430, spd: 78, xp: 800, r: 58, col: '#2e7d32', isBoss: true, assetKey: 'mob_DYLE' }
};

export const xpNext = (lv: number) => Math.floor(40 * Math.pow(lv, 1.4));

export function calcScore(kills: number, lv: number, gTimer: number, bossCleared: boolean): number {
  return kills * 100 + lv * 200 + Math.min(Math.floor(gTimer), 600) * 10 + (bossCleared ? 3000 : 0);
}

export function calcGrade(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  return score >= 15000 ? 'S' : score >= 10000 ? 'A' : score >= 6000 ? 'B' : score >= 2500 ? 'C' : 'D';
}
