import { PlayerState, Enemy, Projectile, DropItem, Particle, Nova, FText, Meteor, Lightning, LightningSeg, PoisonCloud, Hawk } from './types';
import {
  WW, WH, SD, ED, TILE, BOSS_AT, LW, LH,
  MESO_TRASH_DROP_CHANCE, MESO_TRASH_MIN, MESO_TRASH_MAX,
  MESO_MID_MIN, MESO_MID_MAX, MESO_BOSS_MIN, MESO_BOSS_MAX, CH1_CLEAR_BONUS,
  xpNext, calcScore, calcGrade,
} from './constants';
import type { LoadoutBonus } from './catalog';
import { sfx } from './audio';
import * as spriteCache from './spriteCache';
import * as i18n from './i18n';

// ── UTILS ────────────────────────────────────────────────────────────
export const rnd = (a: number, b: number) => a + Math.random() * (b - a);
export const ri = (a: number, b: number) => (a + Math.random() * (b - a + 1)) | 0;
export const clp = (v: number, lo: number, hi: number) => v < lo ? lo : v > hi ? hi : v;
export const dst = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x, dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};
export const dst2 = (a: { x: number; y: number }, b: { x: number; y: number }) => {
  const dx = a.x - b.x, dy = a.y - b.y;
  return dx * dx + dy * dy;
};

function findClosestN(from: { x: number; y: number }, list: Enemy[], n: number): Enemy[] {
  const result: Enemy[] = [];
  const dists: number[] = [];
  for (const e of list) {
    const d2 = dst2(e, from);
    let insertAt = result.length;
    while (insertAt > 0 && d2 < dists[insertAt - 1]) insertAt--;
    if (insertAt < n) {
      result.splice(insertAt, 0, e);
      dists.splice(insertAt, 0, d2);
      if (result.length > n) { result.length = n; dists.length = n; }
    }
  }
  return result;
}

function findClosestInRange(from: { x: number; y: number }, list: Enemy[], maxDist2: number, skip: Set<string | number>): Enemy | null {
  let best: Enemy | null = null;
  let bestD2 = maxDist2;
  for (const e of list) {
    if (skip.has(e._id)) continue;
    const d2 = dst2(e, from);
    if (d2 < bestD2) { best = e; bestD2 = d2; }
  }
  return best;
}
export const ang = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.y - a.y, b.x - a.x);
export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── STATE ───────────────────────────────────────────────────────────
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
let currentLoadout: LoadoutBonus = { atkMulAdd: 0, hpAdd: 0, spdMulAdd: 0, atkSpeedAdd: 0, magRangeAdd: 0 };
let worldW = WW;
let worldH = WH;
let worldInfinite = false;
let CULL_DIST = Math.hypot(LW, LH) * 1.8;
let CULL_DIST2 = CULL_DIST * CULL_DIST;

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

type CosmeticDrawFn = (ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) => void;
let cosmeticDraw: CosmeticDrawFn | null = null;
let cosmeticCapVslot = 'CpH1H5';    // Devilish Horns default
let cosmeticCapAssetKey = '';
let cosmeticCapeDraw: CosmeticDrawFn | null = null;
export let debugInvincible = false;
export let debugSpeedMul = 1;

export function setDebug(invincible: boolean, speedMul: number) {
  debugInvincible = invincible;
  debugSpeedMul = speedMul;
}
let currentMobPool: string[] = ['SN', 'BS', 'SP', 'RS'];
let currentBossType = 'MA';
let currentDifficultyMult = 1;
let currentBgTheme = 'lith';
const BG_FALLBACK_COLORS: Record<string, string> = {
  lith: 'rgb(180,135,100)',
  henesys: '#5aa84e',
  ellinia: '#2f5d4a',
  perion: '#7d7264',
  kerning: '#363b44',
};

export function doShake(pow = 6) {
  shakeT = 0.3;
  shakePow = pow;
}

export function addParts(x: number, y: number, col: string, n = 6, spd = 90, life = 0.55) {
  for (let i = 0; i < n; i++) {
    const a = rnd(0, Math.PI * 2), s = rnd(spd * 0.5, spd * 1.5);
    parts.push({ x, y, dx: Math.cos(a) * s, dy: Math.sin(a) * s, col, life, ml: life, r: rnd(2, 5) });
  }
  if (parts.length > 200) parts.splice(0, parts.length - 200);
}

export function addFText(x: number, y: number, text: string, col = '#fff', sz = 18) {
  if (sz <= 18 && ftexts.length > 26) return;
  if (ftexts.length > 36) ftexts.splice(0, ftexts.length - 36);
  ftexts.push({ x, y, text, col, life: 1.3, vy: -42, vx: rnd(-18, 18), sz });
}

export function addXP(x: number, y: number, v: number) {
  if (drops.length > 240) drops.shift();
  drops.push({ type: 'xp', x, y, v, r: 5, life: 22 });
}

export function addPot(x: number, y: number) {
  if (drops.length > 240) drops.shift();
  drops.push({ type: 'pot', x, y, v: 30, r: 7, life: 22 });
}

export function addMeso(x: number, y: number, v: number) {
  if (drops.length > 240) drops.shift();
  drops.push({ type: 'meso', x, y, v, r: 6, life: 22 });
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

function drawCosmeticOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) {
  if (cosmeticCapeDraw) {
    cosmeticCapeDraw(ctx, x, y, facing, scale);
  }
}

export function resetGameState() {
  phase = 'title';
  pickHover = -1;
  gTimer = 0; kills = 0; runMesos = 0; bossSpawned = false; bossCleared = false; spawnClock = 0; resFade = 0;
  hitStop = 0; hitStopCd = 0; awakenT = 0; hurtT = 0; nextMid = 150;
  enemies = []; projs = []; drops = []; parts = []; novas = []; ftexts = [];
  orbEnts = []; meteors = []; lightnings = []; clouds = []; hawks = [];
  Object.assign(P, {
    x: worldW / 2, y: worldH / 2,
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
  });
  P.atkM += currentLoadout.atkMulAdd;
  P.maxHp += currentLoadout.hpAdd;
  P.hp = P.maxHp;
  P.spdM += currentLoadout.spdMulAdd;
  P.atkCd = 0.7 / (1 + currentLoadout.atkSpeedAdd);
  P.magR += currentLoadout.magRangeAdd;
}

// ── SKILL APPLY & LEVEL UP ───────────────────────────────────────────
export function applySkill(id: string) {
  if (!id || !SD[id]) return;
  const lv = (P.skills[id] || 0) + 1;
  if (lv > SD[id].maxLv) return;
  P.skills[id] = lv;
  SD[id].lvls[lv - 1].fx(P);
  sfx(lv === 6 ? 'awaken' : 'pick');
  if (lv === 6) {
    awakenT = 1.5;
    awakenName = i18n.skillName(id);
    hitStop = Math.max(hitStop, 0.3);
    doShake(16);
    addParts(P.x, P.y, '#ffd700', 26, 240, 1.2);
    addParts(P.x, P.y, '#fff8e1', 14, 130, 0.9);
  }
}

export function triggerLevelUp() {
  const avail = Object.keys(SD).filter(id => (P.skills[id] || 0) < SD[id].maxLv);
  if (!avail.length) return;
  const ready = avail.filter(id => (P.skills[id] || 0) === 5);
  const unowned = avail.filter(id => !P.skills[id]);
  const owned = avail.filter(id => P.skills[id] && P.skills[id] !== 5);
  const pool = [...unowned, ...unowned, ...owned];
  shuffle(pool);
  cards = [...new Set([...ready, ...pool])].slice(0, 3);
}

