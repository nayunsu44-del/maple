import { Enemy } from './types';
import {
  WW, WH, SD, ED, TILE, BOSS_AT, LW, LH,
  MESO_TRASH_DROP_CHANCE, MESO_TRASH_MIN, MESO_TRASH_MAX,
  MESO_MID_MIN, MESO_MID_MAX, MESO_BOSS_MIN, MESO_BOSS_MAX, CH1_CLEAR_BONUS,
  xpNext, calcScore, calcGrade,
} from './constants';
import * as spriteCache from './spriteCache';
import * as i18n from './i18n';
import { clp } from './physics';
import { toSX, toSY, P, enemies, projs, novas, clouds, hawks, meteors, lightnings, drops, parts, ftexts, gTimer, camX, camY, shakeX, shakeY, awakenT, awakenName, hurtT, cosmeticCapAssetKey, cosmeticCapVslot, currentDifficultyMult, currentBgTheme, drawCosmeticOverlay, orbEnts } from './engine';

const BG_FALLBACK_COLORS: Record<string, string> = {
  lith: '#3d7a38',
  henesys: '#4caf50',
  ellinia: '#1b5e20',
  perion: '#8d6e63',
  kerning: '#37474f',
};

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

export function drawSkillSprite(ctx: CanvasRenderingContext2D, assetKey: string, state: string, frameIdx: number, x: number, y: number, scale: number, part?: string, alpha?: number, flip?: boolean) {
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

export function drawEnemies(ctx: CanvasRenderingContext2D) {
  for (const e of enemies) {
    const sx = toSX(e.x), sy = toSY(e.y);
    if (sx < -100 || sx > LW + 100 || sy < -100 || sy > LH + 100) continue;

    const scale = e.isMid ? 2.4 : (e.scale || 1.3);
    const assetKey = getMobAssetKey(e);
    const asset = spriteCache.mapleAssets[assetKey];

    if (!asset || !spriteCache.isMapleLoaded) {
      ctx.fillStyle = e.def.col;
      ctx.beginPath(); ctx.arc(sx, sy, e.def.r, 0, Math.PI * 2); ctx.fill();
      continue;
    }

    let state = 'stand';
    if (e.hp <= 0) state = 'die1';
    else if (e.hf > 0) state = 'hit1';
    else if (e.spd > 0) state = 'move';

    if (!asset.availableStates.includes(state)) {
      state = 'stand';
    }

    const stateFrames = asset.planByState[state];
    if (!stateFrames || stateFrames.length === 0) continue;

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
      ctx.fillStyle = e.def.col;
      ctx.beginPath(); ctx.arc(sx, sy, e.def.r * scale, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
    } else {
      ctx.save();
      ctx.translate(sx, sy);

      if (e.isMid) {
        ctx.shadowColor = '#ffa726';
        ctx.shadowBlur = 16;
      }

      const faceDirection = P.x > e.x ? 1 : -1;
      const flip = faceDirection > 0;
      if (flip) ctx.scale(-1, 1);

      const ox = frame.origin.x, oy = frame.origin.y;
      const drawX = flip ? (img.width - ox) * -scale : -ox * scale;
      const drawY = -oy * scale;

      ctx.drawImage(img, drawX, drawY, img.width * scale, img.height * scale);

      if (e.hf > 0) {
        ctx.globalAlpha = e.hf * 0.65;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = '#fff';
        ctx.fillRect(drawX, drawY, img.width * scale, img.height * scale);
      }
      ctx.restore();
    }

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

export function drawPlayer(ctx: CanvasRenderingContext2D) {
  const sx = toSX(P.x), sy = toSY(P.y);
  if (!spriteCache.isMapleLoaded) {
    ctx.fillStyle = '#1565c0'; ctx.fillRect(sx - 10, sy - 10, 20, 20);
    drawCosmeticOverlay(ctx, sx, sy, P.face, 1);
    return;
  }
  const scale = 1.35;

  const isMoving = Math.abs(P.walk) > 0.01;
  const actionState = isMoving ? 'walk1' : 'stand1';

  const bodyAsset = spriteCache.mapleAssets['body_2000'];
  if (!bodyAsset) return;

  const bodyStateFrames = bodyAsset.planByState[actionState];
  if (!bodyStateFrames || bodyStateFrames.length === 0) return;

  const delay = bodyStateFrames[0].delay || 150;
  const loopTime = delay * bodyStateFrames.length;
  const currentTick = (gTimer * 1000) % loopTime;
  const frameIndex = Math.floor(currentTick / delay) % bodyStateFrames.length;
  const frameStr = String(frameIndex);

  const zmap = bodyAsset.zmap || [];

  const partsToRender: {
    img: HTMLImageElement;
    z: string;
    origin: { x: number; y: number };
    map?: Record<string, { x: number; y: number }>;
    path: string;
  }[] = [];

  const equipmentKeys = [
    'body_2000', 'head_12000', 'face_50247', 'hair_60000',
    'weapon_GAISER', 'coat_DRAKAZ', 'shoes_DRAKAZ', 'acc_1012626'
  ];
  if (cosmeticCapAssetKey) equipmentKeys.push(cosmeticCapAssetKey);

  for (const eqKey of equipmentKeys) {
    const asset = spriteCache.mapleAssets[eqKey];
    if (!asset) continue;

    const targetState = (actionState in asset.planByState) ? actionState : (('default' in asset.planByState) ? 'default' : Object.keys(asset.planByState)[0]);
    const targetFrame = (targetState === 'default') ? '0' : frameStr;
    let stateFrames = asset.planByState[targetState] || [];
    let frames = stateFrames.filter(f => f.frame === targetFrame);

    if (frames.length === 0) {
      frames = stateFrames.filter(f => f.frame === '0');
    }

    for (const frame of frames) {
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
          map: frame.sockets || frame.map,
          path: frame.path
        });
      }
    }
  }

  const bodyPart = partsToRender.find(p => p.z === 'body');
  if (!bodyPart) {
    ctx.fillStyle = '#1565c0'; ctx.fillRect(sx - 14, sy - 20, 28, 40);
    ctx.fillStyle = '#ffb74d'; ctx.beginPath(); ctx.arc(sx, sy - 24, 10, 0, Math.PI * 2); ctx.fill();
    drawCosmeticOverlay(ctx, sx, sy, P.face, 1);
    return;
  }

  const flip = P.face < 0;
  const flipSign = flip ? -1 : 1;

  const neckOnBody = bodyPart.map?.neck || { x: 0, y: 0 };
  const navelOnBody = bodyPart.map?.navel || { x: 0, y: 0 };

  const localPos: Record<string, { x: number; y: number }> = {
    body: { x: 0, y: 0 }
  };

  const headPart = partsToRender.find(p => p.z === 'head');
  if (headPart) {
    const neckOnHead = headPart.map?.neck || { x: 0, y: 0 };
    localPos['head'] = {
      x: (neckOnBody.x - neckOnHead.x) * scale,
      y: (neckOnBody.y - neckOnHead.y) * scale
    };
  }

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

  partsToRender.forEach((part) => {
    if (part.z && part.z.includes('accessory')) {
      const ab = part.map?.brow || { x: 0, y: 0 };
      localPos[part.z] = {
        x: localPos['head'].x + (headBrow.x - ab.x) * scale,
        y: localPos['head'].y + (headBrow.y - ab.y) * scale
      };
    }
  });

  partsToRender.forEach((part) => {
    if (part.z === 'body' || part.z === 'head' || part.z === 'face') return;
    if (part.z === 'hair' || part.z === 'hairOverHead' || part.z === 'hairShade') return;
    if (part.z === 'cap' || part.z === 'capAccessory' || part.z === 'capOverHair' || part.z === 'capBelowAccessory') return;
    if (part.z && part.z.includes('accessory')) return;
    let anchorSocket = part.map?.navel || { x: 0, y: 0 };
    let parentLocal = localPos['body'];
    let parentSocket = navelOnBody;
    localPos[part.z] = {
      x: parentLocal.x + (parentSocket.x - anchorSocket.x) * scale,
      y: parentLocal.y + (parentSocket.y - anchorSocket.y) * scale
    };
  });

  partsToRender.sort((a, b) => {
    const idxA = zmap.indexOf(a.z);
    const idxB = zmap.indexOf(b.z);
    return idxA - idxB;
  });

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
