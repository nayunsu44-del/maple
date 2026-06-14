import { PlayerState, Enemy, Projectile, DropItem, Particle, Nova, FText, Meteor, Lightning, LightningSeg, PoisonCloud, Hawk } from './types';
import {
  WW, WH, SD, ED, TILE, BOSS_AT, LW, LH,
  MESO_TRASH_DROP_CHANCE, MESO_TRASH_MIN, MESO_TRASH_MAX,
  MESO_MID_MIN, MESO_MID_MAX, MESO_BOSS_MIN, MESO_BOSS_MAX, CH1_CLEAR_BONUS,
  xpNext, calcScore, calcGrade,
  SPAWN_OUT_OF_BOUNDS_DISTANCE, PLAYER_COLLISION_RADIUS,
  KNOCKBACK_DECAY_RATE, GEM_COLLECT_RADIUS2, SPAWN_EDGE_PADDING,
  XP_SCATTER_OFFSET, BOSS_CLEAR_XP_BOOST
} from './constants';
import type { LoadoutBonus } from './catalog';
import { sfx } from './audio';
import * as spriteCache from './spriteCache';
import * as i18n from './i18n';

import { rnd, ri, clp, dst, dst2, ang, findClosestN, findClosestInRange, shuffle, makeZigzag } from './physics';

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
export let cosmeticCapVslot = '';    // Devilish Horns: no hair masking
export let cosmeticCapAssetKey = '';
let cosmeticCapeDraw: CosmeticDrawFn | null = null;
export let debugInvincible = false;
export let debugSpeedMul = 1;

export function setDebug(invincible: boolean, speedMul: number) {
  debugInvincible = invincible;
  debugSpeedMul = speedMul;
}
let currentMobPool: string[] = ['SN', 'BS', 'SP', 'RS'];
let currentBossType = 'MA';
export let currentDifficultyMult = 1;
export let currentBgTheme = 'lith';
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

export function drawCosmeticOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, facing: number, scale: number) {
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
    for (let i = 0; i < 5; i++) addXP(e.x + rnd(-XP_SCATTER_OFFSET, XP_SCATTER_OFFSET), e.y + rnd(-XP_SCATTER_OFFSET, XP_SCATTER_OFFSET), BOSS_CLEAR_XP_BOOST);
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
  const bx = worldInfinite ? P.x + 500 : clp(P.x + 500, def.r + SPAWN_EDGE_PADDING, worldW - def.r - SPAWN_EDGE_PADDING);
  const by = worldInfinite ? P.y : clp(P.y, def.r + SPAWN_EDGE_PADDING, worldH - def.r - SPAWN_EDGE_PADDING);
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
  const rawX = P.x + Math.cos(a) * SPAWN_OUT_OF_BOUNDS_DISTANCE;
  const rawY = P.y + Math.sin(a) * SPAWN_OUT_OF_BOUNDS_DISTANCE;
  const ex = worldInfinite ? rawX : clp(rawX, def.r + SPAWN_EDGE_PADDING, worldW - def.r - SPAWN_EDGE_PADDING);
  const ey = worldInfinite ? rawY : clp(rawY, def.r + SPAWN_EDGE_PADDING, worldH - def.r - SPAWN_EDGE_PADDING);
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
    e.kbx *= (1 - KNOCKBACK_DECAY_RATE * dt); e.kby *= (1 - KNOCKBACK_DECAY_RATE * dt);
    e.wb += dt * 3;
    if (e.hf > 0) e.hf -= dt * 4;
    if (P.invT <= 0 && L < e.def.r + PLAYER_COLLISION_RADIUS) {
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


// ── DRAW CHANNELS & PHYSICS (RE-EXPORTED) ────────────────────────────
export { drawBG, drawDrops, drawEnemies, drawPlayer, drawProjs, drawOrbs, drawNovas, drawClouds, drawHawks, drawMeteors, drawLightnings, drawParts, drawFTexts, drawJuiceOverlays, drawSkillSprite } from "./engine_draw_v2";
export { clp, rnd, ri, dst, dst2, ang } from "./physics";