export function tryLevelUp(onTriggerUI: () => void) {
  if (P.exp < P.expMax) return;
  P.exp -= P.expMax;
  P.lv++;
  P.expMax = xpNext(P.lv);
  addFText(P.x, P.y - 35, 'LEVEL UP!', '#ffd54f', 24);
  sfx('levelup');
  addParts(P.x, P.y, '#ffd54f', 12, 100, 0.8);
  const allMaxed = Object.keys(SD).every(id => (P.skills[id] || 0) >= SD[id].maxLv);
  if (allMaxed) {
    P.hp = P.maxHp;
    sfx('heal');
    addFText(P.x, P.y - 58, '💚 FULL HEAL!', '#66bb6a', 20);
  } else {
    triggerLevelUp();
    onTriggerUI();
  }
}

// ── ENEMY LIFE ENGINE ────────────────────────────────────────────────
export function killEnemy(e: Enemy, onEndRun: () => void) {
  const idx = enemies.indexOf(e);
  if (idx === -1) return;
  enemies.splice(idx, 1);
  kills++;
  if (e.def.hp >= 110 && hitStopCd <= 0) {
    hitStop = Math.max(hitStop, 0.03);
    hitStopCd = 0.35;
  }
  sfx('kill');
  if (P.drainEvery > 0) {
    P.drainCnt++;
    if (P.drainCnt >= P.drainEvery) {
      P.drainCnt = 0;
      P.hp = Math.min(P.hp + P.drainHp, P.maxHp);
    }
  }
  addParts(e.x, e.y, e.def.col, 8, 90, 0.55);
  addXP(e.x, e.y, e.xp);
  if (Math.random() < 0.01) addPot(e.x, e.y);
  if (e.isMid) {
    addMeso(e.x, e.y, ri(MESO_MID_MIN, MESO_MID_MAX));
  } else if (!e.isBoss && Math.random() < MESO_TRASH_DROP_CHANCE) {
    addMeso(e.x, e.y, ri(MESO_TRASH_MIN, MESO_TRASH_MAX));
  }
  if (e.isMid) {
    hitStop = Math.max(hitStop, 0.12);
    doShake(12);
    addParts(e.x, e.y, '#ffd54f', 18, 150, 1.0);
    addPot(e.x - 22, e.y);
    addPot(e.x + 22, e.y);
    const owned = Object.keys(P.skills).filter(id => P.skills[id] < SD[id].maxLv);
    shuffle(owned);
    const ups = owned.slice(0, Math.min(ri(1, 5), owned.length));
    ups.forEach(id => applySkill(id));
    if (ups.length) {
      addFText(e.x, e.y - 84, i18n.t('midboss_skillup').replace('{count}', String(ups.length)), '#ffd54f', 26);
      ups.forEach((id, i) => addFText(e.x, e.y - 52 + i * 24, SD[id].icon + ' ' + i18n.skillName(id) + ' → Lv' + P.skills[id], '#fff8e1', 16));
    } else {
      addFText(e.x, e.y - 60, i18n.t('midboss_clear'), '#ffa726', 26);
    }
  }
  if (e.isBoss) {
    doShake(22);
    addParts(e.x, e.y, '#ffd54f', 25, 150, 1.5);
    for (let i = 0; i < 5; i++) addXP(e.x + rnd(-35, 35), e.y + rnd(-35, 35), 50);
    const mesoReward = ri(MESO_BOSS_MIN, MESO_BOSS_MAX) + CH1_CLEAR_BONUS;
    runMesos += mesoReward;
    addFText(e.x, e.y - 96, '+' + mesoReward + ' ' + i18n.t('hud_mesos'), '#ffd54f', 22);
    addFText(e.x, e.y - 60, i18n.t('boss_clear'), '#ffd54f', 32);
    bossCleared = true;
    resGrade = calcGrade(calcScore(kills, P.lv, gTimer, bossCleared));
    onEndRun();
  }
}

export function spawnEnemy(type: string) {
  const def = ED[type];
  if (!def) return;
  const m = 90, t = gTimer;
  const side = ri(0, 3);
  let ex = 0, ey = 0;
  if (side === 0) { ex = rnd(camX - m, camX + LW + m); ey = camY - m; }
  else if (side === 1) { ex = camX + LW + m; ey = rnd(camY - m, camY + LH + m); }
  else if (side === 2) { ex = rnd(camX - m, camX + LW + m); ey = camY + LH + m; }
  else { ex = camX - m; ey = rnd(camY - m, camY + LH + m); }
  if (!worldInfinite) {
    ex = clp(ex, def.r, worldW - def.r);
    ey = clp(ey, def.r, worldH - def.r);
  }

  const hm = (t < 300 ? 1 + t * 0.0067 : 3.0 + (t - 300) * 0.015) * 1.25;
  const am = (t < 300 ? 1 + t * 0.0050 : 2.5 + (t - 300) * 0.004);
  const sm = t < 300 ? 1 + t * 0.0030 : 1.9 + (t - 300) * 0.0003;
  const finalHp = def.hp * hm * currentDifficultyMult;
  const finalAtk = def.atk * am * currentDifficultyMult;

  enemies.push({
    type, def,
    x: ex, y: ey,
    hp: finalHp, maxHp: finalHp,
    atk: finalAtk,
    spd: def.spd * sm,
    xp: Math.round(finalHp * 0.25),
    hf: 0, wb: rnd(0, Math.PI * 2), kbx: 0, kby: 0,
    isBoss: !!def.isBoss,
    _id: Math.random()
  });
}

export function spawnBoss() {
  if (bossSpawned) return;
  bossSpawned = true;
  const def = ED[currentBossType];
  const bx = worldInfinite ? P.x + 500 : clp(P.x + 500, def.r + 20, worldW - def.r - 20);
  const by = worldInfinite ? P.y : clp(P.y, def.r + 20, worldH - def.r - 20);
  const bossHp = def.hp * currentDifficultyMult;
  const bossAtk = def.atk * currentDifficultyMult;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.hp = -1;
    addParts(e.x, e.y, '#90a4ae', 3, 70, 0.4);
    enemies.splice(i, 1);
  }
  enemies.push({ type: currentBossType, def, x: bx, y: by, hp: bossHp, maxHp: bossHp, atk: bossAtk, spd: def.spd, xp: def.xp, hf: 0, wb: 0, kbx: 0, kby: 0, kbR: 0.15, isBoss: true, _id: 'boss' });
  doShake(15);
  addFText(P.x, P.y - 120, i18n.t('boss_spawn').replace('{name}', i18n.mobName(currentBossType)), '#ff4444', 30);
  sfx('boss');
  for (let i = 0; i < 6; i++) addParts(P.x + rnd(-80, 80), P.y + rnd(-80, 80), '#ff4444', 4, 120, 0.9);
}

export function spawnMidBoss() {
  const idx = Math.round(nextMid / 150) - 1;
  const pool = currentMobPool;
  const baseType = pool[idx % 2];
  const base = ED[baseType];
  const nm = i18n.mobName(baseType);
  const t = gTimer;
  const hm = (t < 300 ? 1 + t * 0.0067 : 3.0 + (t - 300) * 0.015) * 1.25;
  const am = (t < 300 ? 1 + t * 0.0050 : 2.5 + (t - 300) * 0.004);
  const def = { ...base, nm, r: 48 }; // 머쉬맘 전용 에셋에 맞는 충돌 반경
  const finalHp = base.hp * hm * 8 * currentDifficultyMult;
  const finalAtk = base.atk * am * 1.5 * currentDifficultyMult;
  const a = rnd(0, Math.PI * 2);
  const rawX = P.x + Math.cos(a) * 560;
  const rawY = P.y + Math.sin(a) * 560;
  const ex = worldInfinite ? rawX : clp(rawX, def.r + 20, worldW - def.r - 20);
  const ey = worldInfinite ? rawY : clp(rawY, def.r + 20, worldH - def.r - 20);
  enemies.push({
    type: baseType, def,
    x: ex, y: ey, hp: finalHp, maxHp: finalHp,
    atk: finalAtk, spd: base.spd * 0.75,
    xp: Math.round(finalHp * 0.25),
    hf: 0, wb: rnd(0, Math.PI * 2), kbx: 0, kby: 0, kbR: 0.18, isMid: true,
    _id: Math.random()
  });
  doShake(9);
  addFText(P.x, P.y - 100, i18n.t('midboss_spawn').replace('{name}', i18n.mobName(nm)), '#ffa726', 26);
  sfx('midboss');
}

