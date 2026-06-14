import { ED, TILE, LW, LH } from './constants';

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
  info?: Record<string, unknown>;
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
export const bgPatterns: Record<string, CanvasPattern | null> = {};
export let hurtVignette: HTMLCanvasElement;

export function buildHurtVignette(w: number, h: number) {
  hurtVignette = document.createElement('canvas');
  hurtVignette.width = w;
  hurtVignette.height = h;
  const hg = hurtVignette.getContext('2d')!;
  const cx = w / 2;
  const cy = h / 2;
  const radiusBase = Math.min(w, h);
  const hgr = hg.createRadialGradient(cx, cy, radiusBase * 0.32, cx, cy, radiusBase * 0.78);
  hgr.addColorStop(0, 'rgba(244,67,54,0)');
  hgr.addColorStop(1, 'rgba(183,28,28,0.55)');
  hg.fillStyle = hgr;
  hg.fillRect(0, 0, w, h);
}

type FloorThemeId = 'lith' | 'henesys' | 'ellinia' | 'perion' | 'kerning';

interface FloorThemeSpec {
  id: FloorThemeId;
  baseColor: string;
  drawTile: (ctx: CanvasRenderingContext2D, ox: number, oy: number, tile: number, row: number, col: number) => void;
  gridColor: string;
  gridWidth?: number;
}

