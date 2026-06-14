import { SD, RC, LW, LH, BOSS_AT, JR, calcScore, calcGrade } from '../game/constants';
import * as i18n from '../game/i18n';
import { isSoundOn } from '../game/audio';
import * as spriteCache from '../game/spriteCache';

interface RefState<T> {
  current: T;
}

interface GuiContext {
  keysRef: RefState<Set<string>>;
  mouseRef: RefState<{ mx: number; my: number; clicked: boolean }>;
  joyRef: RefState<{ on: boolean; bx: number; by: number; dx: number; dy: number; id: number }>;
  soundRef: RefState<boolean>;
  engine: any;
  startGame: (chapterId?: string) => void;
  returnHome: () => void;
  toggleSound: () => boolean;
}

export function drawSkillPickCanvas(ctx: CanvasRenderingContext2D, gui: GuiContext) {
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, LW, LH);

  // Title
  ctx.fillStyle = '#ffd54f';
  ctx.font = "bold 28px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  ctx.strokeText(i18n.t('skillpick_title'), LW / 2, 44);
  ctx.fillText(i18n.t('skillpick_title'), LW/2, 44);

  ctx.fillStyle = '#90a4ae';
  ctx.font = "13px 'Segoe UI', sans-serif";
  ctx.fillText(i18n.t('skillpick_desc'), LW / 2, 65);

  const keys = Object.keys(SD);
  const cols = keys.length > 9 ? 4 : 3;
  const cw = 140, ch = 142, gap = 12;
  const rows = Math.ceil(keys.length / cols);
  const gridW = cols * cw + (cols - 1) * gap;
  const gridH = rows * ch + (rows - 1) * gap;
  const gx = LW / 2 - gridW / 2;
  const gy = (LH - gridH) / 2 + 22;

  gui.engine.setCardHover(-1);

  keys.forEach((id, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx2 = gx + col * (cw + gap);
    const cy2 = gy + row * (ch + gap);
    const def = SD[id];
    const rc = RC[def.rarity];
    
    const hov = gui.mouseRef.current.mx >= cx2 - 8 && gui.mouseRef.current.mx <= cx2 + cw + 8 && gui.mouseRef.current.my >= cy2 - 8 && gui.mouseRef.current.my <= cy2 + ch + 8;

    if (hov) {
      gui.engine.setCardHover(idx);
      if (gui.mouseRef.current.clicked) {
        gui.engine.applySkill(id);
        gui.engine.setPhase('playing');
        gui.mouseRef.current.clicked = false;
      }
    }

    ctx.save();
    ctx.shadowColor = hov ? rc : 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = hov ? 24 : 6;
    ctx.fillStyle = hov ? 'rgba(255,255,255,0.12)' : 'rgba(14,14,34,0.95)';
    ctx.beginPath();
    (ctx as any).roundRect(cx2, cy2, cw, ch, 10);
    ctx.fill();
    ctx.strokeStyle = hov ? rc : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = hov ? 2 : 1;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = rc;
    ctx.font = "bold 9px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(i18n.t(`rarity_${def.rarity}`), cx2 + cw / 2, cy2 + 15);

    ctx.font = '36px Arial';
    ctx.fillText(def.icon, cx2 + cw / 2, cy2 + 58);

    ctx.fillStyle = '#eceff1';
    ctx.font = `bold ${i18n.skillName(id).length > 6 ? 13 : 15}px 'Segoe UI', sans-serif`;
    ctx.fillText(i18n.skillName(id), cx2 + cw / 2, cy2 + 80);

    ctx.fillStyle = '#90a4ae';
    ctx.font = "11px 'Segoe UI', sans-serif";
    ctx.fillText(def.desc ? def.desc(1) : '', cx2 + cw / 2, cy2 + 98);

    if (hov) {
      ctx.fillStyle = '#ffd54f';
      ctx.font = "bold 11px 'Segoe UI', sans-serif";
      ctx.fillText('▶ 선택', cx2 + cw / 2, cy2 + ch - 10);
    }
  });

  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = "12px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('skillpick_click'), LW / 2, LH - 12);
}