export function getSpawnType(): string {
  const t = gTimer, r = Math.random();
  const p = currentMobPool;
  if (t < 60) return p[0]; // 첫 번째 몹만
  if (t < 150) return r < 0.5 ? p[0] : p[1]; // 두 종류
  if (t < 300) return r < 0.3 ? p[0] : r < 0.6 ? p[1] : p[2]; // 세 종류
  return r < 0.2 ? p[0] : r < 0.4 ? p[1] : r < 0.7 ? p[2] : p[3]; // 전부
}

// ── CORE UPDATES ─────────────────────────────────────────────────────
export function updPlayer(dt: number, mv: { dx: number; dy: number; on: boolean }, onEndRun: () => void) {
  const nextX = P.x + mv.dx * P.spd * P.spdM * dt;
  const nextY = P.y + mv.dy * P.spd * P.spdM * dt;
  P.x = worldInfinite ? nextX : clp(nextX, 40, worldW - 40);
  P.y = worldInfinite ? nextY : clp(nextY, 40, worldH - 40);
  if (mv.dx !== 0) P.face = mv.dx > 0 ? -1 : 1; // 오른쪽 이동 시 flip(true), 왼쪽 이동 시 flip(false) - Maple 스프라이트는 기본 왼쪽 방향
  if (mv.on) P.walk += dt * 6;
  else P.walk = 0;
  if (P.invT > 0) P.invT -= dt;

  // Orbit Orbs
  if (P.orbN > 0) {
    P.orbA += dt * 2.3;
    orbEnts = [];
    const or = P.orbRad + P.orbN * 4;
    for (let i = 0; i < P.orbN; i++) {
      const a = P.orbA + (Math.PI * 2 / P.orbN) * i;
      orbEnts.push({ x: P.x + Math.cos(a) * or, y: P.y + Math.sin(a) * or });
    }
  } else orbEnts = [];

  // Nova
  if (P.novaOn) {
    P.novaT += dt;
    if (P.novaT >= P.novaCd) {
      P.novaT = 0;
      novas.push({ x: P.x, y: P.y, r: 0, maxR: P.novaR, life: 1, hit: new Set(), delay: 0 });
      sfx('nova');
      if (P.awk.NOVA) novas.push({ x: P.x, y: P.y, r: 0, maxR: P.novaR, life: 1, hit: new Set(), delay: 0.12 });
      addParts(P.x, P.y, '#ff9800', 10, 65, 0.5);
    }
  }

  // Meteor
  if (P.meteorOn && enemies.length > 0) {
    P.meteorT += dt;
    if (P.meteorT >= P.meteorCd) {
      P.meteorT = 0;
      const topN = findClosestN(P, enemies, P.meteorN);
      for (let i = 0; i < topN.length; i++) {
        const t = topN[i];
        meteors.push({
          x: t.x + rnd(-45, 45),
          y: t.y + rnd(-45, 45),
          warnT: 0,
          maxWarnT: 0.5,
          r: P.meteorR,
          dmg: P.atk * P.atkM * P.meteorDmgM
        });
      }
    }
  }

  // Chain Lightning
  if (P.chainOn && enemies.length > 0) {
    P.chainT += dt;
    if (P.chainT >= P.chainCd) {
      P.chainT = 0;
      triggerChain(onEndRun);
    }
  }

  // Poison Cloud
  if (P.poisonOn) {
    P.poisonT += dt;
    if (P.poisonT >= P.poisonCd) {
      P.poisonT = 0;
      clouds.push({ x: P.x, y: P.y, r: P.poisonR, life: P.poisonDur, maxLife: P.poisonDur });
      if (clouds.length > 12) clouds.shift();
    }
  }

  // Shoot
  P.atkT += dt;
  if (P.atkT >= P.atkCd && enemies.length > 0) {
    P.atkT = 0;
    let near: Enemy | null = null, nd2 = Infinity;
    for (const e of enemies) {
      const d2 = dst2(P, e);
      if (d2 < nd2) { nd2 = d2; near = e; }
    }
    if (near) {
      const ba = ang(P, near), dmg = P.atk * P.atkM, sp = 0.18;
      for (let i = 0; i < P.pc; i++) {
        const a = ba + (i - (P.pc - 1) / 2) * sp;
        projs.push({ x: P.x, y: P.y, dx: Math.cos(a) * 450, dy: Math.sin(a) * 450, dmg, r: 5, life: 2.6, hit: new Set() });
      }
      sfx('shoot');
    }
  }
}

export function updEnemies(dt: number, onEndRun: () => void) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (worldInfinite && !e.isBoss && !e.isMid && dst2(e, P) > CULL_DIST2) {
      enemies.splice(i, 1);
      continue;
    }
    const vx = P.x - e.x, vy = P.y - e.y;
    const L = Math.sqrt(vx * vx + vy * vy) || 1;
    e.x += vx / L * e.spd * dt + e.kbx * dt;
    e.y += vy / L * e.spd * dt + e.kby * dt;
    e.kbx *= (1 - 8 * dt); e.kby *= (1 - 8 * dt);
    e.wb += dt * 3;
    if (e.hf > 0) e.hf -= dt * 4;
    if (P.invT <= 0 && L < e.def.r + 14) {
      P.hp -= e.atk;
      hurtT = 0.4;
      sfx('hurt');
      P.invT = 0.35;
      doShake(4);
      P.hp = clp(P.hp, 0, P.maxHp);
      if (P.hp <= 0) {
        resGrade = calcGrade(calcScore(kills, P.lv, gTimer, bossCleared));
        onEndRun();
      }
    }
  }
}

export function updProjs(dt: number, onEndRun: () => void) {
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i];
    p.x += p.dx * dt; p.y += p.dy * dt; p.life -= dt;
    if (p.life <= 0) { projs.splice(i, 1); continue; }
    for (const e of enemies) {
      const R = e.def.r + p.r, dx = p.x - e.x;
      if (dx > R || dx < -R) continue;
      const dy = p.y - e.y;
      if (dy > R || dy < -R || dx * dx + dy * dy >= R * R) continue;
      if (p.hit.has(e._id)) continue;
      p.hit.add(e._id);
      e.hp -= p.dmg; e.hf = 1;
      const kp = 170 * (e.kbR ?? 1); e.kbx += p.dx / 450 * kp; e.kby += p.dy / 450 * kp;
      sfx('hit');
      addFText(e.x, e.y - e.def.r - 4, String(Math.floor(p.dmg)), '#ffd54f');
      addParts(e.x, e.y, '#ffcc02', 3, 55, 0.3);
      if (e.hp <= 0) killEnemy(e, onEndRun);
      break;
    }
  }
}

export function updOrbs(dt: number, onEndRun: () => void) {
  const dmg = P.atk * P.atkM * P.orbDmgM * dt * 3;
  for (const orb of orbEnts) {
    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const R = e.def.r + 10;
      if (dst2(orb, e) < R * R) {
        e.hp -= dmg; e.hf = 1;
        if (e.hp <= 0) killEnemy(e, onEndRun);
      }
    }
  }
}

