import type { Profile } from './profile';
import { BOSS_AT, CH1_CLEAR_BONUS } from './constants';

export type EnhanceSlotId = keyof Profile['enhance'];

export interface LoadoutBonus {
  atkMulAdd: number;
  hpAdd: number;
  spdMulAdd: number;
}

export interface ChapterDef {
  id: string;
  name: { en: string; ko: string };
  theme: string;
  mobPool: string[];
  boss: string;
  duration: number;
  difficultyMult: number;
  clearBonus: number;
  playable: boolean;
}

export interface CosmeticDef {
  id: string;
  name: { en: string; ko: string };
  maple?: {
    slot: 'Cap' | 'Cape';
    itemId: number;
    assetKey: string;
  };
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) => void;
  unlock: {
    type: 'default' | 'chapterClear' | 'bestScore' | 'totalKills' | 'mesosEarned';
    value?: string | number;
  };
}

export const ENHANCE_MAX_LEVEL = 10;
export const ENHANCE_BASE_COST = 50;
export const ENHANCE_COST_SCALE = 1.55;
export const WEAPON_ATK_MUL_PER_LEVEL = 0.08;
export const ARMOR_HP_PER_LEVEL = 20;
export const SHOES_SPD_MUL_PER_LEVEL = 0.03;

export const ENHANCE_SLOTS: {
  id: EnhanceSlotId;
  nameKey: string;
  icon: string;
  bonusKey: string;
}[] = [
  { id: 'weapon', nameKey: 'enhance_slot_weapon', icon: 'STAFF', bonusKey: 'enhance_bonus_weapon' },
  { id: 'top', nameKey: 'enhance_slot_top', icon: 'COAT', bonusKey: 'enhance_bonus_top' },
  { id: 'bottom', nameKey: 'enhance_slot_bottom', icon: 'PANTS', bonusKey: 'enhance_bonus_bottom' },
  { id: 'shoes', nameKey: 'enhance_slot_shoes', icon: 'SHOES', bonusKey: 'enhance_bonus_shoes' },
];

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'ch1',
    name: { en: 'Lith Harbor', ko: '리스항구' },
    theme: 'chapter_theme_lith',
    mobPool: ['SN', 'BS', 'MU', 'ZM'],
    boss: 'BL',
    duration: BOSS_AT,
    difficultyMult: 1,
    clearBonus: CH1_CLEAR_BONUS,
    playable: true,
  },
  {
    id: 'ch2',
    name: { en: 'Henesys', ko: '헤네시스' },
    theme: 'chapter_theme_henesys',
    mobPool: ['SN', 'BS', 'MU'],
    boss: 'Mushmom',
    duration: BOSS_AT,
    difficultyMult: 1.25,
    clearBonus: 180,
    playable: false,
  },
  {
    id: 'ch3',
    name: { en: 'Ellinia', ko: '엘리니아' },
    theme: 'chapter_theme_ellinia',
    mobPool: ['MU', 'ZM'],
    boss: 'Faust',
    duration: BOSS_AT,
    difficultyMult: 1.5,
    clearBonus: 280,
    playable: false,
  },
  {
    id: 'ch4',
    name: { en: 'Perion', ko: '페리온' },
    theme: 'chapter_theme_perion',
    mobPool: ['BS', 'MU', 'ZM'],
    boss: 'Stumpy',
    duration: BOSS_AT,
    difficultyMult: 1.8,
    clearBonus: 420,
    playable: false,
  },
  {
    id: 'ch5',
    name: { en: 'Kerning City', ko: '커닝시티' },
    theme: 'chapter_theme_kerning',
    mobPool: ['SN', 'BS', 'MU', 'ZM'],
    boss: 'Dyle',
    duration: BOSS_AT,
    difficultyMult: 2.15,
    clearBonus: 600,
    playable: false,
  },
];

function withCosmeticTransform(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  scale: number,
  draw: () => void,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale((facing < 0 ? -1 : 1) * scale, scale);
  draw();
  ctx.restore();
}