export function drawHUDCanvas(ctx: CanvasRenderingContext2D, gui: GuiContext) {
  const { P, enemies, kills, runMesos, gTimer, bossSpawned } = gui.engine;

  // HP Bar
  ctx.fillStyle = 'rgba(0,0,0,0.68)';
  ctx.beginPath();
  (ctx as any).roundRect(8, 8, 212, 50, 7);
  ctx.fill();

  ctx.fillStyle = '#7f0000';
  ctx.fillRect(12, 14, 204, 16);
  ctx.fillStyle = '#e53935';
  ctx.fillRect(12, 14, 204 * (P.hp / P.maxHp), 16);
  ctx.strokeStyle = '#b71c1c';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 14, 204, 16);

  ctx.fillStyle = '#fff';
  ctx.font = "bold 12px 'Segoe UI', sans-serif";
  ctx.textAlign = 'left';
  ctx.fillText(`♥  ${Math.ceil(P.hp)} / ${P.maxHp}`, 16, 26);

  // EXP Bar
  ctx.fillStyle = '#1a0030';
  ctx.fillRect(12, 34, 204, 10);
  ctx.fillStyle = '#7c4dff';
  ctx.fillRect(12, 34, 204 * (P.exp / P.expMax), 10);
  ctx.strokeStyle = '#311b92';
  ctx.lineWidth = 1;
  ctx.strokeRect(12, 34, 204, 10);

  ctx.fillStyle = '#e8eaf6';
  ctx.font = "9px 'Segoe UI', sans-serif";
  ctx.fillText(`Lv.${P.lv}  ${P.exp}/${P.expMax}`, 16, 42);

  // Timer
  const min = Math.floor(gTimer / 60);
  const sec = Math.floor(gTimer % 60);
  const eStr = `${min}:${String(sec).padStart(2, '0')}`;

  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  ctx.beginPath();
  (ctx as any).roundRect(LW / 2 - 78, 6, 156, 44, 7);
  ctx.fill();

  ctx.fillStyle = '#e8eaf6';
  ctx.font = "bold 22px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(eStr, LW / 2, 30);

  if (!bossSpawned) {
    const left = Math.max(0, BOSS_AT - gTimer);
    const lMin = Math.floor(left / 60);
    const lSec = Math.floor(left % 60);
    ctx.fillStyle = '#ff8a65';
    ctx.font = "10px 'Segoe UI', sans-serif";
    ctx.fillText(`${i18n.t('boss_soon')} ${lMin}:${String(lSec).padStart(2, '0')}`, LW / 2, 44);
  } else {
    ctx.fillStyle = '#ff5252';
    ctx.font = "bold 10px 'Segoe UI', sans-serif";
    ctx.fillText(i18n.t('boss_now'), LW / 2, 44);
  }

  // Kill Count
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  (ctx as any).roundRect(LW - 110, 8, 100, 28, 6);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = "bold 14px 'Segoe UI', sans-serif";
  ctx.textAlign = 'right';
  ctx.fillText(`💀 ${kills}`, LW - 12, 28);

  // Run mesos
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.beginPath();
  (ctx as any).roundRect(LW - 132, 42, 122, 28, 6);
  ctx.fill();

  ctx.fillStyle = '#ffd54f';
  ctx.font = "bold 13px 'Segoe UI', sans-serif";
  ctx.textAlign = 'right';
  ctx.fillText(`${i18n.t('hud_mesos')} ${runMesos.toLocaleString()}`, LW - 14, 61);

  // Skill Icons
  const skids = Object.keys(P.skills);
  if (skids.length) {
    const is = 36, ip = 4, tw = skids.length * (is + ip) - ip;
    let ix = LW / 2 - tw / 2;
    const iy = LH - is - 12;
    for (const id of skids) {
      const def = SD[id];
      const lv = P.skills[id];
      ctx.fillStyle = 'rgba(0,0,0,0.78)';
      ctx.beginPath();
      (ctx as any).roundRect(ix, iy, is, is, 5);
      ctx.fill();

      ctx.strokeStyle = lv >= 6 ? '#ffd700' : RC[def.rarity];
      ctx.lineWidth = lv >= 6 ? 2.5 : 2;
      ctx.strokeRect(ix, iy, is, is);

      ctx.font = '18px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(def.icon, ix + is / 2, iy + is / 2 + 6);

      ctx.fillStyle = '#ffd54f';
      ctx.font = "bold 9px 'Segoe UI', sans-serif";
      ctx.fillText(lv >= 6 ? '★' : 'Lv' + lv, ix + is / 2, iy + is - 2);

      ix += is + ip;
    }
  }

  // Boss HP Bar
  const boss = enemies.find((e: any) => e.isBoss);
  if (boss) {
    const bw = 380, bh = 20, bx = LW / 2 - bw / 2, by = LH - 72;
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.beginPath();
    (ctx as any).roundRect(bx - 6, by - 24, bw + 12, bh + 30, 8);
    ctx.fill();

    ctx.fillStyle = '#d4a017';
    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(`⚠️  ${i18n.mobName(boss.type)}  ⚠️`, LW / 2, by - 5);

    ctx.fillStyle = '#4a0000';
    ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(bx, by, bw * (boss.hp / boss.maxHp), bh);

    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, bh);
  }

  // Sound toggle box (bottom-left)
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  (ctx as any).roundRect(12, LH - 48, 36, 36, 8);
  ctx.fill();

  ctx.font = '17px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(isSoundOn() ? '🔊' : '🔇', 30, LH - 24);

  // JoyStick
  if (gui.joyRef.current.on) {
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gui.joyRef.current.bx, gui.joyRef.current.by, JR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(gui.joyRef.current.bx + gui.joyRef.current.dx * JR, gui.joyRef.current.by + gui.joyRef.current.dy * JR, JR * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function drawLevelUpCanvas(
  ctx: CanvasRenderingContext2D,
  startX: number,
  cy0: number,
  cw: number,
  ch: number,
  gap: number,
  gui: GuiContext
) {
  const { P, cards } = gui.engine;

  ctx.fillStyle = 'rgba(0,0,0,0.74)';
  ctx.fillRect(0, 0, LW, LH);

  ctx.fillStyle = '#ffd54f';
  ctx.font = "bold 34px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  ctx.strokeText(i18n.t('levelup_title'), LW / 2, 82);
  ctx.fillText(i18n.t('levelup_title'), LW / 2, 82);

  ctx.fillStyle = '#fff9c4';
  ctx.font = "15px 'Segoe UI', sans-serif";
  ctx.fillText(`Lv.${P.lv}  —  ${i18n.t('levelup_desc')}`, LW / 2, 107);

  for (let i = 0; i < cards.length; i++) {
    const id = cards[i];
    const def = SD[id];
    if (!def) continue;
    const curLv = P.skills[id] || 0;
    const cx2 = startX + i * (cw + gap);
    
    const hover = gui.mouseRef.current.mx >= cx2 - 8 && gui.mouseRef.current.mx <= cx2 + cw + 8 && gui.mouseRef.current.my >= cy0 - 12 && gui.mouseRef.current.my <= cy0 + ch + 8;
    const cardY = hover ? cy0 - 10 : cy0;
    const rc = RC[def.rarity];

    if (hover) {
      gui.engine.setCardHover(i);
      if (gui.mouseRef.current.clicked) {
        gui.engine.applySkill(id);
        gui.engine.setPhase('playing');
        gui.engine.setCards([]);
        gui.mouseRef.current.clicked = false;
        gui.engine.tryLevelUp(() => {
          gui.engine.setPhase('levelup');
        });
      }
    }

    ctx.save();
    ctx.shadowColor = hover ? rc : 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = hover ? 30 : 8;
    ctx.fillStyle = hover ? 'rgba(255,255,255,0.13)' : 'rgba(14,14,34,0.94)';
    ctx.beginPath();
    (ctx as any).roundRect(cx2, cardY, cw, ch, 12);
    ctx.fill();
    ctx.strokeStyle = hover ? rc : 'rgba(255,255,255,0.18)';
    ctx.lineWidth = hover ? 2.5 : 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = rc;
    ctx.font = "bold 10px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(i18n.t(`rarity_${def.rarity}`), cx2 + cw / 2, cardY + 22);

    ctx.font = '52px Arial';
    ctx.fillText(def.icon, cx2 + cw / 2, cardY + 90);

    ctx.fillStyle = '#eceff1';
    const snm = i18n.skillName(id);
    ctx.font = `bold ${snm.length > 6 ? 14 : 16}px 'Segoe UI', sans-serif`;
    ctx.fillText(snm, cx2 + cw / 2, cardY + 116);

    ctx.fillStyle = rc;
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    if (curLv + 1 === 6) {
      ctx.fillStyle = '#ffd700';
    }
    ctx.fillText(curLv === 0 ? i18n.t('new_skill') : (curLv + 1 === 6 ? i18n.t('awakening') : `Lv ${curLv} → ${curLv + 1}`), cx2 + cw / 2, cardY + 136);

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx2 + 18, cardY + 148);
    ctx.lineTo(cx2 + cw - 18, cardY + 148);
    ctx.stroke();

    ctx.fillStyle = '#b0bec5';
    ctx.font = "13px 'Segoe UI', sans-serif";
    ctx.fillText(def.desc ? def.desc(curLv + 1) : '', cx2 + cw / 2, cardY + 168);

    if (hover) {
      ctx.fillStyle = '#ffd54f';
      ctx.font = "11px 'Segoe UI', sans-serif";
      ctx.fillText(`▶ 클릭 또는 ${i + 1} 키`, cx2 + cw / 2, cardY + ch - 12);
    }
  }

  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.font = "13px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(i18n.t('levelup_key'), LW / 2, LH - 16);
}

export function drawResultCanvas(ctx: CanvasRenderingContext2D, gui: GuiContext) {
  const { resFade, bossCleared, resGrade, kills, gTimer, P } = gui.engine;

  ctx.fillStyle = `rgba(0,0,0,${Math.min(resFade * 1.6, 0.88)})`;
  ctx.fillRect(0, 0, LW, LH);

  if (resFade < 0.45) return;
  const alpha = Math.min((resFade - 0.45) * 4, 1);
  ctx.save();
  ctx.globalAlpha = alpha;

  const survived = bossCleared;
  ctx.fillStyle = survived ? '#ffd54f' : '#ff5252';
  ctx.font = "bold 50px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 4;
  const titleText = survived ? i18n.t('result_clear') : i18n.t('result_over');
  ctx.strokeText(titleText, LW / 2, 100);
  ctx.fillText(titleText, LW / 2, 100);

  const gcol = { S: '#ffd700', A: '#40c4ff', B: '#69f0ae', C: '#e0e0e0', D: '#ef9a9a' }[resGrade as 'S'|'A'|'B'|'C'|'D'] || '#fff';
  ctx.save();
  ctx.shadowColor = gcol;
  ctx.shadowBlur = 42;
  ctx.strokeStyle = gcol;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(LW / 2, 224, 66, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  ctx.arc(LW / 2, 224, 66, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = gcol;
  ctx.font = "bold 84px 'Segoe UI', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(resGrade, LW / 2, 252);
  ctx.restore();

  // Stats Panel
  const py = 302;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath();
  (ctx as any).roundRect(LW / 2 - 188, py, 376, 166, 12);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const min = Math.floor(gTimer / 60);
  const sec = Math.floor(gTimer % 60);
  const timeStr = `${min}:${String(sec).padStart(2, '0')}`;

  const theScore = calcScore(kills, P.lv, gTimer, bossCleared);
  const isNewBestLocal = (() => { try { const b = localStorage.getItem('sr_best'); return !b || theScore > (JSON.parse(b)?.score || 0); } catch(e) { return false; } })();
  const STATS = [
    [i18n.t('result_score'), theScore.toLocaleString() + (isNewBestLocal ? `  ${i18n.t('result_newbest')}` : '')],
    [i18n.t('result_kills'), `${kills}${i18n.currentLang === 'en' ? '' : '마리'}`],
    [i18n.t('result_level'), `Lv.${P.lv}`],
    [i18n.t('result_time'), timeStr],
    [i18n.t('result_skills'), `${Object.keys(P.skills).length}${i18n.currentLang === 'en' ? '' : '종'}`]
  ];

  STATS.forEach(([k, v], i) => {
    ctx.fillStyle = '#eceff1';
    ctx.font = "17px 'Segoe UI', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(k, LW / 2 - 170, py + 30 + i * 28);

    ctx.fillStyle = '#ffd54f';
    ctx.font = "bold 17px 'Segoe UI', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText(v, LW / 2 + 168, py + 30 + i * 28);
  });

  // Skill icons row
  const skids = Object.keys(P.skills);
  if (skids.length) {
    ctx.font = '22px Arial';
    ctx.textAlign = 'center';
    const sx2 = LW / 2 - skids.length * 14;
    skids.forEach((id, i) => {
      const def = SD[id];
      ctx.fillText(def?.icon || '', sx2 + i * 28 + 14, py + 188);
    });
  }

  // Result buttons
  const bw = 184, bh = 52, gap = 16, by = py + 208;
  const retryX = LW / 2 - bw - gap / 2;
  const homeX = LW / 2 + gap / 2;
  const hit = (x: number) => (
    gui.mouseRef.current.mx >= x - 12
    && gui.mouseRef.current.mx <= x + bw + 12
    && gui.mouseRef.current.my >= by - 12
    && gui.mouseRef.current.my <= by + bh + 12
  );
  const hovRetry = hit(retryX);
  const hovHome = hit(homeX);

  const drawButton = (x: number, label: string, hover: boolean, primary: boolean) => {
    ctx.save();
    ctx.shadowColor = hover ? '#ffd54f' : 'transparent';
    ctx.shadowBlur = hover ? 18 : 0;
    ctx.fillStyle = primary ? (hover ? '#ffd54f' : '#ffb300') : (hover ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.08)');
    ctx.beginPath();
    (ctx as any).roundRect(x, by, bw, bh, 26);
    ctx.fill();
    if (!primary) {
      ctx.strokeStyle = hover ? '#ffd54f' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = primary ? '#1a1a2e' : '#fff';
    ctx.font = "bold 19px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(label, x + bw / 2, by + 34);
  };

  drawButton(retryX, i18n.t('result_retry'), hovRetry, true);
  drawButton(homeX, i18n.t('result_home'), hovHome, false);

  if (gui.mouseRef.current.clicked) {
    if (hovRetry) {
      gui.startGame();
      gui.mouseRef.current.clicked = false;
    } else if (hovHome) {
      gui.returnHome();
      gui.mouseRef.current.clicked = false;
    }
  }

  ctx.restore();
}