export function updNovas(dt: number, onEndRun: () => void) {
  const dmg = P.atk * P.atkM * P.novaDmgM;
  for (let i = novas.length - 1; i >= 0; i--) {
    const nv = novas[i];
    if (nv.delay > 0) { nv.delay -= dt; continue; }
    nv.r += nv.maxR / 0.4 * dt; nv.life -= dt * 2.5;
    if (nv.life <= 0) { novas.splice(i, 1); continue; }
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      if (nv.hit.has(e._id)) continue;
      const hitRange2 = (nv.r + e.def.r + 10) * (nv.r + e.def.r + 10);
      if (dst2(nv, e) < hitRange2) {
        nv.hit.add(e._id); e.hp -= dmg; e.hf = 1;
        const ka = ang(nv, e), kn = 220 * (e.kbR ?? 1); e.kbx += Math.cos(ka) * kn; e.kby += Math.sin(ka) * kn;
        addFText(e.x, e.y - e.def.r - 4, String(Math.floor(dmg)), '#ff9800', 22);
        addParts(e.x, e.y, '#ff9800', 5, 80, 0.4);
        if (e.hp <= 0) killEnemy(e, onEndRun);
      }
    }
  }
}

function makeZigzag(p1: { x: number; y: number }, p2: { x: number; y: number }, n = 5) {
  const dx = p2.x - p1.x, dy = p2.y - p1.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return [{ ...p1 }, { ...p2 }];
  const nx = -dy / len, ny = dx / len;
  const pts = [{ ...p1 }];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const off = rnd(-16, 16);
    pts.push({ x: p1.x + dx * t + nx * off, y: p1.y + dy * t + ny * off });
  }
  pts.push({ ...p2 });
  return pts;
}

export function triggerChain(onEndRun: () => void) {
  if (enemies.length === 0) return;
  const dmgBase = P.atk * P.atkM * P.chainDmgM;
  const chainRange = P.chainRng;
  const visited = new Set<string | number>();
  const segs: LightningSeg[] = [];

  let cur = findClosestInRange(P, enemies, Infinity, new Set<string | number>());
  let prevPos = { x: P.x, y: P.y };

  for (let i = 0; i < P.chainCount && cur; i++) {
    visited.add(cur._id);
    const dmg = dmgBase * Math.pow(0.85, i);
    const hitPos = { x: cur.x, y: cur.y };
    segs.push({ zz: makeZigzag(prevPos, hitPos) });
    addFText(cur.x, cur.y - cur.def.r - 4, String(Math.floor(dmg)), '#29b6f6', 20);
    addParts(cur.x, cur.y, '#29b6f6', 3, 55, 0.2);
    cur.hp -= dmg; cur.hf = 1;
    const saved = { x: cur.x, y: cur.y };
    if (cur.hp <= 0) killEnemy(cur, onEndRun);
    prevPos = saved;
    cur = findClosestInRange(saved, enemies, chainRange * chainRange, visited);
  }
  if (segs.length > 0) {
    lightnings.push({ segs, life: 0.3, maxLife: 0.3 });
    sfx('chain');
  }
}

export function updLightnings(dt: number) {
  for (let i = lightnings.length - 1; i >= 0; i--) {
    lightnings[i].life -= dt;
    if (lightnings[i].life <= 0) lightnings.splice(i, 1);
  }
}

export function updClouds(dt: number, onEndRun: () => void) {
  for (let i = clouds.length - 1; i >= 0; i--) {
    const c = clouds[i];
    c.life -= dt;
    if (c.life <= 0) { clouds.splice(i, 1); continue; }
    const dmg = P.atk * P.atkM * P.poisonDmgM * dt;
    for (let j = enemies.length - 1; j >= 0; j--) {
      const e = enemies[j];
      const R = c.r + e.def.r * 0.5, dx = c.x - e.x;
      if (dx > R || dx < -R) continue;
      const dy = c.y - e.y;
      if (dy <= R && dy >= -R && dx * dx + dy * dy < R * R) {
        e.hp -= dmg;
        if (e.hp <= 0) killEnemy(e, onEndRun);
      }
    }
  }
}

export function updHawks(dt: number, onEndRun: () => void) {
  while (hawks.length < P.hawkN) {
    hawks.push({ x: P.x, y: P.y, a: rnd(0, Math.PI * 2), tgt: null, hit: new Set(), gl: 0 });
  }
  if (P.hawkN === 0) { hawks.length = 0; return; }
  const spd = P.awk.HAWK ? 575 : 500;
  const dmg = P.atk * P.atkM * P.hawkDmgM;
  for (const h of hawks) {
    if (!h.tgt || h.tgt.hp <= 0) {
      h.hit.clear(); h.gl = 0;
      if (enemies.length) {
        const top3 = findClosestN(h, enemies, 3);
        h.tgt = top3.length > 0 ? top3[ri(0, Math.min(2, top3.length - 1))] : enemies[0];
      } else h.tgt = null;
    }
    const ta = h.tgt ? ang(h, h.tgt) : ang(h, P) + 0.8;
    let da = ta - h.a;
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    h.a += clp(da, -4 * dt, 4 * dt);
    const nextX = h.x + Math.cos(h.a) * spd * dt;
    const nextY = h.y + Math.sin(h.a) * spd * dt;
    h.x = worldInfinite ? nextX : clp(nextX, 0, worldW);
    h.y = worldInfinite ? nextY : clp(nextY, 0, worldH);

    for (let i = enemies.length - 1; i >= 0; i--) {
      const e = enemies[i];
      const R = e.def.r + 12, dx = h.x - e.x;
      if (dx > R || dx < -R) continue;
      const dy = h.y - e.y;
      if (dy > R || dy < -R || dx * dx + dy * dy >= R * R) continue;
      if (h.hit.has(e._id)) continue;
      h.hit.add(e._id);
      e.hp -= dmg; e.hf = 1;
      const kn = 200 * (e.kbR ?? 1); e.kbx += Math.cos(h.a) * kn; e.kby += Math.sin(h.a) * kn;
      sfx('ram');
      addFText(e.x, e.y - e.def.r - 4, String(Math.floor(dmg)), '#b0bec5');
      addParts(e.x, e.y, '#cfd8dc', 3, 70, 0.3);
      if (e.hp <= 0) killEnemy(e, onEndRun);
    }
    if (h.tgt && h.hit.has(h.tgt._id)) {
      h.gl += dt;
      if (h.gl > 0.3) { h.gl = 0; h.tgt = null; }
    }
  }
}

export function updMeteors(dt: number, onEndRun: () => void) {
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i];
    m.warnT += dt;
    if (m.warnT >= m.maxWarnT) {
      const dmg = m.dmg;
      for (let ei = enemies.length - 1; ei >= 0; ei--) {
        const e = enemies[ei];
        if (dst2(m, e) < (m.r + e.def.r) * (m.r + e.def.r)) {
          e.hp -= dmg; e.hf = 1;
          const ka = ang(m, e), kn = 260 * (e.kbR ?? 1); e.kbx += Math.cos(ka) * kn; e.kby += Math.sin(ka) * kn;
          addFText(e.x, e.y - e.def.r - 4, String(Math.floor(dmg)), '#ff6d00', 22);
          addParts(e.x, e.y, '#ff9800', 3, 60, 0.35);
          if (e.hp <= 0) killEnemy(e, onEndRun);
        }
      }
      addParts(m.x, m.y, '#ff6d00', 18, 180, 0.8);
      addParts(m.x, m.y, '#ffd54f', 10, 110, 0.55);
      addFText(m.x, m.y - 20, '💥', '#ff6d00', 38);
      sfx('meteor');
      meteors.splice(i, 1);
    }
  }
}

