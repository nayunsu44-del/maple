import { useEffect, useRef } from 'react';
import { getCosmetic } from '../game/catalog';

interface CharacterPreviewProps {
  cosmeticId: string;
  size?: number;
  facing?: 1 | -1;
  className?: string;
}

function drawBaseCharacter(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = '#263238';
  ctx.fillRect(-15, -23, 30, 28);
  ctx.fillStyle = '#1565c0';
  ctx.fillRect(-12, -31, 24, 31);
  ctx.fillStyle = '#64b5f6';
  ctx.fillRect(-18, -27, 8, 22);
  ctx.fillRect(10, -27, 8, 22);
  ctx.fillStyle = '#263238';
  ctx.fillRect(-12, 0, 8, 15);
  ctx.fillRect(4, 0, 8, 15);

  ctx.fillStyle = '#ffcc80';
  ctx.beginPath();
  ctx.arc(0, -45, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#5d4037';
  ctx.beginPath();
  ctx.arc(0, -50, 15, Math.PI, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#263238';
  ctx.beginPath();
  ctx.arc(-5, -45, 1.8, 0, Math.PI * 2);
  ctx.arc(6, -45, 1.8, 0, Math.PI * 2);
  ctx.fill();

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

    drawBaseCharacter(ctx, anchorX, anchorY, scale);
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
