/**
 * AUTO-GENERATED system helper, managed by the runtime.
 * Restored automatically on the next prompt if missing.
 *
 * DO NOT EDIT — your changes will not propagate, and a future runtime
 * update may overwrite or fail to merge them. If different behaviour is
 * needed, create a sibling file OUTSIDE `src/__system__/` and import that
 * instead.
 *
 * --------------------------------------------------------------------
 * MapleStory map layout helpers — pure utility functions, no Phaser
 * dependency at the value level. Opt-in: importing this module does
 * NOT change the behaviour of MapleSprite / MapleSkillEffect / etc.
 *
 * Covers the three formulas from `maple-map`:
 *   1. Cross-layer z-sort for tile / obj across pages 0..7
 *   2. Parallax screen-space conversion via rx / ry
 *   3. Background draw-order (front=0 first, front=1 last)
 *
 * Foothold lookup, portal handling, life-spawn placement, and
 * reactor wiring stay LLM territory — those are game-state logic
 * that vary per project, not deterministic per-asset math.
 */

/**
 * Cross-page z-sort for a TILE entry within layers 0..7.
 *
 * Formula (per `maple-map` line 379):
 *   sortZ = pageIdx * 30000 + 20000 - 10 * (zM + 1) + tileZ
 *
 * The `30000` separation guarantees every tile on page 1 sits in
 * front of every tile on page 0, regardless of `zM`. The `-10*(zM+1)`
 * means LOW `zM` draws in front (counter-intuitive but matches the
 * asset CDN convention). `tileZ` is the per-tile micro-offset from
 * the tileset entry's own `z` field.
 *
 * Use the returned number as the Phaser sprite's `depth`.
 *
 * @param pageIdx 0..7 — which `0`..`7` layer the tile lives in
 * @param zM      tile entry's `zM` field (depth modifier)
 * @param tileZ   tileset entry's `z` field (micro-offset; 0 if absent)
 */
export function tileDepth(pageIdx: number, zM: number, tileZ: number): number {
  return pageIdx * 30000 + 20000 - 10 * (zM + 1) + tileZ;
}

/**
 * Cross-page z-sort for an OBJ entry within layers 0..7.
 *
 * Formula (per `maple-map` line 379):
 *   sortZ = pageIdx * 30000 + 2000 + z
 *
 * The `2000` base sits BELOW the tile band (`20000`), so objects on
 * the same page render BEHIND tiles on that page — counter-intuitive
 * but the asset CDN's standard. Objects can still cover tiles on
 * lower pages because `pageIdx * 30000` dominates.
 *
 * @param pageIdx 0..7 — which `0`..`7` layer the obj lives in
 * @param z       obj entry's `z` field (per-instance depth)
 */
export function objDepth(pageIdx: number, z: number): number {
  return pageIdx * 30000 + 2000 + z;
}

/**
 * Background entry depth for the `back` array. Backgrounds render
 * either BEHIND or IN FRONT of terrain tiles, based on `front`:
 *
 *   front=0  → behind everything (sky / parallax landscape)
 *   front=1  → in front of tiles + objs (foreground decoration)
 *
 * We use a generous separation (-1_000_000 vs +1_000_000) so a
 * background never accidentally interleaves with the tile/obj band
 * (which sits in [0, 240_000]).
 *
 * `index` is the entry's position in the `back` array (preserves
 * draw order across multiple background entries with the same front
 * value).
 */
export function backgroundDepth(index: number, front: 0 | 1): number {
  if (front === 1) return 1_000_000 + index;
  return -1_000_000 + index;
}

/**
 * Parallax screen-space conversion for a background entry.
 *
 * Formula (per `maple-map` line 133):
 *   screenX = entryX - cameraX * (100 + rx) / 100
 *   screenY = entryY - cameraY * (100 + ry) / 100
 *
 * `rx` / `ry` are PERCENT offsets from camera-locked motion:
 *   rx=0    → world-fixed (background scrolls 100% with camera)
 *   rx=-15  → distant parallax (background scrolls 85%)
 *   rx=-100 → screen-fixed (HUD-like; background doesn't scroll at all)
 *
 * Apply `parallaxScreenX` / `parallaxScreenY` per frame to the
 * background's display position. For tile/obj entries you typically
 * just subtract camera position (rx implicit 0).
 */
export function parallaxScreenX(entryX: number, cameraX: number, rx: number): number {
  return entryX - (cameraX * (100 + rx)) / 100;
}

export function parallaxScreenY(entryY: number, cameraY: number, ry: number): number {
  return entryY - (cameraY * (100 + ry)) / 100;
}

/**
 * Background tile-mode handling. The `back` entry's `type` controls
 * how a background image repeats across the screen:
 *
 *   0 → no tiling, single placement
 *   1 → horizontal tile (repeat X every `cx` px; cx=0 means use image width)
 *   2 → vertical tile   (repeat Y every `cy` px; cy=0 means use image height)
 *   3 → tile both H and V
 *   4 → scroll H + tile (continuous flow using rx as speed)
 *   5 → scroll V + tile (continuous flow using ry as speed)
 *   6 → scroll H + tile (variant of 4)
 *   7 → scroll both + tile (diagonal flow)
 *
 * Returns true when the engine should call Phaser's TileSprite (or
 * draw multiple copies) for this entry. For type 0 use a regular
 * Image / Sprite at `parallaxScreenX, parallaxScreenY`.
 */
export function isTilingBackground(type: number): boolean {
  return type >= 1 && type <= 7;
}

/**
 * Foothold coordinate utility — reproduces the lookup convention from
 * `maple-map`. Foothold storage is 3-level nested:
 *
 *   foothold[group][subgroup][fhID] = { x1, y1, x2, y2, next, prev, ... }
 *
 * Iterate every group/subgroup to find a foothold by ID. `life` entries
 * reference footholds by ID via `fh`.
 *
 * The helper deliberately operates on the raw shape so the LLM can pass
 * `mapData.foothold` straight through. We only handle the lookup; the
 * foothold-following / standing logic stays in game state.
 */
export interface Foothold {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  next?: number;
  prev?: number;
  piece?: number;
  forbidFallDown?: number;
}

export function findFoothold(
  // biome-ignore lint/suspicious/noExplicitAny: maple-map storage is dynamic
  footholdRoot: Record<string, Record<string, Record<string, any>>> | undefined,
  fhId: number,
): Foothold | null {
  if (!footholdRoot) return null;
  const targetKey = String(fhId);
  for (const group of Object.values(footholdRoot)) {
    if (!group) continue;
    for (const sub of Object.values(group)) {
      if (!sub) continue;
      const found = sub[targetKey];
      if (found) return found as Foothold;
    }
  }
  return null;
}

/**
 * Standing-Y for an entity placed on a foothold. Uses the foothold's
 * `y1` (lower x-end) when the entity X is closer to that end, `y2`
 * otherwise. Linear interpolation across the foothold span handles
 * diagonal segments.
 */
export function footholdY(fh: Foothold, x: number): number {
  if (fh.y1 === fh.y2) return fh.y1;
  const span = fh.x2 - fh.x1;
  if (span === 0) return fh.y1;
  const t = Math.max(0, Math.min(1, (x - fh.x1) / span));
  return fh.y1 + (fh.y2 - fh.y1) * t;
}
