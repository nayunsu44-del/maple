import { ED, TILE } from './constants';

export interface MapleRenderFrame {
  state: string;
  frame: string;
  part: string;
  path: string;
  origin: { x: number; y: number };
  texture_key: string;
  delay?: number;
  map?: Record<string, { x: number; y: number }>;
  sockets?: Record<string, { x: number; y: number }>;
  z?: string;
}

export interface MapleAssetData {
  id: string;
  type: string;
  cdnBase: string;
  availableStates: string[];
  render_plan: MapleRenderFrame[];
  planByState: Record<string, MapleRenderFrame[]>;
  zmap?: string[];
}

export const mapleImages: Record<string, HTMLImageElement> = {};
const mapleImageLoading: Record<string, boolean> = {};
export const mapleAssets: Record<string, MapleAssetData> = {};
export let isMapleLoaded = false;
export let mapleLoadProgress = 0;

export let projSprite: HTMLCanvasElement;
export let projAwkSprite: HTMLCanvasElement;
export let orbSprite: HTMLCanvasElement;
export let orbAwkSprite: HTMLCanvasElement;
export let xpSprite: HTMLCanvasElement;
export let bgPattern: CanvasPattern | null = null;
export let hurtVignette: HTMLCanvasElement;

const MAPLE_ASSET_PATHS = {
  mob_100100: '/data/maple/mob_100100.json',
  mob_100101: '/data/maple/mob_100101.json',
  mob_1210102: '/data/maple/mob_1210102.json',
  mob_2230101: '/data/maple/mob_2230101.json',
  mob_8130100: '/data/maple/mob_8130100.json',
  mob_MUSHMOM: '/data/maple/mob_MUSHMOM.json',
  mob_ZMUSHMOM: '/data/maple/mob_ZMUSHMOM.json',
  body_2000: '/data/maple/body_2000.json',
  head_12000: '/data/maple/head_12000.json',
  face_20000: '/data/maple/face_20000.json',
  hair_30000: '/data/maple/hair_30000.json',
  weapon_1302000: '/data/maple/weapon_1302000.json',
  weapon_STAFF: '/data/maple/weapon_STAFF.json',
  coat_1040004: '/data/maple/coat_1040004.json',
  pants_1060040: '/data/maple/pants_1060040.json',
  shoes_1072850: '/data/maple/shoes_1072850.json',
  // Cosmetic items
  cap_1001128: '/data/maple/cap_1001128.json',
  cap_1002357: '/data/maple/cap_1002357.json',
  cap_1002083: '/data/maple/cap_1002083.json',
  cap_1003084: '/data/maple/cap_1003084.json',
  cape_1102005: '/data/maple/cape_1102005.json',
  // Skill Effects
  skill_ENERGYBOLT: '/data/maple/skill_ENERGYBOLT.json',
  skill_CHAINLIGHTNING: '/data/maple/skill_CHAINLIGHTNING.json',
  skill_METEOR: '/data/maple/skill_METEOR.json',
  skill_POISONMIST: '/data/maple/skill_POISONMIST.json',
  skill_SILVERHAWK: '/data/maple/skill_SILVERHAWK.json',
  skill_GENESIS: '/data/maple/skill_GENESIS.json',
  skill_HOLYSYMBOL: '/data/maple/skill_HOLYSYMBOL.json',
};

export async function loadMapleAssets() {
  const keys = Object.keys(MAPLE_ASSET_PATHS);
  const total = keys.length;
  let loadedCount = 0;

  // JSON 명세만 고속 병렬 로딩
  const jsonPromises = keys.map(async (key) => {
    const path = MAPLE_ASSET_PATHS[key as keyof typeof MAPLE_ASSET_PATHS];
    try {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data: MapleAssetData = await response.json();
      data.planByState = {};
      for (const f of data.render_plan) {
        if (!data.planByState[f.state]) data.planByState[f.state] = [];
        data.planByState[f.state].push(f);
      }
      mapleAssets[key] = data;
    } catch (e) {
      console.warn(`Failed to preload Maple JSON: ${path}`, e);
    } finally {
      loadedCount++;
      mapleLoadProgress = Math.round((loadedCount / total) * 100);
    }
  });

  await Promise.all(jsonPromises);
  isMapleLoaded = true;
  preloadCriticalImages();
}

function preloadCriticalImages() {
  const criticalKeys = [
    'body_2000', 'head_12000', 'face_20000', 'hair_30000',
    'weapon_STAFF', 'coat_1040004', 'pants_1060040', 'shoes_1072850',
    'cap_1001128', 'cap_1002357', 'cap_1002083', 'cap_1003084', 'cape_1102005',
  ];
  const actionState = 'stand1';
  for (const key of criticalKeys) {
    const asset = mapleAssets[key];
    if (!asset) continue;
    const isFace = asset.type === 'face';
    const targetState = isFace ? 'default' : actionState;
    const stateFrames = asset.planByState[targetState] || [];
    for (const frame of stateFrames) {
      if (['highlefEar', 'humanEar', 'lefEar'].includes(frame.part)) continue;
      if (frame.frame !== '0') continue;
      ensureImageLoaded(asset, frame);
    }
  }
}