export function updDrops(dt: number) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.life -= dt;
    if (d.life <= 0) { drops.splice(i, 1); continue; }
    const dd = dst(d, P);
    if (dd < P.magR) {
      const a = ang(d, P), sp = clp((1 - dd / P.magR) * 320 + 50, 50, 420);
      d.x += Math.cos(a) * sp * dt; d.y += Math.sin(a) * sp * dt;
    }
    if (dst2(d, P) < 324) {
      if (d.type === 'xp') {
        P.exp += d.v;
        sfx('xp');
      } else if (d.type === 'meso') {
        runMesos += d.v;
        sfx('xp');
        addFText(P.x, P.y - 30, '+' + d.v + ' ' + i18n.t('hud_mesos'), '#ffd54f', 18);
      } else {
        sfx('heal');
        const heal = Math.max(1, Math.round(P.maxHp * 0.10));
        P.hp = Math.min(P.hp + heal, P.maxHp);
        addFText(P.x, P.y - 30, '+' + heal + 'HP', '#66bb6a', 20);
      }
      drops.splice(i, 1);
    }
  }
}

export function updParts(dt: number) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.x += p.dx * dt; p.y += p.dy * dt; p.dy += 60 * dt; p.dx *= (1 - 3 * dt); p.life -= dt;
    if (p.life <= 0) parts.splice(i, 1);
  }
}

export function updFTexts(dt: number) {
  for (let i = ftexts.length - 1; i >= 0; i--) {
    const t = ftexts[i];
    t.y += t.vy * dt; t.x += (t.vx || 0) * dt; t.life -= dt;
    if (t.life <= 0) ftexts.splice(i, 1);
  }
}

export function updCamera() {
  if (worldInfinite) {
    camX = P.x - LW / 2;
    camY = P.y - LH / 2;
  } else {
    camX = clp(P.x - LW / 2, -60, worldW - LW + 60);
    camY = clp(P.y - LH / 2, -60, worldH - LH + 60);
  }
}

export function decayTimers(rawDt: number, dt: number) {
  if (shakeT > 0) {
    shakeT -= dt;
    const s = shakePow * (shakeT / 0.3);
    shakeX = rnd(-s, s); shakeY = rnd(-s, s);
  } else {
    shakeX = 0; shakeY = 0;
  }
  if (hitStop > 0) hitStop -= rawDt;
  if (hitStopCd > 0) hitStopCd -= rawDt;
  if (awakenT > 0) awakenT -= rawDt;
  if (hurtT > 0) hurtT -= rawDt;
}

export function addTime(dt: number) {
  gTimer += dt;
}

export function addSpawnClock(dt: number) {
  spawnClock += dt;
}

export function setSpawnClock(v: number) {
  spawnClock = v;
}

export function incrementMidBoss() {
  nextMid += 150;
}

export function setResFade(v: number) {
  resFade = v;
}

export function addResFade(v: number) {
  resFade += v;
}

export function setCardHover(v: number) {
  cardHover = v;
}

export function setCards(v: string[]) {
  cards = v;
}

export function setPhase(newPhase: 'title' | 'skillpick' | 'playing' | 'paused' | 'levelup' | 'result') {
  phase = newPhase;
}

export function setPickHover(newHover: number) {
  pickHover = newHover;
}

// ── DRAW CHANNELS ────────────────────────────────────────────────────
export function drawBG(ctx: CanvasRenderingContext2D) {
  const P2 = TILE * 2;
  const ox = (((-camX + shakeX) % P2) + P2) % P2 - P2;
  const oy = (((-camY + shakeY) % P2) + P2) % P2 - P2;
  ctx.save();
  ctx.translate(ox, oy);
  const pattern = spriteCache.bgPatterns[currentBgTheme] ?? spriteCache.bgPattern;
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, LW + P2 * 2, LH + P2 * 2);
  } else {
    ctx.fillStyle = BG_FALLBACK_COLORS[currentBgTheme] ?? BG_FALLBACK_COLORS.lith;
    ctx.fillRect(0, 0, LW + P2 * 2, LH + P2 * 2);
  }
  ctx.restore();
}

