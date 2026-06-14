import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { BOSS_AT, LW, LH, BASE_LW, BASE_LH, setViewport, JR, SD, RC, calcScore, calcGrade } from './game/constants';
import { initAudio, sfx, isSoundOn, toggleSound } from './game/audio';
import * as spriteCache from './game/spriteCache';
import * as engine from './game/engine';
import { t, setLang, skillName, mobName, currentLang, type Lang } from './game/i18n';
import { computeLoadout, getCosmetic, CHAPTERS } from './game/catalog';
import { getActiveProfile, saveProfile, unlockCosmetics, type Profile } from './game/profile';
import HomeHub from './ui/HomeHub';
import ChapterSelect from './ui/ChapterSelect';
import EnhancePanel from './ui/EnhancePanel';
import ProfileSelect from './ui/ProfileSelect';
import Wardrobe from './ui/Wardrobe';

type MenuView = 'home' | 'chapters' | 'enhance' | 'wardrobe' | 'profiles' | null;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [lang, setLangState] = useState<Lang>('en');
  const [menuView, setMenuView] = useState<MenuView>('home');
  const menuViewRef = useRef<MenuView>('home');
  const [activeProfile, setActiveProfileState] = useState<Profile>(() => getActiveProfile());
  const bestRef = useRef<{ score: number; grade: string; kills: number; lv: number } | null>(null);
  const soundRef = useRef(true);
  const [mapleLoaded, setMapleLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  // Input states
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef({ mx: LW / 2, my: LH / 2, clicked: false });
  const joyRef = useRef({ on: false, bx: 0, by: 0, dx: 0, dy: 0, id: -1 });
  const resultRecordedRef = useRef(false);
  const activeChapterRef = useRef('ch1');
  const rotatedRef = useRef(false);
  const [rotated, setRotated] = useState(false);

  const refreshActiveProfile = () => {
    const profile = getActiveProfile();
    setActiveProfileState(profile);
    return profile;
  };

  const showMenu = (view: Exclude<MenuView, null>) => {
    menuViewRef.current = view;
    setMenuView(view);
    engine.setPhase('title');
    keysRef.current.clear();
    joyRef.current.on = false;
    joyRef.current.dx = 0;
    joyRef.current.dy = 0;
    mouseRef.current.clicked = false;
    refreshActiveProfile();
  };

  const startGame = (chapterId = activeChapterRef.current) => {
    initAudio();
    activeChapterRef.current = chapterId;
    menuViewRef.current = null;
    setMenuView(null);
    keysRef.current.clear();
    joyRef.current.on = false;
    joyRef.current.dx = 0;
    joyRef.current.dy = 0;
    mouseRef.current.clicked = false;
    resultRecordedRef.current = false;
    const profile = getActiveProfile();
    setActiveProfileState(profile);
    engine.setLoadout(computeLoadout(profile.enhance));
    const chapter = CHAPTERS.find(c => c.id === chapterId);
    engine.setWorld(chapter?.infinite ?? false);
    if (chapter) engine.setChapterConfig(chapter.mobPool, chapter.boss, chapter.difficultyMult, chapter.bgTheme);
    const cos = getCosmetic(profile.equippedCosmetic);
    engine.setCosmeticDraw(cos?.draw ?? null);
    if (cos?.maple?.slot === 'Cap') {
      const vslot = cos.id === 'ninja' ? 'CpH1H2H5' : ((spriteCache.mapleAssets[cos.maple.assetKey]?.info as any)?.vslot || '');
      engine.setCosmeticCapVslot(vslot);
    } else {
      engine.setCosmeticCapVslot('');
    }
    engine.resetGameState();
    engine.setPhase('skillpick');
  };

  const returnHome = () => {
    engine.resetGameState();
    showMenu('home');
  };

  const handleLangChange = (nextLang: Lang) => {
    setLang(nextLang);
    setLangState(nextLang);
  };

  const recordActiveProfileResult = (score: number, grade: string) => {
    const profile = getActiveProfile();
    const chapterId = activeChapterRef.current || 'ch1';
    const prevChapter = profile.chapters[chapterId];
    const isBest = !prevChapter || score > prevChapter.bestScore;
    const nextProfile: Profile = unlockCosmetics({
      ...profile,
      mesos: profile.mesos + engine.runMesos,
      chapters: {
        ...profile.chapters,
        [chapterId]: {
          cleared: Boolean(prevChapter?.cleared || engine.bossCleared),
          bestScore: isBest ? score : prevChapter.bestScore,
          bestGrade: isBest ? grade : prevChapter.bestGrade,
          bestTime: isBest ? Math.floor(engine.gTimer) : prevChapter.bestTime,
        },
      },
      stats: {
        ...profile.stats,
        plays: profile.stats.plays + 1,
        totalKills: profile.stats.totalKills + engine.kills,
        bossKills: profile.stats.bossKills + (engine.bossCleared ? 1 : 0),
        maxLevel: Math.max(profile.stats.maxLevel, engine.P.lv),
        totalMesosEarned: profile.stats.totalMesosEarned + engine.runMesos,
      },
    });
    setActiveProfileState(saveProfile(nextProfile));
  };

  useEffect(() => {
    menuViewRef.current = menuView;
  }, [menuView]);

  // Load High Score & Maple Story Assets
  useEffect(() => {
    try {
      const b = localStorage.getItem('sr_best');
      if (b) {
        bestRef.current = JSON.parse(b);
      }
    } catch (e) {
      console.error(e);
    }
    soundRef.current = isSoundOn();

    // 메이플스토리 MCP 데이터셋 로딩 구동
    spriteCache.loadMapleAssets().then(() => {
      setMapleLoaded(true);
    });

    // 실시간 진행률 게이지 바 트래킹 타이머
    const interval = setInterval(() => {
      setLoadProgress(spriteCache.mapleLoadProgress);
      if (spriteCache.isMapleLoaded) {
        clearInterval(interval);
      }
    }, 50);

    return () => clearInterval(interval);
  }, []);

  // Set up dynamic logical resolution.
  useEffect(() => {
    const handleResize = () => {
      const cv = canvasRef.current;
      if (!cv) return;
      const rawW = Math.max(1, window.innerWidth);
      const rawH = Math.max(1, window.innerHeight);
      const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
      const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? false;
      const touchDevice = coarsePointer || (!finePointer && navigator.maxTouchPoints > 0);
      const shouldRotate = touchDevice && rawH > rawW;
      rotatedRef.current = shouldRotate;
      setRotated(prev => prev === shouldRotate ? prev : shouldRotate);
      const viewportW = shouldRotate ? rawH : rawW;
      const viewportH = shouldRotate ? rawW : rawH;
      const aspect = viewportW / viewportH;
      const BASE_ASPECT = BASE_LW / BASE_LH;
      const MAX_ASPECT = 2.4;
      const MIN_ASPECT = 1 / 2.4;
      const a = Math.max(MIN_ASPECT, Math.min(MAX_ASPECT, aspect));
      let lw: number;
      let lh: number;
      if (a >= BASE_ASPECT) {
        lh = BASE_LH;
        lw = Math.round(BASE_LH * a);
      } else {
        lw = BASE_LW;
        lh = Math.round(BASE_LW / a);
      }
      setViewport(lw, lh);
      cv.width = lw;
      cv.height = lh;
      cv.style.width = '100%';
      cv.style.height = '100%';
      if (containerRef.current) {
        containerRef.current.style.width = '100%';
        containerRef.current.style.height = '100%';
      }
      engine.recomputeViewport();
      spriteCache.buildHurtVignette(lw, lh);
    };
    let orientationFrame = 0;
    const handleOrientationChange = () => {
      cancelAnimationFrame(orientationFrame);
      orientationFrame = requestAnimationFrame(handleResize);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      cancelAnimationFrame(orientationFrame);
    };
  }, []);

  // Start loop on mount and register inputs
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d')!;

    // Initial sprite building
    spriteCache.buildSprites(ctx);

    // Keyboard handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target
        && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)
      ) {
        return;
      }
      initAudio();
      keysRef.current.add(e.code);
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || e.key === ' ') {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.code);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // ── DEBUG SHORTCUTS (remove this block to disable) ──────────────────
    const handleDebugKey = (e: KeyboardEvent) => {
      if (e.key === 'F1') { engine.setDebug(!engine.debugInvincible, engine.debugSpeedMul); e.preventDefault(); }
      if (e.key === 'F2') { engine.setDebug(engine.debugInvincible, engine.debugSpeedMul === 10 ? 1 : 10); e.preventDefault(); }
    };
    window.addEventListener('keydown', handleDebugKey);
    // ── END DEBUG ───────────────────────────────────────────────────────

    // Mouse handlers
    const getCvCoords = (clientX: number, clientY: number) => {
      if (rotatedRef.current) {
        const screenW = Math.max(1, window.innerWidth);
        const screenH = Math.max(1, window.innerHeight);
        const fracX = Math.max(0, Math.min(1, clientY / screenH));
        const fracY = Math.max(0, Math.min(1, 1 - clientX / screenW));
        return { x: fracX * LW, y: fracY * LH };
      }
      const r = cv.getBoundingClientRect();
      const s = LW / r.width;
      return { x: (clientX - r.left) * s, y: (clientY - r.top) * s };
    };

    const handleMouseMove = (e: MouseEvent) => {
      const coords = getCvCoords(e.clientX, e.clientY);
      mouseRef.current.mx = coords.x;
      mouseRef.current.my = coords.y;
    };

    const handleMouseClick = (e: MouseEvent) => {
      initAudio();
      const coords = getCvCoords(e.clientX, e.clientY);
      mouseRef.current.mx = coords.x;
      mouseRef.current.my = coords.y;
      mouseRef.current.clicked = true;
    };

    cv.addEventListener('mousemove', handleMouseMove);
    cv.addEventListener('click', handleMouseClick);

    // Touch joystick handlers
    const handleTouchStart = (e: TouchEvent) => {
      initAudio();
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const coords = getCvCoords(t.clientX, t.clientY);
        const tx = coords.x;
        const ty = coords.y;

        // In menu/paused/levelup, treat all touches as clicks
        if (engine.phase !== 'playing' || tx >= LW * 0.55) {
          mouseRef.current.mx = tx;
          mouseRef.current.my = ty;
          mouseRef.current.clicked = true;
        } else if (!joyRef.current.on) {
          joyRef.current.on = true;
          joyRef.current.id = t.identifier;
          joyRef.current.bx = tx;
          joyRef.current.by = ty;
          joyRef.current.dx = 0;
          joyRef.current.dy = 0;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joyRef.current.id) {
          const coords = getCvCoords(t.clientX, t.clientY);
          let dx = coords.x - joyRef.current.bx;
          let dy = coords.y - joyRef.current.by;
          const d = Math.hypot(dx, dy);
          if (d > JR) {
            dx = (dx / d) * JR;
            dy = (dy / d) * JR;
          }
          joyRef.current.dx = dx / JR;
          joyRef.current.dy = dy / JR;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joyRef.current.id) {
          joyRef.current.on = false;
          joyRef.current.dx = 0;
          joyRef.current.dy = 0;
        }
      }
    };

    cv.addEventListener('touchstart', handleTouchStart, { passive: false });
    cv.addEventListener('touchmove', handleTouchMove, { passive: false });
    cv.addEventListener('touchend', handleTouchEnd, { passive: false });

    // Game loop
    let lastT = 0;
    let animId = 0;

    const gameLoop = (ts: number) => {
      animId = requestAnimationFrame(gameLoop);
      const rawDt = Math.min((ts - lastT) / 1000, 0.1);
      let dt = rawDt;

      // Local synced phases
      const currentPhase = engine.phase;

      if (menuViewRef.current) {
        lastT = ts;
        ctx.clearRect(0, 0, LW, LH);
        mouseRef.current.clicked = false;
        return;
      }

      if (currentPhase === 'playing' && engine.hitStop > 0) {
        dt *= 0.12;
      }

      // ── DEBUG ─────────────────────────────────────────────────────────
      if (engine.debugSpeedMul !== 1) dt *= engine.debugSpeedMul;
      if (engine.debugInvincible) engine.P.invT = 999;
      // ── END DEBUG ─────────────────────────────────────────────────────

      engine.decayTimers(rawDt, dt);
      lastT = ts;

      ctx.clearRect(0, 0, LW, LH);

      // ── MAIN STATE MACHINE ──────────────────────────────────────────
      if (currentPhase === 'title') {
        ctx.fillStyle = '#101827';
        ctx.fillRect(0, 0, LW, LH);

      } else if (currentPhase === 'skillpick') {
        drawSkillPickCanvas(ctx);
        // 즉시 클릭 실행 패턴으로 drawSkillPickCanvas 내부에서 이미 처리가 조율되므로, 
        // 이곳에서는 클릭 플래그 안전 해제 및 렌더링 동기화만 담당합니다.
        if (mouseRef.current.clicked) {
          mouseRef.current.clicked = false;
        }

      } else if (currentPhase === 'playing') {
        // Esc Pause
        if (keysRef.current.has('Escape')) {
          keysRef.current.delete('Escape');
          engine.setPhase('paused');
        }

        // Sound Toggle Click Box (Bottom Left: 12, LH-48 to 48, LH-12)
        if (mouseRef.current.clicked && mouseRef.current.mx >= 12 && mouseRef.current.mx <= 48 && mouseRef.current.my >= LH - 48 && mouseRef.current.my <= LH - 12) {
          const newState = toggleSound();
          soundRef.current = newState;
          mouseRef.current.clicked = false;
        }

        engine.addTime(dt);

        // Spawn Mid Bosses / Bosses
        if (!engine.bossSpawned && engine.gTimer >= BOSS_AT) engine.spawnBoss();
        if (!engine.bossSpawned && engine.nextMid <= 450 && engine.gTimer >= engine.nextMid) {
          engine.spawnMidBoss();
          engine.incrementMidBoss();
        }

        // Spawner Engine
        engine.addSpawnClock(dt);
        const base = engine.gTimer < 30 ? 0.85 :
                     engine.gTimer < 420 ? 0.85 + ((engine.gTimer - 30) / 390) * 0.20 :
                     engine.gTimer < 480 ? 1.05 + ((engine.gTimer - 420) / 60) * 0.20 : 0.70;

        const ampGrow = engine.gTimer < 480 ? 0.10 + engine.clp(engine.gTimer / 480, 0, 1) * 0.16 : 0.08;
        const wave = Math.sin(engine.gTimer / 42 * Math.PI * 2) * ampGrow + Math.sin(engine.gTimer / 15 * Math.PI * 2) * (ampGrow * 0.35);
        const rampIn = 0.5 + 0.5 * engine.clp(engine.gTimer / 12, 0, 1);
        const intensity = engine.clp((base + wave) * rampIn, 0.05, 1.30);

        const earlyMul = 0.75 + 0.25 * engine.clp(engine.gTimer / 300, 0, 1);
        const si = engine.clp((1.05 - intensity * 0.93) / 2, 0.05, 0.55) / earlyMul;
        const maxE = Math.round((12 + intensity * 60 + (engine.gTimer > 300 ? (engine.gTimer - 300) * 0.15 : 0)) * earlyMul);

        if (!engine.bossSpawned && engine.spawnClock >= si && engine.enemies.length < maxE) {
          engine.setSpawnClock(0);
          engine.spawnEnemy(engine.getSpawnType());
        }

        // Gather movement inputs
        let mdx = 0, mdy = 0;
        let isMoving = false;
        if (keysRef.current.has('KeyA') || keysRef.current.has('ArrowLeft')) mdx -= 1;
        if (keysRef.current.has('KeyD') || keysRef.current.has('ArrowRight')) mdx += 1;
        if (keysRef.current.has('KeyW') || keysRef.current.has('ArrowUp')) mdy -= 1;
        if (keysRef.current.has('KeyS') || keysRef.current.has('ArrowDown')) mdy += 1;

        mdx += joyRef.current.dx;
        mdy += joyRef.current.dy;
        const h = Math.hypot(mdx, mdy);
        const mv = h > 0 ? { dx: mdx / h, dy: mdy / h, on: true } : { dx: 0, dy: 0, on: false };

        // Handle End Run Event
        const triggerEndRun = () => {
          if (resultRecordedRef.current) return;
          resultRecordedRef.current = true;
          engine.setPhase('result');
          sfx(engine.bossCleared ? 'clear' : 'over');

          try {
            const s = calcScore(engine.kills, engine.P.lv, engine.gTimer, engine.bossCleared);
            const currentGrade = calcGrade(s);
            recordActiveProfileResult(s, currentGrade);
            const b = localStorage.getItem('sr_best');
            const parsed = b ? JSON.parse(b) : null;
            const isNew = !parsed || s > parsed.score;
            if (isNew) {
              const rec = { score: s, grade: currentGrade, kills: engine.kills, lv: engine.P.lv };
              localStorage.setItem('sr_best', JSON.stringify(rec));
              bestRef.current = rec;
            }
          } catch (e) {
            console.error(e);
          }
        };

        // Update systems
        engine.updPlayer(dt, mv, triggerEndRun);
        engine.updEnemies(dt, triggerEndRun);
        engine.updProjs(dt, triggerEndRun);
        engine.updOrbs(dt, triggerEndRun);
        engine.updNovas(dt, triggerEndRun);
        engine.updMeteors(dt, triggerEndRun);
        engine.updLightnings(dt);
        engine.updClouds(dt, triggerEndRun);
        engine.updHawks(dt, triggerEndRun);
        engine.updDrops(dt);
        engine.updParts(dt);
        engine.updFTexts(dt);
        engine.updCamera();

        // Level Up Checking
        engine.tryLevelUp(() => {
          engine.setPhase('levelup');
        });

        // Drawing
        engine.drawBG(ctx);
        engine.drawClouds(ctx);
        engine.drawDrops(ctx);
        engine.drawEnemies(ctx);
        engine.drawPlayer(ctx);
        engine.drawHawks(ctx);
        engine.drawProjs(ctx);
        engine.drawOrbs(ctx);
        engine.drawNovas(ctx);
        engine.drawMeteors(ctx);
        engine.drawLightnings(ctx);
        engine.drawParts(ctx);
        engine.drawFTexts(ctx);
        drawHUDCanvas(ctx);
        engine.drawJuiceOverlays(ctx);

      } else if (currentPhase === 'paused') {
        engine.updCamera();
        engine.drawBG(ctx);
        engine.drawClouds(ctx);
        engine.drawDrops(ctx);
        engine.drawEnemies(ctx);
        engine.drawPlayer(ctx);
        engine.drawHawks(ctx);
        engine.drawProjs(ctx);
        engine.drawOrbs(ctx);
        engine.drawNovas(ctx);
        engine.drawMeteors(ctx);
        engine.drawLightnings(ctx);
        engine.drawParts(ctx);
        engine.drawFTexts(ctx);
        drawHUDCanvas(ctx);

        ctx.fillStyle = 'rgba(0,0,0,0.62)';
        ctx.fillRect(0, 0, LW, LH);
        ctx.fillStyle = '#fff';
        ctx.font = "bold 42px 'Segoe UI', sans-serif";
        ctx.textAlign = 'center';
        ctx.fillText(t('pause_title'), LW / 2, LH / 2 - 8);
        ctx.fillStyle = '#b0bec5';
        ctx.font = "15px 'Segoe UI', sans-serif";
        ctx.fillText(t('pause_desc'), LW / 2, LH / 2 + 28);

        if (keysRef.current.has('Escape')) {
          keysRef.current.delete('Escape');
          engine.setPhase('playing');
        } else if (mouseRef.current.clicked) {
          engine.setPhase('playing');
        }

      } else if (currentPhase === 'levelup') {
        engine.updParts(dt);
        engine.updFTexts(dt);
        engine.updCamera();

        // Card Hover Matrix
        const cw = 178, ch = 242, gap = 18;
        const tw = engine.cards.length * (cw + gap) - gap;
        const startX = LW / 2 - tw / 2;
        const cy0 = LH / 2 - ch / 2 + 22;
        let foundHover = -1;
        engine.cards.forEach((_, i) => {
          const cx2 = startX + i * (cw + gap);
          if (mouseRef.current.mx >= cx2 && mouseRef.current.mx <= cx2 + cw && mouseRef.current.my >= cy0 - 12 && mouseRef.current.my <= cy0 + ch) {
            foundHover = i;
          }
        });
        engine.setCardHover(foundHover);

        engine.drawBG(ctx);
        engine.drawClouds(ctx);
        engine.drawDrops(ctx);
        engine.drawEnemies(ctx);
        engine.drawPlayer(ctx);
        engine.drawHawks(ctx);
        engine.drawProjs(ctx);
        engine.drawOrbs(ctx);
        engine.drawNovas(ctx);
        engine.drawMeteors(ctx);
        engine.drawLightnings(ctx);
        engine.drawParts(ctx);
        engine.drawFTexts(ctx);
        drawHUDCanvas(ctx);

        drawLevelUpCanvas(ctx, startX, cy0, cw, ch, gap);

        // drawLevelUpCanvas 내부에서 마우스 클릭 선택이 무지연으로 즉각 완결 처리되므로 
        // 이곳에서는 키보드 단축키(1, 2, 3) 선택 수신 로직만 가볍게 가동합니다.

        // Keyboard selection
        const checkKeys = [
          { codes: ['Digit1', 'Numpad1'], idx: 0 },
          { codes: ['Digit2', 'Numpad2'], idx: 1 },
          { codes: ['Digit3', 'Numpad3'], idx: 2 }
        ];
        checkKeys.forEach(({ codes, idx }) => {
          if (codes.some(c => keysRef.current.has(c)) && engine.cards[idx] !== undefined) {
            engine.applySkill(engine.cards[idx]);
            engine.setPhase('playing');
            engine.setCards([]);
            codes.forEach(c => keysRef.current.delete(c));
            engine.tryLevelUp(() => {
              engine.setPhase('levelup');
            });
          }
        });

      } else if (currentPhase === 'result') {
        engine.addResFade(dt * 1.3);
        engine.updCamera();
        engine.drawBG(ctx);
        engine.drawEnemies(ctx);
        engine.drawPlayer(ctx);
        engine.drawParts(ctx);
        drawResultCanvas(ctx);
      }

      // 프레임 연산 처리가 완료된 후 클릭 버퍼를 안전하게 해제합니다.
      mouseRef.current.clicked = false;
    };

    animId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleDebugKey);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cv.removeEventListener('mousemove', handleMouseMove);
      cv.removeEventListener('click', handleMouseClick);
      cv.removeEventListener('touchstart', handleTouchStart);
      cv.removeEventListener('touchmove', handleTouchMove);
      cv.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  // ── INTERNAL DRAWS FOR REACT CONTEXT CANVAS ─────────────────────────
  const drawSkillPickCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, LW, LH);

    // Title
    ctx.fillStyle = '#ffd54f';
    ctx.font = "bold 28px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(t('skillpick_title'), LW / 2, 44);
    ctx.fillText(t('skillpick_title'), LW/2, 44);

    ctx.fillStyle = '#90a4ae';
    ctx.font = "13px 'Segoe UI', sans-serif";
    ctx.fillText(t('skillpick_desc'), LW / 2, 65);

    const keys = Object.keys(SD);
    const cols = keys.length > 9 ? 4 : 3;
    const cw = 140, ch = 142, gap = 12;
    const rows = Math.ceil(keys.length / cols);
    const gridW = cols * cw + (cols - 1) * gap;
    const gridH = rows * ch + (rows - 1) * gap;
    const gx = LW / 2 - gridW / 2;
    const gy = (LH - gridH) / 2 + 22;

    engine.setCardHover(-1);

    keys.forEach((id, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const cx2 = gx + col * (cw + gap);
      const cy2 = gy + row * (ch + gap);
      const def = SD[id];
      const rc = RC[def.rarity];
      
      // 모바일 터치 및 마우스 클릭 오차를 감안해 히트 박스 판정 마진을 8px 더 넉넉하게 확장합니다.
      const hov = mouseRef.current.mx >= cx2 - 8 && mouseRef.current.mx <= cx2 + cw + 8 && mouseRef.current.my >= cy2 - 8 && mouseRef.current.my <= cy2 + ch + 8;

      if (hov) {
        engine.setCardHover(idx);
        // 즉시 클릭 실행(Immediate Click Response) 패턴으로 렉시컬 상태 지연 없이 즉각 선택 처리합니다.
        if (mouseRef.current.clicked) {
          engine.applySkill(id);
          engine.setPhase('playing');
          mouseRef.current.clicked = false;
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
      ctx.fillText(t(`rarity_${def.rarity}`), cx2 + cw / 2, cy2 + 15);

      ctx.font = '36px Arial';
      ctx.fillText(def.icon, cx2 + cw / 2, cy2 + 58);

      ctx.fillStyle = '#eceff1';
      ctx.font = `bold ${skillName(id).length > 6 ? 13 : 15}px 'Segoe UI', sans-serif`;
      ctx.fillText(skillName(id), cx2 + cw / 2, cy2 + 80);

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
    ctx.fillText(t('skillpick_click'), LW / 2, LH - 12);
  };

  const drawHUDCanvas = (ctx: CanvasRenderingContext2D) => {
    // HP Bar
    ctx.fillStyle = 'rgba(0,0,0,0.68)';
    ctx.beginPath();
    (ctx as any).roundRect(8, 8, 212, 50, 7);
    ctx.fill();

    ctx.fillStyle = '#7f0000';
    ctx.fillRect(12, 14, 204, 16);
    ctx.fillStyle = '#e53935';
    ctx.fillRect(12, 14, 204 * (engine.P.hp / engine.P.maxHp), 16);
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 14, 204, 16);

    ctx.fillStyle = '#fff';
    ctx.font = "bold 12px 'Segoe UI', sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(`♥  ${Math.ceil(engine.P.hp)} / ${engine.P.maxHp}`, 16, 26);

    // EXP Bar
    ctx.fillStyle = '#1a0030';
    ctx.fillRect(12, 34, 204, 10);
    ctx.fillStyle = '#7c4dff';
    ctx.fillRect(12, 34, 204 * (engine.P.exp / engine.P.expMax), 10);
    ctx.strokeStyle = '#311b92';
    ctx.lineWidth = 1;
    ctx.strokeRect(12, 34, 204, 10);

    ctx.fillStyle = '#e8eaf6';
    ctx.font = "9px 'Segoe UI', sans-serif";
    ctx.fillText(`Lv.${engine.P.lv}  ${engine.P.exp}/${engine.P.expMax}`, 16, 42);

    // Timer
    const min = Math.floor(engine.gTimer / 60);
    const sec = Math.floor(engine.gTimer % 60);
    const eStr = `${min}:${String(sec).padStart(2, '0')}`;

    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.beginPath();
    (ctx as any).roundRect(LW / 2 - 78, 6, 156, 44, 7);
    ctx.fill();

    ctx.fillStyle = '#e8eaf6';
    ctx.font = "bold 22px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(eStr, LW / 2, 30);

    if (!engine.bossSpawned) {
      const left = Math.max(0, BOSS_AT - engine.gTimer);
      const lMin = Math.floor(left / 60);
      const lSec = Math.floor(left % 60);
      ctx.fillStyle = '#ff8a65';
      ctx.font = "10px 'Segoe UI', sans-serif";
      ctx.fillText(`${t('boss_soon')} ${lMin}:${String(lSec).padStart(2, '0')}`, LW / 2, 44);
    } else {
      ctx.fillStyle = '#ff5252';
      ctx.font = "bold 10px 'Segoe UI', sans-serif";
      ctx.fillText(t('boss_now'), LW / 2, 44);
    }

    // Kill Count
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    (ctx as any).roundRect(LW - 110, 8, 100, 28, 6);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = "bold 14px 'Segoe UI', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText(`💀 ${engine.kills}`, LW - 12, 28);

    // Run mesos
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    (ctx as any).roundRect(LW - 132, 42, 122, 28, 6);
    ctx.fill();

    ctx.fillStyle = '#ffd54f';
    ctx.font = "bold 13px 'Segoe UI', sans-serif";
    ctx.textAlign = 'right';
    ctx.fillText(`${t('hud_mesos')} ${engine.runMesos.toLocaleString()}`, LW - 14, 61);

    // Skill Icons
    const skids = Object.keys(engine.P.skills);
    if (skids.length) {
      const is = 36, ip = 4, tw = skids.length * (is + ip) - ip;
      let ix = LW / 2 - tw / 2;
      const iy = LH - is - 12;
      for (const id of skids) {
        const def = SD[id];
        const lv = engine.P.skills[id];
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
    const boss = engine.enemies.find(e => e.isBoss);
    if (boss) {
      const bw = 380, bh = 20, bx = LW / 2 - bw / 2, by = LH - 72;
      ctx.fillStyle = 'rgba(0,0,0,0.82)';
      ctx.beginPath();
      (ctx as any).roundRect(bx - 6, by - 24, bw + 12, bh + 30, 8);
      ctx.fill();

      ctx.fillStyle = '#d4a017';
      ctx.font = "bold 13px 'Segoe UI', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText(`⚠️  ${mobName(boss.type)}  ⚠️`, LW / 2, by - 5);

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
    if (joyRef.current.on) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(joyRef.current.bx, joyRef.current.by, JR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(joyRef.current.bx + joyRef.current.dx * JR, joyRef.current.by + joyRef.current.dy * JR, JR * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const drawLevelUpCanvas = (ctx: CanvasRenderingContext2D, startX: number, cy0: number, cw: number, ch: number, gap: number) => {
    ctx.fillStyle = 'rgba(0,0,0,0.74)';
    ctx.fillRect(0, 0, LW, LH);

    ctx.fillStyle = '#ffd54f';
    ctx.font = "bold 34px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.strokeText(t('levelup_title'), LW / 2, 82);
    ctx.fillText(t('levelup_title'), LW / 2, 82);

    ctx.fillStyle = '#fff9c4';
    ctx.font = "15px 'Segoe UI', sans-serif";
    ctx.fillText(`Lv.${engine.P.lv}  —  ${t('levelup_desc')}`, LW / 2, 107);

    for (let i = 0; i < engine.cards.length; i++) {
      const id = engine.cards[i];
      const def = SD[id];
      if (!def) continue;
      const curLv = engine.P.skills[id] || 0;
      const cx2 = startX + i * (cw + gap);
      
      // 모바일/데스크톱 마우스 클릭 히트 박스 마진을 실시간으로 8px 더 확장해 기민한 상호작용을 보장합니다.
      const hover = mouseRef.current.mx >= cx2 - 8 && mouseRef.current.mx <= cx2 + cw + 8 && mouseRef.current.my >= cy0 - 12 && mouseRef.current.my <= cy0 + ch + 8;
      const cardY = hover ? cy0 - 10 : cy0;
      const rc = RC[def.rarity];

      // 실시간 호버 시 엔진 상태에 바로 동기화하여 키보드/마우스 선택 영역을 동기화합니다.
      if (hover) {
        engine.setCardHover(i);
        if (mouseRef.current.clicked) {
          engine.applySkill(id);
          engine.setPhase('playing');
          engine.setCards([]);
          mouseRef.current.clicked = false;
          engine.tryLevelUp(() => {
            engine.setPhase('levelup');
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
      ctx.fillText(t(`rarity_${def.rarity}`), cx2 + cw / 2, cardY + 22);

      ctx.font = '52px Arial';
      ctx.fillText(def.icon, cx2 + cw / 2, cardY + 90);

      ctx.fillStyle = '#eceff1';
      const snm = skillName(id);
      ctx.font = `bold ${snm.length > 6 ? 14 : 16}px 'Segoe UI', sans-serif`;
      ctx.fillText(snm, cx2 + cw / 2, cardY + 116);

      ctx.fillStyle = rc;
      ctx.font = "bold 12px 'Segoe UI', sans-serif";
      if (curLv + 1 === 6) {
        ctx.fillStyle = '#ffd700';
      }
      ctx.fillText(curLv === 0 ? t('new_skill') : (curLv + 1 === 6 ? t('awakening') : `Lv ${curLv} → ${curLv + 1}`), cx2 + cw / 2, cardY + 136);

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
    ctx.fillText(t('levelup_key'), LW / 2, LH - 16);
  };

  const drawResultCanvas = (ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = `rgba(0,0,0,${Math.min(engine.resFade * 1.6, 0.88)})`;
    ctx.fillRect(0, 0, LW, LH);

    if (engine.resFade < 0.45) return;
    const alpha = Math.min((engine.resFade - 0.45) * 4, 1);
    ctx.save();
    ctx.globalAlpha = alpha;

    const survived = engine.bossCleared;
    ctx.fillStyle = survived ? '#ffd54f' : '#ff5252';
    ctx.font = "bold 50px 'Segoe UI', sans-serif";
    ctx.textAlign = 'center';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    const titleText = survived ? t('result_clear') : t('result_over');
    ctx.strokeText(titleText, LW / 2, 100);
    ctx.fillText(titleText, LW / 2, 100);

    const gcol = { S: '#ffd700', A: '#40c4ff', B: '#69f0ae', C: '#e0e0e0', D: '#ef9a9a' }[engine.resGrade] || '#fff';
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
    ctx.fillText(engine.resGrade, LW / 2, 252);
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

    const min = Math.floor(engine.gTimer / 60);
    const sec = Math.floor(engine.gTimer % 60);
    const timeStr = `${min}:${String(sec).padStart(2, '0')}`;

    const theScore = calcScore(engine.kills, engine.P.lv, engine.gTimer, engine.bossCleared);
    const isNewBestLocal = (() => { try { const b = localStorage.getItem('sr_best'); return !b || theScore > (JSON.parse(b)?.score || 0); } catch(e) { return false; } })();
    const STATS = [
      [t('result_score'), theScore.toLocaleString() + (isNewBestLocal ? `  ${t('result_newbest')}` : '')],
      [t('result_kills'), `${engine.kills}${currentLang === 'en' ? '' : '마리'}`],
      [t('result_level'), `Lv.${engine.P.lv}`],
      [t('result_time'), timeStr],
      [t('result_skills'), `${Object.keys(engine.P.skills).length}${currentLang === 'en' ? '' : '종'}`]
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
    const skids = Object.keys(engine.P.skills);
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
      mouseRef.current.mx >= x - 12
      && mouseRef.current.mx <= x + bw + 12
      && mouseRef.current.my >= by - 12
      && mouseRef.current.my <= by + bh + 12
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

    drawButton(retryX, t('result_retry'), hovRetry, true);
    drawButton(homeX, t('result_home'), hovHome, false);

    if (mouseRef.current.clicked) {
      if (hovRetry) {
        startGame();
        mouseRef.current.clicked = false;
      } else if (hovHome) {
        returnHome();
        mouseRef.current.clicked = false;
      }
    }

    ctx.restore();
  };

  return (
    <div className={`app-shell ${rotated ? 'app-shell--rotated' : ''} bg-[#0d0d1a] text-white font-sans overflow-hidden select-none`}>
      <div ref={containerRef} className="relative h-full w-full bg-[#0d0d1a] overflow-hidden">
        {/* 로딩 진행 상황을 표시하는 Absolute 오버레이 레이어 */}
        {!mapleLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center space-y-6 p-8 bg-[#14142a]/95 z-50">
            <div className="text-4xl animate-bounce">🍁</div>
            <div className="flex flex-col items-center space-y-2">
            <h2 className="text-2xl font-bold tracking-wider text-[#ffd54f]">{t('loading_title')}</h2>
            <p className="text-sm text-[#90a4ae] font-medium">{t('loading_desc')}</p>
            </div>
            <div className="w-full max-w-[240px] bg-[#0d0d1a] h-4 rounded-full overflow-hidden border border-[#ffd54f]/10 p-0.5">
              <div 
                className="bg-gradient-to-r from-[#ffb300] to-[#ffd54f] h-full rounded-full transition-all duration-100 ease-out"
                style={{ width: `${loadProgress}%` }}
              />
            </div>
            <span className="text-[#ffd54f] font-bold text-lg">{loadProgress}%</span>
          </div>
        )}

        {/* 메인 캔버스 엘리먼트 (항상 마운트 상태를 유지하여 마운트 훅 레이스를 차단) */}
        <canvas
          ref={canvasRef}
          id="c"
          width={LW}
          height={LH}
          className="block h-full w-full touch-none"
        />

        {menuView === 'home' && (
          <HomeHub
            profile={activeProfile}
            lang={lang}
            onLangChange={handleLangChange}
            onOpenChapters={() => showMenu('chapters')}
            onOpenEnhance={() => showMenu('enhance')}
            onOpenWardrobe={() => showMenu('wardrobe')}
            onOpenProfiles={() => showMenu('profiles')}
          />
        )}

        {menuView === 'chapters' && (
          <ChapterSelect
            onBack={() => showMenu('home')}
            onPlayChapter={startGame}
          />
        )}

        {menuView === 'enhance' && (
          <EnhancePanel
            onBack={() => showMenu('home')}
            onProfilesChange={refreshActiveProfile}
          />
        )}

        {menuView === 'wardrobe' && (
          <Wardrobe
            onBack={() => showMenu('home')}
            onProfilesChange={refreshActiveProfile}
          />
        )}

        {menuView === 'profiles' && (
          <ProfileSelect
            onBack={() => showMenu('home')}
            onProfilesChange={refreshActiveProfile}
          />
        )}
      </div>
    </div>
  );
}