function drawMage(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) {
  withCosmeticTransform(ctx, x, y, facing, scale, () => {
    ctx.fillStyle = '#2d4fb8';
    ctx.strokeStyle = '#172554';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-24, -52);
    ctx.quadraticCurveTo(0, -60, 24, -52);
    ctx.quadraticCurveTo(15, -45, -20, -47);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3454d1';
    ctx.strokeStyle = '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(-12, -55);
    ctx.quadraticCurveTo(-2, -82, 9, -88);
    ctx.quadraticCurveTo(20, -70, 11, -55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-20, -57, 38, 5);
    ctx.beginPath();
    ctx.arc(6, -70, 2.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawKnight(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) {
  withCosmeticTransform(ctx, x, y, facing, scale, () => {
    ctx.fillStyle = '#7b5a2e';
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 2;

    ctx.fillStyle = '#d7ccc8';
    ctx.beginPath();
    ctx.moveTo(-12, -56);
    ctx.lineTo(-34, -69);
    ctx.lineTo(-22, -48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(12, -56);
    ctx.lineTo(34, -69);
    ctx.lineTo(22, -48);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#8d6e63';
    ctx.beginPath();
    ctx.arc(0, -45, 17, Math.PI, 0);
    ctx.lineTo(15, -35);
    ctx.quadraticCurveTo(0, -28, -15, -35);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-14, -45, 28, 5);
    ctx.strokeStyle = '#ffcc80';
    ctx.beginPath();
    ctx.moveTo(-8, -60);
    ctx.lineTo(-5, -52);
    ctx.moveTo(0, -64);
    ctx.lineTo(0, -52);
    ctx.moveTo(8, -60);
    ctx.lineTo(5, -52);
    ctx.stroke();
  });
}

function drawNinja(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) {
  withCosmeticTransform(ctx, x, y, facing, scale, () => {
    ctx.fillStyle = '#0b0f19';
    ctx.beginPath();
    ctx.arc(0, -48, 15, Math.PI, 0);
    ctx.lineTo(14, -41);
    ctx.quadraticCurveTo(0, -35, -14, -41);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#111827';
    ctx.fillRect(-18, -55, 36, 7);
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-18, -55, 36, 7);

    ctx.fillStyle = '#050816';
    ctx.beginPath();
    ctx.moveTo(-17, -52);
    ctx.lineTo(-39, -63);
    ctx.lineTo(-31, -48);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-16, -50);
    ctx.lineTo(-37, -42);
    ctx.lineTo(-27, -37);
    ctx.closePath();
    ctx.fill();
  });
}

function drawAngel(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) {
  withCosmeticTransform(ctx, x, y, facing, scale, () => {
    ctx.save();
    ctx.shadowColor = 'rgba(179,229,252,0.6)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = 'rgba(255,255,255,0.86)';
    ctx.strokeStyle = '#b3e5fc';
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(-12, -31);
    ctx.bezierCurveTo(-46, -58, -61, -22, -30, -13);
    ctx.bezierCurveTo(-47, -14, -43, 5, -22, -1);
    ctx.bezierCurveTo(-32, 9, -20, 16, -10, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(12, -31);
    ctx.bezierCurveTo(46, -58, 61, -22, 30, -13);
    ctx.bezierCurveTo(47, -14, 43, 5, 22, -1);
    ctx.bezierCurveTo(32, 9, 20, 16, 10, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(129,212,250,0.72)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-28, -32);
    ctx.quadraticCurveTo(-41, -25, -28, -17);
    ctx.moveTo(28, -32);
    ctx.quadraticCurveTo(41, -25, 28, -17);
    ctx.stroke();
    ctx.restore();
  });
}

function drawKing(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) {
  withCosmeticTransform(ctx, x, y, facing, scale, () => {
    ctx.fillStyle = '#ffd54f';
    ctx.strokeStyle = '#6d4c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-19, -55);
    ctx.lineTo(-14, -72);
    ctx.lineTo(-5, -58);
    ctx.lineTo(0, -77);
    ctx.lineTo(6, -58);
    ctx.lineTo(15, -72);
    ctx.lineTo(20, -55);
    ctx.lineTo(20, -49);
    ctx.lineTo(-19, -49);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#fbc02d';
    ctx.fillRect(-21, -54, 42, 7);
    ctx.strokeRect(-21, -54, 42, 7);
    ctx.fillStyle = '#40c4ff';
    ctx.beginPath();
    ctx.arc(0, -65, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(-12, -52, 2.2, 0, Math.PI * 2);
    ctx.arc(13, -52, 2.2, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const COSMETICS: CosmeticDef[] = [
  {
    id: 'default',
    name: { en: 'Adventurer', ko: '모험가' },
    draw: () => {},
    unlock: { type: 'default' },
  },
  {
    id: 'mage',
    name: { en: 'Magician Hat', ko: '매지션 모자' },
    maple: { slot: 'Cap', itemId: 1001128, assetKey: 'cap_1001128' },
    draw: drawMage,
    unlock: { type: 'chapterClear', value: 'ch1' },
  },
  {
    id: 'knight',
    name: { en: 'Zakum Helmet', ko: '자쿰의 투구' },
    maple: { slot: 'Cap', itemId: 1002357, assetKey: 'cap_1002357' },
    draw: drawKnight,
    unlock: { type: 'mesosEarned', value: 5000 },
  },
  {
    id: 'ninja',
    name: { en: 'Black Bandana', ko: '검은 두건' },
    maple: { slot: 'Cap', itemId: 1002083, assetKey: 'cap_1002083' },
    draw: drawNinja,
    unlock: { type: 'totalKills', value: 1000 },
  },
  {
    id: 'angel',
    name: { en: 'Baby Angel Wings', ko: '베이비 엔젤 윙' },
    maple: { slot: 'Cape', itemId: 1102005, assetKey: 'cape_1102005' },
    draw: drawAngel,
    unlock: { type: 'bestScore', value: 10000 },
  },
  {
    id: 'king',
    name: { en: 'Royal Crown', ko: '로얄 크라운' },
    maple: { slot: 'Cap', itemId: 1003084, assetKey: 'cap_1003084' },
    draw: drawKing,
    unlock: { type: 'chapterClear', value: 'ch2' },
  },
];

export function enhanceCost(level: number): number {
  return Math.round(ENHANCE_BASE_COST * Math.pow(ENHANCE_COST_SCALE, level));
}

function clampLevel(level: number): number {
  return Math.max(0, Math.min(ENHANCE_MAX_LEVEL, level));
}

export function computeLoadout(enhance: Profile['enhance']): LoadoutBonus {
  const weapon = clampLevel(enhance.weapon);
  const top = clampLevel(enhance.top);
  const bottom = clampLevel(enhance.bottom);
  const shoes = clampLevel(enhance.shoes);

  return {
    atkMulAdd: weapon * WEAPON_ATK_MUL_PER_LEVEL,
    hpAdd: (top + bottom) * ARMOR_HP_PER_LEVEL,
    spdMulAdd: shoes * SHOES_SPD_MUL_PER_LEVEL,
  };
}

export function isChapterUnlocked(chapterId: string, profile: Profile): boolean {
  const idx = CHAPTERS.findIndex(chapter => chapter.id === chapterId);
  if (idx <= 0) return idx === 0;
  const prev = CHAPTERS[idx - 1];
  return Boolean(profile.chapters[prev.id]?.cleared);
}

export function getCosmetic(id: string): CosmeticDef | undefined {
  return COSMETICS.find(cosmetic => cosmetic.id === id);
}

export function evaluateCosmeticUnlocks(profile: Profile): string[] {
  const bestScore = Object.values(profile.chapters).reduce(
    (best, chapter) => Math.max(best, chapter.bestScore || 0),
    0,
  );

  return COSMETICS.filter(cosmetic => {
    const { unlock } = cosmetic;
    if (unlock.type === 'default') return true;
    if (unlock.type === 'chapterClear') return Boolean(profile.chapters[String(unlock.value)]?.cleared);
    if (unlock.type === 'bestScore') return bestScore >= Number(unlock.value || 0);
    if (unlock.type === 'totalKills') return profile.stats.totalKills >= Number(unlock.value || 0);
    if (unlock.type === 'mesosEarned') return profile.stats.totalMesosEarned >= Number(unlock.value || 0);
    return false;
  }).map(cosmetic => cosmetic.id);
}
