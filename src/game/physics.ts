import { Enemy } from './types';

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

export const ang = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.atan2(b.y - a.y, b.x - a.x);

export function findClosestN(from: { x: number; y: number }, list: Enemy[], n: number): Enemy[] {
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

export function findClosestInRange(from: { x: number; y: number }, list: Enemy[], maxDist2: number, skip: Set<string | number>): Enemy | null {
  let best: Enemy | null = null;
  let bestD2 = maxDist2;
  for (const e of list) {
    if (skip.has(e._id)) continue;
    const d2 = dst2(e, from);
    if (d2 < bestD2) { best = e; bestD2 = d2; }
  }
  return best;
}

export function shuffle<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = ri(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeZigzag(p1: { x: number; y: number }, p2: { x: number; y: number }, n = 5) {
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
