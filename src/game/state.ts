import { PlayerState, Enemy, Projectile, DropItem, Particle, Nova, FText, Meteor, Lightning, PoisonCloud, Hawk } from './types';
import { WW, WH, LW, LH } from './constants';
import type { LoadoutBonus } from './catalog';

// ── ENGINE STATE ─────────────────────────────────────────────────────
export let phase: 'title' | 'skillpick' | 'playing' | 'paused' | 'levelup' | 'result' = 'title';
export let pickHover = -1;
export let gTimer = 0;
export let kills = 0;
export let runMesos = 0;
export let bossSpawned = false;
export let bossCleared = false;
export let spawnClock = 0;
export let resGrade: 'S' | 'A' | 'B' | 'C' | 'D' = 'D';
export let resFade = 0;
export let cardHover = -1;
export let cards: string[] = [];
export let shakeT = 0;
export let shakePow = 0;
export let hitStop = 0;
export let hitStopCd = 0;
export let awakenT = 0;
export let awakenName = '';
export let hurtT = 0;
export let nextMid = 150;

export let currentLoadout: LoadoutBonus = { atkMulAdd: 0, hpAdd: 0, spdMulAdd: 0, atkSpeedAdd: 0, magRangeAdd: 0 };
export let worldW = WW;
export let worldH = WH;
export let worldInfinite = false;
export let CULL_DIST = Math.hypot(LW, LH) * 1.8;
export let CULL_DIST2 = CULL_DIST * CULL_DIST;

export function recomputeViewport() {
  CULL_DIST = Math.hypot(LW, LH) * 1.8;
  CULL_DIST2 = CULL_DIST * CULL_DIST;
}

export const P: PlayerState = {
  x: WW / 2, y: WH / 2,
  hp: 100, maxHp: 100,
  atk: 43, atkM: 1,
  spd: 180, spdM: 1,
  pc: 1, orbN: 0, orbA: 0,
  novaOn: false, novaT: 0, novaCd: 3.5, novaR: 90,
  meteorOn: false, meteorT: 0, meteorCd: 4.0, meteorN: 1, meteorR: 90,
  chainOn: false, chainT: 0, chainCd: 3.1, chainCount: 4,
  novaDmgM: 1, meteorDmgM: 1, chainDmgM: 1,
  orbDmgM: 1, orbRad: 65, magR: 100, chainRng: 340,
  poisonOn: false, poisonT: 0, poisonCd: 3.0, poisonR: 70, poisonDur: 4, poisonDmgM: 1,
  hawkN: 0, hawkDmgM: 1,
  drainHp: 0, drainEvery: 0, drainCnt: 0,
  awk: {},
  atkT: 0, atkCd: 0.7, invT: 0,
  lv: 1, exp: 0, expMax: 40,
  skills: {}, face: 1, walk: 0
};

export let enemies: Enemy[] = [];
export let projs: Projectile[] = [];
export let drops: DropItem[] = [];
export let parts: Particle[] = [];
export let novas: Nova[] = [];
export let ftexts: FText[] = [];
export let orbEnts: { x: number; y: number }[] = [];
export let meteors: Meteor[] = [];
export let lightnings: Lightning[] = [];
export let clouds: PoisonCloud[] = [];
export let hawks: Hawk[] = [];

// Camera
export let camX = 0, camY = 0, shakeX = 0, shakeY = 0;
export const toSX = (wx: number) => wx - camX + shakeX;
export const toSY = (wy: number) => wy - camY + shakeY;

export type CosmeticDrawFn = (ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) => void;
export let cosmeticDraw: CosmeticDrawFn | null = null;
export let cosmeticCapVslot = 'CpH1H5';    // Devilish Horns: no hair masking
export let cosmeticCapAssetKey = '';
export let cosmeticCapeDraw: CosmeticDrawFn | null = null;
export let debugInvincible = false;
export let debugSpeedMul = 1;

export function setDebug(invincible: boolean, speedMul: number) {
  debugInvincible = invincible;
  debugSpeedMul = speedMul;
}

export let currentMobPool: string[] = ['SN', 'BS', 'SP', 'RS'];
export let currentBossType = 'MA';
export let currentDifficultyMult = 1;
export let currentBgTheme = 'lith';

export function doShake(pow = 6) {
  shakeT = 0.3;
  shakePow = pow;
}

export function drawCosmeticOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) {
  if (cosmeticCapeDraw) {
    cosmeticCapeDraw(ctx, x, y, facing, scale);
  }
}

export function setLoadout(loadout: LoadoutBonus) {
  currentLoadout = { ...loadout };
}

export function setWorld(infinite: boolean, w = WW, h = WH) {
  worldInfinite = infinite;
  worldW = w;
  worldH = h;
}

export function setCosmeticDraw(fn: CosmeticDrawFn | null) {
  cosmeticDraw = fn;
}

export function setCapCosmetic(vslot: string, assetKey: string) {
  cosmeticCapVslot = vslot;
  cosmeticCapAssetKey = assetKey;
}

export function setCapeCosmetic(draw: CosmeticDrawFn | null) {
  cosmeticCapeDraw = draw;
}

export function setChapterConfig(mobPool: string[], bossType: string, difficultyMult = 1, bgTheme = 'lith') {
  currentMobPool = mobPool;
  currentBossType = bossType;
  currentDifficultyMult = difficultyMult;
  currentBgTheme = bgTheme;
}