const FLOOR_THEMES: FloorThemeSpec[] = [
  {
    id: 'lith',
    baseColor: 'rgb(180,135,100)',
    gridColor: 'rgba(0,0,0,0.08)',
    drawTile: (ctx, ox, oy, tile, row, col) => {
      const shade = 0.92 + (row + col % 2) * 0.04;
      const r = Math.floor(180 * shade), g = Math.floor(135 * shade), b = Math.floor(100 * shade);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(ox, oy, tile, tile);

      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      for (let py = oy + tile / 4; py < oy + tile; py += tile / 4) {
        ctx.fillRect(ox, py, tile, 1.5);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.1)';
      ctx.fillRect(ox + tile / 2, oy, 2, tile);

      ctx.fillStyle = 'rgba(0,0,0,0.04)';
      for (let px = ox + 4; px < ox + tile; px += 12) {
        ctx.fillRect(px, oy + 3, 3, tile - 6);
      }

      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      const nailX = ox + tile / 2, nailY1 = oy + tile / 4, nailY2 = oy + tile * 3 / 4;
      ctx.beginPath(); ctx.arc(nailX, nailY1, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(nailX, nailY2, 2.5, 0, Math.PI * 2); ctx.fill();
    },
  },
  {
    id: 'henesys',
    baseColor: '#5aa84e',
    gridColor: 'rgba(34,85,29,0.12)',
    drawTile: (ctx, ox, oy, tile, row, col) => {
      ctx.fillStyle = row === col ? '#5eaf52' : '#55a049';
      ctx.fillRect(ox, oy, tile, tile);
      ctx.strokeStyle = 'rgba(22,83,27,0.16)';
      ctx.lineWidth = 1;
      for (let x = ox + 9; x < ox + tile; x += 16) {
        ctx.beginPath(); ctx.moveTo(x, oy + 6); ctx.lineTo(x + 6, oy + tile - 8); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(222,255,191,0.16)';
      for (let x = ox + 4; x < ox + tile; x += 22) {
        ctx.beginPath(); ctx.moveTo(x, oy + tile - 6); ctx.lineTo(x + 7, oy + 12); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(232,255,194,0.18)';
      for (let i = 0; i < 5; i++) {
        const x = ox + 10 + ((i * 17 + row * 11 + col * 7) % (tile - 18));
        const y = oy + 8 + ((i * 13 + row * 19 + col * 5) % (tile - 16));
        ctx.fillRect(x, y, 2, 2);
      }
    },
  },
  {
    id: 'ellinia',
    baseColor: '#2f5d4a',
    gridColor: 'rgba(9,31,28,0.14)',
    drawTile: (ctx, ox, oy, tile, row, col) => {
      ctx.fillStyle = row === col ? '#315f4d' : '#2b5747';
      ctx.fillRect(ox, oy, tile, tile);
      ctx.fillStyle = 'rgba(19,65,56,0.24)';
      for (let i = 0; i < 5; i++) {
        const x = ox + 8 + ((i * 21 + col * 13) % (tile - 20));
        const y = oy + 10 + ((i * 15 + row * 17) % (tile - 22));
        ctx.beginPath(); ctx.ellipse(x, y, 12, 4, (i + row + col) * 0.6, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = 'rgba(98,151,119,0.12)';
      for (let i = 0; i < 4; i++) {
        const x = ox + 12 + ((i * 19 + row * 9) % (tile - 18));
        const y = oy + 12 + ((i * 11 + col * 13) % (tile - 18));
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
  {
    id: 'perion',
    baseColor: '#7d7264',
    gridColor: 'rgba(46,36,28,0.14)',
    drawTile: (ctx, ox, oy, tile, row, col) => {
      ctx.fillStyle = row === col ? '#817669' : '#766b5e';
      ctx.fillRect(ox, oy, tile, tile);
      ctx.strokeStyle = 'rgba(45,36,31,0.22)';
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(ox + 10, oy + 18); ctx.lineTo(ox + 27, oy + 31); ctx.lineTo(ox + 42, oy + 29); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox + 54, oy + 8); ctx.lineTo(ox + 47, oy + 26); ctx.lineTo(ox + 59, oy + 46); ctx.stroke();
      ctx.fillStyle = 'rgba(42,34,29,0.18)';
      for (let i = 0; i < 8; i++) {
        const x = ox + 7 + ((i * 13 + row * 17 + col * 5) % (tile - 14));
        const y = oy + 6 + ((i * 19 + row * 7 + col * 11) % (tile - 12));
        ctx.beginPath(); ctx.arc(x, y, i % 3 === 0 ? 2.2 : 1.3, 0, Math.PI * 2); ctx.fill();
      }
    },
  },
  {
    id: 'kerning',
    baseColor: '#363b44',
    gridColor: 'rgba(120,141,157,0.20)',
    gridWidth: 1.5,
    drawTile: (ctx, ox, oy, tile, row, col) => {
      ctx.fillStyle = row === col ? '#383e47' : '#323740';
      ctx.fillRect(ox, oy, tile, tile);
      ctx.fillStyle = 'rgba(20,23,28,0.32)';
      ctx.beginPath(); ctx.arc(ox + tile * 0.72, oy + tile * 0.32, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ox + tile * 0.22, oy + tile * 0.72, 3, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(20,24,30,0.28)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ox + 12, oy + 18); ctx.lineTo(ox + 32, oy + 18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox + 48, oy + 55); ctx.lineTo(ox + 66, oy + 55); ctx.stroke();
    },
  },
];

const MAPLE_ASSET_PATHS = {
  mob_100100: '/data/maple/mob_100100.json',
  mob_100101: '/data/maple/mob_100101.json',
  mob_1210102: '/data/maple/mob_1210102.json',
  mob_2230101: '/data/maple/mob_2230101.json',
  mob_8130100: '/data/maple/mob_8130100.json',
  mob_MUSHMOM: '/data/maple/mob_MUSHMOM.json',
  mob_ZMUSHMOM: '/data/maple/mob_ZMUSHMOM.json',
  mob_SPORE: '/data/maple/mob_SPORE.json',
  mob_REDSNAIL: '/data/maple/mob_REDSNAIL.json',
  mob_MANO: '/data/maple/mob_MANO.json',
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
    'mob_SPORE', 'mob_REDSNAIL', 'mob_MANO',
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

function makeFloorPattern(ctxForPattern: CanvasRenderingContext2D, spec: FloorThemeSpec): CanvasPattern | null {
  const pc = document.createElement('canvas'); pc.width = pc.height = TILE * 2;
  const pg = pc.getContext('2d')!;
  const T = TILE;
  pg.fillStyle = spec.baseColor;
  pg.fillRect(0, 0, T * 2, T * 2);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      spec.drawTile(pg, col * T, row * T, T, row, col);
    }
  }
  pg.strokeStyle = spec.gridColor;
  pg.lineWidth = spec.gridWidth ?? 1;
  pg.strokeRect(0.5, 0.5, T * 2 - 1, T * 2 - 1);
  return ctxForPattern.createPattern(pc, 'repeat');
}

export function buildSprites(ctxForPattern: CanvasRenderingContext2D) {
  projSprite = makeGlowSprite(28, [[0, '#fff9c4'], [0.4, 'rgba(255,241,118,0.55)'], [1, 'rgba(255,241,118,0)']], 5, '#fff9c4');
  projAwkSprite = makeGlowSprite(42, [[0, '#fffde7'], [0.35, 'rgba(255,193,7,0.75)'], [1, 'rgba(255,160,0,0)']], 8, '#ffd54f');
  orbSprite = makeGlowSprite(44, [[0, '#ffffff'], [0.4, 'rgba(225,190,231,0.8)'], [1, 'rgba(206,147,216,0)']], 7, '#e1bee7');
  orbAwkSprite = makeGlowSprite(58, [[0, '#ffffff'], [0.4, 'rgba(64,196,255,0.85)'], [1, 'rgba(41,121,255,0)']], 10, '#80d8ff');
  xpSprite = makeGlowSprite(30, [[0, '#b9f6ca'], [0.5, 'rgba(0,230,118,0.7)'], [1, 'rgba(0,230,118,0)']], 5, '#e8f5e9');

  for (const theme of FLOOR_THEMES) {
    bgPatterns[theme.id] = makeFloorPattern(ctxForPattern, theme);
  }
  bgPattern = bgPatterns.lith ?? null;

  buildHurtVignette(LW, LH);
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