export function ensureImageLoaded(asset: MapleAssetData, frame: MapleRenderFrame) {
  const imgKey = `${asset.type}_${asset.id}_${frame.state}_${frame.frame}_${frame.part}`;
  if (mapleImages[imgKey]) return mapleImages[imgKey];
  if (mapleImageLoading[imgKey]) return null;

  mapleImageLoading[imgKey] = true;
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const cleanBase = asset.cdnBase.replace(/\/+$/, '');
  const cleanPath = frame.path.replace(/^\/+/, '');
  img.src = `${cleanBase}/${cleanPath}`;
  img.onload = () => {
    mapleImages[imgKey] = img;
  };
  img.onerror = () => {
    mapleImageLoading[imgKey] = false;
  };
  return null;
}

export function buildSprites(ctxForPattern: CanvasRenderingContext2D) {
  projSprite = makeGlowSprite(28, [[0, '#fff9c4'], [0.4, 'rgba(255,241,118,0.55)'], [1, 'rgba(255,241,118,0)']], 5, '#fff9c4');
  projAwkSprite = makeGlowSprite(42, [[0, '#fffde7'], [0.35, 'rgba(255,193,7,0.75)'], [1, 'rgba(255,160,0,0)']], 8, '#ffd54f');
  orbSprite = makeGlowSprite(44, [[0, '#ffffff'], [0.4, 'rgba(225,190,231,0.8)'], [1, 'rgba(206,147,216,0)']], 7, '#e1bee7');
  orbAwkSprite = makeGlowSprite(58, [[0, '#ffffff'], [0.4, 'rgba(64,196,255,0.85)'], [1, 'rgba(41,121,255,0)']], 10, '#80d8ff');
  xpSprite = makeGlowSprite(30, [[0, '#b9f6ca'], [0.5, 'rgba(0,230,118,0.7)'], [1, 'rgba(0,230,118,0)']], 5, '#e8f5e9');

  const pc = document.createElement('canvas'); pc.width = pc.height = TILE * 2;
  const pg = pc.getContext('2d')!;
  const T = TILE;

  // 리스항구 스타일 나무 판자 바닥
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const ox = col * T, oy = row * T;
      // 기본 나무 색상 (따뜻한 갈색)
      const shade = 0.92 + (row + col % 2) * 0.04;
      const r = Math.floor(180 * shade), g = Math.floor(135 * shade), b = Math.floor(100 * shade);
      pg.fillStyle = `rgb(${r},${g},${b})`;
      pg.fillRect(ox, oy, T, T);

      // 판자 무늬 (가로선)
      pg.fillStyle = 'rgba(0,0,0,0.06)';
      for (let py = oy + T/4; py < oy + T; py += T/4) {
        pg.fillRect(ox, py, T, 1.5);
      }

      // 세로 판자 경계선
      pg.fillStyle = 'rgba(0,0,0,0.1)';
      pg.fillRect(ox + T/2, oy, 2, T);

      // 나무 결 무늬
      pg.fillStyle = 'rgba(0,0,0,0.04)';
      for (let px = ox + 4; px < ox + T; px += 12) {
        pg.fillRect(px, oy + 3, 3, T - 6);
      }

      // 못 자국 (교차점)
      pg.fillStyle = 'rgba(0,0,0,0.15)';
      const nailX = ox + T/2, nailY1 = oy + T/4, nailY2 = oy + T*3/4;
      pg.beginPath(); pg.arc(nailX, nailY1, 2.5, 0, Math.PI * 2); pg.fill();
      pg.beginPath(); pg.arc(nailX, nailY2, 2.5, 0, Math.PI * 2); pg.fill();
    }
  }

  // 타일 경계 그리드
  pg.strokeStyle = 'rgba(0,0,0,0.08)'; pg.lineWidth = 1;
  pg.strokeRect(0.5, 0.5, T * 2 - 1, T * 2 - 1);
  bgPattern = ctxForPattern.createPattern(pc, 'repeat');

  hurtVignette = document.createElement('canvas');
  hurtVignette.width = 800;
  hurtVignette.height = 600;
  const hg = hurtVignette.getContext('2d')!;
  const hgr = hg.createRadialGradient(400, 300, 600 * 0.32, 400, 300, 600 * 0.78);
  hgr.addColorStop(0, 'rgba(244,67,54,0)');
  hgr.addColorStop(1, 'rgba(183,28,28,0.55)');
  hg.fillStyle = hgr; hg.fillRect(0, 0, 800, 600);
}

function makeGlowSprite(size: number, stops: [number, string][], coreR: number, coreCol: string): HTMLCanvasElement {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d')!;
  const h = size / 2;
  const gr = g.createRadialGradient(h, h, 0, h, h, h);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  if (coreR) {
    g.fillStyle = coreCol; g.beginPath(); g.arc(h, h, coreR, 0, Math.PI * 2); g.fill();
  }
  return c;
}
