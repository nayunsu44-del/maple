import { useEffect, useRef } from 'react';
import { getCosmetic } from '../game/catalog';
import * as spriteCache from '../game/spriteCache';

interface CharacterPreviewProps {
  cosmeticId: string;
  size?: number;
  facing?: 1 | -1;
  className?: string;
}

interface PartToRender {
  img: HTMLImageElement;
  z: string;
  origin: { x: number; y: number };
  map?: Record<string, { x: number; y: number }>;
}

function drawMapleCharacter(ctx: CanvasRenderingContext2D, anchorX: number, anchorY: number, scale: number, flip: boolean) {
  if (!spriteCache.isMapleLoaded) return;

  const equipmentKeys = [
    'body_2000', 'head_12000', 'face_20000', 'hair_30000',
    'weapon_STAFF', 'coat_1040004', 'pants_1060040', 'shoes_1072850'
  ];

  const partsToRender: PartToRender[] = [];
  const actionState = 'stand1';

  for (const eqKey of equipmentKeys) {
    const asset = spriteCache.mapleAssets[eqKey];
    if (!asset) continue;

    const isFace = asset.type === 'face';
    const targetState = isFace ? 'default' : actionState;
    const stateFrames = asset.planByState[targetState] || [];
    let frames = stateFrames.filter(f => f.frame === '0');

    if (frames.length === 0) frames = stateFrames.filter(f => f.frame === '0');

    for (const frame of frames) {
      if (['highlefEar', 'humanEar', 'lefEar'].includes(frame.part)) continue;

      const imgKey = `${asset.type}_${asset.id}_${frame.state}_${frame.frame}_${frame.part}`;
      const img = spriteCache.mapleImages[imgKey] || spriteCache.ensureImageLoaded(asset, frame);
      if (img) {
        partsToRender.push({ img, z: frame.z || asset.type, origin: frame.origin, map: frame.sockets || frame.map });
      }
    }
  }

  const bodyPart = partsToRender.find(p => p.z === 'body');
  if (!bodyPart) return;

  const zmap = spriteCache.mapleAssets['body_2000']?.zmap || [];
  const navelOnBody = bodyPart.map?.navel || { x: 0, y: 0 };
  const neckOnBody = bodyPart.map?.neck || { x: 0, y: 0 };

  const localPos: Record<string, { x: number; y: number }> = { body: { x: 0, y: 0 } };

  const headPart = partsToRender.find(p => p.z === 'head');
  if (headPart) {
    const neckOnHead = headPart.map?.neck || { x: 0, y: 0 };
    localPos['head'] = { x: (neckOnBody.x - neckOnHead.x) * scale, y: (neckOnBody.y - neckOnHead.y) * scale };
  }

  const headBrow = headPart?.map?.brow || { x: 0, y: 0 };

  for (const part of partsToRender) {
    if (['body', 'head'].includes(part.z)) continue;
    if (!part.map?.brow && !part.map?.navel) continue;

    if (part.map?.brow && !part.map?.navel) {
      const pb = part.map.brow;
      localPos[part.z] = {
        x: (localPos['head']?.x || 0) + (headBrow.x - pb.x) * scale,
        y: (localPos['head']?.y || 0) + (headBrow.y - pb.y) * scale
      };
    } else {
      const anchor = part.map?.navel || { x: 0, y: 0 };
      localPos[part.z] = {
        x: (navelOnBody.x - anchor.x) * scale,
        y: (navelOnBody.y - anchor.y) * scale
      };
    }
  }

  partsToRender.sort((a, b) => {
    const ai = zmap.indexOf(a.z), bi = zmap.indexOf(b.z);
    if (ai === -1 && bi === -1) return 0;
    if (ai === -1) return -1;
    if (bi === -1) return 1;
    return ai - bi;
  });

  ctx.save();
  ctx.translate(anchorX, anchorY);
  if (flip) ctx.scale(-1, 1);

  for (const part of partsToRender) {
    if (!part.z || !part.img || !part.origin) continue;
    const lp = localPos[part.z] || { x: 0, y: 0 };
    const ox = part.origin.x | 0, oy = part.origin.y | 0;
    ctx.drawImage(part.img, lp.x - ox * scale, lp.y - oy * scale, part.img.width * scale, part.img.height * scale);
  }

  ctx.restore();
}

export default function CharacterPreview({ cosmeticId, size = 88, facing = 1, className = '' }: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);

    const anchorX = size / 2;
    const anchorY = size * 0.74;
    const scale = size / 104;
    const flip = facing < 0;

    drawMapleCharacter(ctx, anchorX, anchorY, scale, flip);
    getCosmetic(cosmeticId)?.draw(ctx, anchorX, anchorY, facing, scale);
  }, [cosmeticId, facing, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`block ${className}`}
      aria-hidden="true"
    />
  );
}