export function drawDrops(ctx: CanvasRenderingContext2D) {
  for (const d of drops) {
    const sx = toSX(d.x), sy = toSY(d.y);
    if (sx < -20 || sx > LW + 20 || sy < -20 || sy > LH + 20) continue;
    if (d.type === 'xp') {
      ctx.drawImage(spriteCache.xpSprite, sx - 15, sy - 15);
    } else if (d.type === 'meso') {
      ctx.save();
      ctx.fillStyle = '#ffca28';
      ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#8d5f00';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(sx - 1, sy - 1, 3.5, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#fff8e1';
      ctx.beginPath(); ctx.arc(sx - 2.5, sy - 2.5, 1.2, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#b71c1c'; ctx.fillRect(sx - 4, sy - 6, 8, 11);
      ctx.fillStyle = '#ef5350'; ctx.fillRect(sx - 3, sy - 5, 6, 9);
      ctx.fillStyle = '#ef9a9a'; ctx.fillRect(sx - 1.5, sy - 9, 3, 4);
    }
  }
}

// ── MAPLE MCP SKILL EFFECT DRAWING ──────────────────────────────────
function getSkillFrame(assetKey: string, state: string, frameIdx: number, part?: string) {
  const asset = spriteCache.mapleAssets[assetKey];
  if (!asset) return null;
  const stateFrames = asset.planByState[state];
  if (!stateFrames) return null;
  const frames = part ? stateFrames.filter(f => f.part === part) : stateFrames;
  if (!frames.length) return null;
  const frame = frames[frameIdx % frames.length];
  const imgKey = `${asset.type}_${asset.id}_${frame.state}_${frame.frame}_${frame.part}`;
  return spriteCache.mapleImages[imgKey] || spriteCache.ensureImageLoaded(asset, frame) || null;
}

function drawSkillSprite(ctx: CanvasRenderingContext2D, assetKey: string, state: string, frameIdx: number, x: number, y: number, scale: number, part?: string, alpha?: number, flip?: boolean) {
  const asset = spriteCache.mapleAssets[assetKey];
  if (!asset) return false;
  const stateFrames = asset.planByState[state];
  if (!stateFrames) return false;
  const frames = part ? stateFrames.filter(f => f.part === part) : stateFrames;
  if (!frames.length) return false;
  const frame = frames[frameIdx % frames.length];
  const imgKey = `${asset.type}_${asset.id}_${frame.state}_${frame.frame}_${frame.part}`;
  const img = spriteCache.mapleImages[imgKey] || spriteCache.ensureImageLoaded(asset, frame);
  if (!img) return false;

  ctx.save();
  if (alpha !== undefined) ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.drawImage(img, -frame.origin.x * scale, -frame.origin.y * scale, img.width * scale, img.height * scale);
  ctx.restore();
  return true;
}

// ── MAPLE MCP MOB DRAWING ───────────────────────────────────────────
function getMobAssetKey(e: Enemy): string {
  if (e.def.assetKey) return e.def.assetKey;
  const typeMap: Record<string, string> = {
    SN: 'mob_100100', BS: 'mob_100101', MU: 'mob_1210102', ZM: 'mob_2230101', BL: 'mob_8130100',
    SP: 'mob_SPORE', RS: 'mob_REDSNAIL', MM: 'mob_MUSHMOM',
    SL: 'mob_SL', ST: 'mob_ST', GM: 'mob_GM', PG: 'mob_PG',
    CE: 'mob_CE', EE: 'mob_EE', JN: 'mob_JN', WM: 'mob_WM',
    WB: 'mob_WB', FB: 'mob_FB', SG: 'mob_SG', DS: 'mob_DS',
    OC: 'mob_OC', BB: 'mob_BB', LG: 'mob_LG', WK: 'mob_WK',
  };
  return typeMap[e.type] || `mob_${e.type}`;
}

export function drawEnemies(ctx: CanvasRenderingContext2D) {
  for (const e of enemies) {
    const sx = toSX(e.x), sy = toSY(e.y);
    if (sx < -100 || sx > LW + 100 || sy < -100 || sy > LH + 100) continue;

    const scale = e.isMid ? 2.4 : (e.scale || 1.3);
    const assetKey = getMobAssetKey(e);
    const asset = spriteCache.mapleAssets[assetKey];

    if (!asset || !spriteCache.isMapleLoaded) {
      // 에셋이 로딩 중일 때는 대안으로 단순 원형 표기
      ctx.fillStyle = e.def.col;
      ctx.beginPath(); ctx.arc(sx, sy, e.def.r, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    // 상태 애니메이션 딜레이에 비례한 실시간 현재 프레임 인덱스 선택
    let state = 'stand';
    if (e.hp <= 0) state = 'die1';
    else if (e.hf > 0) state = 'hit1';
    else if (e.spd > 0) state = 'move';

    // 해당 상태가 정의되어 있는지 확인, 없을 시 대안 상태인 stand 선택
    if (!asset.availableStates.includes(state)) {
      state = 'stand';
    }

    const stateFrames = asset.planByState[state];
    if (!stateFrames || stateFrames.length === 0) continue;

    // 몹의 개별 수명주기 시간에 기반하여 모션 프레임 선정
    const durationPerFrame = stateFrames[0].delay || 150;
    const totalDuration = durationPerFrame * stateFrames.length;
    const idNum = typeof e._id === 'number' ? e._id : 0;
    const animationTime = (gTimer * 1000 + idNum * 100) % totalDuration;
    const frameIndex = Math.floor(animationTime / durationPerFrame) % stateFrames.length;
    const frame = stateFrames[frameIndex];
    if (!frame) continue;

    const imgKey = `${asset.type}_${asset.id}_${frame.state}_${frame.frame}_${frame.part}`;
    const img = spriteCache.mapleImages[imgKey] || spriteCache.ensureImageLoaded(asset, frame);

    if (!img) {
      // 이미지가 아직 CDN에서 로딩되지 않았으면 컬러 원형 폴백을 그립니다.
      ctx.fillStyle = e.def.col;
      ctx.beginPath(); ctx.arc(sx, sy, e.def.r * scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
      // HP Bar는 아래에서 통합 처리
    } else {
      ctx.save();
      ctx.translate(sx, sy);

      // 중간보스 글로우 효과
      if (e.isMid) {
        ctx.shadowColor = '#ffa726';
        ctx.shadowBlur = 16;
      }

    // 몹들은 기본적으로 왼쪽을 바라봅니다. 플레이어 방향에 따라 플리핑(Flipping)을 적용합니다.
    const faceDirection = P.x > e.x ? 1 : -1;
    const flip = faceDirection > 0;
    if (flip) ctx.scale(-1, 1);

    const ox = frame.origin.x, oy = frame.origin.y;
    // Anchor Pixel Correction 적용
    const drawX = flip ? (img.width - ox) * -scale : -ox * scale;
    const drawY = -oy * scale;

    ctx.drawImage(img, drawX, drawY, img.width * scale, img.height * scale);

    // 피격 플래시 화이트 필터 오버레이
    if (e.hf > 0) {
      ctx.globalAlpha = e.hf * 0.65;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#fff';
      ctx.fillRect(drawX, drawY, img.width * scale, img.height * scale);
    }
    ctx.restore();
    } // end of maple sprite else block

    // HP Bar 드로잉 (이미지 유무와 관계없이 항상 그리기)
    if (e.def.hp > 80 || e.isBoss) {
      const bw = e.def.r * 2.4, bh = e.isBoss ? 8 : 4;
      const bx = sx - bw / 2, by = sy - e.def.r - bh - 10;
      ctx.fillStyle = '#212121'; ctx.fillRect(bx, by, bw, bh);
      const pct = clp(e.hp / e.maxHp, 0, 1);
      ctx.fillStyle = pct > 0.5 ? '#4caf50' : pct > 0.25 ? '#ffa726' : '#f44336';
      ctx.fillRect(bx, by, bw * pct, bh);
      ctx.strokeStyle = 'rgba(0,0,0,0.7)'; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh);
    }
  }
}

// ── MAPLE MCP CHARACTER ASSEMBLY DRAWING ────────────────────────────
export function drawPlayer(ctx: CanvasRenderingContext2D) {
  if (!spriteCache.isMapleLoaded) {
    // 로드 완료 전에는 기존 도형 캐릭터 대체 렌더링
    const sx = toSX(P.x), sy = toSY(P.y);
    ctx.fillStyle = '#1565c0'; ctx.fillRect(sx - 10, sy - 10, 20, 20);
    drawCosmeticOverlay(ctx, sx, sy, P.face, 1);
    return;
  }

  const sx = toSX(P.x), sy = toSY(P.y);
  const scale = 1.35;

  const isMoving = Math.abs(P.walk) > 0.01;
  const actionState = isMoving ? 'walk1' : 'stand1';

  // 현재 모션의 바디 프레임 개수 확인
  const bodyAsset = spriteCache.mapleAssets['body_2000'];
  if (!bodyAsset) return;

  const bodyStateFrames = bodyAsset.planByState[actionState];
  if (!bodyStateFrames || bodyStateFrames.length === 0) return;

  // 프레임 딜레이 연산
  const delay = bodyStateFrames[0].delay || 150;
  const loopTime = delay * bodyStateFrames.length;
  const currentTick = (gTimer * 1000) % loopTime;
  const frameIndex = Math.floor(currentTick / delay) % bodyStateFrames.length;
  const frameStr = String(frameIndex);

  // Z-order를 결정하는 zmap 리스트 확보 (body_2000.json 에 정의된 배열 활용)
  const zmap = bodyAsset.zmap || [];

  // 각 부속 장비 파트들 수집
  const partsToRender: {
    img: HTMLImageElement;
    z: string;
    origin: { x: number; y: number };
    map?: Record<string, { x: number; y: number }>;
    path: string;
  }[] = [];

  const equipmentKeys = [
    'body_2000', 'head_12000', 'face_JEROME', 'hair_CAIN',
    'weapon_VAMPIRE', 'coat_VAMPIRE', 'cap_VAMPIRE', 'cape_VAMPIRE',
    'acc_EARRING', 'shoes_DRAKAZ'
  ];
  if (cosmeticCapAssetKey) equipmentKeys.push(cosmeticCapAssetKey);

  // 각 파트에서 현재 상태 및 프레임에 적합한 조각들을 가져옵니다.
  for (const eqKey of equipmentKeys) {
    const asset = spriteCache.mapleAssets[eqKey];
    if (!asset) continue;

    // 얼굴(Face)은 actionState 상관없이 항상 default, frame "0" 고정
    const isFace = asset.type === 'face';
    const targetState = isFace ? 'default' : actionState;
    const targetFrame = isFace ? '0' : frameStr;
    let stateFrames = asset.planByState[targetState] || [];
    let frames = stateFrames.filter(f => f.frame === targetFrame);

    // 프레임이 없을 시 '0'번 프레임 폴백
    if (frames.length === 0) {
      frames = stateFrames.filter(f => f.frame === '0');
    }

    for (const frame of frames) {
      // 불필요한 이어 파트 제외 (highlefEar, humanEar, lefEar는 특정 조건에서만 활성화)
      if (['highlefEar', 'humanEar', 'lefEar'].includes(frame.part)) continue;
      if (cosmeticCapVslot && frame.part === 'hair' && cosmeticCapVslot.includes('H1')) continue;
      if (cosmeticCapVslot && frame.part === 'hairOverHead' && cosmeticCapVslot.includes('H2')) continue;
      if (cosmeticCapVslot && frame.part === 'hairShade' && cosmeticCapVslot.includes('H5')) continue;
      
      const imgKey = `${asset.type}_${asset.id}_${frame.state}_${frame.frame}_${frame.part}`;
      const img = spriteCache.mapleImages[imgKey] || spriteCache.ensureImageLoaded(asset, frame);
      if (img) {
        partsToRender.push({
          img,
          z: frame.z || asset.type,
          origin: frame.origin,
          map: frame.sockets || frame.map, // JSON 명세의 sockets 혹은 map 필드를 폴백으로 완전 적재합니다.
          path: frame.path
        });
      }
    }
  }

  // 1. 소켓 체인(Assembly)을 통해 몸통(body)을 기준으로 각 파트의 상대 좌표를 계산합니다.
  const bodyPart = partsToRender.find(p => p.z === 'body');
  if (!bodyPart) {
    // 메이플 이미지가 아직 로딩되지 않았으면 컬러 도형 폴백을 그립니다.
    ctx.fillStyle = '#1565c0'; ctx.fillRect(sx - 14, sy - 20, 28, 40);
    ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.arc(sx, sy - 24, 10, 0, Math.PI * 2); ctx.fill();
    drawCosmeticOverlay(ctx, sx, sy, P.face, 1);
    return;
  }

  const flip = P.face < 0;
  const flipSign = flip ? -1 : 1;

  // 바디 좌표는 기준점 (sx, sy)에서 시작
  const neckOnBody = bodyPart.map?.neck || { x: 0, y: 0 };
  const navelOnBody = bodyPart.map?.navel || { x: 0, y: 0 };

  // 로컬 좌표계 (캐릭터 중심이 0,0)로 모든 파트 위치 계산
  const localPos: Record<string, { x: number; y: number }> = {
    body: { x: 0, y: 0 }
  };

  // 2. 부위별 소켓 부착 공식 (로컬 좌표 계산)
  // 공식: childLocal = parentLocal + (parentSocket - childSocket)
  const headPart = partsToRender.find(p => p.z === 'head');
  if (headPart) {
    const neckOnHead = headPart.map?.neck || { x: 0, y: 0 };
    localPos['head'] = {
      x: (neckOnBody.x - neckOnHead.x) * scale,
      y: (neckOnBody.y - neckOnHead.y) * scale
    };
  }

  // 얼굴, 헤어, 모자: 각자의 brow 소켓을 빼서 정확한 위치 계산
  const facePart = partsToRender.find(p => p.z === 'face');
  const hairPart = partsToRender.find(p => p.z && p.z.includes('hair'));
  const capPart  = partsToRender.find(p => p.z && (p.z.includes('cap') || p.z.includes('Cap')));
  const headBrow = headPart?.map?.brow || { x: 0, y: 0 };

  if (facePart) {
    const fb = facePart.map?.brow || { x: 0, y: 0 };
    localPos['face'] = {
      x: localPos['head'].x + (headBrow.x - fb.x) * scale,
      y: localPos['head'].y + (headBrow.y - fb.y) * scale
    };
  }
  if (hairPart) {
    const hb = hairPart.map?.brow || { x: 0, y: 0 };
    const hp = {
      x: localPos['head'].x + (headBrow.x - hb.x) * scale,
      y: localPos['head'].y + (headBrow.y - hb.y) * scale
    };
    localPos['hair'] = hp;
    localPos['hairOverHead'] = hp;
    localPos['hairShade'] = hp;
  }
  if (capPart) {
    const cb = capPart.map?.brow || { x: 0, y: 0 };
    const cp = {
      x: localPos['head'].x + (headBrow.x - cb.x) * scale,
      y: localPos['head'].y + (headBrow.y - cb.y) * scale
    };
    localPos['cap'] = cp;
    localPos['capAccessory'] = cp;
    localPos['capOverHair'] = cp;
    localPos['capBelowAccessory'] = cp;
  }

  // 상의, 하의, 신발, 무기, 팔 위치 계산
  partsToRender.forEach((part) => {
    if (part.z === 'body' || part.z === 'head' || part.z === 'face') return;
    if (part.z === 'hair' || part.z === 'hairOverHead' || part.z === 'hairShade') return;
    if (part.z === 'cap' || part.z === 'capAccessory' || part.z === 'capOverHair' || part.z === 'capBelowAccessory') return;
    let anchorSocket = part.map?.navel || { x: 0, y: 0 };
    let parentLocal = localPos['body'];
    let parentSocket = navelOnBody;
    localPos[part.z] = {
      x: parentLocal.x + (parentSocket.x - anchorSocket.x) * scale,
      y: parentLocal.y + (parentSocket.y - anchorSocket.y) * scale
    };
  });

  // 3. zmap 정렬 (index 0 = 가장 뒤 → 먼저 그림, 높은 index = 가장 앞 → 나중에 그림)
  partsToRender.sort((a, b) => {
    const idxA = zmap.indexOf(a.z);
    const idxB = zmap.indexOf(b.z);
    return idxA - idxB; // 오름차순: 낮은 index (뒤) 먼저 그림
  });

  // 4. 캐릭터 전체를 한 번에 flip 하여 그리기
  ctx.save();
  ctx.translate(sx, sy);
  if (flip) ctx.scale(-1, 1);

  partsToRender.forEach((part) => {
    if (!part || !part.z || !part.img) return;
    const lp = localPos[part.z] || { x: 0, y: 0 };
    if (!part.origin) return;
    const ox = part.origin.x | 0, oy = part.origin.y | 0;
    const drawX = lp.x - ox * scale;
    const drawY = lp.y - oy * scale;
    if (P.invT > 0 && Math.floor(P.invT * 12) % 2 === 0) ctx.globalAlpha = 0.4;
    ctx.drawImage(part.img, drawX, drawY, part.img.width * scale, part.img.height * scale);
  });

  ctx.restore();
  drawCosmeticOverlay(ctx, sx, sy, P.face, scale);
}

export function drawProjs(ctx: CanvasRenderingContext2D) {
  const frameIdx = Math.floor(gTimer * 10) % 10;
  for (const p of projs) {
    const sx = toSX(p.x), sy = toSY(p.y);
    if (sx < -25 || sx > LW + 25 || sy < -25 || sy > LH + 25) continue;
    if (!drawSkillSprite(ctx, 'skill_ENERGYBOLT', 'ball', frameIdx, sx, sy, 0.5)) {
      const awakened = P.awk.POWER || P.awk.SPREAD;
      const spr = awakened ? spriteCache.projAwkSprite : spriteCache.projSprite;
      const h = awakened ? 21 : 14;
      ctx.drawImage(spr, sx - h, sy - h);
    }
  }
}

export function drawOrbs(ctx: CanvasRenderingContext2D) {
  const spr = P.awk.ORBS ? spriteCache.orbAwkSprite : spriteCache.orbSprite;
  const h = P.awk.ORBS ? 29 : 22;
  for (const orb of orbEnts) {
    const sx = toSX(orb.x), sy = toSY(orb.y);
    ctx.drawImage(spr, sx - h, sy - h);
  }
}

export function drawNovas(ctx: CanvasRenderingContext2D) {
  const frameIdx = Math.floor(gTimer * 20) % 20;
  for (const nv of novas) {
    if (nv.delay > 0) continue;
    const sx = toSX(nv.x), sy = toSY(nv.y);
    if (!drawSkillSprite(ctx, 'skill_GENESIS', 'effect', frameIdx, sx, sy, 1.5, undefined, nv.life * 0.7)) {
      const col = P.awk.NOVA ? '#ff1744' : '#ff9800';
      const lw = P.awk.NOVA ? 6 : 4;
      ctx.save(); ctx.globalAlpha = nv.life * 0.65;
      ctx.beginPath(); ctx.arc(sx, sy, nv.r, 0, Math.PI * 2);
      ctx.strokeStyle = col; ctx.globalAlpha = nv.life * 0.25; ctx.lineWidth = lw + 6; ctx.stroke();
      ctx.globalAlpha = nv.life * 0.65; ctx.lineWidth = lw; ctx.stroke();
      ctx.restore();
    }
  }
}

export function drawClouds(ctx: CanvasRenderingContext2D) {
  const frameIdx = Math.floor(gTimer * 6) % 18;
  for (const c of clouds) {
    const sx = toSX(c.x), sy = toSY(c.y);
    if (sx < -c.r - 50 || sx > LW + c.r + 50 || sy < -c.r - 50 || sy > LH + c.r + 50) continue;
    const fade = Math.min(c.life / c.maxLife * 2.5, 1);
    const spScale = c.r / 140;
    const syOff = sy + c.r * 0.35;
    drawSkillSprite(ctx, 'skill_POISONMIST', 'effect1', frameIdx, sx, syOff, spScale, undefined, fade * 0.6);
    // 절차적 원형도 함께 표시
    const pulse = 1 + Math.sin(c.life * 4) * 0.03;
    ctx.save();
    ctx.globalAlpha = fade * 0.22;
    ctx.fillStyle = P.awk.POISON ? '#ab47bc' : '#66bb6a';
    ctx.beginPath(); ctx.arc(sx, sy, c.r * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = fade * 0.4;
    ctx.strokeStyle = P.awk.POISON ? '#4a148c' : '#33691e'; ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

export function drawHawks(ctx: CanvasRenderingContext2D) {
  const moveFrame = Math.floor(gTimer * 6) % 6;
  const standFrame = Math.floor(gTimer * 4) % 6;
  for (const h of hawks) {
    const sx = toSX(h.x), sy = toSY(h.y);
    if (sx < -30 || sx > LW + 30 || sy < -30 || sy > LH + 30) continue;
    const moving = h.tgt && h.gl <= 0;
    const state = moving ? 'move' : 'stand';
    const frameIdx = moving ? moveFrame : standFrame;
    if (!drawSkillSprite(ctx, 'skill_SILVERHAWK', state, frameIdx, sx, sy, 1.0, 'summon')) {
      // fallback procedural hawk
      const flap = Math.sin((h.x + h.y) * 0.05) * 4;
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(h.a);
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#cfd8dc'; ctx.beginPath(); ctx.ellipse(-12, 0, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1; ctx.fillStyle = '#b0bec5';
      ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#90a4ae';
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-9, -9 + flap); ctx.lineTo(3, -2); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-2, 0); ctx.lineTo(-9, 9 - flap); ctx.lineTo(3, 2); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#eceff1'; ctx.beginPath(); ctx.arc(8, 0, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffa726'; ctx.beginPath(); ctx.moveTo(11, -1.5); ctx.lineTo(15.5, 0); ctx.lineTo(11, 1.5); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
}

export function drawMeteors(ctx: CanvasRenderingContext2D) {
  const A = P.awk.METEOR;
  const cWarn = A ? '#00b0ff' : '#ff1744';
  const cMain = A ? '#2962ff' : '#ff6d00';
  const cCore = A ? '#80d8ff' : '#ffd54f';
  for (const m of meteors) {
    const sx = toSX(m.x), sy = toSY(m.y);
    const prog = m.warnT / m.maxWarnT;
    const warnR = m.r * (0.25 + prog * 0.75);

    ctx.save();
    ctx.globalAlpha = 0.25 + prog * 0.45;
    ctx.strokeStyle = cWarn;
    ctx.lineWidth = 1.5 + prog * 2;
    ctx.setLineDash([8, 5]);
    ctx.beginPath(); ctx.arc(sx, sy, warnR, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.45 + prog * 0.55;
    ctx.strokeStyle = cMain;
    ctx.lineWidth = 1.5;
    const cs = 10 + prog * 6;
    ctx.beginPath(); ctx.moveTo(sx - cs, sy); ctx.lineTo(sx + cs, sy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, sy - cs); ctx.lineTo(sx, sy + cs); ctx.stroke();

    const ballX = sx;
    const ballY = sy - 220 + prog * 220;
    const ballR = 7 + prog * 9;
    ctx.globalAlpha = Math.min(prog * 2, 1);
    ctx.fillStyle = cMain; ctx.globalAlpha = Math.min(prog * 2, 1) * 0.2;
    ctx.beginPath(); ctx.arc(ballX, ballY, ballR * 1.9, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = Math.min(prog * 2, 1);
    ctx.fillStyle = cCore;
    ctx.beginPath(); ctx.arc(ballX, ballY, ballR, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

export function drawLightnings(ctx: CanvasRenderingContext2D) {
  const frameIdx = Math.floor(gTimer * 9) % 9;
  for (const l of lightnings) {
    const alpha = l.life / l.maxLife;
    for (const seg of l.segs) {
      const zz = seg.zz;
      const mid = zz[Math.floor(zz.length / 2)];
      const sx = toSX(mid.x), sy = toSY(mid.y);
      if (!drawSkillSprite(ctx, 'skill_CHAINLIGHTNING', 'hit', frameIdx, sx, sy, 1.0, undefined, alpha)) {
        const lc = P.awk.CHAIN ? '#ffd740' : '#29b6f6';
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(toSX(zz[0].x), toSY(zz[0].y));
        for (let i = 1; i < zz.length; i++) ctx.lineTo(toSX(zz[i].x), toSY(zz[i].y));
        ctx.globalAlpha = alpha * 0.18; ctx.strokeStyle = lc; ctx.lineWidth = 9; ctx.stroke();
        ctx.globalAlpha = alpha * 0.45; ctx.lineWidth = 4; ctx.stroke();
        ctx.globalAlpha = alpha; ctx.strokeStyle = P.awk.CHAIN ? '#fffde7' : '#e1f5fe'; ctx.lineWidth = 1.8; ctx.stroke();
        ctx.restore();
      }
    }
  }
}

export function drawParts(ctx: CanvasRenderingContext2D) {
  for (const p of parts) {
    const sx = toSX(p.x), sy = toSY(p.y);
    ctx.save(); ctx.globalAlpha = p.life / p.ml;
    ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
}

let _ftFont = '';
export function drawFTexts(ctx: CanvasRenderingContext2D) {
  _ftFont = ''; ctx.save(); ctx.textAlign = 'center';
  for (const t of ftexts) {
    const sx = toSX(t.x), sy = toSY(t.y);
    const age = 1.3 - t.life;
    const pop = age < 0.15 ? 1 + Math.sin(age / 0.15 * Math.PI) * 0.45 : 1;
    ctx.globalAlpha = Math.min(t.life, 1);
    const f = `bold ${Math.round(t.sz * pop)}px 'Segoe UI',sans-serif`;
    if (f !== _ftFont) { ctx.font = f; _ftFont = f; }
    ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillText(t.text, sx + 1.5, sy + 1.5);
    ctx.fillStyle = t.col; ctx.fillText(t.text, sx, sy);
  }
  ctx.restore();
}

export function drawJuiceOverlays(ctx: CanvasRenderingContext2D) {
  if (hurtT > 0) {
    ctx.save();
    ctx.globalAlpha = clp(hurtT / 0.4, 0, 1) * 0.8;
    ctx.drawImage(spriteCache.hurtVignette, 0, 0);
    ctx.restore();
  }
  if (awakenT > 0) {
    const t = awakenT / 1.5;
    ctx.save();
    ctx.globalAlpha = clp((t - 0.8) * 5, 0, 1) * 0.45;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(0, 0, LW, LH);

    const age = 1.5 - awakenT;
    const scale = age < 0.25 ? 0.4 + (age / 0.25) * 0.75 : age < 0.35 ? 1.15 - (age - 0.25) / 0.1 * 0.15 : 1.0;
    ctx.globalAlpha = clp(t * 3, 0, 1);
    ctx.translate(LW / 2, LH * 0.34);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 28;
    ctx.font = 'bold 46px Segoe UI';
    ctx.strokeStyle = '#3e2723'; ctx.lineWidth = 6;
    ctx.strokeText(i18n.t('awakening_text'), 0, 0);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(i18n.t('awakening_text'), 0, 0);
    ctx.font = 'bold 22px Segoe UI';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 4;
    ctx.strokeText(awakenName, 0, 36);
    ctx.fillStyle = '#fff8e1';
    ctx.fillText(awakenName, 0, 36);
    ctx.restore();
  }
}
