import React, { useEffect, useRef, useState } from 'react';
import './App.css';
import { BOSS_AT, LW, LH, BASE_LW, BASE_LH, setViewport, JR, SD, RC, calcScore, calcGrade } from './game/constants';
import { initAudio, sfx, isSoundOn, toggleSound } from './game/audio';
import * as spriteCache from './game/spriteCache';
import * as engine from './game/engine';
import { t, setLang, skillName, mobName, currentLang, type Lang } from './game/i18n';
import { computeLoadout, getCosmetic, CHAPTERS } from './game/catalog';
import { getActiveProfile, saveProfile, unlockCosmetics, type Profile } from './game/profile';
import * as canvasUi from './ui/canvas_ui';
import { useGameInput } from './game/useGameInput';
import { clp } from './game/physics';
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
  const lastPhaseRef = useRef<string>('title');
  const rotatedRef = useRef(false);
  const [rotated, setRotated] = useState(false);

  // Register clean game input hook
  useGameInput(canvasRef, keysRef, mouseRef, joyRef, rotatedRef, LW, LH, JR);

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
    if (cos?.maple?.slot === 'Cap') {
      const vslot = cos.id === 'ninja' ? 'CpH1H2H5' : ((spriteCache.mapleAssets[cos.maple.assetKey]?.info as any)?.vslot || '');
      engine.setCapCosmetic(vslot, cos.maple.assetKey);
      engine.setCapeCosmetic(null);
    } else if (cos?.maple?.slot === 'Cape') {
      engine.setCapCosmetic('', '');
      engine.setCapeCosmetic(cos.draw ?? null);
    } else {
      engine.setCapCosmetic('', '');
      engine.setCapeCosmetic(null);
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

    // Game loop
    let lastT = 0;
    let animId = 0;

    const gameLoop = (ts: number) => {
      const guiContext = { keysRef, mouseRef, joyRef, soundRef, engine, startGame, returnHome, toggleSound };
      animId = requestAnimationFrame(gameLoop);
      const rawDt = Math.min((ts - lastT) / 1000, 0.1);
      let dt = rawDt;

      // Local synced phases
      const currentPhase = engine.phase;

      if (currentPhase !== 'playing' && lastPhaseRef.current === 'playing') {
        keysRef.current.clear();
        joyRef.current.on = false;
        joyRef.current.dx = 0;
        joyRef.current.dy = 0;
      }
      lastPhaseRef.current = currentPhase;

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

        const ampGrow = engine.gTimer < 480 ? 0.10 + clp(engine.gTimer / 480, 0, 1) * 0.16 : 0.08;
        const wave = Math.sin(engine.gTimer / 42 * Math.PI * 2) * ampGrow + Math.sin(engine.gTimer / 15 * Math.PI * 2) * (ampGrow * 0.35);
        const rampIn = 0.5 + 0.5 * clp(engine.gTimer / 12, 0, 1);
        const intensity = clp((base + wave) * rampIn, 0.05, 1.30);

        const earlyMul = 0.75 + 0.25 * clp(engine.gTimer / 300, 0, 1);
        const si = clp((1.05 - intensity * 0.93) / 2, 0.05, 0.55) / earlyMul;
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
    };
  }, []);

  // ── INTERNAL DRAWS FOR REACT CONTEXT CANVAS ─────────────────────────



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
